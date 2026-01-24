/**
 * Seed: Chart of Accounts
 * Creates GL accounts
 * Order: 6
 * Dependencies: Admin User must be seeded first
 */

import { PrismaClient } from '../../src/generated/prisma/client';
import { SYSTEM_ACCOUNTS } from '../data/chart-of-accounts.data';

export interface SeedContext {
  prisma: PrismaClient;
  adminUserId?: string;
}

export interface SeedResult {
  name: string;
  success: boolean;
  created: number;
  skipped: number;
  error?: string;
}

export async function seedChartOfAccounts(context: SeedContext): Promise<SeedResult> {
  const { prisma, adminUserId } = context;

  if (!adminUserId) {
    return {
      name: 'Chart of Accounts',
      success: false,
      created: 0,
      skipped: 0,
      error: 'Admin user ID not found in context. Ensure seed-admin-user has been run first.',
    };
  }

  let created = 0;
  let skipped = 0;

  try {
    await prisma.$transaction(async (tx) => {
      // First pass: Create all accounts without parent references
      const accountIdMap: Record<string, string> = {};
      
      for (const account of SYSTEM_ACCOUNTS) {
        // Check if account already exists
        const existing = await tx.chartOfAccount.findUnique({
          where: { accountCode: account.code },
        });

        if (existing) {
          accountIdMap[account.code] = existing.accountId;
          skipped++;
          continue;
        }

        // Create new account (without parent initially)
        const created_account = await tx.chartOfAccount.create({
          data: {
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type,
            accountCategory: account.category,
            normalBalance: account.normalBalance,
            isActive: true,
            isSystemAccount: account.isSystemAccount,
            accountLevel: 'parentCode' in account ? 2 : 1,
            createdBy: adminUserId,
          },
        });

        accountIdMap[account.code] = created_account.accountId;
        created++;
      }

      // Second pass: Update parent references for child accounts
      for (const account of SYSTEM_ACCOUNTS) {
        if ('parentCode' in account && account.parentCode) {
          const parentAccountId = accountIdMap[account.parentCode];
          if (parentAccountId) {
            await tx.chartOfAccount.update({
              where: { accountCode: account.code },
              data: { parentAccountId: parentAccountId },
            });
          }
        }
      }
    });

    return { name: 'Chart of Accounts', success: true, created, skipped };
  } catch (error: any) {
    return {
      name: 'Chart of Accounts',
      success: false,
      created,
      skipped,
      error: error.message,
    };
  }
}
