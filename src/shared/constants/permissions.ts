/**
 * Permissions Constants
 * Strongly typed permission codes for use throughout the application
 * Exported from permission seeds
 */

export const PERMISSIONS = {
  // ===== IAM MODULE =====
  IAM: {
    USER: {
      CREATE: 'iam.user.create',
      READ: 'iam.user.read',
      UPDATE: 'iam.user.update',
      DELETE: 'iam.user.delete',
    },
    ROLE: {
      CREATE: 'iam.role.create',
      READ: 'iam.role.read',
      UPDATE: 'iam.role.update',
      DELETE: 'iam.role.delete',
      ASSIGN: 'iam.role.assign',
      REVOKE: 'iam.role.revoke',
    },
    PERMISSION: {
      READ: 'iam.permission.read',
    },
  },

  // ===== ORGANIZATION MODULE =====
  ORG: {
    FORUM: {
      CREATE: 'org.forum.create',
      READ: 'org.forum.read',
      UPDATE: 'org.forum.update',
      DELETE: 'org.forum.delete',
    },
    AREA: {
      CREATE: 'org.area.create',
      READ: 'org.area.read',
      UPDATE: 'org.area.update',
      DELETE: 'org.area.delete',
    },
    UNIT: {
      CREATE: 'org.unit.create',
      READ: 'org.unit.read',
      UPDATE: 'org.unit.update',
      DELETE: 'org.unit.delete',
    },
    TIER: {
      CREATE: 'org.tier.create',
      READ: 'org.tier.read',
      UPDATE: 'org.tier.update',
      DELETE: 'org.tier.delete',
    },
  },

  // ===== AGENT MODULE =====
  AGENT: {
    CREATE: 'agent.create',
    READ: 'agent.read',
    UPDATE: 'agent.update',
    DELETE: 'agent.delete',
    SUSPEND: 'agent.suspend',
    REACTIVATE: 'agent.reactivate',
    REASSIGN: 'agent.reassign',
    EXPORT: 'agent.export',
    PROFILE_UPDATE: 'agent.profile.update',
  },

  // ===== MEMBER MODULE =====
  MEMBER: {
    CREATE: 'member.create',
    READ: 'member.read',
    UPDATE: 'member.update',
    DELETE: 'member.delete',
    APPROVE: 'member.approve',
    REJECT: 'member.reject',
    SUSPEND: 'member.suspend',
    REACTIVATE: 'member.reactivate',
    TRANSFER: 'member.transfer',
    EXPORT: 'member.export',
    PROFILE_UPDATE: 'member.profile.update',
    NOMINEE: {
      CREATE: 'member.nominee.create',
      READ: 'member.nominee.read',
      UPDATE: 'member.nominee.update',
      DELETE: 'member.nominee.delete',
    },
    DOCUMENT: {
      UPLOAD: 'member.document.upload',
      READ: 'member.document.read',
      DELETE: 'member.document.delete',
    },
  },

  // ===== WALLET MODULE =====
  WALLET: {
    READ: 'wallet.read',
    BALANCE_VIEW: 'wallet.balance.view',
    TRANSACTION_READ: 'wallet.transaction.read',
    DEPOSIT: {
      CREATE: 'wallet.deposit.create',
      APPROVE: 'wallet.deposit.approve',
      REJECT: 'wallet.deposit.reject',
    },
    ADJUSTMENT_CREATE: 'wallet.adjustment.create',
    REFUND_CREATE: 'wallet.refund.create',
    EXPORT: 'wallet.export',
  },

  // ===== DEATH CLAIM MODULE =====
  CLAIM: {
    CREATE: 'claim.create',
    READ: 'claim.read',
    UPDATE: 'claim.update',
    DELETE: 'claim.delete',
    SUBMIT: 'claim.submit',
    APPROVE: 'claim.approve',
    REJECT: 'claim.reject',
    SETTLE: 'claim.settle',
    EXPORT: 'claim.export',
    DOCUMENT: {
      UPLOAD: 'claim.document.upload',
      READ: 'claim.document.read',
      VERIFY: 'claim.document.verify',
    },
  },

  // ===== CONTRIBUTION MODULE =====
  CONTRIBUTION: {
    CYCLE: {
      CREATE: 'contribution.cycle.create',
      READ: 'contribution.cycle.read',
      UPDATE: 'contribution.cycle.update',
      CLOSE: 'contribution.cycle.close',
    },
    READ: 'contribution.read',
    COLLECT: 'contribution.collect',
    ACKNOWLEDGE: 'contribution.acknowledge',
    MISS: 'contribution.miss',
    EXPORT: 'contribution.export',
  },

  // ===== APPROVAL WORKFLOW MODULE =====
  APPROVAL: {
    WORKFLOW: {
      CREATE: 'approval.workflow.create',
      READ: 'approval.workflow.read',
      UPDATE: 'approval.workflow.update',
      DELETE: 'approval.workflow.delete',
    },
    REQUEST: {
      READ: 'approval.request.read',
      APPROVE: 'approval.request.approve',
      REJECT: 'approval.request.reject',
      REASSIGN: 'approval.request.reassign',
      ESCALATE: 'approval.request.escalate',
    },
  },

  // ===== GENERAL LEDGER MODULE =====
  GL: {
    ACCOUNT: {
      CREATE: 'gl.account.create',
      READ: 'gl.account.read',
      UPDATE: 'gl.account.update',
      DEACTIVATE: 'gl.account.deactivate',
    },
    ENTRY: {
      CREATE: 'gl.entry.create',
      READ: 'gl.entry.read',
      REVERSE: 'gl.entry.reverse',
    },
    PERIOD: {
      READ: 'gl.period.read',
      CLOSE: 'gl.period.close',
    },
    REPORT: {
      VIEW: 'gl.report.view',
      EXPORT: 'gl.report.export',
    },
  },

  // ===== REPORTS MODULE =====
  REPORT: {
    DASHBOARD_VIEW: 'report.dashboard.view',
    MEMBER_VIEW: 'report.member.view',
    FINANCIAL_VIEW: 'report.financial.view',
    AGENT_VIEW: 'report.agent.view',
    CLAIM_VIEW: 'report.claim.view',
    CONTRIBUTION_VIEW: 'report.contribution.view',
    AUDIT_VIEW: 'report.audit.view',
  },
} as const;

/**
 * Flatten all permissions for easy iteration
 * Usage: ALL_PERMISSIONS.forEach(perm => console.log(perm))
 */
export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS)
  .flatMap((module) =>
    Object.values(module).flatMap((entity) =>
      typeof entity === 'string'
        ? [entity]
        : Object.values(entity).flatMap((action) =>
            typeof action === 'string' ? [action] : Object.values(action)
          )
    )
  );

/**
 * Type helper for permission codes
 * Usage: const permission: PermissionCode = PERMISSIONS.MEMBER.CREATE
 */
export type PermissionCode = typeof ALL_PERMISSIONS[number];

/**
 * Check if a string is a valid permission code
 * Usage: if (isValidPermission('member.create')) { ... }
 */
export function isValidPermission(code: string): code is PermissionCode {
  return ALL_PERMISSIONS.includes(code);
}

/**
 * Get permission module from code
 * Usage: getPermissionModule('member.create') -> 'Member'
 */
export function getPermissionModule(code: string): string | null {
  const module = code.split('.')[0];
  const moduleMap: Record<string, string> = {
    iam: 'IAM',
    org: 'Organization',
    agent: 'Agent',
    member: 'Member',
    wallet: 'Wallet',
    claim: 'Claim',
    contribution: 'Contribution',
    approval: 'Approval',
    gl: 'General Ledger',
    report: 'Report',
  };
  return moduleMap[module] || null;
}

/**
 * System Roles
 * Defines available system roles and their default permissions
 */
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  FORUM_ADMIN: 'forum_admin',
  AREA_ADMIN: 'area_admin',
  UNIT_ADMIN: 'unit_admin',
  AGENT: 'agent',
  MEMBER: 'member',
} as const;

export type SystemRole = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];

/**
 * Membership Tiers
 * Tier codes for member registration
 */
export const MEMBERSHIP_TIERS = {
  BASIC: 'BASIC',
  PREMIUM: 'PREMIUM',
} as const;

export type MembershipTier = typeof MEMBERSHIP_TIERS[keyof typeof MEMBERSHIP_TIERS];

/**
 * GL Account Codes
 * Common account codes for financial entries
 */
export const GL_ACCOUNTS = {
  // Assets
  CASH_ON_HAND: '1000',
  CASH_AGENT_CUSTODY: '1001',
  CASH_UNIT_ADMIN_CUSTODY: '1002',
  CASH_AREA_ADMIN_CUSTODY: '1003',
  CASH_FORUM_ADMIN_CUSTODY: '1004',
  BANK_ACCOUNT: '1100',
  ACCOUNTS_RECEIVABLE: '1200',

  // Liabilities
  WALLET_LIABILITY: '2100',
  BENEFIT_PAYABLE: '2200',

  // Revenue
  REGISTRATION_FEE: '4100',
  CONTRIBUTION_REVENUE: '4200',
  DONATION_REVENUE: '4300',

  // Expenses
  DEATH_BENEFIT_EXPENSE: '5100',
  ADMIN_EXPENSE: '5200',
} as const;

/**
 * Approval Workflow Codes
 * Default workflow codes for system processes
 */
export const APPROVAL_WORKFLOWS = {
  AGENT_REGISTRATION: 'agent_registration',
  MEMBER_REGISTRATION: 'member_registration',
  WALLET_DEPOSIT: 'wallet_deposit',
  DEATH_CLAIM: 'death_claim_approval',
} as const;

export type ApprovalWorkflowCode = typeof APPROVAL_WORKFLOWS[keyof typeof APPROVAL_WORKFLOWS];
