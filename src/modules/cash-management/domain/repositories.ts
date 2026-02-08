// Domain: Cash Management Repository Interfaces
// See docs/domain/90-domain-cash-management.md

import {
  CashCustody,
  CashCustodyWithRelations,
  CashCustodyUserRole,
  CashCustodyStatus,
  CashHandover,
  CashHandoverWithRelations,
  CashHandoverStatus,
} from './entities';

/**
 * Cash Custody Repository Interface
 */
export interface CashCustodyRepository {
  /**
   * Create a new cash custody record
   */
  create(
    data: Omit<CashCustody, 'custodyId' | 'createdAt' | 'updatedAt'>,
    tx?: unknown
  ): Promise<CashCustody>;

  /**
   * Find custody by ID
   */
  findById(custodyId: string, tx?: unknown): Promise<CashCustody | null>;

  /**
   * Find custody by ID with relations
   */
  findByIdWithRelations(custodyId: string, tx?: unknown): Promise<CashCustodyWithRelations | null>;

  /**
   * Find active custody by user ID
   */
  findActiveByUserId(userId: string, tx?: unknown): Promise<CashCustody | null>;

  /**
   * Find custody by user ID with relations
   */
  findByUserIdWithRelations(userId: string, tx?: unknown): Promise<CashCustodyWithRelations | null>;

  /**
   * Update custody record
   */
  update(
    custodyId: string,
    data: Partial<Omit<CashCustody, 'custodyId' | 'createdAt' | 'updatedAt'>>,
    tx?: unknown
  ): Promise<CashCustody>;

  /**
   * Increment custody balance (used when receiving cash)
   */
  incrementBalance(
    custodyId: string,
    amount: number,
    tx?: unknown
  ): Promise<CashCustody>;

  /**
   * Decrement custody balance (used when transferring cash)
   */
  decrementBalance(
    custodyId: string,
    amount: number,
    tx?: unknown
  ): Promise<CashCustody>;

  /**
   * Find all custodies with filters
   */
  findAll(filters: {
    userId?: string;
    userRole?: CashCustodyUserRole;
    status?: CashCustodyStatus;
    forumId?: string;
    areaId?: string;
    unitId?: string;
    page: number;
    limit: number;
  }): Promise<{ custodies: CashCustodyWithRelations[]; total: number }>;

  /**
   * Find custodies by GL account code
   */
  findByGlAccountCode(
    glAccountCode: string,
    filters: {
      status?: CashCustodyStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ custodies: CashCustodyWithRelations[]; total: number }>;

  /**
   * Get total balance by GL account code
   */
  getTotalBalanceByGlAccount(glAccountCode: string, tx?: unknown): Promise<number>;

  /**
   * Get count of active custodies by GL account code
   */
  countActiveByGlAccount(glAccountCode: string, tx?: unknown): Promise<number>;

  /**
   * Find overdue custodies (balance > 0, no transaction in threshold days)
   */
  findOverdue(filters: {
    thresholdDays: number;
    forumId?: string;
    areaId?: string;
    userRole?: CashCustodyUserRole;
  }): Promise<CashCustodyWithRelations[]>;

  /**
   * Get aggregated balances by user role
   */
  getBalancesByRole(forumId?: string, areaId?: string): Promise<
    Array<{
      userRole: CashCustodyUserRole;
      totalBalance: number;
      userCount: number;
    }>
  >;
}

/**
 * Cash Handover Repository Interface
 */
export interface CashHandoverRepository {
  /**
   * Create a new cash handover record
   */
  create(
    data: Omit<CashHandover, 'handoverId' | 'updatedAt'>,
    tx?: unknown
  ): Promise<CashHandover>;

  /**
   * Find handover by ID
   */
  findById(handoverId: string, tx?: unknown): Promise<CashHandover | null>;

  /**
   * Find handover by ID with relations
   */
  findByIdWithRelations(handoverId: string, tx?: unknown): Promise<CashHandoverWithRelations | null>;

  /**
   * Find handover by handover number
   */
  findByHandoverNumber(handoverNumber: string, tx?: unknown): Promise<CashHandover | null>;

  /**
   * Update handover record
   */
  update(
    handoverId: string,
    data: Partial<Omit<CashHandover, 'handoverId' | 'handoverNumber' | 'updatedAt'>>,
    tx?: unknown
  ): Promise<CashHandover>;

  /**
   * Find all handovers with filters
   */
  findAll(filters: {
    fromUserId?: string;
    toUserId?: string;
    status?: CashHandoverStatus;
    forumId?: string;
    requiresApproval?: boolean;
    page: number;
    limit: number;
  }): Promise<{ handovers: CashHandoverWithRelations[]; total: number }>;

  /**
   * Find pending handovers for a user (as receiver - incoming)
   */
  findPendingIncomingForUser(userId: string, tx?: unknown): Promise<CashHandoverWithRelations[]>;

  /**
   * Find pending handovers initiated by user (outgoing)
   */
  findPendingOutgoingForUser(userId: string, tx?: unknown): Promise<CashHandoverWithRelations[]>;

  /**
   * Find pending handovers for a role (for SuperAdmin)
   */
  findPendingForRole(role: string, tx?: unknown): Promise<CashHandoverWithRelations[]>;

  /**
   * Get the next handover number sequence
   */
  getNextHandoverNumber(tx?: unknown): Promise<string>;

  /**
   * Sum of pending outgoing handover amounts for a user
   * Used to calculate available balance at initiation time
   */
  sumPendingOutgoingAmount(userId: string, tx?: unknown): Promise<number>;

  /**
   * Count pending incoming handovers for user
   */
  countPendingIncoming(userId: string, tx?: unknown): Promise<number>;

  /**
   * Get user's handover history (sent and received)
   */
  findUserHistory(
    userId: string,
    filters: {
      direction?: 'sent' | 'received' | 'all';
      status?: CashHandoverStatus;
      fromDate?: Date;
      toDate?: Date;
      page: number;
      limit: number;
    }
  ): Promise<{ handovers: CashHandoverWithRelations[]; total: number }>;

  /**
   * Find all pending handovers (admin view)
   */
  findAllPending(filters: {
    forumId?: string;
    areaId?: string;
    fromRole?: string;
    toRole?: string;
    minAgeHours?: number;
    page: number;
    limit: number;
  }): Promise<{ handovers: CashHandoverWithRelations[]; total: number }>;

  /**
   * Count pending handovers requiring approval
   */
  countPendingRequiringApproval(forumId?: string, tx?: unknown): Promise<number>;
}
