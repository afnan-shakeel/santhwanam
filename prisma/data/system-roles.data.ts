/**
 * System Roles Data
 * Core roles for the system with permission assignments
 */

export const SYSTEM_ROLES = [
  {
    code: 'super_admin',
    name: 'Super Administrator',
    description: 'Full system access with no scope restrictions',
    scopeType: 'None' as const,
  },
  {
    code: 'forum_admin',
    name: 'Forum Administrator',
    description: 'Manages a forum and all its areas, units, and agents',
    scopeType: 'Forum' as const,
  },
  {
    code: 'area_admin',
    name: 'Area Administrator',
    description: 'Manages an area and its units and agents',
    scopeType: 'Area' as const,
  },
  {
    code: 'unit_admin',
    name: 'Unit Administrator',
    description: 'Manages a unit and its agents',
    scopeType: 'Unit' as const,
  },
  {
    code: 'agent',
    name: 'Agent',
    description: 'Registers and manages members within their assignment',
    scopeType: 'Agent' as const,
  },
  {
    code: 'member',
    name: 'Member',
    description: 'Basic member with self-service access',
    scopeType: 'Member' as const,
  },
];

/**
 * Role-Permission Assignments
 * Defines which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'], // All permissions

  forum_admin: [
    // IAM (limited)
    'iam.user.read',
    'iam.role.read',
    'iam.role.assign',
    'iam.role.revoke',
    'iam.permission.read',
    // Organization
    'org.forum.read',
    'org.forum.update',
    'org.area.create',
    'org.area.read',
    'org.area.update',
    'org.area.delete',
    'org.unit.create',
    'org.unit.read',
    'org.unit.update',
    'org.unit.delete',
    'org.tier.read',
    // Agent
    'agent.create',
    'agent.read',
    'agent.update',
    'agent.delete',
    'agent.suspend',
    'agent.reactivate',
    'agent.reassign',
    'agent.export',
    // Member
    'member.create',
    'member.read',
    'member.update',
    'member.delete',
    'member.approve',
    'member.reject',
    'member.suspend',
    'member.reactivate',
    'member.transfer',
    'member.export',
    'member.nominee.create',
    'member.nominee.read',
    'member.nominee.update',
    'member.nominee.delete',
    'member.document.upload',
    'member.document.read',
    'member.document.delete',
    // Wallet
    'wallet.read',
    'wallet.balance.view',
    'wallet.transaction.read',
    'wallet.deposit.create',
    'wallet.deposit.approve',
    'wallet.deposit.reject',
    'wallet.adjustment.create',
    'wallet.refund.create',
    'wallet.export',
    // Claim
    'claim.create',
    'claim.read',
    'claim.update',
    'claim.delete',
    'claim.submit',
    'claim.approve',
    'claim.reject',
    'claim.settle',
    'claim.export',
    'claim.document.upload',
    'claim.document.read',
    'claim.document.verify',
    // Contribution
    'contribution.cycle.create',
    'contribution.cycle.read',
    'contribution.cycle.update',
    'contribution.cycle.close',
    'contribution.read',
    'contribution.collect',
    'contribution.acknowledge',
    'contribution.miss',
    'contribution.export',
    // Approval
    'approval.workflow.read',
    'approval.request.read',
    'approval.request.approve',
    'approval.request.reject',
    'approval.request.reassign',
    // GL (read only)
    'gl.account.read',
    'gl.entry.read',
    'gl.period.read',
    'gl.report.view',
    'gl.report.export',
    // Reports
    'report.dashboard.view',
    'report.member.view',
    'report.financial.view',
    'report.agent.view',
    'report.claim.view',
    'report.contribution.view',
  ],

  area_admin: [
    // Organization
    'org.area.read',
    'org.area.update',
    'org.unit.create',
    'org.unit.read',
    'org.unit.update',
    'org.unit.delete',
    'org.tier.read',
    // Agent
    'agent.create',
    'agent.read',
    'agent.update',
    'agent.suspend',
    'agent.reactivate',
    'agent.export',
    // Member
    'member.create',
    'member.read',
    'member.update',
    'member.approve',
    'member.reject',
    'member.suspend',
    'member.reactivate',
    'member.export',
    'member.nominee.create',
    'member.nominee.read',
    'member.nominee.update',
    'member.nominee.delete',
    'member.document.upload',
    'member.document.read',
    'member.document.delete',
    // Wallet
    'wallet.read',
    'wallet.balance.view',
    'wallet.transaction.read',
    'wallet.deposit.create',
    'wallet.deposit.approve',
    'wallet.deposit.reject',
    'wallet.export',
    // Claim
    'claim.create',
    'claim.read',
    'claim.update',
    'claim.document.upload',
    'claim.document.read',
    'claim.document.verify',
    // Contribution
    'contribution.cycle.read',
    'contribution.read',
    'contribution.collect',
    'contribution.acknowledge',
    'contribution.export',
    // Approval
    'approval.request.read',
    'approval.request.approve',
    'approval.request.reject',
    // Reports
    'report.dashboard.view',
    'report.member.view',
    'report.agent.view',
  ],

  unit_admin: [
    // Organization
    'org.unit.read',
    'org.unit.update',
    'org.tier.read',
    // Agent
    'agent.create',
    'agent.read',
    'agent.update',
    'agent.suspend',
    'agent.reactivate',
    // Member
    'member.create',
    'member.read',
    'member.update',
    'member.approve',
    'member.reject',
    'member.suspend',
    'member.reactivate',
    'member.nominee.create',
    'member.nominee.read',
    'member.nominee.update',
    'member.nominee.delete',
    'member.document.upload',
    'member.document.read',
    'member.document.delete',
    // Wallet
    'wallet.balance.view',
    'wallet.transaction.read',
    'wallet.deposit.create',
    'wallet.deposit.approve',
    'wallet.deposit.reject',
    // Claim
    'claim.create',
    'claim.read',
    'claim.document.upload',
    'claim.document.read',
    // Contribution
    'contribution.cycle.read',
    'contribution.read',
    'contribution.collect',
    'contribution.acknowledge',
    // Approval
    'approval.request.read',
    'approval.request.approve',
    'approval.request.reject',
    // Reports
    'report.dashboard.view',
    'report.member.view',
  ],

  agent: [
    // Organization
    'org.tier.read',
    // Agent (self only)
    'agent.read',
    'agent.profile.update',
    // Member (own members)
    'member.create',
    'member.read',
    'member.update',
    'member.nominee.create',
    'member.nominee.read',
    'member.nominee.update',
    'member.nominee.delete',
    'member.document.upload',
    'member.document.read',
    // Wallet (own members)
    'wallet.balance.view',
    'wallet.deposit.create',
    // Claim
    'claim.create',
    'claim.read',
    'claim.document.upload',
    'claim.document.read',
    // Contribution
    'contribution.cycle.read',
    'contribution.read',
    'contribution.collect',
    'contribution.acknowledge',
    // Reports
    'report.dashboard.view',
  ],

  member: [
    // Member (self only)
    'member.read',
    'member.profile.update',
    'member.nominee.read',
    // Wallet (self only)
    'wallet.balance.view',
    'wallet.transaction.read',
    'wallet.deposit.create',
    // Claim (related)
    'claim.read',
    // Contribution (self only)
    'contribution.read',
  ],
};
