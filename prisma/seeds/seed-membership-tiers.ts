/**
 * Seed: Membership Tiers
 * Creates default membership tiers
 * Order: 5
 * Dependencies: Admin User must be seeded first
 */

import { PrismaClient, Prisma } from '../../src/generated/prisma/client';

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

const DEFAULT_TIERS = [
  {
    code: 'BASIC',
    name: 'Basic Tier',
    description: 'Standard membership tier with basic benefits',
    registrationFee: new Prisma.Decimal(500),
    advanceDepositAmount: new Prisma.Decimal(100),
    contributionAmount: new Prisma.Decimal(100),
    deathBenefitAmount: new Prisma.Decimal(50000),
    isDefault: true,
  },
  {
    code: 'PREMIUM',
    name: 'Premium Tier',
    description: 'Premium membership tier with enhanced benefits',
    registrationFee: new Prisma.Decimal(1000),
    advanceDepositAmount: new Prisma.Decimal(250),
    contributionAmount: new Prisma.Decimal(250),
    deathBenefitAmount: new Prisma.Decimal(100000),
    isDefault: false,
  },
];

export async function seedMembershipTiers(context: SeedContext): Promise<SeedResult> {
  const { prisma, adminUserId } = context;

  if (!adminUserId) {
    return {
      name: 'Membership Tiers',
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
      for (const tier of DEFAULT_TIERS) {
        // Check if tier already exists
        const existing = await tx.membershipTier.findUnique({
          where: { tierCode: tier.code },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create new tier
        await tx.membershipTier.create({
          data: {
            tierCode: tier.code,
            tierName: tier.name,
            description: tier.description,
            registrationFee: tier.registrationFee,
            advanceDepositAmount: tier.advanceDepositAmount,
            contributionAmount: tier.contributionAmount,
            deathBenefitAmount: tier.deathBenefitAmount,
            isActive: true,
            isDefault: tier.isDefault,
            createdBy: adminUserId,
          },
        });

        created++;
      }
    });

    return { name: 'Membership Tiers', success: true, created, skipped };
  } catch (error: any) {
    return {
      name: 'Membership Tiers',
      success: false,
      created,
      skipped,
      error: error.message,
    };
  }
}
