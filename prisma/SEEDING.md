# Database Seeding Documentation

This document describes the seeding setup for the Santhwanam Mutual Aid platform.

## Overview

The seeding system provides:
- **Permissions**: 110 system permissions organized by module
- **Roles**: 6 core system roles with hierarchical permissions
- **Admin User**: Initial super admin user
- **Membership Tiers**: Default membership tiers (Basic, Premium)
- **Chart of Accounts**: GL accounts for financial tracking
- **Approval Workflows**: Default approval workflows for key processes

## Seeding Principles

1. **Idempotent** - Seeds can be run multiple times safely
2. **Ordered** - Seeds execute in dependency order
3. **Transactional** - Each seed wrapped in database transaction
4. **Environment-aware** - Respects environment variables
5. **Auditable** - Proper `createdBy` fields tracked

## Project Structure

```
prisma/
├── seed.ts                    # Entry point (called by npm run seed)
├── seeds/
│   ├── index.ts              # Main seed runner & orchestrator
│   ├── seed-permissions.ts
│   ├── seed-system-roles.ts
│   ├── seed-admin-user.ts
│   ├── seed-role-permissions.ts
│   ├── seed-membership-tiers.ts
│   ├── seed-chart-of-accounts.ts
│   ├── seed-approval-workflows.ts
│   └── demo/                 # (Future demo seeds)
└── data/
    ├── permissions.data.ts
    ├── system-roles.data.ts
    ├── chart-of-accounts.data.ts
    └── approval-workflows.data.ts
```

## Seed Execution Order

| Order | Seed | Created | Dependencies |
|-------|------|---------|--------------|
| 1 | Permissions | 110 permissions | None |
| 2 | System Roles | 6 roles | None |
| 3 | Admin User | 1 user + 1 role assignment | Roles |
| 4 | Role Permissions | ~200 role-permission links | Permissions, Roles |
| 5 | Membership Tiers | 2 tiers (Basic, Premium) | Admin User |
| 6 | Chart of Accounts | 10 accounts | Admin User |
| 7 | Approval Workflows | 4 workflows + stages | Admin User, Roles |

## Running Seeds

### First Time Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:dbpush

# Run all seeds
npm run seed
```

### Database Reset (Development Only)

```bash
# ⚠️  CAUTION: Resets entire database
npm run db:reset
```

### Reseed Only (Preserve Existing Data)

```bash
# Run seeds without resetting database
npm run seed
```

## Environment Variables

Configure the admin user via environment variables:

```env
# Optional: Override admin email (default: admin@santhwanam.local)
ADMIN_EMAIL=your-admin@email.com

# Optional: Override admin external auth ID
ADMIN_EXTERNAL_ID=custom-admin-id
```

## System Roles

### 1. Super Administrator
- **Code**: `super_admin`
- **Scope**: None (system-wide)
- **Permissions**: All 110 permissions
- **Usage**: System admin with full access

### 2. Forum Administrator
- **Code**: `forum_admin`
- **Scope**: Forum
- **Permissions**: ~80 permissions
- **Usage**: Manages entire forum (areas, units, agents)

### 3. Area Administrator
- **Code**: `area_admin`
- **Scope**: Area
- **Permissions**: ~50 permissions
- **Usage**: Manages area and its units

### 4. Unit Administrator
- **Code**: `unit_admin`
- **Scope**: Unit
- **Permissions**: ~30 permissions
- **Usage**: Manages unit and its agents

### 5. Agent
- **Code**: `agent`
- **Scope**: Agent
- **Permissions**: ~20 permissions
- **Usage**: Registers and manages own members

### 6. Member
- **Code**: `member`
- **Scope**: Member
- **Permissions**: ~10 permissions
- **Usage**: Self-service member access

## Permissions By Module

| Module | Count | Examples |
|--------|-------|----------|
| IAM | 11 | user.*, role.*, permission.read |
| Organization | 16 | forum.*, area.*, unit.*, tier.* |
| Agent | 9 | agent.create, agent.read, agent.suspend |
| Member | 17 | member.*, nominee.*, document.* |
| Wallet | 9 | wallet.read, wallet.balance.view, wallet.deposit.* |
| Claim | 12 | claim.*, claim.document.* |
| Contribution | 9 | contribution.cycle.*, contribution.collect |
| Approval | 9 | approval.workflow.*, approval.request.* |
| GL | 11 | gl.account.*, gl.entry.*, gl.report.* |
| Report | 7 | report.dashboard.view, report.*.view |
| **Total** | **110** | — |

## Membership Tiers

### Basic Tier
- Registration Fee: 500
- Advance Deposit: 100
- Contribution Amount: 100
- Death Benefit: 50,000
- Default: Yes

### Premium Tier
- Registration Fee: 1,000
- Advance Deposit: 250
- Contribution Amount: 250
- Death Benefit: 100,000
- Default: No

## Chart of Accounts

### Asset Accounts (1xxx)
- 1000: Cash on Hand
- 1100: Bank Account
- 1200: Accounts Receivable

### Liability Accounts (2xxx)
- 2100: Member Wallet Liability
- 2200: Death Benefit Payable

### Revenue Accounts (4xxx)
- 4100: Registration Fee Revenue
- 4200: Contribution Revenue
- 4300: Donation Revenue

### Expense Accounts (5xxx)
- 5100: Death Benefit Expense
- 5200: Administrative Expenses

## Approval Workflows

### 1. Agent Registration
- **Stages**: 3 (Unit → Area → Forum Admin)
- **Status**: Draft → PendingApproval → Approved/Rejected

### 2. Member Registration
- **Stages**: 3 (Agent → Unit Admin → Area Admin)
- **Status**: Draft → PendingApproval → Approved/Rejected

### 3. Wallet Deposit
- **Stages**: 2 (Unit Admin → Area Admin, optional)
- **Status**: Draft → PendingApproval → Approved/Rejected

### 4. Death Claim Approval
- **Stages**: 3 (Unit → Area → Forum Admin)
- **Status**: Reported → UnderVerification → PendingApproval → Approved/Settled

## Verification

After running seeds, verify data was created:

```bash
# Check permissions
npm run prisma:studio
# Navigate to Permission table

# Check roles
# Navigate to Role table

# Check admin user
# Navigate to User table

# Check membership tiers
# Navigate to MembershipTier table

# Check GL accounts
# Navigate to ChartOfAccount table

# Check workflows
# Navigate to ApprovalWorkflow table
```

## Troubleshooting

### Error: "Super Admin role not found"
- This means `seed-system-roles` hasn't run yet
- Ensure seeds run in the correct order
- Run: `npm run seed`

### Error: "Admin user ID not found in context"
- Previous seed (Admin User) failed
- Check logs for the actual error
- Run: `npm run seed`

### Error: "Database connection failed"
- Ensure DATABASE_URL is set in .env
- Ensure database is running
- Check connection string format

### Duplicate key error on re-run
- Seeds are idempotent and skip existing records
- Check database state with Prisma Studio
- Run: `npm run prisma:studio`

## Adding New Seeds

To add a new seed:

1. Create data file in `prisma/data/`
   ```typescript
   export const NEW_DATA = [/* ... */];
   ```

2. Create seed function in `prisma/seeds/seed-new-feature.ts`
   ```typescript
   export async function seedNewFeature(context: SeedContext): Promise<SeedResult> {
     // Implementation
   }
   ```

3. Add to CORE_SEEDS array in `prisma/seeds/index.ts`
   ```typescript
   { name: 'New Feature', fn: seedNewFeature },
   ```

## Best Practices

1. **Always make seeds idempotent** - Check before insert
2. **Use transactions** - Atomic operation for each seed
3. **Document dependencies** - Which seeds must run first
4. **Handle errors gracefully** - Return SeedResult with error
5. **Add audit fields** - Track `createdBy`, `createdAt`
6. **Test on clean database** - Run `db:reset` before committing

## Related Documentation

- See `docs/domain/10-domain-iam-permissions-specs.md` for permission details
- See `docs/infrastructure/00-database-seeding-specs.md` for architecture
- See `docs/architecture.md` for overall system design
