// Application: Debit Request Service
// Handles wallet debit request workflows (for contributions)

import { v4 as uuidv4 } from "uuid";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import {
  WalletRepository,
  WalletDebitRequestRepository,
  WalletTransactionRepository,
} from "../domain/repositories";
import {
  WalletDebitRequest,
  WalletDebitRequestStatus,
  WalletTransactionType,
  WalletTransactionStatus,
} from "../domain/entities";
import { MemberRepository } from "@/modules/members/domain/repositories";
import { JournalEntryService } from "@/modules/gl/application/journalEntryService";
import {
  ACCOUNT_CODES,
  TRANSACTION_SOURCE,
  TRANSACTION_TYPE,
} from "@/modules/gl/constants/accountCodes";
import { AppError } from "@/shared/utils/error-handling/AppError";
import { eventBus } from "@/shared/domain/events/event-bus";
import {
  WalletDebitRequestCreatedEvent,
  WalletDebitCompletedEvent,
  WalletDebitRequestInvalidatedEvent,
} from "../domain/events";
import { logger } from "@/shared/utils/logger";

export class DebitRequestService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly debitRequestRepo: WalletDebitRequestRepository,
    private readonly walletTransactionRepo: WalletTransactionRepository,
    private readonly memberRepo: MemberRepository,
    private readonly journalEntryService: JournalEntryService
  ) {}

  /**
   * Create a wallet debit request (usually system-triggered for contributions)
   * Returns null if insufficient balance (agent will collect directly)
   */
  async createDebitRequest(data: {
    memberId: string;
    amount: number;
    purpose: string;
    contributionCycleId?: string;
    contributionId?: string;
  }): Promise<WalletDebitRequest | null> {
    // Validate amount
    if (data.amount <= 0) {
      throw new AppError("Amount must be positive", 400);
    }

    return await prisma.$transaction(async (tx: any) => {
      // Get wallet
      const wallet = await this.walletRepo.findByMemberId(data.memberId, tx);
      if (!wallet) {
        throw new AppError("Wallet not found for member", 404);
      }

      // Check if sufficient balance
      if (wallet.currentBalance < data.amount) {
        return null; // Agent will collect directly
      }

      // Create debit request
      const debitRequestId = uuidv4();
      const debitRequest = await this.debitRequestRepo.create(
        {
          debitRequestId,
          memberId: data.memberId,
          walletId: wallet.walletId,
          amount: data.amount,
          purpose: data.purpose,
          contributionCycleId: data.contributionCycleId || null,
          contributionId: data.contributionId || null,
          status: WalletDebitRequestStatus.PendingAcknowledgment,
          isAutoDebit: false,
        },
        tx
      );

      // Emit event
      eventBus.publish(
        new WalletDebitRequestCreatedEvent({
          debitRequestId,
          memberId: data.memberId,
          walletId: wallet.walletId,
          amount: data.amount,
          purpose: data.purpose,
        })
      );

      return debitRequest;
    });
  }

  /**
   * Acknowledge wallet debit (by agent on behalf of member)
   * This actually performs the debit
   */
  async acknowledgeDebit(
    debitRequestId: string,
    acknowledgedBy: string
  ): Promise<WalletDebitRequest> {
    return await prisma.$transaction(async (tx: any) => {
      // Get debit request with relations
      const debitRequest = await this.debitRequestRepo.findByIdWithRelations(
        debitRequestId,
        tx
      );

      if (!debitRequest) {
        throw new AppError("Debit request not found", 404);
      }

      if (debitRequest.status !== WalletDebitRequestStatus.PendingAcknowledgment) {
        throw new AppError("Debit request is not pending acknowledgment", 400);
      }

      // Verify agent is the member's agent
      if (debitRequest.member?.agentId !== acknowledgedBy) {
        throw new AppError("Only assigned agent can acknowledge debit", 403);
      }

      // Get wallet and verify balance
      const wallet = await this.walletRepo.findById(debitRequest.walletId, tx);
      if (!wallet) {
        throw new AppError("Wallet not found", 404);
      }

      if (wallet.currentBalance < debitRequest.amount) {
        throw new AppError("Insufficient wallet balance", 400);
      }

      // Debit wallet
      const updatedWallet = await this.walletRepo.decrementBalance(
        debitRequest.walletId,
        debitRequest.amount,
        tx
      );

      // Create GL entry (Dr Member Wallet Liability, Cr Contribution Income)
      const journalEntry = await this.journalEntryService.createJournalEntry({
        entryDate: new Date(),
        description: debitRequest.purpose,
        reference: `DEBIT-${debitRequestId.substring(0, 8)}`,
        sourceModule: TRANSACTION_SOURCE.CONTRIBUTION,
        sourceEntityId: debitRequest.contributionId || debitRequestId,
        sourceTransactionType: TRANSACTION_TYPE.CONTRIBUTION_FROM_WALLET,
        lines: [
          {
            accountCode: ACCOUNT_CODES.MEMBER_WALLET_LIABILITY,
            debitAmount: debitRequest.amount,
            creditAmount: 0,
            description: "Contribution deducted from wallet",
          },
          {
            accountCode: ACCOUNT_CODES.CONTRIBUTION_INCOME,
            debitAmount: 0,
            creditAmount: debitRequest.amount,
            description: debitRequest.purpose,
          },
        ],
        createdBy: acknowledgedBy,
        autoPost: true,
      });

      // Create wallet transaction
      await this.walletTransactionRepo.create(
        {
          transactionId: uuidv4(),
          walletId: debitRequest.walletId,
          transactionType: WalletTransactionType.Debit,
          amount: debitRequest.amount,
          balanceAfter: updatedWallet.currentBalance,
          sourceModule: TRANSACTION_SOURCE.CONTRIBUTION,
          sourceEntityId: debitRequest.contributionId || debitRequestId,
          description: debitRequest.purpose,
          journalEntryId: journalEntry.entry.entryId,
          status: WalletTransactionStatus.Completed,
          createdBy: acknowledgedBy,
        },
        tx
      );

      // Update debit request status
      const now = new Date();
      const updated = await this.debitRequestRepo.update(
        debitRequestId,
        {
          status: WalletDebitRequestStatus.Completed,
          acknowledgedAt: now,
          completedAt: now,
        },
        tx
      );

      // Emit event
      eventBus.publish(
        new WalletDebitCompletedEvent(
          {
            debitRequestId,
            memberId: debitRequest.memberId,
            walletId: debitRequest.walletId,
            amount: debitRequest.amount,
            newBalance: updatedWallet.currentBalance,
            acknowledgedBy,
          },
          acknowledgedBy
        )
      );

      return updated;
    });
  }

  /**
   * Invalidate a debit request (when member pays cash instead)
   */
  async invalidateDebitRequest(
    debitRequestId: string,
    invalidatedBy: string
  ): Promise<WalletDebitRequest> {
    return await prisma.$transaction(async (tx: any) => {
      const debitRequest = await this.debitRequestRepo.findByIdWithRelations(
        debitRequestId,
        tx
      );

      if (!debitRequest) {
        throw new AppError("Debit request not found", 404);
      }

      const validStatuses = [
        WalletDebitRequestStatus.PendingAcknowledgment,
        WalletDebitRequestStatus.Acknowledged,
      ];

      if (!validStatuses.includes(debitRequest.status as WalletDebitRequestStatus)) {
        throw new AppError("Cannot invalidate request in this status", 400);
      }

      const updated = await this.debitRequestRepo.update(
        debitRequestId,
        {
          status: WalletDebitRequestStatus.Invalidated,
        },
        tx
      );

      // Emit event
      eventBus.publish(
        new WalletDebitRequestInvalidatedEvent(
          {
            debitRequestId,
            memberId: debitRequest.memberId,
            invalidatedBy,
          },
          invalidatedBy
        )
      );

      return updated;
    });
  }

  /**
   * Get debit requests by member
   */
  async getDebitRequestsByMember(
    memberId: string,
    filters: {
      status?: WalletDebitRequestStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ requests: WalletDebitRequest[]; total: number }> {
    return await this.debitRequestRepo.findByMemberId(memberId, filters);
  }

  /**
   * Get pending acknowledgment requests (for agent)
   */
  async getPendingAcknowledgmentRequests(filters: {
    agentId?: string;
    page: number;
    limit: number;
  }): Promise<{ requests: WalletDebitRequest[]; total: number }> {
    return await this.debitRequestRepo.findPendingAcknowledgment(filters);
  }

  /**
   * Get debit request by ID
   */
  async getDebitRequestById(
    debitRequestId: string
  ): Promise<WalletDebitRequest | null> {
    return await this.debitRequestRepo.findById(debitRequestId);
  }

  /**
   * Execute auto-debit for contribution
   * This performs immediate wallet debit without agent acknowledgment.
   * Used when wallet.autoDebitEnabled is true.
   * 
   * Creates a WalletDebitRequest with status=Completed and isAutoDebit=true,
   * and performs the wallet debit + GL entry in one transaction.
   * 
   * Returns null if insufficient balance (member will need to pay via agent).
   * 
   * See docs/implementations/update-99-remove-wallet-debit-request.md
   */
  async executeAutoDebit(
    data: {
      memberId: string;
      amount: number;
      purpose: string;
      contributionCycleId: string;
      contributionId: string;
    },
    systemUserId: string,
    tx?: any
  ): Promise<{ debitRequest: WalletDebitRequest; journalEntryId: string } | null> {
    const execute = async (client: any) => {
      logger.info(`Executing auto-debit for member ${data.memberId}, amount ${data.amount}`);
      // Validate amount
      if (data.amount <= 0) {
        throw new AppError("Amount must be positive", 400);
      }

      // Get wallet
      const wallet = await this.walletRepo.findByMemberId(data.memberId, client);
      if (!wallet) {
        return null; // No wallet, agent will collect cash
      }
      logger.info(`Member wallet found with balance ${wallet.currentBalance}`);

      // Check if sufficient balance
      if (wallet.currentBalance < data.amount) {
        return null; // Insufficient balance, agent will collect cash
      }

      // Debit wallet immediately
      const updatedWallet = await this.walletRepo.decrementBalance(
        wallet.walletId,
        data.amount,
        client
      );

      // Create GL entry (Dr Member Wallet Liability, Cr Contribution Income)
      const debitRequestId = uuidv4();
      const journalEntry = await this.journalEntryService.createJournalEntry({
        entryDate: new Date(),
        description: data.purpose,
        reference: `AUTODEBIT-${debitRequestId.substring(0, 8)}`,
        sourceModule: TRANSACTION_SOURCE.CONTRIBUTION,
        sourceEntityId: data.contributionId,
        sourceTransactionType: TRANSACTION_TYPE.CONTRIBUTION_FROM_WALLET,
        lines: [
          {
            accountCode: ACCOUNT_CODES.MEMBER_WALLET_LIABILITY,
            debitAmount: data.amount,
            creditAmount: 0,
            description: "Auto-debit: Contribution deducted from wallet",
          },
          {
            accountCode: ACCOUNT_CODES.CONTRIBUTION_INCOME,
            debitAmount: 0,
            creditAmount: data.amount,
            description: data.purpose,
          },
        ],
        createdBy: systemUserId,
        autoPost: true,
      });

      logger.info(`Journal entry created with ID ${journalEntry.entry.entryId}`);
      // Create wallet transaction
      await this.walletTransactionRepo.create(
        {
          transactionId: uuidv4(),
          walletId: wallet.walletId,
          transactionType: WalletTransactionType.Debit,
          amount: data.amount,
          balanceAfter: updatedWallet.currentBalance,
          sourceModule: TRANSACTION_SOURCE.CONTRIBUTION,
          sourceEntityId: data.contributionId,
          description: data.purpose,
          journalEntryId: journalEntry.entry.entryId,
          status: WalletTransactionStatus.Completed,
          createdBy: systemUserId,
        },
        client
      );

      // Create debit request record with Completed status and isAutoDebit=true
      const now = new Date();
      const debitRequest = await this.debitRequestRepo.create(
        {
          debitRequestId,
          memberId: data.memberId,
          walletId: wallet.walletId,
          amount: data.amount,
          purpose: data.purpose,
          contributionCycleId: data.contributionCycleId,
          contributionId: data.contributionId,
          status: WalletDebitRequestStatus.Completed,
          isAutoDebit: true,
          acknowledgedAt: now,
          completedAt: now,
        },
        client
      );

      // Emit completion event
      eventBus.publish(
        new WalletDebitCompletedEvent(
          {
            debitRequestId,
            memberId: data.memberId,
            walletId: wallet.walletId,
            amount: data.amount,
            newBalance: updatedWallet.currentBalance,
            acknowledgedBy: systemUserId,
            isAutoDebit: true,
          },
          systemUserId
        )
      );

      return {
        debitRequest,
        journalEntryId: journalEntry.entry.entryId,
      };
    };

    // Use provided transaction or create new one
    if (tx) {
      return await execute(tx);
    }
    return await prisma.$transaction(execute);
  }
}
