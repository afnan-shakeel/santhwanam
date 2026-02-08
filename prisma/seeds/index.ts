/**
 * Main Seed Runner
 * Orchestrates all database seeds in correct dependency order
 *
 * Seed Execution Order:
 * 1. Permissions
 * 2. System Roles
 * 3. Admin User
 * 4. Role Permissions
 * 5. Membership Tiers
 * 6. Chart of Accounts
 * 7. Approval Workflows
 * 8. System Configuration
 */

import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '../../src/generated/prisma/client';
import { seedPermissions, SeedResult, SeedContext } from './seed-permissions';
import { seedSystemRoles } from './seed-system-roles';
import { seedAdminUser } from './seed-admin-user';
import { seedRolePermissions } from './seed-role-permissions';
import { seedMembershipTiers } from './seed-membership-tiers';
import { seedChartOfAccounts } from './seed-chart-of-accounts';
import { seedApprovalWorkflows } from './seed-approval-workflows';
import { seedSystemConfig } from './seed-system-config';

import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
console.log('Database connection string for seeding:', connectionString);
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface SeedFunction {
  name: string;
  fn: (context: SeedContext) => Promise<SeedResult>;
}

const CORE_SEEDS: SeedFunction[] = [
  { name: 'Permissions', fn: seedPermissions },
  { name: 'System Roles', fn: seedSystemRoles },
  { name: 'Admin User', fn: seedAdminUser },
  { name: 'Role Permissions', fn: seedRolePermissions },
  { name: 'Membership Tiers', fn: seedMembershipTiers },
  { name: 'Chart of Accounts', fn: seedChartOfAccounts },
  { name: 'Approval Workflows', fn: seedApprovalWorkflows },
  { name: 'System Configuration', fn: seedSystemConfig },
];


async function runSeeds(): Promise<boolean> {
  console.log('\n🌱 Starting database seeding...\n');

  const context: SeedContext = { prisma };
  const results: SeedResult[] = [];

  for (const seed of CORE_SEEDS) {
    console.log(`📦 Running: ${seed.name}...`);

    try {
      const result = await seed.fn(context);
      results.push(result);

      if (result.success) {
        console.log(`   ✅ Created: ${result.created}, Skipped: ${result.skipped}\n`);
      } else {
        console.log(`   ❌ Error: ${result.error}\n`);
        break;
      }
    } catch (error: any) {
      results.push({
        name: seed.name,
        success: false,
        created: 0,
        skipped: 0,
        error: error.message,
      });
      console.log(`   ❌ Error: ${error.message}\n`);
      break;
    }
  }

  // Print summary
  console.log('\n📊 Seeding Summary:');
  console.log('─'.repeat(60));

  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(
      `${status} ${result.name.padEnd(30)}: ${result.created} created, ${result.skipped} skipped`
    );

    if (result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }
  }

  console.log('─'.repeat(60));

  const allSuccess = results.every((r) => r.success);
  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

  console.log(`\n📈 Total: ${totalCreated} created, ${totalSkipped} skipped`);

  if (allSuccess) {
    console.log('🎉 All seeds completed successfully!\n');
  } else {
    console.log('⚠️  Seeding incomplete due to errors\n');
  }

  return allSuccess;
}

// Run seeds
runSeeds()
  .then(async (success) => {
    await prisma.$disconnect();
    process.exit(success ? 0 : 1);
  })
  .catch(async (e) => {
    console.error('Fatal error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
