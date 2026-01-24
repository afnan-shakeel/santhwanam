/**
 * Permission Seeds Data
 * All system permissions organized by module
 * Total: 110 permissions
 */

export const PERMISSION_SEEDS = [
  // ===== IAM MODULE (11 permissions) =====
  { code: 'iam.user.create', name: 'Create User', module: 'IAM', action: 'create' },
  { code: 'iam.user.read', name: 'View Users', module: 'IAM', action: 'read' },
  { code: 'iam.user.update', name: 'Update User', module: 'IAM', action: 'update' },
  { code: 'iam.user.delete', name: 'Delete User', module: 'IAM', action: 'delete' },
  { code: 'iam.role.create', name: 'Create Role', module: 'IAM', action: 'create' },
  { code: 'iam.role.read', name: 'View Roles', module: 'IAM', action: 'read' },
  { code: 'iam.role.update', name: 'Update Role', module: 'IAM', action: 'update' },
  { code: 'iam.role.delete', name: 'Delete Role', module: 'IAM', action: 'delete' },
  { code: 'iam.role.assign', name: 'Assign Role', module: 'IAM', action: 'assign' },
  { code: 'iam.role.revoke', name: 'Revoke Role', module: 'IAM', action: 'revoke' },
  { code: 'iam.permission.read', name: 'View Permissions', module: 'IAM', action: 'read' },

  // ===== ORGANIZATION MODULE (16 permissions) =====
  { code: 'org.forum.create', name: 'Create Forum', module: 'Organization', action: 'create' },
  { code: 'org.forum.read', name: 'View Forums', module: 'Organization', action: 'read' },
  { code: 'org.forum.update', name: 'Update Forum', module: 'Organization', action: 'update' },
  { code: 'org.forum.delete', name: 'Delete Forum', module: 'Organization', action: 'delete' },
  { code: 'org.area.create', name: 'Create Area', module: 'Organization', action: 'create' },
  { code: 'org.area.read', name: 'View Areas', module: 'Organization', action: 'read' },
  { code: 'org.area.update', name: 'Update Area', module: 'Organization', action: 'update' },
  { code: 'org.area.delete', name: 'Delete Area', module: 'Organization', action: 'delete' },
  { code: 'org.unit.create', name: 'Create Unit', module: 'Organization', action: 'create' },
  { code: 'org.unit.read', name: 'View Units', module: 'Organization', action: 'read' },
  { code: 'org.unit.update', name: 'Update Unit', module: 'Organization', action: 'update' },
  { code: 'org.unit.delete', name: 'Delete Unit', module: 'Organization', action: 'delete' },
  { code: 'org.tier.create', name: 'Create Tier', module: 'Organization', action: 'create' },
  { code: 'org.tier.read', name: 'View Tiers', module: 'Organization', action: 'read' },
  { code: 'org.tier.update', name: 'Update Tier', module: 'Organization', action: 'update' },
  { code: 'org.tier.delete', name: 'Delete Tier', module: 'Organization', action: 'delete' },

  // ===== AGENT MODULE (9 permissions) =====
  { code: 'agent.create', name: 'Create Agent', module: 'Agent', action: 'create' },
  { code: 'agent.read', name: 'View Agents', module: 'Agent', action: 'read' },
  { code: 'agent.update', name: 'Update Agent', module: 'Agent', action: 'update' },
  { code: 'agent.delete', name: 'Delete Agent', module: 'Agent', action: 'delete' },
  { code: 'agent.suspend', name: 'Suspend Agent', module: 'Agent', action: 'suspend' },
  { code: 'agent.reactivate', name: 'Reactivate Agent', module: 'Agent', action: 'reactivate' },
  { code: 'agent.reassign', name: 'Reassign Agent', module: 'Agent', action: 'reassign' },
  { code: 'agent.export', name: 'Export Agents', module: 'Agent', action: 'export' },
  { code: 'agent.profile.update', name: 'Update Own Profile', module: 'Agent', action: 'update' },

  // ===== MEMBER MODULE (17 permissions) =====
  { code: 'member.create', name: 'Create Member', module: 'Member', action: 'create' },
  { code: 'member.read', name: 'View Members', module: 'Member', action: 'read' },
  { code: 'member.update', name: 'Update Member', module: 'Member', action: 'update' },
  { code: 'member.delete', name: 'Delete Member', module: 'Member', action: 'delete' },
  { code: 'member.approve', name: 'Approve Registration', module: 'Member', action: 'approve' },
  { code: 'member.reject', name: 'Reject Registration', module: 'Member', action: 'reject' },
  { code: 'member.suspend', name: 'Suspend Member', module: 'Member', action: 'suspend' },
  { code: 'member.reactivate', name: 'Reactivate Member', module: 'Member', action: 'reactivate' },
  { code: 'member.transfer', name: 'Transfer Member', module: 'Member', action: 'transfer' },
  { code: 'member.export', name: 'Export Members', module: 'Member', action: 'export' },
  { code: 'member.profile.update', name: 'Update Own Profile', module: 'Member', action: 'update' },
  { code: 'member.nominee.create', name: 'Add Nominee', module: 'Member', action: 'create' },
  { code: 'member.nominee.read', name: 'View Nominees', module: 'Member', action: 'read' },
  { code: 'member.nominee.update', name: 'Update Nominee', module: 'Member', action: 'update' },
  { code: 'member.nominee.delete', name: 'Delete Nominee', module: 'Member', action: 'delete' },
  { code: 'member.document.upload', name: 'Upload Documents', module: 'Member', action: 'create' },
  { code: 'member.document.read', name: 'View Documents', module: 'Member', action: 'read' },
  { code: 'member.document.delete', name: 'Delete Documents', module: 'Member', action: 'delete' },

  // ===== WALLET MODULE (9 permissions) =====
  { code: 'wallet.read', name: 'View Wallets', module: 'Wallet', action: 'read' },
  { code: 'wallet.balance.view', name: 'View Balance', module: 'Wallet', action: 'read' },
  { code: 'wallet.transaction.read', name: 'View Transactions', module: 'Wallet', action: 'read' },
  { code: 'wallet.deposit.create', name: 'Create Deposit', module: 'Wallet', action: 'create' },
  { code: 'wallet.deposit.approve', name: 'Approve Deposit', module: 'Wallet', action: 'approve' },
  { code: 'wallet.deposit.reject', name: 'Reject Deposit', module: 'Wallet', action: 'reject' },
  { code: 'wallet.adjustment.create', name: 'Create Adjustment', module: 'Wallet', action: 'create' },
  { code: 'wallet.refund.create', name: 'Create Refund', module: 'Wallet', action: 'create' },
  { code: 'wallet.export', name: 'Export Wallet Data', module: 'Wallet', action: 'export' },

  // ===== DEATH CLAIM MODULE (12 permissions) =====
  { code: 'claim.create', name: 'Report Death', module: 'Claim', action: 'create' },
  { code: 'claim.read', name: 'View Claims', module: 'Claim', action: 'read' },
  { code: 'claim.update', name: 'Update Claim', module: 'Claim', action: 'update' },
  { code: 'claim.delete', name: 'Delete Claim', module: 'Claim', action: 'delete' },
  { code: 'claim.submit', name: 'Submit for Approval', module: 'Claim', action: 'submit' },
  { code: 'claim.approve', name: 'Approve Claim', module: 'Claim', action: 'approve' },
  { code: 'claim.reject', name: 'Reject Claim', module: 'Claim', action: 'reject' },
  { code: 'claim.settle', name: 'Settle Claim', module: 'Claim', action: 'settle' },
  { code: 'claim.export', name: 'Export Claims', module: 'Claim', action: 'export' },
  { code: 'claim.document.upload', name: 'Upload Documents', module: 'Claim', action: 'create' },
  { code: 'claim.document.read', name: 'View Documents', module: 'Claim', action: 'read' },
  { code: 'claim.document.verify', name: 'Verify Documents', module: 'Claim', action: 'verify' },

  // ===== CONTRIBUTION MODULE (9 permissions) =====
  { code: 'contribution.cycle.create', name: 'Create Cycle', module: 'Contribution', action: 'create' },
  { code: 'contribution.cycle.read', name: 'View Cycles', module: 'Contribution', action: 'read' },
  { code: 'contribution.cycle.update', name: 'Update Cycle', module: 'Contribution', action: 'update' },
  { code: 'contribution.cycle.close', name: 'Close Cycle', module: 'Contribution', action: 'close' },
  { code: 'contribution.read', name: 'View Contributions', module: 'Contribution', action: 'read' },
  { code: 'contribution.collect', name: 'Collect Contribution', module: 'Contribution', action: 'collect' },
  { code: 'contribution.acknowledge', name: 'Acknowledge Debit', module: 'Contribution', action: 'acknowledge' },
  { code: 'contribution.miss', name: 'Mark as Missed', module: 'Contribution', action: 'miss' },
  { code: 'contribution.export', name: 'Export Contributions', module: 'Contribution', action: 'export' },

  // ===== APPROVAL MODULE (9 permissions) =====
  { code: 'approval.workflow.create', name: 'Create Workflow', module: 'Approval', action: 'create' },
  { code: 'approval.workflow.read', name: 'View Workflows', module: 'Approval', action: 'read' },
  { code: 'approval.workflow.update', name: 'Update Workflow', module: 'Approval', action: 'update' },
  { code: 'approval.workflow.delete', name: 'Delete Workflow', module: 'Approval', action: 'delete' },
  { code: 'approval.request.read', name: 'View Requests', module: 'Approval', action: 'read' },
  { code: 'approval.request.approve', name: 'Approve Request', module: 'Approval', action: 'approve' },
  { code: 'approval.request.reject', name: 'Reject Request', module: 'Approval', action: 'reject' },
  { code: 'approval.request.reassign', name: 'Reassign Request', module: 'Approval', action: 'reassign' },
  { code: 'approval.request.escalate', name: 'Escalate Request', module: 'Approval', action: 'escalate' },

  // ===== GENERAL LEDGER MODULE (11 permissions) =====
  { code: 'gl.account.create', name: 'Create Account', module: 'GL', action: 'create' },
  { code: 'gl.account.read', name: 'View Accounts', module: 'GL', action: 'read' },
  { code: 'gl.account.update', name: 'Update Account', module: 'GL', action: 'update' },
  { code: 'gl.account.deactivate', name: 'Deactivate Account', module: 'GL', action: 'deactivate' },
  { code: 'gl.entry.create', name: 'Create Entry', module: 'GL', action: 'create' },
  { code: 'gl.entry.read', name: 'View Entries', module: 'GL', action: 'read' },
  { code: 'gl.entry.reverse', name: 'Reverse Entry', module: 'GL', action: 'reverse' },
  { code: 'gl.period.read', name: 'View Periods', module: 'GL', action: 'read' },
  { code: 'gl.period.close', name: 'Close Period', module: 'GL', action: 'close' },
  { code: 'gl.report.view', name: 'View Reports', module: 'GL', action: 'read' },
  { code: 'gl.report.export', name: 'Export Reports', module: 'GL', action: 'export' },

  // ===== REPORTS MODULE (7 permissions) =====
  { code: 'report.dashboard.view', name: 'View Dashboard', module: 'Report', action: 'read' },
  { code: 'report.member.view', name: 'View Member Reports', module: 'Report', action: 'read' },
  { code: 'report.financial.view', name: 'View Financial Reports', module: 'Report', action: 'read' },
  { code: 'report.agent.view', name: 'View Agent Reports', module: 'Report', action: 'read' },
  { code: 'report.claim.view', name: 'View Claim Reports', module: 'Report', action: 'read' },
  { code: 'report.contribution.view', name: 'View Contribution Reports', module: 'Report', action: 'read' },
  { code: 'report.audit.view', name: 'View Audit Logs', module: 'Report', action: 'read' },
];
