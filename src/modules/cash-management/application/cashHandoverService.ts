// Application: Cash Handover Service
// Handles cash handover workflows between personnel

import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { CashCustodyRepository, CashHandoverRepository } from '../domain/repositories';
import {
  CashHandover,
  CashHandoverWithRelations,
  CashHandoverStatus,
  CashHandoverType,
  CashCustodyUserRole,
  CashCustodyStatus,
  isValidTransferPath,
  requiresApproval,
  getReceiverGlAccountCode,
  GL_ACCOUNT_BY_ROLE,
  BANK_ACCOUNT_CODE,
} from '../domain/entities';
import { CashCustodyService } from './cashCustodyService';
import { JournalEntryService } from '@/modules/gl/application/journalEntryService';
import { ApprovalRequestService } from '@/modules/approval-workflow/application/approvalRequestService';
import { AppError } from '@/shared/utils/error-handling/AppError';
import { eventBus } from '@/shared/domain/events/event-bus';
import {
  CashHandoverInitiatedEvent,
  CashHandoverAcknowledgedEvent,
  CashHandoverRejectedEvent,
  CashHandoverCancelledEvent,
  CashDepositedToBankEvent,
} from '../domain/events';
import {
  TRANSACTION_SOURCE,
  TRANSACTION_TYPE,
} from '@/modules/gl/constants/accountCodes';

export class CashHandoverService {
  constructor(
    private readonly cashCustodyRepo: CashCustodyRepository,
    private readonly cashHandoverRepo: CashHandoverRepository,
    private readonly cashCustodyService: CashCustodyService,
    private readonly journalEntryService: JournalEntryService,
    private readonly approvalRequestService: ApprovalRequestService
  ) {}

  /**
   * Initiate a cash handover from one user to another
   */
  async initiateHandover(data: {
    fromUserId: string;
    toUserId: string;
    toUserRole: string;
    amount: number;
    initiatorNotes?: string;
    handoverType?: CashHandoverType;
    sourceHandoverId?: string;
  }): Promise<CashHandover> {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Get from user's custody
      const fromCustody = await this.cashCustodyRepo.findActiveByUserId(data.fromUserId, tx);
      if (!fromCustody) {
        throw new AppError('No active cash custody record found for initiator', 404);
      }

      // 2. Validate amount
      if (data.amount <= 0) {
        throw new AppError('Amount must be positive', 400);
      }

      if (data.amount > fromCustody.currentBalance) {
        throw new AppError(
          `Insufficient cash custody balance. Available: ${fromCustody.currentBalance}, Requested: ${data.amount}`,
          400
        );
      }

      // 3. Validate transfer path
      if (!isValidTransferPath(fromCustody.userRole, data.toUserRole)) {
        throw new AppError(
          `Invalid transfer path: ${fromCustody.userRole} cannot transfer to ${data.toUserRole}`,
          400
        );
      }

      // 4. Determine if approval required (only for SuperAdmin)
      const needsApproval = requiresApproval(data.toUserRole);

      // 5. Get or create receiver's custody (if not SuperAdmin)
      let toCustody = null;
      let toGlAccountCode = BANK_ACCOUNT_CODE;

      if (data.toUserRole !== 'SuperAdmin') {
        toCustody = await this.cashCustodyService.getOrCreateCashCustody(
          {
            userId: data.toUserId,
            userRole: data.toUserRole as CashCustodyUserRole,
            unitId: fromCustody.unitId,
            areaId: fromCustody.areaId,
            forumId: fromCustody.forumId,
          },
          tx
        );
        toGlAccountCode = toCustody.glAccountCode;
      } else {
        toGlAccountCode = getReceiverGlAccountCode(data.toUserRole);
      }

      // 6. Generate handover number
      const handoverNumber = await this.cashHandoverRepo.getNextHandoverNumber(tx);

      // 7. Create handover record
      const handover = await this.cashHandoverRepo.create(
        {
          handoverNumber,
          fromUserId: data.fromUserId,
          fromUserRole: fromCustody.userRole,
          fromCustodyId: fromCustody.custodyId,
          fromGlAccountCode: fromCustody.glAccountCode,
          toUserId: data.toUserId,
          toUserRole: data.toUserRole,
          toCustodyId: toCustody?.custodyId || null,
          toGlAccountCode,
          amount: data.amount,
          unitId: fromCustody.unitId,
          areaId: fromCustody.areaId,
          forumId: fromCustody.forumId!,
          status: CashHandoverStatus.Initiated,
          handoverType: data.handoverType || CashHandoverType.Normal,
          sourceHandoverId: data.sourceHandoverId || null,
          requiresApproval: needsApproval,
          approvalRequestId: null,
          journalEntryId: null,
          initiatedAt: new Date(),
          acknowledgedAt: null,
          rejectedAt: null,
          cancelledAt: null,
          initiatorNotes: data.initiatorNotes || null,
          receiverNotes: null,
          rejectionReason: null,
          createdBy: data.fromUserId,
        },
        tx
      );

      // 8. If approval required (SuperAdmin only), create approval request
      if (needsApproval) {
        const { request: approvalRequest } = await this.approvalRequestService.submitRequest({
          workflowCode: 'cash_handover_to_bank',
          entityType: 'CashHandover',
          entityId: handover.handoverId,
          forumId: fromCustody.forumId,
          areaId: fromCustody.areaId,
          unitId: fromCustody.unitId,
          requestedBy: data.fromUserId,
        });

        await this.cashHandoverRepo.update(
          handover.handoverId,
          { approvalRequestId: approvalRequest.requestId },
          tx
        );
      }

      // 9. Emit event
      eventBus.publish(
        new CashHandoverInitiatedEvent(
          {
            handoverId: handover.handoverId,
            handoverNumber: handover.handoverNumber,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            amount: data.amount,
            requiresApproval: needsApproval,
          },
          data.fromUserId
        )
      );

      return handover;
    });
  }

  /**
   * Acknowledge cash handover (receiver confirms receipt)
   */
  async acknowledgeHandover(
    handoverId: string,
    acknowledgedBy: string,
    receiverNotes?: string
  ): Promise<CashHandover> {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Get handover with relations
      const handover = await this.cashHandoverRepo.findByIdWithRelations(handoverId, tx);
      if (!handover) {
        throw new AppError('Handover not found', 404);
      }

      if (handover.status !== CashHandoverStatus.Initiated) {
        throw new AppError('Handover is not in Initiated status', 400);
      }

      // 2. Verify acknowledger is the receiver (or any SuperAdmin for SuperAdmin transfers)
      if (handover.toUserRole === 'SuperAdmin') {
        // For SuperAdmin, verify role instead of specific user
        const isSuperAdmin = await this.checkUserHasRole(acknowledgedBy, 'super_admin', tx);
        if (!isSuperAdmin) {
          throw new AppError('Only Super Admin can acknowledge this handover', 403);
        }
      } else {
        if (handover.toUserId !== acknowledgedBy) {
          throw new AppError('Only the designated receiver can acknowledge', 403);
        }
      }

      // 3. If approval required, verify approval granted
      if (handover.requiresApproval && handover.approvalRequestId) {
        const approvalRequest = await prisma.approvalRequest.findUnique({
          where: { requestId: handover.approvalRequestId },
        });

        if (!approvalRequest || approvalRequest.status !== 'Approved') {
          throw new AppError('Approval required before acknowledgment', 400);
        }
      }

      // 4. Verify from custody still has sufficient balance
      const fromCustody = await this.cashCustodyRepo.findById(handover.fromCustodyId, tx);
      if (!fromCustody || fromCustody.currentBalance < handover.amount) {
        throw new AppError('Insufficient balance in source custody', 400);
      }

      // 5. Create GL entry
      const transactionType =
        handover.toUserRole === 'SuperAdmin'
          ? TRANSACTION_TYPE.CASH_HANDOVER_TO_BANK
          : TRANSACTION_TYPE.CASH_HANDOVER;

      const { entry: journalEntry } = await this.journalEntryService.createJournalEntry({
        entryDate: new Date(),
        description: `Cash handover from ${handover.fromUserRole} to ${handover.toUserRole} - ${handover.handoverNumber}`,
        reference: handover.handoverNumber,
        sourceModule: TRANSACTION_SOURCE.CASH_MANAGEMENT,
        sourceEntityId: handover.handoverId,
        sourceTransactionType: transactionType,
        lines: [
          {
            accountCode: handover.toGlAccountCode,
            debitAmount: handover.amount,
            creditAmount: 0,
            description: `Cash received from ${handover.fromUserRole} - ${handover.handoverNumber}`,
          },
          {
            accountCode: handover.fromGlAccountCode,
            debitAmount: 0,
            creditAmount: handover.amount,
            description: `Cash transferred to ${handover.toUserRole} - ${handover.handoverNumber}`,
          },
        ],
        createdBy: acknowledgedBy,
        autoPost: true,
      });

      // 6. Update from custody (decrease)
      await this.cashCustodyRepo.decrementBalance(handover.fromCustodyId, handover.amount, tx);

      // 7. Update to custody (increase) - if not SuperAdmin
      if (handover.toCustodyId) {
        await this.cashCustodyRepo.incrementBalance(handover.toCustodyId, handover.amount, tx);
      }

      // 8. Update handover status
      const updated = await this.cashHandoverRepo.update(
        handoverId,
        {
          status: CashHandoverStatus.Acknowledged,
          acknowledgedAt: new Date(),
          receiverNotes: receiverNotes || null,
          journalEntryId: journalEntry.entryId,
        },
        tx
      );

      // 9. Emit appropriate event
      if (handover.toUserRole === 'SuperAdmin') {
        eventBus.publish(
          new CashDepositedToBankEvent(
            {
              handoverId: handover.handoverId,
              handoverNumber: handover.handoverNumber,
              fromUserId: handover.fromUserId,
              amount: handover.amount,
              journalEntryId: journalEntry.entryId,
            },
            acknowledgedBy
          )
        );
      } else {
        eventBus.publish(
          new CashHandoverAcknowledgedEvent(
            {
              handoverId: handover.handoverId,
              handoverNumber: handover.handoverNumber,
              fromUserId: handover.fromUserId,
              toUserId: handover.toUserId,
              amount: handover.amount,
              journalEntryId: journalEntry.entryId,
            },
            acknowledgedBy
          )
        );
      }

      return updated;
    });
  }

  /**
   * Reject cash handover
   */
  async rejectHandover(
    handoverId: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<CashHandover> {
    return await prisma.$transaction(async (tx: any) => {
      const handover = await this.cashHandoverRepo.findById(handoverId, tx);
      if (!handover) {
        throw new AppError('Handover not found', 404);
      }

      if (handover.status !== CashHandoverStatus.Initiated) {
        throw new AppError('Can only reject handovers in Initiated status', 400);
      }

      // Verify rejecter is the receiver (or SuperAdmin for SuperAdmin transfers)
      if (handover.toUserRole === 'SuperAdmin') {
        const isSuperAdmin = await this.checkUserHasRole(rejectedBy, 'super_admin', tx);
        if (!isSuperAdmin) {
          throw new AppError('Only Super Admin can reject this handover', 403);
        }
      } else {
        if (handover.toUserId !== rejectedBy) {
          throw new AppError('Only the designated receiver can reject', 403);
        }
      }

      const updated = await this.cashHandoverRepo.update(
        handoverId,
        {
          status: CashHandoverStatus.Rejected,
          rejectedAt: new Date(),
          rejectionReason,
        },
        tx
      );

      eventBus.publish(
        new CashHandoverRejectedEvent(
          {
            handoverId: handover.handoverId,
            handoverNumber: handover.handoverNumber,
            rejectedBy,
            rejectionReason,
          },
          rejectedBy
        )
      );

      return updated;
    });
  }

  /**
   * Cancel cash handover (by initiator)
   */
  async cancelHandover(handoverId: string, cancelledBy: string): Promise<CashHandover> {
    return await prisma.$transaction(async (tx: any) => {
      const handover = await this.cashHandoverRepo.findById(handoverId, tx);
      if (!handover) {
        throw new AppError('Handover not found', 404);
      }

      if (handover.status !== CashHandoverStatus.Initiated) {
        throw new AppError('Can only cancel handovers in Initiated status', 400);
      }

      // Verify canceller is the initiator
      if (handover.fromUserId !== cancelledBy) {
        throw new AppError('Only the initiator can cancel', 403);
      }

      // Cancel approval request if exists
      if (handover.approvalRequestId) {
        await prisma.approvalRequest.update({
          where: { requestId: handover.approvalRequestId },
          data: { status: 'Cancelled' },
        });
      }

      const updated = await this.cashHandoverRepo.update(
        handoverId,
        {
          status: CashHandoverStatus.Cancelled,
          cancelledAt: new Date(),
        },
        tx
      );

      eventBus.publish(
        new CashHandoverCancelledEvent(
          {
            handoverId: handover.handoverId,
            handoverNumber: handover.handoverNumber,
          },
          cancelledBy
        )
      );

      return updated;
    });
  }

  /**
   * Get handover by ID
   */
  async getHandoverById(handoverId: string): Promise<CashHandoverWithRelations | null> {
    return this.cashHandoverRepo.findByIdWithRelations(handoverId);
  }

  /**
   * Get all handovers with filters
   */
  async getHandovers(filters: {
    fromUserId?: string;
    toUserId?: string;
    status?: CashHandoverStatus;
    forumId?: string;
    requiresApproval?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ handovers: CashHandoverWithRelations[]; total: number }> {
    return this.cashHandoverRepo.findAll({
      ...filters,
      page: filters.page || 1,
      limit: filters.limit || 20,
    });
  }

  /**
   * Get pending handovers for a user (both incoming and outgoing)
   */
  async getPendingHandoversForUser(userId: string): Promise<{
    incoming: CashHandoverWithRelations[];
    outgoing: CashHandoverWithRelations[];
    summary: {
      totalIncoming: number;
      totalIncomingAmount: number;
      totalOutgoing: number;
      totalOutgoingAmount: number;
    };
  }> {
    const [incoming, outgoing] = await Promise.all([
      this.cashHandoverRepo.findPendingIncomingForUser(userId),
      this.cashHandoverRepo.findPendingOutgoingForUser(userId),
    ]);

    const totalIncomingAmount = incoming.reduce((sum, h) => sum + h.amount, 0);
    const totalOutgoingAmount = outgoing.reduce((sum, h) => sum + h.amount, 0);

    return {
      incoming,
      outgoing,
      summary: {
        totalIncoming: incoming.length,
        totalIncomingAmount,
        totalOutgoing: outgoing.length,
        totalOutgoingAmount,
      },
    };
  }

  /**
   * Get pending handovers for SuperAdmin role
   */
  async getPendingHandoversForSuperAdmin(): Promise<CashHandoverWithRelations[]> {
    return this.cashHandoverRepo.findPendingForRole('SuperAdmin');
  }

  /**
   * Get valid receivers for a user based on their role
   */
  async getValidReceivers(userId: string): Promise<
    Array<{
      userId: string;
      userName: string;
      role: string;
      roleDisplayName: string;
    }>
  > {
    // Get user's custody to determine their role
    const custody = await this.cashCustodyRepo.findActiveByUserId(userId);
    if (!custody) {
      throw new AppError('No active cash custody found for user', 404);
    }

    const validTargetRoles: string[] = [];

    switch (custody.userRole) {
      case CashCustodyUserRole.Agent:
        validTargetRoles.push('unit_admin', 'area_admin', 'forum_admin', 'super_admin');
        break;
      case CashCustodyUserRole.UnitAdmin:
        validTargetRoles.push('area_admin', 'forum_admin', 'super_admin');
        break;
      case CashCustodyUserRole.AreaAdmin:
        validTargetRoles.push('forum_admin', 'super_admin');
        break;
      case CashCustodyUserRole.ForumAdmin:
        validTargetRoles.push('super_admin');
        break;
    }

    // Query users with valid roles
    const usersWithRoles = await prisma.userRole.findMany({
      where: {
        isActive: true,
        role: {
          roleCode: { in: validTargetRoles },
          isActive: true,
        },
      },
      include: {
        user: true,
        role: true,
      },
    });

    // Map to response format
    const roleDisplayNames: Record<string, string> = {
      unit_admin: 'UnitAdmin',
      area_admin: 'AreaAdmin',
      forum_admin: 'ForumAdmin',
      super_admin: 'SuperAdmin',
    };

    return usersWithRoles.map((ur) => ({
      userId: ur.user.userId,
      userName: `${ur.user.firstName || ''} ${ur.user.lastName || ''}`.trim() || ur.user.email,
      role: roleDisplayNames[ur.role.roleCode] || ur.role.roleCode,
      roleDisplayName: ur.role.roleName,
    }));
  }

  /**
   * Helper: Check if user has a specific role
   */
  private async checkUserHasRole(
    userId: string,
    roleCode: string,
    tx?: any
  ): Promise<boolean> {
    const db = tx || prisma;
    const userRole = await db.userRole.findFirst({
      where: {
        userId,
        isActive: true,
        role: {
          roleCode,
          isActive: true,
        },
      },
    });
    return !!userRole;
  }

  /**
   * Get handover history for a user
   */
  async getHandoverHistory(
    userId: string,
    filters: {
      direction?: 'sent' | 'received' | 'all';
      status?: CashHandoverStatus;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    handovers: Array<{
      handoverId: string;
      handoverNumber: string;
      direction: 'sent' | 'received';
      counterpartyName: string | null;
      counterpartyRole: string | null;
      amount: number;
      status: string;
      initiatedAt: Date;
      completedAt: Date | null;
    }>;
    summary: {
      totalSent: number;
      totalReceived: number;
      countSent: number;
      countReceived: number;
    };
    total: number;
  }> {
    const result = await this.cashHandoverRepo.findUserHistory(userId, {
      ...filters,
      page: filters.page || 1,
      limit: filters.limit || 20,
    });

    // Map handovers with direction
    const handovers = result.handovers.map((h) => {
      const isSent = h.fromUserId === userId;
      const counterparty = isSent ? h.toUser : h.fromUser;
      const completedAt = h.acknowledgedAt || h.rejectedAt || h.cancelledAt || null;

      return {
        handoverId: h.handoverId,
        handoverNumber: h.handoverNumber,
        direction: (isSent ? 'sent' : 'received') as 'sent' | 'received',
        counterpartyName: counterparty
          ? `${counterparty.firstName || ''} ${counterparty.lastName || ''}`.trim()
          : null,
        counterpartyRole: (isSent ? h.toUserRole : h.fromUserRole) as string | null,
        amount: h.amount,
        status: h.status as string,
        initiatedAt: h.initiatedAt,
        completedAt,
      };
    });

    // Calculate summary
    const sentHandovers = result.handovers.filter((h) => h.fromUserId === userId);
    const receivedHandovers = result.handovers.filter((h) => h.toUserId === userId);

    return {
      handovers,
      summary: {
        totalSent: sentHandovers.reduce((sum, h) => sum + h.amount, 0),
        totalReceived: receivedHandovers.reduce((sum, h) => sum + h.amount, 0),
        countSent: sentHandovers.length,
        countReceived: receivedHandovers.length,
      },
      total: result.total,
    };
  }

  /**
   * Get all pending transfers (admin view)
   */
  async getAllPendingTransfers(filters: {
    forumId?: string;
    areaId?: string;
    fromRole?: string;
    toRole?: string;
    minAgeHours?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    transfers: Array<{
      handoverId: string;
      handoverNumber: string;
      fromUserName: string | null;
      fromUserRole: string;
      fromUnit: string | null;
      toUserName: string | null;
      toUserRole: string;
      amount: number;
      status: string;
      requiresApproval: boolean;
      approvalStatus: string | null;
      initiatedAt: Date;
      ageHours: number;
    }>;
    summary: {
      total: number;
      totalAmount: number;
      requiresApproval: number;
      overdue: number;
    };
    total: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const result = await this.cashHandoverRepo.findAllPending({
      ...filters,
      page,
      limit,
    });

    const now = new Date();
    const overdueThresholdHours = 48;

    const transfers = result.handovers.map((h) => {
      const ageHours = Math.round(
        ((now.getTime() - h.initiatedAt.getTime()) / (1000 * 60 * 60)) * 10
      ) / 10;

      return {
        handoverId: h.handoverId,
        handoverNumber: h.handoverNumber,
        fromUserName: h.fromUser
          ? `${h.fromUser.firstName || ''} ${h.fromUser.lastName || ''}`.trim()
          : null,
        fromUserRole: h.fromUserRole,
        fromUnit: h.fromCustody?.unitId || null,
        toUserName: h.toUser
          ? `${h.toUser.firstName || ''} ${h.toUser.lastName || ''}`.trim()
          : null,
        toUserRole: h.toUserRole,
        amount: h.amount,
        status: h.status,
        requiresApproval: h.requiresApproval,
        approvalStatus: h.approvalRequest?.status || null,
        initiatedAt: h.initiatedAt,
        ageHours,
      };
    });

    const requiresApprovalCount = transfers.filter((t) => t.requiresApproval).length;
    const overdueCount = transfers.filter((t) => t.ageHours > overdueThresholdHours).length;
    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);

    return {
      transfers,
      summary: {
        total: result.total,
        totalAmount,
        requiresApproval: requiresApprovalCount,
        overdue: overdueCount,
      },
      total: result.total,
    };
  }

  /**
   * Approve bank deposit (SuperAdmin only)
   */
  async approveBankDeposit(
    handoverId: string,
    approvedBy: string,
    approverNotes?: string
  ): Promise<CashHandover> {
    return await prisma.$transaction(async (tx: any) => {
      const handover = await this.cashHandoverRepo.findById(handoverId, tx);
      if (!handover) {
        throw new AppError('Handover not found', 404);
      }

      if (handover.status !== CashHandoverStatus.Initiated) {
        throw new AppError('Handover is not in Initiated status', 400);
      }

      if (!handover.requiresApproval) {
        throw new AppError('This handover does not require approval', 400);
      }

      // Verify user is SuperAdmin
      const isSuperAdmin = await this.checkUserHasRole(approvedBy, 'super_admin', tx);
      if (!isSuperAdmin) {
        throw new AppError('Only Super Admin can approve bank deposits', 403);
      }

      // Update approval request if exists
      if (handover.approvalRequestId) {
        await tx.approvalRequest.update({
          where: { requestId: handover.approvalRequestId },
          data: {
            status: 'Approved',
            approvedBy,
            approvedAt: new Date(),
            approverNotes: approverNotes || null,
          },
        });
      }

      return handover;
    });
  }
}
