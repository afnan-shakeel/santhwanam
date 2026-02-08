/**
 * Seed: System Configuration
 * Creates system-wide configuration settings
 * Order: 8
 * Dependencies: None (runs independently)
 */

import { PrismaClient } from '../../src/generated/prisma/client';
import { SYSTEM_CONFIG } from '../data/system-config.data';

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

export async function seedSystemConfig(context: SeedContext): Promise<SeedResult> {
  const { prisma, adminUserId } = context;

  let created = 0;
  let skipped = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const config of SYSTEM_CONFIG) {
        // Check if config key already exists
        const existing = await tx.systemConfiguration.findUnique({
          where: { key: config.key },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create new config
        await tx.systemConfiguration.create({
          data: {
            key: config.key,
            value: config.value,
            description: config.description,
            dataType: config.dataType,
            updatedBy: adminUserId || 'system',
          },
        });

        created++;
      }
    });

    return { name: 'System Configuration', success: true, created, skipped };
  } catch (error: any) {
    return {
      name: 'System Configuration',
      success: false,
      created,
      skipped,
      error: error.message,
    };
  }
}
