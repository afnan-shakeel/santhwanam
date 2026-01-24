# Database Seeding Specification

This document defines the seeding strategy for the Mutual Aid / Death Benefit platform.

---

## Seeding Principles

1. **Idempotent** - Seeds can be run multiple times safely (check before insert)
2. **Ordered** - Seeds execute in dependency order
3. **Transactional** - Each seed wrapped in transaction for atomicity
4. **Environment-aware** - Core seeds for all envs, demo seeds for dev/staging only
5. **Auditable** - Proper `createdBy`, `createdAt` fields set

---

## Seed Execution Order

| Order | Seed File | Description | Environment |
|-------|-----------|-------------|-------------|
| 1 | `seed-permissions.ts` | All system permissions | All |
| 2 | `seed-system-roles.ts` | System roles (Super Admin, etc.) | All |
| 3 | `seed-admin-user.ts` | Initial admin user | All |
| 4 | `seed-role-permissions.ts` | Assign permissions to roles | All |
| 5 | `seed-membership-tiers.ts` | Default membership tiers | All |
| 6 | `seed-chart-of-accounts.ts` | GL system accounts | All |
| 7 | `seed-approval-workflows.ts` | Default approval workflows | All |
| 8 | `seed-demo-organization.ts` | Demo forum/area/unit | Dev/Staging |
| 9 | `seed-demo-agents.ts` | Demo agents | Dev/Staging |
| 10 | `seed-demo-members.ts` | Demo members | Dev/Staging |

---

## Project Structure

```
prisma/
  ├── seeds/
  │   ├── index.ts                    # Seed runner
  │   ├── seed-permissions.ts
  │   ├── seed-system-roles.ts
  │   ├── seed-admin-user.ts
  │   ├── seed-role-permissions.ts
  │   ├── seed-membership-tiers.ts
  │   ├── seed-chart-of-accounts.ts
  │   ├── seed-approval-workflows.ts
  │   └── demo/
  │       ├── seed-demo-organization.ts
  │       ├── seed-demo-agents.ts
  │       └── seed-demo-members.ts
  └── data/
      ├── permissions.data.ts
      ├── system-roles.data.ts
      ├── chart-of-accounts.data.ts
      └── approval-workflows.data.ts
```

---

## Implementation

### Base Seed Runner

```typescript
// prisma/seeds/index.ts
import { PrismaClient } from '@prisma/client';
import { seedPermissions } from './seed-permissions';
import { seedSystemRoles } from './seed-system-roles';
import { seedAdminUser } from './seed-admin-user';
import { seedRolePermissions } from './seed-role-permissions';
import { seedMembershipTiers } from './seed-membership-tiers';
import { seedChartOfAccounts } from './seed-chart-of-accounts';
import { seedApprovalWorkflows } from './seed-approval-workflows';

const prisma = new PrismaClient();

interface SeedContext {
  prisma: PrismaClient;
  adminUserId?: string;
}

interface SeedResult {
  name: string;
  success: boolean;
  created: number;
  skipped: number;
  error?: string;
}

const CORE_SEEDS = [
  { name: 'Permissions', fn: seedPermissions },
  { name: 'System Roles', fn: seedSystemRoles },
  { name: 'Admin User', fn: seedAdminUser },
  { name: 'Role Permissions', fn: seedRolePermissions },
  { name: 'Membership Tiers', fn: seedMembershipTiers },
  { name: 'Chart of Accounts', fn: seedChartOfAccounts },
  { name: 'Approval Workflows', fn: seedApprovalWorkflows },
];

async function runSeeds() {
  console.log('🌱 Starting database seeding...\n');
  
  const context: SeedContext = { prisma };
  const results: SeedResult[] = [];
  
  for (const seed of CORE_SEEDS) {
    console.log(`📦 Running: ${seed.name}...`);
    
    try {
      const result = await seed.fn(context);
      results.push({ name: seed.name, success: true, ...result });
      console.log(`   ✅ Created: ${result.created}, Skipped: ${result.skipped}\n`);
    } catch (error: any) {
      results.push({ 
        name: seed.name, 
        success: false, 
        created: 0, 
        skipped: 0, 
        error: error.message 
      });
      console.error(`   ❌ Error: ${error.message}\n`);
      // Stop on error - seeds are dependent
      break;
    }
  }
  
  // Summary
  console.log('\n📊 Seeding Summary:');
  console.log('─'.repeat(50));
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.created} created, ${result.skipped} skipped`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  const allSuccess = results.every(r => r.success);
  console.log('─'.repeat(50));
  console.log(allSuccess ? '🎉 All seeds completed!' : '⚠️ Seeding incomplete due to errors');
  
  return allSuccess;
}

// Run
runSeeds()
  .then(async (success) => {
    await prisma.$disconnect();
    process.exit(success ? 0 : 1);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

---

### Seed 1: Permissions

```typescript
// prisma/seeds/seed-permissions.ts
import { SeedContext } from './index';
import { PERMISSION_SEEDS } from '../data/permissions.data';

export async function seedPermissions(context: SeedContext) {
  const { prisma } = context;
  
  let created = 0;
  let skipped = 0;
  
  await prisma.$transaction(async (tx) => {
    for (const permission of PERMISSION_SEEDS) {
      // Check if exists
      const existing = await tx.permission.findUnique({
        where: { permissionCode: permission.code }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create
      await tx.permission.create({
        data: {
          permissionId: crypto.randomUUID(),
          permissionCode: permission.code,
          permissionName: permission.name,
          description: permission.description || null,
          module: permission.module,
          action: permission.action,
          isActive: true,
          createdAt: new Date()
        }
      });
      
      created++;
    }
  });
  
  return { created, skipped };
}
```

```typescript
// prisma/data/permissions.data.ts
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

### Seed 2: System Roles

```typescript
// prisma/seeds/seed-system-roles.ts
import { SeedContext } from './index';
import { SYSTEM_ROLES } from '../data/system-roles.data';

export async function seedSystemRoles(context: SeedContext) {
  const { prisma } = context;
  
  let created = 0;
  let skipped = 0;
  
  await prisma.$transaction(async (tx) => {
    for (const role of SYSTEM_ROLES) {
      // Check if exists
      const existing = await tx.role.findUnique({
        where: { roleCode: role.code }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create
      await tx.role.create({
        data: {
          roleId: crypto.randomUUID(),
          roleCode: role.code,
          roleName: role.name,
          description: role.description,
          scopeType: role.scopeType,
          isActive: true,
          isSystemRole: true,
          createdAt: new Date()
        }
      });
      
      created++;
    }
  });
  
  return { created, skipped };
}
```

```typescript
// prisma/data/system-roles.data.ts
export const SYSTEM_ROLES = [
  {
    code: 'super_admin',
    name: 'Super Administrator',
    description: 'Full system access with no scope restrictions',
    scopeType: 'None'
  },
  {
    code: 'forum_admin',
    name: 'Forum Administrator',
    description: 'Manages a forum and all its areas, units, and agents',
    scopeType: 'Forum'
  },
  {
    code: 'area_admin',
    name: 'Area Administrator',
    description: 'Manages an area and its units and agents',
    scopeType: 'Area'
  },
  {
    code: 'unit_admin',
    name: 'Unit Administrator',
    description: 'Manages a unit and its agents',
    scopeType: 'Unit'
  },
  {
    code: 'agent',
    name: 'Agent',
    description: 'Registers and manages members within their assignment',
    scopeType: 'Agent'
  },
  {
    code: 'member',
    name: 'Member',
    description: 'Basic member with self-service access',
    scopeType: 'Member'
  }
];

// Permission assignments for each role
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'], // All permissions
  
  forum_admin: [
    // IAM (limited)
    'iam.user.read', 'iam.role.read', 'iam.role.assign', 'iam.role.revoke', 'iam.permission.read',
    // Organization
    'org.forum.read', 'org.forum.update',
    'org.area.create', 'org.area.read', 'org.area.update', 'org.area.delete',
    'org.unit.create', 'org.unit.read', 'org.unit.update', 'org.unit.delete',
    'org.tier.read',
    // Agent
    'agent.create', 'agent.read', 'agent.update', 'agent.delete',
    'agent.suspend', 'agent.reactivate', 'agent.reassign', 'agent.export',
    // Member
    'member.create', 'member.read', 'member.update', 'member.delete',
    'member.approve', 'member.reject', 'member.suspend', 'member.reactivate',
    'member.transfer', 'member.export',
    'member.nominee.create', 'member.nominee.read', 'member.nominee.update', 'member.nominee.delete',
    'member.document.upload', 'member.document.read', 'member.document.delete',
    // Wallet
    'wallet.read', 'wallet.balance.view', 'wallet.transaction.read',
    'wallet.deposit.create', 'wallet.deposit.approve', 'wallet.deposit.reject',
    'wallet.adjustment.create', 'wallet.refund.create', 'wallet.export',
    // Claim
    'claim.create', 'claim.read', 'claim.update', 'claim.delete',
    'claim.submit', 'claim.approve', 'claim.reject', 'claim.settle', 'claim.export',
    'claim.document.upload', 'claim.document.read', 'claim.document.verify',
    // Contribution
    'contribution.cycle.create', 'contribution.cycle.read', 'contribution.cycle.update', 'contribution.cycle.close',
    'contribution.read', 'contribution.collect', 'contribution.acknowledge', 'contribution.miss', 'contribution.export',
    // Approval
    'approval.workflow.read',
    'approval.request.read', 'approval.request.approve', 'approval.request.reject', 'approval.request.reassign',
    // GL (read only)
    'gl.account.read', 'gl.entry.read', 'gl.period.read', 'gl.report.view', 'gl.report.export',
    // Reports
    'report.dashboard.view', 'report.member.view', 'report.financial.view',
    'report.agent.view', 'report.claim.view', 'report.contribution.view',
  ],
  
  area_admin: [
    // Organization
    'org.area.read', 'org.area.update',
    'org.unit.create', 'org.unit.read', 'org.unit.update', 'org.unit.delete',
    'org.tier.read',
    // Agent
    'agent.create', 'agent.read', 'agent.update', 'agent.suspend', 'agent.reactivate', 'agent.export',
    // Member
    'member.create', 'member.read', 'member.update',
    'member.approve', 'member.reject', 'member.suspend', 'member.reactivate', 'member.export',
    'member.nominee.create', 'member.nominee.read', 'member.nominee.update', 'member.nominee.delete',
    'member.document.upload', 'member.document.read', 'member.document.delete',
    // Wallet
    'wallet.read', 'wallet.balance.view', 'wallet.transaction.read',
    'wallet.deposit.create', 'wallet.deposit.approve', 'wallet.deposit.reject', 'wallet.export',
    // Claim
    'claim.create', 'claim.read', 'claim.update',
    'claim.document.upload', 'claim.document.read', 'claim.document.verify',
    // Contribution
    'contribution.cycle.read', 'contribution.read', 'contribution.collect', 'contribution.acknowledge', 'contribution.export',
    // Approval
    'approval.request.read', 'approval.request.approve', 'approval.request.reject',
    // Reports
    'report.dashboard.view', 'report.member.view', 'report.agent.view',
  ],
  
  unit_admin: [
    // Organization
    'org.unit.read', 'org.unit.update', 'org.tier.read',
    // Agent
    'agent.create', 'agent.read', 'agent.update', 'agent.suspend', 'agent.reactivate',
    // Member
    'member.create', 'member.read', 'member.update',
    'member.approve', 'member.reject', 'member.suspend', 'member.reactivate',
    'member.nominee.create', 'member.nominee.read', 'member.nominee.update', 'member.nominee.delete',
    'member.document.upload', 'member.document.read', 'member.document.delete',
    // Wallet
    'wallet.balance.view', 'wallet.transaction.read',
    'wallet.deposit.create', 'wallet.deposit.approve', 'wallet.deposit.reject',
    // Claim
    'claim.create', 'claim.read', 'claim.document.upload', 'claim.document.read',
    // Contribution
    'contribution.cycle.read', 'contribution.read', 'contribution.collect', 'contribution.acknowledge',
    // Approval
    'approval.request.read', 'approval.request.approve', 'approval.request.reject',
    // Reports
    'report.dashboard.view', 'report.member.view',
  ],
  
  agent: [
    // Organization
    'org.tier.read',
    // Agent (self only)
    'agent.read', 'agent.profile.update',
    // Member (own members)
    'member.create', 'member.read', 'member.update',
    'member.nominee.create', 'member.nominee.read', 'member.nominee.update', 'member.nominee.delete',
    'member.document.upload', 'member.document.read',
    // Wallet (own members)
    'wallet.balance.view', 'wallet.deposit.create',
    // Claim
    'claim.create', 'claim.read', 'claim.document.upload', 'claim.document.read',
    // Contribution
    'contribution.cycle.read', 'contribution.read', 'contribution.collect', 'contribution.acknowledge',
    // Reports
    'report.dashboard.view',
  ],
  
  member: [
    // Member (self only)
    'member.read', 'member.profile.update',
    'member.nominee.read',
    // Wallet (self only)
    'wallet.balance.view', 'wallet.transaction.read', 'wallet.deposit.create',
    // Claim (related)
    'claim.read',
    // Contribution (self only)
    'contribution.read',
  ],
};
```

---

### Seed 3: Admin User

```typescript
// prisma/seeds/seed-admin-user.ts
import { SeedContext } from './index';
import { createClient } from '@supabase/supabase-js';

// Configuration - can be moved to env
const ADMIN_CONFIG = {
  email: process.env.ADMIN_EMAIL || 'admin@system.local',
  password: process.env.ADMIN_PASSWORD || 'Admin@123!',
  firstName: 'System',
  lastName: 'Administrator'
};

export async function seedAdminUser(context: SeedContext) {
  const { prisma } = context;
  
  let created = 0;
  let skipped = 0;
  
  // Check if admin user already exists in local DB
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: ADMIN_CONFIG.email },
        { userRoles: { some: { role: { roleCode: 'super_admin' } } } }
      ]
    }
  });
  
  if (existingUser) {
    // Store adminUserId in context for subsequent seeds
    context.adminUserId = existingUser.userId;
    return { created: 0, skipped: 1 };
  }
  
  // Initialize Supabase Admin client
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  await prisma.$transaction(async (tx) => {
    // 1. Check if user exists in Supabase
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(
      u => u.email === ADMIN_CONFIG.email
    );
    
    let supabaseUserId: string;
    
    if (existingAuthUser) {
      // Use existing Supabase user
      supabaseUserId = existingAuthUser.id;
    } else {
      // 2. Create Supabase user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: ADMIN_CONFIG.email,
        password: ADMIN_CONFIG.password,
        email_confirm: true // Auto-confirm for admin
      });
      
      if (authError || !authData.user) {
        throw new Error(`Failed to create Supabase user: ${authError?.message}`);
      }
      
      supabaseUserId = authData.user.id;
    }
    
    // 3. Create local user
    const userId = crypto.randomUUID();
    
    await tx.user.create({
      data: {
        userId,
        externalAuthId: supabaseUserId,
        email: ADMIN_CONFIG.email,
        firstName: ADMIN_CONFIG.firstName,
        lastName: ADMIN_CONFIG.lastName,
        isActive: true,
        createdAt: new Date()
      }
    });
    
    // 4. Get super_admin role
    const superAdminRole = await tx.role.findUnique({
      where: { roleCode: 'super_admin' }
    });
    
    if (!superAdminRole) {
      throw new Error('Super Admin role not found. Run seed-system-roles first.');
    }
    
    // 5. Assign super_admin role to user
    await tx.userRole.create({
      data: {
        userRoleId: crypto.randomUUID(),
        userId,
        roleId: superAdminRole.roleId,
        scopeEntityType: null,
        scopeEntityId: null,
        isActive: true,
        assignedAt: new Date()
      }
    });
    
    // Store adminUserId in context for subsequent seeds
    context.adminUserId = userId;
    created++;
  });
  
  return { created, skipped };
}
```

---

### Seed 4: Role Permissions

```typescript
// prisma/seeds/seed-role-permissions.ts
import { SeedContext } from './index';
import { ROLE_PERMISSIONS } from '../data/system-roles.data';

export async function seedRolePermissions(context: SeedContext) {
  const { prisma } = context;
  
  let created = 0;
  let skipped = 0;
  
  await prisma.$transaction(async (tx) => {
    // Get all roles
    const roles = await tx.role.findMany({
      where: { isSystemRole: true }
    });
    
    // Get all permissions
    const allPermissions = await tx.permission.findMany();
    const permissionMap = new Map(allPermissions.map(p => [p.permissionCode, p]));
    
    for (const role of roles) {
      const permissionCodes = ROLE_PERMISSIONS[role.roleCode] || [];
      
      // Handle '*' for super_admin (all permissions)
      const targetCodes = permissionCodes.includes('*') 
        ? allPermissions.map(p => p.permissionCode)
        : permissionCodes;
      
      for (const code of targetCodes) {
        const permission = permissionMap.get(code);
        
        if (!permission) {
          console.warn(`   ⚠️ Permission not found: ${code}`);
          continue;
        }
        
        // Check if already assigned
        const existing = await tx.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: role.roleId,
              permissionId: permission.permissionId
            }
          }
        });
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Assign permission to role
        await tx.rolePermission.create({
          data: {
            rolePermissionId: crypto.randomUUID(),
            roleId: role.roleId,
            permissionId: permission.permissionId,
            createdAt: new Date()
          }
        });
        
        created++;
      }
    }
  });
  
  return { created, skipped };
}
```

---

### Seed 5: Membership Tiers

```typescript
// prisma/seeds/seed-membership-tiers.ts
import { SeedContext } from './index';

const DEFAULT_TIERS = [
  {
    code: 'BASIC',
    name: 'Basic Tier',
    description: 'Standard membership tier with basic benefits',
    registrationFee: 500,
    minimumAdvanceDeposit: 100,
    contributionAmount: 100,
    deathBenefitAmount: 50000,
    isDefault: true
  }
];

export async function seedMembershipTiers(context: SeedContext) {
  const { prisma, adminUserId } = context;
  
  if (!adminUserId) {
    throw new Error('Admin user ID not found in context. Run seed-admin-user first.');
  }
  
  let created = 0;
  let skipped = 0;
  
  await prisma.$transaction(async (tx) => {
    for (const tier of DEFAULT_TIERS) {
      // Check if exists
      const existing = await tx.membershipTier.findUnique({
        where: { tierCode: tier.code }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create
      await tx.membershipTier.create({
        data: {
          tierId: crypto.randomUUID(),
          tierCode: tier.code,
          tierName: tier.name,
          description: tier.description,
          registrationFee: tier.registrationFee,
          minimumAdvanceDeposit: tier.minimumAdvanceDeposit,
          contributionAmount: tier.contributionAmount,
          deathBenefitAmount: tier.deathBenefitAmount,
          isDefault: tier.isDefault,
          isActive: true,
          createdAt: new Date(),
          createdBy: adminUserId
        }
      });
      
      created++;
    }
  });
  
  return { created, skipped };
}
```

---

### Seed 6: Chart of Accounts

```typescript
// prisma/seeds/seed-chart-of-accounts.ts
import { SeedContext } from './index';
import { SYSTEM_ACCOUNTS } from '../data/chart-of-accounts.data';

export async function seedChartOfAccounts(context: SeedContext) {
  const { prisma, adminUserId } = context;
  
  if (!adminUserId) {
    throw new Error('Admin user ID not found in context. Run seed-admin-user first.');
  }
  
  let created = 0;
  let skipped = 0;
  
  await prisma.$transaction(async (tx) => {
    for (const account of SYSTEM_ACCOUNTS) {
      // Check if exists
      const existing = await tx.chartOfAccount.findUnique({
        where: { accountCode: account.code }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create
      await tx.chartOfAccount.create({
        data: {
          accountId: crypto.randomUUID(),
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          accountCategory: account.category,
          normalBalance: account.normalBalance,
          currentBalance: 0,
          isActive: true,
          isSystemAccount: true,
          createdAt: new Date(),
          createdBy: adminUserId
        }
      });
      
      created++;
    }
  });
  
  return { created, skipped };
}
```

```typescript
// prisma/data/chart-of-accounts.data.ts
export const SYSTEM_ACCOUNTS = [
  // Assets (1xxx)
  { code: '1000', name: 'Cash on Hand', type: 'Asset', category: 'Current Assets', normalBalance: 'Debit' },
  { code: '1100', name: 'Bank Account', type: 'Asset', category: 'Current Assets', normalBalance: 'Debit' },
  { code: '1200', name: 'Accounts Receivable', type: 'Asset', category: 'Current Assets', normalBalance: 'Debit' },
  
  // Liabilities (2xxx)
  { code: '2100', name: 'Member Wallet Liability', type: 'Liability', category: 'Current Liabilities', normalBalance: 'Credit' },
  { code: '2200', name: 'Death Benefit Payable', type: 'Liability', category: 'Current Liabilities', normalBalance: 'Credit' },
  
  // Revenue (4xxx)
  { code: '4100', name: 'Registration Fee Revenue', type: 'Revenue', category: 'Operating Revenue', normalBalance: 'Credit' },
  { code: '4200', name: 'Contribution Revenue', type: 'Revenue', category: 'Operating Revenue', normalBalance: 'Credit' },
  { code: '4300', name: 'Donation Revenue', type: 'Revenue', category: 'Non-Operating Revenue', normalBalance: 'Credit' },
  
  // Expenses (5xxx)
  { code: '5100', name: 'Death Benefit Expense', type: 'Expense', category: 'Operating Expenses', normalBalance: 'Debit' },
  { code: '5200', name: 'Administrative Expenses', type: 'Expense', category: 'Operating Expenses', normalBalance: 'Debit' },
];
```

---

### Seed 7: Approval Workflows

```typescript
// prisma/seeds/seed-approval-workflows.ts
import { SeedContext } from './index';
import { DEFAULT_WORKFLOWS } from '../data/approval-workflows.data';

export async function seedApprovalWorkflows(context: SeedContext) {
  const { prisma, adminUserId } = context;
  
  if (!adminUserId) {
    throw new Error('Admin user ID not found in context. Run seed-admin-user first.');
  }
  
  let created = 0;
  let skipped = 0;
  
  await prisma.$transaction(async (tx) => {
    // Get roles for stage assignment
    const roles = await tx.role.findMany();
    const roleMap = new Map(roles.map(r => [r.roleCode, r]));
    
    for (const workflow of DEFAULT_WORKFLOWS) {
      // Check if exists
      const existing = await tx.approvalWorkflow.findUnique({
        where: { workflowCode: workflow.code }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create workflow
      const workflowId = crypto.randomUUID();
      
      await tx.approvalWorkflow.create({
        data: {
          workflowId,
          workflowCode: workflow.code,
          workflowName: workflow.name,
          description: workflow.description,
          module: workflow.module,
          entityType: workflow.entityType,
          isActive: true,
          requiresAllStages: workflow.requiresAllStages,
          createdAt: new Date(),
          createdBy: adminUserId
        }
      });
      
      // Create stages
      for (const stage of workflow.stages) {
        const role = roleMap.get(stage.roleCode);
        
        await tx.approvalStage.create({
          data: {
            stageId: crypto.randomUUID(),
            workflowId,
            stageName: stage.name,
            stageOrder: stage.order,
            approverType: 'Role',
            roleId: role?.roleId || null,
            organizationBody: stage.organizationBody,
            isOptional: stage.isOptional || false,
            autoApprove: stage.autoApprove || false,
            createdAt: new Date()
          }
        });
      }
      
      created++;
    }
  });
  
  return { created, skipped };
}
```

```typescript
// prisma/data/approval-workflows.data.ts
export const DEFAULT_WORKFLOWS = [
  {
    code: 'agent_registration',
    name: 'Agent Registration Approval',
    description: 'Approval workflow for new agent registrations',
    module: 'Agent',
    entityType: 'Agent',
    requiresAllStages: true,
    stages: [
      { order: 1, name: 'Admin Review', roleCode: 'forum_admin', organizationBody: 'Forum', isOptional: false }
    ]
  },
  {
    code: 'member_registration',
    name: 'Member Registration Approval',
    description: 'Approval workflow for new member registrations',
    module: 'Membership',
    entityType: 'Member',
    requiresAllStages: true,
    stages: [
      { order: 1, name: 'Unit Admin Review', roleCode: 'forum_admin', organizationBody: 'Forum', isOptional: false }
    ]
  },
  {
    code: 'wallet_deposit',
    name: 'Wallet Deposit Approval',
    description: 'Approval workflow for wallet deposit requests',
    module: 'Wallet',
    entityType: 'WalletDepositRequest',
    requiresAllStages: true,
    stages: [
      { order: 1, name: 'Unit Admin Approval', roleCode: 'unit_admin', organizationBody: 'Unit', isOptional: false }
    ]
  },
  {
    code: 'death_claim_approval',
    name: 'Death Claim Approval',
    description: 'Approval workflow for death claim processing',
    module: 'Claims',
    entityType: 'DeathClaim',
    requiresAllStages: true,
    stages: [
      { order: 1, name: 'Forum Admin Approval', roleCode: 'forum_admin', organizationBody: 'Forum', isOptional: false }
    ]
  }
];
```

---

## Running Seeds

### Package.json Scripts

```json
{
  "scripts": {
    "db:seed": "ts-node src/database/seeds/index.ts",
    "db:seed:demo": "ts-node src/database/seeds/demo/index.ts",
    "db:reset": "prisma migrate reset && npm run db:seed"
  }
}
```

### Environment Variables Required

```env
# Supabase (for admin user creation)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key

# Admin user credentials
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=SecurePassword123!

# Database
DATABASE_URL=your-database-url
```

---

## Summary

| Seed | Dependencies | Creates |
|------|--------------|---------|
| Permissions | None | 110 permissions |
| System Roles | None | 6 roles |
| Admin User | Roles | 1 user + 1 role assignment |
| Role Permissions | Permissions, Roles | ~200 role-permission links |
| Membership Tiers | Admin User | 2 tiers |
| Chart of Accounts | Admin User | 13 accounts |
| Approval Workflows | Admin User, Roles | 3 workflows + stages |