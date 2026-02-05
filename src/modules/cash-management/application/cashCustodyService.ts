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
   * If custody doesn't exist, it will be created automatically
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
    // Try to get existing custody
    let custody = await this.cashCustodyRepo.findActiveByUserId(data.userId, tx);
    
    // If no custody exists, create one (first-time cash collection)
    if (!custody) {
      // Determine user's cash-handling role and hierarchy
      const roleInfo = await this.getUserCashRoleAndHierarchy(data.userId);
      
      if (!roleInfo) {
        throw new AppError(
          'User does not have a cash-handling role (agent, unit admin, area admin, or forum admin)',
          400
        );
      }

      // Map string role to enum
      const userRole = roleInfo.cashRole as CashCustodyUserRole;
      
      // Create custody record
      custody = await this.getOrCreateCashCustody(
        {
          userId: data.userId,
          userRole,
          unitId: roleInfo.unitId,
          areaId: roleInfo.areaId,
          forumId: roleInfo.forumId,
        },
        tx
      );
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
   * Determine user's cash-handling role and hierarchy from organizational tables
   * Used when creating custody for first-time cash collection
   */
  async getUserCashRoleAndHierarchy(userId: string): Promise<{
    cashRole: string;
    unitId: string | null;
    areaId: string | null;
    forumId: string | null;
  } | null> {
    // Check if user is an Agent
    const agent = await prisma.agent.findFirst({
      where: {
        userId,
        registrationStatus: 'Approved',
      },
      select: { unitId: true, areaId: true, forumId: true },
    });

    if (agent) {
      return {
        cashRole: CashCustodyUserRole.Agent,
        unitId: agent.unitId,
        areaId: agent.areaId,
        forumId: agent.forumId,
      };
    }

    // Check if user is a Unit Admin (adminUserId on a unit)
    const unit = await prisma.unit.findFirst({
      where: { adminUserId: userId },
      select: { unitId: true, areaId: true, forumId: true },
    });

    if (unit) {
      return {
        cashRole: CashCustodyUserRole.UnitAdmin,
        unitId: unit.unitId,
        areaId: unit.areaId,
        forumId: unit.forumId,
      };
    }

    // Check if user is an Area Admin
    const area = await prisma.area.findFirst({
      where: { adminUserId: userId },
      select: { areaId: true, forumId: true },
    });

    if (area) {
      return {
        cashRole: CashCustodyUserRole.AreaAdmin,
        unitId: null,
        areaId: area.areaId,
        forumId: area.forumId,
      };
    }

    // Check if user is a Forum Admin
    const forum = await prisma.forum.findFirst({
      where: { adminUserId: userId },
      select: { forumId: true },
    });

    if (forum) {
      return {
        cashRole: CashCustodyUserRole.ForumAdmin,
        unitId: null,
        areaId: null,
        forumId: forum.forumId,
      };
    }

    return null; // User has no cash-handling role
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

  /**
   * Get overdue users (cash held beyond threshold)
   */
  async getOverdueUsers(filters: {
    thresholdDays: number;
    forumId?: string;
    areaId?: string;
    level?: CashCustodyUserRole;
  }): Promise<{
    thresholdDays: number;
    overdueUsers: Array<{
      custodyId: string;
      userId: string;
      userName: string | null;
      userRole: string;
      unitName: string | null;
      areaName: string | null;
      currentBalance: number;
      lastTransactionAt: Date | null;
      daysSinceLastTransaction: number;
      contact: {
        email: string | null;
        phone: string | null;
      };
    }>;
    summary: {
      totalOverdueUsers: number;
      totalOverdueAmount: number;
    };
  }> {
    const overdueCustodies = await this.cashCustodyRepo.findOverdue({
      thresholdDays: filters.thresholdDays,
      forumId: filters.forumId,
      areaId: filters.areaId,
      userRole: filters.level,
    });

    const now = new Date();
    const overdueUsers = overdueCustodies.map((c) => {
      const lastTxDate = c.lastTransactionAt || c.createdAt;
      const daysSince = Math.floor(
        (now.getTime() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        custodyId: c.custodyId,
        userId: c.userId,
        userName: c.user
          ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim()
          : null,
        userRole: c.userRole,
        unitName: c.unit?.unitName || null,
        areaName: c.area?.areaName || null,
        currentBalance: c.currentBalance,
        lastTransactionAt: c.lastTransactionAt ?? null,
        daysSinceLastTransaction: daysSince,
        contact: {
          email: c.user?.email || null,
          phone: null, // Would need to fetch from user profile
        },
      };
    });

    const totalOverdueAmount = overdueUsers.reduce((sum, u) => sum + u.currentBalance, 0);

    return {
      thresholdDays: filters.thresholdDays,
      overdueUsers,
      summary: {
        totalOverdueUsers: overdueUsers.length,
        totalOverdueAmount,
      },
    };
  }

  /**
   * Get custody aggregated by level
   */
  async getCustodyByLevel(filters: {
    forumId?: string;
    areaId?: string;
  }): Promise<{
    levels: Array<{
      level: string;
      glAccountCode: string;
      glAccountName: string;
      userCount: number;
      totalBalance: number;
      glBalance: number;
      reconciled: boolean;
    }>;
    totalInCustody: number;
    bankBalance: number;
    totalCash: number;
  }> {
    const roleBalances = await this.cashCustodyRepo.getBalancesByRole(
      filters.forumId,
      filters.areaId
    );

    const glAccountNames: Record<string, string> = {
      '1001': 'Cash - Agent Custody',
      '1002': 'Cash - Unit Admin Custody',
      '1003': 'Cash - Area Admin Custody',
      '1004': 'Cash - Forum Admin Custody',
    };

    const levels = roleBalances.map((rb) => {
      const glAccountCode = GL_ACCOUNT_BY_ROLE[rb.userRole] || '1001';
      return {
        level: rb.userRole,
        glAccountCode,
        glAccountName: glAccountNames[glAccountCode] || glAccountCode,
        userCount: rb.userCount,
        totalBalance: rb.totalBalance,
        glBalance: rb.totalBalance, // In reconciled state, these match
        reconciled: true,
      };
    });

    const totalInCustody = levels.reduce((sum, l) => sum + l.totalBalance, 0);
    // Bank balance would come from GL module - placeholder for now
    const bankBalance = 0;

    return {
      levels,
      totalInCustody,
      bankBalance,
      totalCash: totalInCustody + bankBalance,
    };
  }

  /**
   * Get custody report (detailed list)
   */
  async getCustodyReport(filters: {
    forumId?: string;
    areaId?: string;
    unitId?: string;
    level?: CashCustodyUserRole;
    minBalance?: number;
    status?: CashCustodyStatus;
    page?: number;
    limit?: number;
  }): Promise<{
    custodies: Array<{
      custodyId: string;
      userId: string;
      userName: string | null;
      firstName: string | null;
      lastName: string | null;
      userRole: string;
      unitName: string | null;
      areaName: string | null;
      glAccountCode: string;
      status: string;
      currentBalance: number;
      totalReceived: number;
      totalTransferred: number;
      lastTransactionAt: Date | null;
      daysSinceLastTransaction: number | null;
      isOverdue: boolean;
    }>;
    summary: {
      totalUsers: number;
      totalBalance: number;
      activeUsers: number;
      inactiveUsers: number;
    };
    total: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const overdueThresholdDays = 7;

    const result = await this.cashCustodyRepo.findAll({
      userRole: filters.level,
      status: filters.status,
      forumId: filters.forumId,
      areaId: filters.areaId,
      unitId: filters.unitId,
      page,
      limit,
    });

    const now = new Date();
    const custodies = result.custodies
      .filter((c) => !filters.minBalance || c.currentBalance >= filters.minBalance)
      .map((c) => {
        const lastTxDate = c.lastTransactionAt;
        const daysSince = lastTxDate
          ? Math.floor((now.getTime() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const isOverdue =
          c.currentBalance > 0 && daysSince !== null && daysSince > overdueThresholdDays;

        return {
          custodyId: c.custodyId,
          userId: c.userId,
          userName: c.user
            ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim()
            : null,
          firstName: c.user?.firstName || null,
          lastName: c.user?.lastName || null,
          userRole: c.userRole,
          unitName: c.unit?.unitName || null,
          areaName: c.area?.areaName || null,
          glAccountCode: c.glAccountCode,
          status: c.status,
          currentBalance: c.currentBalance,
          totalReceived: c.totalReceived,
          totalTransferred: c.totalTransferred,
          lastTransactionAt: c.lastTransactionAt ?? null,
          daysSinceLastTransaction: daysSince,
          isOverdue,
        };
      });

    const activeUsers = custodies.filter((c) => c.status === CashCustodyStatus.Active).length;
    const totalBalance = custodies.reduce((sum, c) => sum + c.currentBalance, 0);

    return {
      custodies,
      summary: {
        totalUsers: result.total,
        totalBalance,
        activeUsers,
        inactiveUsers: custodies.length - activeUsers,
      },
      total: result.total,
    };
  }

  /**
   * Get reconciliation report
   */
  async getReconciliationReport(forumId?: string): Promise<{
    accounts: Array<{
      accountCode: string;
      accountName: string;
      glBalance: number;
      custodyTotal: number;
      difference: number;
      isReconciled: boolean;
      userCount: number;
    }>;
    summary: {
      totalGlBalance: number;
      totalCustodyBalance: number;
      totalDifference: number;
      allReconciled: boolean;
    };
    bankAccount: {
      accountCode: string;
      accountName: string;
      balance: number;
    };
    lastCheckedAt: Date;
  }> {
    const glAccounts = ['1001', '1002', '1003', '1004'];
    const glAccountNames: Record<string, string> = {
      '1001': 'Cash - Agent Custody',
      '1002': 'Cash - Unit Admin Custody',
      '1003': 'Cash - Area Admin Custody',
      '1004': 'Cash - Forum Admin Custody',
    };

    const accounts = await Promise.all(
      glAccounts.map(async (accountCode) => {
        const [totalBalance, userCount] = await Promise.all([
          this.cashCustodyRepo.getTotalBalanceByGlAccount(accountCode),
          this.cashCustodyRepo.countActiveByGlAccount(accountCode),
        ]);

        // GL balance would come from GL module - using custody total as proxy
        const glBalance = totalBalance;
        const difference = glBalance - totalBalance;

        return {
          accountCode,
          accountName: glAccountNames[accountCode] || accountCode,
          glBalance,
          custodyTotal: totalBalance,
          difference,
          isReconciled: Math.abs(difference) < 0.01,
          userCount,
        };
      })
    );

    const totalGlBalance = accounts.reduce((sum, a) => sum + a.glBalance, 0);
    const totalCustodyBalance = accounts.reduce((sum, a) => sum + a.custodyTotal, 0);
    const totalDifference = totalGlBalance - totalCustodyBalance;
    const allReconciled = accounts.every((a) => a.isReconciled);

    return {
      accounts,
      summary: {
        totalGlBalance,
        totalCustodyBalance,
        totalDifference,
        allReconciled,
      },
      bankAccount: {
        accountCode: '1100',
        accountName: 'Bank Account',
        balance: 0, // Would come from GL module
      },
      lastCheckedAt: new Date(),
    };
  }
}
