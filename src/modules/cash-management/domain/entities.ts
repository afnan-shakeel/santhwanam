// Domain: Cash Management Entities
// See docs/domain/90-domain-cash-management.md

export enum CashCustodyUserRole {
  Agent = 'Agent',
  UnitAdmin = 'UnitAdmin',
  AreaAdmin = 'AreaAdmin',
  ForumAdmin = 'ForumAdmin',
}

export enum CashCustodyStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Suspended = 'Suspended',
}

export enum CashHandoverStatus {
  Initiated = 'Initiated',
  Acknowledged = 'Acknowledged',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
}

export enum CashHandoverType {
  Normal = 'Normal',
  AdminTransition = 'AdminTransition',
}

// Receiver role includes SuperAdmin for bank transfers
export type CashReceiverRole = CashCustodyUserRole | 'SuperAdmin';

/**
 * CashCustody - Tracks the current cash balance held by each user
 */
export interface CashCustody {
  custodyId: string;
  userId: string;
  userRole: CashCustodyUserRole;
  glAccountCode: string;
  unitId?: string | null;
  areaId?: string | null;
  forumId?: string | null;
  status: CashCustodyStatus;
  currentBalance: number;
  totalReceived: number;
  totalTransferred: number;
  lastTransactionAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deactivatedAt?: Date | null;
  deactivatedBy?: string | null;
  deactivatedReason?: string | null;
}

/**
 * CashCustody with user relations
 */
export interface CashCustodyWithRelations extends CashCustody {
  user?: {
    userId: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  unit?: {
    unitId: string;
    unitCode: string;
    unitName: string;
  } | null;
  area?: {
    areaId: string;
    areaCode: string;
    areaName: string;
  } | null;
  forum?: {
    forumId: string;
    forumCode: string;
    forumName: string;
  } | null;
}

/**
 * CashHandover - Records each transfer of cash between two people
 */
export interface CashHandover {
  handoverId: string;
  handoverNumber: string;
  fromUserId: string;
  fromUserRole: CashCustodyUserRole;
  fromCustodyId: string;
  fromGlAccountCode: string;
  toUserId: string;
  toUserRole: string; // CashReceiverRole (includes SuperAdmin)
  toCustodyId?: string | null;
  toGlAccountCode: string;
  amount: number;
  unitId?: string | null;
  areaId?: string | null;
  forumId: string;
  status: CashHandoverStatus;
  handoverType: CashHandoverType;
  sourceHandoverId?: string | null;
  requiresApproval: boolean;
  approvalRequestId?: string | null;
  journalEntryId?: string | null;
  initiatedAt: Date;
  acknowledgedAt?: Date | null;
  rejectedAt?: Date | null;
  cancelledAt?: Date | null;
  initiatorNotes?: string | null;
  receiverNotes?: string | null;
  rejectionReason?: string | null;
  createdBy: string;
  updatedAt: Date;
}

/**
 * CashHandover with relations for display
 */
export interface CashHandoverWithRelations extends CashHandover {
  fromUser?: {
    userId: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  toUser?: {
    userId: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  fromCustody?: CashCustody;
  toCustody?: CashCustody | null;
  forum?: {
    forumId: string;
    forumCode: string;
    forumName: string;
  };
  approvalRequest?: {
    requestId: string;
    status: string;
  } | null;
}

/**
 * GL Account mapping by role
 */
export const GL_ACCOUNT_BY_ROLE: Record<CashCustodyUserRole, string> = {
  [CashCustodyUserRole.Agent]: '1001',
  [CashCustodyUserRole.UnitAdmin]: '1002',
  [CashCustodyUserRole.AreaAdmin]: '1003',
  [CashCustodyUserRole.ForumAdmin]: '1004',
};

/**
 * GL Account names mapping
 */
export const GL_ACCOUNT_NAMES: Record<string, string> = {
  '1001': 'Cash - Agent Custody',
  '1002': 'Cash - Unit Admin Custody',
  '1003': 'Cash - Area Admin Custody',
  '1004': 'Cash - Forum Admin Custody',
  '1100': 'Bank Account',
};

/**
 * Bank account code for SuperAdmin transfers
 */
export const BANK_ACCOUNT_CODE = '1100';

/**
 * Role code to CashCustodyUserRole mapping
 */
export const ROLE_CODE_TO_CUSTODY_ROLE: Record<string, CashCustodyUserRole> = {
  agent: CashCustodyUserRole.Agent,
  unit_admin: CashCustodyUserRole.UnitAdmin,
  area_admin: CashCustodyUserRole.AreaAdmin,
  forum_admin: CashCustodyUserRole.ForumAdmin,
};

/**
 * Valid transfer paths - who can transfer to whom
 */
export const VALID_TRANSFER_PATHS: Record<CashCustodyUserRole, string[]> = {
  [CashCustodyUserRole.Agent]: ['UnitAdmin', 'AreaAdmin', 'ForumAdmin', 'SuperAdmin'],
  [CashCustodyUserRole.UnitAdmin]: ['AreaAdmin', 'ForumAdmin', 'SuperAdmin'],
  [CashCustodyUserRole.AreaAdmin]: ['ForumAdmin', 'SuperAdmin'],
  [CashCustodyUserRole.ForumAdmin]: ['SuperAdmin'],
};

/**
 * Check if transfer path is valid
 */
export function isValidTransferPath(fromRole: CashCustodyUserRole, toRole: string): boolean {
  return VALID_TRANSFER_PATHS[fromRole]?.includes(toRole) ?? false;
}

/**
 * Check if transfer requires approval (only SuperAdmin transfers)
 */
export function requiresApproval(toRole: string): boolean {
  return toRole === 'SuperAdmin';
}

/**
 * Get GL account code for receiver role
 */
export function getReceiverGlAccountCode(toRole: string): string {
  if (toRole === 'SuperAdmin') {
    return BANK_ACCOUNT_CODE;
  }
  return GL_ACCOUNT_BY_ROLE[toRole as CashCustodyUserRole] || '';
}
