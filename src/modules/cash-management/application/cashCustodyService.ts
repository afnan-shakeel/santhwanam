// Application: Cash Custody Service
// Handles cash custody lifecycle and balance management

import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { CashCustodyRepository } from '../domain/repositories';
import {
  CashCustody,
  CashCustodyWithRelations,
  CashCustodyUserRole,
  CashCustodyStatus,
  GL_ACCOUNT_BY_ROLE,
  ROLE_CODE_TO_CUSTODY_ROLE,
} from '../domain/entities';
import { AppError } from '@/shared/utils/error-handling/AppError';
import { eventBus } from '@/shared/domain/events/event-bus';
import {
  CashCustodyCreatedEvent,
  CashCustodyIncreasedEvent,
  CashCustodyDeactivatedEvent,
} from '../domain/events';

export class CashCustodyService {
  constructor(private readonly cashCustodyRepo: CashCustodyRepository) {}

  /**
   * Get or create cash custody record for a user
   * Called when user first handles cash
   */
  async getOrCreateCashCustody(
    data: {
      userId: string;
      userRole: CashCustodyUserRole;
      unitId?: string | null;
      areaId?: string | null;
      forumId?: string | null;
    },
    tx?: unknown
  ): Promise<CashCustody> {
    // Check if active custody exists
    let custody = await this.cashCustodyRepo.findActiveByUserId(data.userId, tx);
    if (custody) {
      return custody;
    }

    // Determine GL account code
    const glAccountCode = GL_ACCOUNT_BY_ROLE[data.userRole];
    if (!glAccountCode) {
      throw new AppError(`Invalid user role for cash custody: ${data.userRole}`, 400);
    }

    // Create new custody record
    custody = await this.cashCustodyRepo.create(
      {
        userId: data.userId,
        userRole: data.userRole,
        glAccountCode,
        unitId: data.unitId,
        areaId: data.areaId,
        forumId: data.forumId,
        status: CashCustodyStatus.Active,
        currentBalance: 0,
        totalReceived: 0,
        totalTransferred: 0,
        lastTransactionAt: null,
        deactivatedAt: null,
        deactivatedBy: null,
        deactivatedReason: null,
      },
      tx
    );

    eventBus.publish(
      new CashCustodyCreatedEvent({
        custodyId: custody.custodyId,
        userId: data.userId,
        userRole: data.userRole,
        glAccountCode,
      })
    );

    return custody;
  }

  /**
   * Increase cash custody balance when cash is collected
   */
  async increaseCashCustody(
    data: {
      userId: string;
      amount: number;
      sourceModule: string;
      sourceEntityId: string;
      sourceTransactionType: string;
    },
    tx?: unknown
  ): Promise<CashCustody> {
    // Get existing custody
    const custody = await this.cashCustodyRepo.findActiveByUserId(data.userId, tx);
    if (!custody) {
      throw new AppError('No active cash custody found for user', 404);
    }

    if (custody.status !== CashCustodyStatus.Active) {
      throw new AppError('Cash custody is not active', 400);
    }

    // Increment balance
    const updated = await this.cashCustodyRepo.incrementBalance(
      custody.custodyId,
      data.amount,
      tx
    );

    eventBus.publish(
      new CashCustodyIncreasedEvent(
        {
          custodyId: custody.custodyId,
          userId: data.userId,
          amount: data.amount,
          sourceModule: data.sourceModule,
          sourceEntityId: data.sourceEntityId,
          sourceTransactionType: data.sourceTransactionType,
        },
        data.userId
      )
    );

    return updated;
  }

  /**
   * Get custody by user ID
   */
  async getCustodyByUserId(userId: string): Promise<CashCustodyWithRelations | null> {
    return this.cashCustodyRepo.findByUserIdWithRelations(userId);
  }

  /**
   * Get custody by ID
   */
  async getCustodyById(custodyId: string): Promise<CashCustodyWithRelations | null> {
    return this.cashCustodyRepo.findByIdWithRelations(custodyId);
  }

  /**
   * Get all custodies with filters
   */
  async getCustodies(filters: {
    userId?: string;
    userRole?: CashCustodyUserRole;
    status?: CashCustodyStatus;
    forumId?: string;
    areaId?: string;
    unitId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ custodies: CashCustodyWithRelations[]; total: number }> {
    return this.cashCustodyRepo.findAll({
      ...filters,
      page: filters.page || 1,
      limit: filters.limit || 20,
    });
  }

  /**
   * Get custody summary by GL account
   */
  async getCustodySummaryByGlAccount(glAccountCode: string): Promise<{
    glAccountCode: string;
    totalBalance: number;
    activeCustodies: number;
  }> {
    const totalBalance = await this.cashCustodyRepo.getTotalBalanceByGlAccount(glAccountCode);
    const { total: activeCustodies } = await this.cashCustodyRepo.findByGlAccountCode(
      glAccountCode,
      { status: CashCustodyStatus.Active, page: 1, limit: 1 }
    );

    return {
      glAccountCode,
      totalBalance,
      activeCustodies,
    };
  }

  /**
   * Deactivate custody (for admin reassignment)
   * Cannot deactivate if balance > 0
   */
  async deactivateCashCustody(
    userId: string,
    reason: string,
    deactivatedBy: string
  ): Promise<CashCustody> {
    return await prisma.$transaction(async (tx: any) => {
      const custody = await this.cashCustodyRepo.findActiveByUserId(userId, tx);
      if (!custody) {
        throw new AppError('No active custody record found', 404);
      }

      // Check balance
      if (custody.currentBalance > 0) {
        throw new AppError(
          `Cannot deactivate custody. User has ${custody.currentBalance} in custody. Cash must be transferred upward before reassignment.`,
          400
        );
      }

      // Check pending incoming handovers
      // Note: This check should be done via CashHandoverRepository, but for simplicity we skip here
      // Will be implemented when integrating with handover service

      const updated = await this.cashCustodyRepo.update(
        custody.custodyId,
        {
          status: CashCustodyStatus.Inactive,
          deactivatedAt: new Date(),
          deactivatedBy,
          deactivatedReason: reason,
        },
        tx
      );

      eventBus.publish(
        new CashCustodyDeactivatedEvent(
          {
            custodyId: custody.custodyId,
            userId,
            reason,
          },
          deactivatedBy
        )
      );

      return updated;
    });
  }

  /**
   * Determine custody role from user's role codes
   */
  determineCustodyRole(roleCodes: string[]): CashCustodyUserRole | null {
    // Priority: agent > unit_admin > area_admin > forum_admin
    // (lowest level first as they handle cash first)
    const priorityOrder: string[] = ['agent', 'unit_admin', 'area_admin', 'forum_admin'];
    
    for (const roleCode of priorityOrder) {
      if (roleCodes.includes(roleCode)) {
        return ROLE_CODE_TO_CUSTODY_ROLE[roleCode] || null;
      }
    }
    
    return null;
  }
}
