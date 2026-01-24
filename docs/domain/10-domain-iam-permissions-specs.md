# Permissions Specification

This document defines all permissions for the Mutual Aid / Death Benefit platform, organized by module.

---

## Permission Code Convention

```
{module}.{entity}.{action}
```

**Actions:**
- `create` - Create new records
- `read` - View records
- `update` - Modify existing records
- `delete` - Remove records (soft delete)
- `approve` - Approve pending items
- `reject` - Reject pending items
- `suspend` - Suspend/deactivate
- `reactivate` - Reactivate suspended items
- `export` - Export data
- `assign` - Assign to users/entities

---

## 1. IAM Module (Identity & Access Management)

| Permission Code | Name | Description |
|-----------------|------|-------------|
| `iam.user.create` | Create User | Create new user accounts |
| `iam.user.read` | View Users | View user list and details |
| `iam.user.update` | Update User | Update user information |
| `iam.user.delete` | Delete User | Deactivate user accounts |
| `iam.role.create` | Create Role | Create custom roles |
| `iam.role.read` | View Roles | View roles and permissions |
| `iam.role.update` | Update Role | Modify role permissions |
| `iam.role.delete` | Delete Role | Delete custom roles |
| `iam.role.assign` | Assign Role | Assign roles to users |
| `iam.role.revoke` | Revoke Role | Remove roles from users |
| `iam.permission.read` | View Permissions | View available permissions |

---

## 2. Organization Module (Forum, Area, Unit)

| Permission Code | Name | Description |
|-----------------|------|-------------|
| `org.forum.create` | Create Forum | Create new forums |
| `org.forum.read` | View Forums | View forum list and details |
| `org.forum.update` | Update Forum | Update forum information |
| `org.forum.delete` | Delete Forum | Deactivate forums |
| `org.area.create` | Create Area | Create new areas |
| `org.area.read` | View Areas | View area list and details |
| `org.area.update` | Update Area | Update area information |
| `org.area.delete` | Delete Area | Deactivate areas |
| `org.unit.create` | Create Unit | Create new units |
| `org.unit.read` | View Units | View unit list and details |
| `org.unit.update` | Update Unit | Update unit information |
| `org.unit.delete` | Delete Unit | Deactivate units |
| `org.tier.create` | Create Tier | Create membership tiers |
| `org.tier.read` | View Tiers | View membership tiers |
| `org.tier.update` | Update Tier | Update tier details |
| `org.tier.delete` | Delete Tier | Deactivate tiers |

---

## 3. Agent Module

| Permission Code | Name | Description |
|-----------------|------|-------------|
| `agent.create` | Create Agent | Register new agents |
| `agent.read` | View Agents | View agent list and profiles |
| `agent.update` | Update Agent | Update agent information |
| `agent.delete` | Delete Agent | Deactivate agents |
| `agent.suspend` | Suspend Agent | Suspend agent accounts |
| `agent.reactivate` | Reactivate Agent | Reactivate suspended agents |
| `agent.reassign` | Reassign Agent | Reassign agent to different unit |
| `agent.export` | Export Agents | Export agent data |
| `agent.profile.update` | Update Own Profile | Agent updates their own profile |

---

## 4. Member Module

| Permission Code | Name | Description |
|-----------------|------|-------------|
| `member.create` | Create Member | Register new members |
| `member.read` | View Members | View member list and profiles |
| `member.update` | Update Member | Update member information |
| `member.delete` | Delete Member | Remove member records |
| `member.approve` | Approve Registration | Approve pending registrations |
| `member.reject` | Reject Registration | Reject pending registrations |
| `member.suspend` | Suspend Member | Suspend member accounts |
| `member.reactivate` | Reactivate Member | Reactivate suspended members |
| `member.transfer` | Transfer Member | Transfer member to another agent |
| `member.export` | Export Members | Export member data |
| `member.nominee.create` | Add Nominee | Add member nominees |
| `member.nominee.read` | View Nominees | View member nominees |
| `member.nominee.update` | Update Nominee | Update nominee information |
| `member.nominee.delete` | Delete Nominee | Remove nominees |
| `member.document.upload` | Upload Documents | Upload member documents |
| `member.document.read` | View Documents | View member documents |
| `member.document.delete` | Delete Documents | Remove member documents |
| `member.profile.update` | Update Own Profile | Member updates their own profile |

---

## 5. Wallet Module

| Permission Code | Name | Description |
|-----------------|------|-------------|
| `wallet.read` | View Wallets | View wallet list and balances |
| `wallet.balance.view` | View Balance | View wallet balance |
| `wallet.transaction.read` | View Transactions | View wallet transactions |
| `wallet.deposit.create` | Create Deposit | Request wallet deposit |
| `wallet.deposit.approve` | Approve Deposit | Approve deposit requests |
| `wallet.deposit.reject` | Reject Deposit | Reject deposit requests |
| `wallet.adjustment.create` | Create Adjustment | Make manual wallet adjustments |
| `wallet.refund.create` | Create Refund | Process wallet refunds |
| `wallet.export` | Export Wallet Data | Export wallet transactions |

---

## 6. Death Claim Module

| Permission Code | Name | Description |
|-----------------|------|-------------|
| `claim.create` | Report Death | Create death claim reports |
| `claim.read` | View Claims | View death claims list and details |
| `claim.update` | Update Claim | Update claim information |
| `claim.delete` | Delete Claim | Remove claim records |
| `claim.document.upload` | Upload Documents | Upload claim documents |
| `claim.document.read` | View Documents | View claim documents |
| `claim.document.verify` | Verify Documents | Verify claim documents |
| `claim.submit` | Submit for Approval | Submit claim for approval |
| `claim.approve` | Approve Claim | Approve death claims |
| `claim.reject` | Reject Claim | Reject death claims |
| `claim.settle` | Settle Claim | Process benefit payout |
| `claim.export` | Export Claims | Export claim data |

---

## 7. Contribution Module

| Permission Code | Name | Description |
|-----------------|------|-------------|
| `contribution.cycle.create` | Create Cycle | Create contribution cycles |
| `contribution.cycle.read` | View Cycles | View contribution cycles |
| `contribution.cycle.update` | Update Cycle | Update cycle information |
| `contribution.cycle.close` | Close Cycle | Close contribution cycles |
| `contribution.read` | View Contributions | View member contributions |
| `contribution.collect` | Collect Contribution | Record contribution collection |
| `contribution.acknowledge` | Acknowledge Debit | Acknowledge wallet debit |
| `contribution.miss` | Mark as Missed | Mark contribution as missed |
| `contribution.export` | Export Contributions | Export contribution data |

---

## 8. Approval Workflow Module

| Permission Code | Name | Description |
|-----------------|------|-------------|
| `approval.workflow.create` | Create Workflow | Create approval workflows |
| `approval.workflow.read` | View Workflows | View workflow configurations |
| `approval.workflow.update` | Update Workflow | Update workflow stages |
| `approval.workflow.delete` | Delete Workflow | Remove workflows |
| `approval.request.read` | View Requests | View approval requests |
| `approval.request.approve` | Approve Request | Approve pending requests |
| `approval.request.reject` | Reject Request | Reject pending requests |
| `approval.request.reassign` | Reassign Request | Reassign to another approver |
| `approval.request.escalate` | Escalate Request | Escalate overdue requests |

---

## 9. General Ledger Module

| Permission Code | Name | Description |
|-----------------|------|-------------|
| `gl.account.create` | Create Account | Create chart of accounts |
| `gl.account.read` | View Accounts | View chart of accounts |
| `gl.account.update` | Update Account | Update account details |
| `gl.account.deactivate` | Deactivate Account | Deactivate accounts |
| `gl.entry.create` | Create Entry | Create journal entries |
| `gl.entry.read` | View Entries | View journal entries |
| `gl.entry.reverse` | Reverse Entry | Reverse posted entries |
| `gl.period.read` | View Periods | View fiscal periods |
| `gl.period.close` | Close Period | Close fiscal periods |
| `gl.report.view` | View Reports | View financial reports |
| `gl.report.export` | Export Reports | Export financial reports |

---

## 10. Reports & Dashboard Module

| Permission Code | Name | Description |
|-----------------|------|-------------|
| `report.dashboard.view` | View Dashboard | Access main dashboard |
| `report.member.view` | View Member Reports | View member statistics |
| `report.financial.view` | View Financial Reports | View financial summaries |
| `report.agent.view` | View Agent Reports | View agent performance |
| `report.claim.view` | View Claim Reports | View claim statistics |
| `report.contribution.view` | View Contribution Reports | View contribution summaries |
| `report.audit.view` | View Audit Logs | View system audit logs |

---

## System Role Default Permissions

### Super Admin
All permissions

### Forum Admin
```
iam.role.assign, iam.role.revoke (within forum)
org.area.*, org.unit.*, org.tier.read
agent.*
member.*
wallet.*
claim.*
contribution.*
approval.request.*
gl.entry.read, gl.report.view
report.*
```

### Area Admin
```
org.unit.* (within area)
agent.* (within area)
member.* (within area)
wallet.* (within area)
claim.create, claim.read, claim.update, claim.document.*
contribution.* (within area)
approval.request.read, approval.request.approve, approval.request.reject
report.dashboard.view, report.member.view, report.agent.view
```

### Unit Admin
```
agent.* (within unit)
member.* (within unit)
wallet.deposit.create, wallet.deposit.approve, wallet.balance.view, wallet.transaction.read
claim.create, claim.read, claim.document.upload
contribution.* (within unit)
approval.request.read, approval.request.approve, approval.request.reject
report.dashboard.view, report.member.view
```

### Agent
```
member.create, member.read, member.update (own members)
member.nominee.*, member.document.* (own members)
wallet.deposit.create, wallet.balance.view (own members)
claim.create, claim.read, claim.document.upload (own members)
contribution.collect, contribution.acknowledge (own members)
agent.profile.update (self only)
report.dashboard.view
```

### Member
```
member.profile.update (self only)
member.nominee.read (self only)
wallet.balance.view (self only)
wallet.transaction.read (self only)
wallet.deposit.create (self - request only)
claim.read (related to self)
contribution.read (self only)
```

---

## Permission Constants (Code)

### TypeScript Constant (Shared)

```typescript
// src/shared/constants/permissions.ts

export const PERMISSIONS = {
  // IAM
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
  
  // Organization
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
  
  // Agent
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
  
  // Member
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
  
  // Wallet
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
  
  // Death Claim
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
  
  // Contribution
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
  
  // Approval Workflow
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
  
  // General Ledger
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
  
  // Reports
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

// Flatten for easy iteration
export const ALL_PERMISSIONS = Object.values(PERMISSIONS)
  .flatMap(module => 
    Object.values(module).flatMap(entity => 
      typeof entity === 'string' 
        ? [entity] 
        : Object.values(entity).flatMap(action =>
            typeof action === 'string' ? [action] : Object.values(action)
          )
    )
  );

// Type helper
export type PermissionCode = typeof ALL_PERMISSIONS[number];
```

---

## Seed Data for Permissions Table

```typescript
// src/database/seeds/permissions.seed.ts

export const PERMISSION_SEEDS = [
  // IAM
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
  
  // Organization
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
  
  // Agent
  { code: 'agent.create', name: 'Create Agent', module: 'Agent', action: 'create' },
  { code: 'agent.read', name: 'View Agents', module: 'Agent', action: 'read' },
  { code: 'agent.update', name: 'Update Agent', module: 'Agent', action: 'update' },
  { code: 'agent.delete', name: 'Delete Agent', module: 'Agent', action: 'delete' },
  { code: 'agent.suspend', name: 'Suspend Agent', module: 'Agent', action: 'suspend' },
  { code: 'agent.reactivate', name: 'Reactivate Agent', module: 'Agent', action: 'reactivate' },
  { code: 'agent.reassign', name: 'Reassign Agent', module: 'Agent', action: 'reassign' },
  { code: 'agent.export', name: 'Export Agents', module: 'Agent', action: 'export' },
  { code: 'agent.profile.update', name: 'Update Own Profile', module: 'Agent', action: 'update' },
  
  // Member
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
  
  // Wallet
  { code: 'wallet.read', name: 'View Wallets', module: 'Wallet', action: 'read' },
  { code: 'wallet.balance.view', name: 'View Balance', module: 'Wallet', action: 'read' },
  { code: 'wallet.transaction.read', name: 'View Transactions', module: 'Wallet', action: 'read' },
  { code: 'wallet.deposit.create', name: 'Create Deposit', module: 'Wallet', action: 'create' },
  { code: 'wallet.deposit.approve', name: 'Approve Deposit', module: 'Wallet', action: 'approve' },
  { code: 'wallet.deposit.reject', name: 'Reject Deposit', module: 'Wallet', action: 'reject' },
  { code: 'wallet.adjustment.create', name: 'Create Adjustment', module: 'Wallet', action: 'create' },
  { code: 'wallet.refund.create', name: 'Create Refund', module: 'Wallet', action: 'create' },
  { code: 'wallet.export', name: 'Export Wallet Data', module: 'Wallet', action: 'export' },
  
  // Death Claim
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
  
  // Contribution
  { code: 'contribution.cycle.create', name: 'Create Cycle', module: 'Contribution', action: 'create' },
  { code: 'contribution.cycle.read', name: 'View Cycles', module: 'Contribution', action: 'read' },
  { code: 'contribution.cycle.update', name: 'Update Cycle', module: 'Contribution', action: 'update' },
  { code: 'contribution.cycle.close', name: 'Close Cycle', module: 'Contribution', action: 'close' },
  { code: 'contribution.read', name: 'View Contributions', module: 'Contribution', action: 'read' },
  { code: 'contribution.collect', name: 'Collect Contribution', module: 'Contribution', action: 'collect' },
  { code: 'contribution.acknowledge', name: 'Acknowledge Debit', module: 'Contribution', action: 'acknowledge' },
  { code: 'contribution.miss', name: 'Mark as Missed', module: 'Contribution', action: 'miss' },
  { code: 'contribution.export', name: 'Export Contributions', module: 'Contribution', action: 'export' },
  
  // Approval
  { code: 'approval.workflow.create', name: 'Create Workflow', module: 'Approval', action: 'create' },
  { code: 'approval.workflow.read', name: 'View Workflows', module: 'Approval', action: 'read' },
  { code: 'approval.workflow.update', name: 'Update Workflow', module: 'Approval', action: 'update' },
  { code: 'approval.workflow.delete', name: 'Delete Workflow', module: 'Approval', action: 'delete' },
  { code: 'approval.request.read', name: 'View Requests', module: 'Approval', action: 'read' },
  { code: 'approval.request.approve', name: 'Approve Request', module: 'Approval', action: 'approve' },
  { code: 'approval.request.reject', name: 'Reject Request', module: 'Approval', action: 'reject' },
  { code: 'approval.request.reassign', name: 'Reassign Request', module: 'Approval', action: 'reassign' },
  { code: 'approval.request.escalate', name: 'Escalate Request', module: 'Approval', action: 'escalate' },
  
  // General Ledger
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
  
  // Reports
  { code: 'report.dashboard.view', name: 'View Dashboard', module: 'Report', action: 'read' },
  { code: 'report.member.view', name: 'View Member Reports', module: 'Report', action: 'read' },
  { code: 'report.financial.view', name: 'View Financial Reports', module: 'Report', action: 'read' },
  { code: 'report.agent.view', name: 'View Agent Reports', module: 'Report', action: 'read' },
  { code: 'report.claim.view', name: 'View Claim Reports', module: 'Report', action: 'read' },
  { code: 'report.contribution.view', name: 'View Contribution Reports', module: 'Report', action: 'read' },
  { code: 'report.audit.view', name: 'View Audit Logs', module: 'Report', action: 'read' },
];
```

---

## Total Permissions Summary

| Module | Count |
|--------|-------|
| IAM | 11 |
| Organization | 16 |
| Agent | 9 |
| Member | 17 |
| Wallet | 9 |
| Death Claim | 12 |
| Contribution | 9 |
| Approval | 9 |
| General Ledger | 11 |
| Reports | 7 |
| **Total** | **110** |