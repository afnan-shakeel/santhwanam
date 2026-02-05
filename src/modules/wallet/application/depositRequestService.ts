// Application: Deposit Request Service
// Handles wallet deposit request workflows

import { v4 as uuidv4 } from "uuid";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import {
  WalletRepository,
  WalletDepositRequestRepository,
  WalletTransactionRepository,
} from "../domain/repositories";
import {
  WalletDepositRequest,
  WalletDepositRequestStatus,
  WalletTransactionType,
  WalletTransactionStatus,
} from "../domain/entities";
import { MemberRepository } from "@/modules/members/domain/repositories";
import { ApprovalRequestService } from "@/modules/approval-workflow/application/approvalRequestService";
import { JournalEntryService } from "@/modules/gl/application/journalEntryService";
import {
  ACCOUNT_CODES,
  TRANSACTION_SOURCE,
  TRANSACTION_TYPE,
} from "@/modules/gl/constants/accountCodes";
import { AppError } from "@/shared/utils/error-handling/AppError";
import { eventBus } from "@/shared/domain/events/event-bus";
import {
  WalletDepositRequestedEvent,
  WalletDepositSubmittedEvent,
  WalletDepositApprovedEvent,
  WalletDepositRejectedEvent,
} from "../domain/events";
import { MemberStatus } from "@/modules/members/domain/entities";
import { AgentRepository } from "@/modules/agents/domain/repositories";
import { logger } from "@/shared/utils/logger";

export class DepositRequestService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly depositRequestRepo: WalletDepositRequestRepository,
    private readonly walletTransactionRepo: WalletTransactionRepository,
    private readonly memberRepo: MemberRepository,
    private readonly agentRepo: AgentRepository,
    private readonly approvalRequestService: ApprovalRequestService,
    private readonly journalEntryService: JournalEntryService,
  ) {}

  /**
   * Request and process a wallet deposit (by agent)
   * This is the main entry point for wallet deposits.
   * GL entry is created at collection time, wallet is credited immediately.
   * No approval workflow required.
   */
  async requestDeposit(data: {
    memberId: string;
    amount: number;
    collectionDate: Date;
    collectedBy: string;
    notes?: string;
  }): Promise<WalletDepositRequest> {
    // Validate amount
    if (data.amount <= 0) {
      throw new AppError("Amount must be positive", 400);
    }

    return await prisma.$transaction(async (tx: any) => {
      // Get member and validate
      const member = await this.memberRepo.findById(data.memberId, tx);
      if (!member) {
        throw new AppError("Member not found", 404);
      }
      if (member.memberStatus !== MemberStatus.Active) {
        throw new AppError("Member is not active", 400);
      }

      // Verify agent is the member's agent
      const agent = await this.agentRepo.findById(member.agentId);
      if (!agent) {
        throw new AppError("Agent not found", 404);
      }
      if (agent.userId !== data.collectedBy) {
        throw new AppError("Only assigned agent can request deposit", 403);
      }

      // Get wallet
      const wallet = await this.walletRepo.findByMemberId(data.memberId, tx);
      if (!wallet) {
        throw new AppError("Wallet not found for member", 404);
      }

      // Create deposit request
      const depositRequestId = uuidv4();

      // Create GL entry at collection time (Dr Cash Agent Custody, Cr Member Wallet Liability)
      const journalEntry = await this.journalEntryService.createJournalEntry({
        entryDate: data.collectionDate,
        description: `Wallet Deposit - ${member.memberCode}`,
        reference: `DEP-${depositRequestId.substring(0, 8)}`,
        sourceModule: TRANSACTION_SOURCE.WALLET,
        sourceEntityId: depositRequestId,
        sourceTransactionType: TRANSACTION_TYPE.WALLET_DEPOSIT_COLLECTION,
        lines: [
          {
            accountCode: ACCOUNT_CODES.CASH_AGENT_CUSTODY,
            debitAmount: data.amount,
            creditAmount: 0,
            description: "Cash collected for wallet deposit",
          },
          {
            accountCode: ACCOUNT_CODES.MEMBER_WALLET_LIABILITY,
            debitAmount: 0,
            creditAmount: data.amount,
            description: "Member wallet balance increase",
          },
        ],
        createdBy: data.collectedBy,
        autoPost: true,
      });

      // Credit wallet immediately
      const updatedWallet = await this.walletRepo.incrementBalance(
        wallet.walletId,
        data.amount,
        tx
      );

      // Create deposit request record (already approved)
      let depositRequest = await this.depositRequestRepo.create(
        {
          depositRequestId,
          memberId: data.memberId,
          walletId: wallet.walletId,
          amount: data.amount,
          collectionDate: data.collectionDate,
          collectedBy: data.collectedBy,
          notes: data.notes || null,
          requestStatus: WalletDepositRequestStatus.Approved, // Direct approval
          approvalRequestId: null,
          journalEntryId: journalEntry.entry.entryId,
        },
        tx
      );

      // Update approved timestamp
      depositRequest = await this.depositRequestRepo.update(
        depositRequestId,
        { approvedAt: new Date() },
        tx
      );

      // Create wallet transaction record
      await this.walletTransactionRepo.create(
        {
          transactionId: uuidv4(),
          walletId: wallet.walletId,
          transactionType: WalletTransactionType.Deposit,
          amount: data.amount,
          balanceAfter: updatedWallet.currentBalance,
          sourceModule: TRANSACTION_SOURCE.WALLET,
          sourceEntityId: depositRequestId,
          description: `Deposit by agent`,
          journalEntryId: journalEntry.entry.entryId,
          status: WalletTransactionStatus.Completed,
          createdBy: data.collectedBy,
        },
        tx
      );

      // Emit event (cash custody update is handled by event handler)
      eventBus.publish(
        new WalletDepositRequestedEvent(
          {
            depositRequestId,
            memberId: data.memberId,
            walletId: wallet.walletId,
            amount: data.amount,
            collectedBy: data.collectedBy,
          },
          data.collectedBy
        )
      );

      // Also emit approved event for any listeners
      logger.info("Emitting WalletDepositApprovedEvent for depositRequestId:", { depositRequestId });
      eventBus.publish(
        new WalletDepositApprovedEvent(
          {
            depositRequestId,
            memberId: data.memberId,
            walletId: wallet.walletId,
            amount: data.amount,
            newBalance: updatedWallet.currentBalance,
            approvedBy: data.collectedBy,
          },
          data.collectedBy
        )
      );

      return depositRequest;
    });
  }

  /**
   * Submit deposit request for approval
   * @deprecated This method is kept for backward compatibility but is no longer needed.
   * Deposits are now processed immediately in requestDeposit().
   * If called on an already-approved deposit, it returns the deposit as-is.
   */
  async submitForApproval(
    depositRequestId: string,
    submittedBy: string
  ): Promise<WalletDepositRequest> {
    // First validate the deposit request
    const depositRequest = await this.depositRequestRepo.findByIdWithRelations(
      depositRequestId
    );

    if (!depositRequest) {
      throw new AppError("Deposit request not found", 404);
    }

    // If already approved (new flow), just return it
    if (depositRequest.requestStatus === WalletDepositRequestStatus.Approved) {
      return depositRequest;
    }

    // Legacy: Only process if still in Draft status
    if (depositRequest.requestStatus !== WalletDepositRequestStatus.Draft) {
      throw new AppError("Deposit request is not in Draft status", 400);
    }

    // Create approval request (handles its own transaction)
    const { request: approvalRequest } = await this.approvalRequestService.submitRequest({
      workflowCode: "wallet_deposit",
      entityType: "WalletDepositRequest",
      entityId: depositRequestId,
      forumId: depositRequest.member?.forumId,
      areaId: depositRequest.member?.areaId,
      unitId: depositRequest.member?.unitId,
      requestedBy: submittedBy,
    });

    // Update deposit request status
    const updated = await this.depositRequestRepo.update(
      depositRequestId,
      {
        requestStatus: WalletDepositRequestStatus.PendingApproval,
        approvalRequestId: approvalRequest.requestId,
      }
    );

    // Emit event
    eventBus.publish(
      new WalletDepositSubmittedEvent(
        {
          depositRequestId,
          approvalRequestId: approvalRequest.requestId,
        },
        submittedBy
      )
    );

    return updated;
  }

  /**
  /**
   * Process deposit approval (called by event handler)
   * @deprecated This method is kept for backward compatibility with legacy approval workflows.
   * New deposits are processed immediately in requestDeposit().
   */
  async processApproval(
    depositRequestId: string,
    approvedBy: string
  ): Promise<void> {
    await prisma.$transaction(async (tx: any) => {
      // Get deposit request with relations
      const depositRequest = await this.depositRequestRepo.findByIdWithRelations(
        depositRequestId,
        tx
      );

      if (!depositRequest) {
        throw new AppError("Deposit request not found", 404);
      }

      // If already approved (new flow processed it), skip
      if (depositRequest.requestStatus === WalletDepositRequestStatus.Approved) {
        return;
      }

      // Only process pending approval status (legacy flow)
      if (depositRequest.requestStatus !== WalletDepositRequestStatus.PendingApproval) {
        throw new AppError("Deposit request is not pending approval", 400);
      }

      // Credit wallet
      const updatedWallet = await this.walletRepo.incrementBalance(
        depositRequest.walletId,
        depositRequest.amount,
        tx
      );

      // For legacy deposits that didn't have GL at collection, create it now
      // Note: This uses WALLET_DEPOSIT type for legacy compatibility
      const journalEntry = await this.journalEntryService.createJournalEntry({
        entryDate: depositRequest.collectionDate,
        description: `Wallet Deposit - ${depositRequest.member?.memberCode}`,
        reference: `DEP-${depositRequestId.substring(0, 8)}`,
        sourceModule: TRANSACTION_SOURCE.WALLET,
        sourceEntityId: depositRequestId,
        sourceTransactionType: TRANSACTION_TYPE.WALLET_DEPOSIT,
        lines: [
          {
            accountCode: ACCOUNT_CODES.CASH_AGENT_CUSTODY,
            debitAmount: depositRequest.amount,
            creditAmount: 0,
            description: "Cash collected for wallet deposit",
          },
          {
            accountCode: ACCOUNT_CODES.MEMBER_WALLET_LIABILITY,
            debitAmount: 0,
            creditAmount: depositRequest.amount,
            description: "Member wallet balance increase",
          },
        ],
        createdBy: approvedBy,
        autoPost: true,
      });

      // Create wallet transaction
      await this.walletTransactionRepo.create(
        {
          transactionId: uuidv4(),
          walletId: depositRequest.walletId,
          transactionType: WalletTransactionType.Deposit,
          amount: depositRequest.amount,
          balanceAfter: updatedWallet.currentBalance,
          sourceModule: TRANSACTION_SOURCE.WALLET,
          sourceEntityId: depositRequestId,
          description: "Deposit approved by admin",
          journalEntryId: journalEntry.entry.entryId,
          status: WalletTransactionStatus.Completed,
          createdBy: approvedBy,
        },
        tx
      );

      // Update deposit request
      await this.depositRequestRepo.update(
        depositRequestId,
        {
          requestStatus: WalletDepositRequestStatus.Approved,
          approvedAt: new Date(),
          journalEntryId: journalEntry.entry.entryId,
        },
        tx
      );

      // Emit event
      eventBus.publish(
        new WalletDepositApprovedEvent(
          {
            depositRequestId,
            memberId: depositRequest.memberId,
            walletId: depositRequest.walletId,
            amount: depositRequest.amount,
            newBalance: updatedWallet.currentBalance,
            approvedBy,
          },
          approvedBy
        )
      );
    });
  }

  /**
   * Process deposit rejection (called by event handler)
   * @deprecated This method is kept for backward compatibility with legacy approval workflows.
   * New deposits are processed immediately and cannot be rejected.
   */
  async processRejection(
    depositRequestId: string,
    rejectionReason: string | null
  ): Promise<void> {
    const depositRequest = await this.depositRequestRepo.findById(depositRequestId);

    if (!depositRequest) {
      throw new AppError("Deposit request not found", 404);
    }

    await this.depositRequestRepo.update(depositRequestId, {
      requestStatus: WalletDepositRequestStatus.Rejected,
      rejectedAt: new Date(),
    });

    // Emit event
    eventBus.publish(
      new WalletDepositRejectedEvent({
        depositRequestId,
        memberId: depositRequest.memberId,
        rejectionReason,
      })
    );
  }

  /**
   * Get deposit requests by member
   */
  async getDepositRequestsByMember(
    memberId: string,
    filters: {
      status?: WalletDepositRequestStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ requests: WalletDepositRequest[]; total: number }> {
    return await this.depositRequestRepo.findByMemberId(memberId, filters);
  }

  /**
   * Get pending deposit requests (for admin/agent)
   */
  async getPendingDepositRequests(filters: {
    collectedBy?: string;
    page: number;
    limit: number;
  }): Promise<{ requests: WalletDepositRequest[]; total: number }> {
    return await this.depositRequestRepo.findPending(filters);
  }

  /**
   * Get deposit request by ID
   */
  async getDepositRequestById(
    depositRequestId: string
  ): Promise<WalletDepositRequest | null> {
    return await this.depositRequestRepo.findById(depositRequestId);
  }
}
