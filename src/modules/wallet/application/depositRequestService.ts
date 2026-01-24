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
   * Request a wallet deposit (by agent)
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
      const depositRequest = await this.depositRequestRepo.create(
        {
          depositRequestId,
          memberId: data.memberId,
          walletId: wallet.walletId,
          amount: data.amount,
          collectionDate: data.collectionDate,
          collectedBy: data.collectedBy,
          notes: data.notes || null,
          requestStatus: WalletDepositRequestStatus.Draft,
          approvalRequestId: null,
          journalEntryId: null,
        },
        tx
      );

      // Emit event
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

      return depositRequest;
    });
  }

  /**
   * Submit deposit request for approval
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
   * Process deposit approval (called by event handler)
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

      // Credit wallet
      const updatedWallet = await this.walletRepo.incrementBalance(
        depositRequest.walletId,
        depositRequest.amount,
        tx
      );

      // Create GL entry (Dr Cash, Cr Member Wallet Liability)
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
