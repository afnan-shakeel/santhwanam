/**
 * Seed: Permissions
 * Creates all system permissions
 * Order: 1
 * Dependencies: None
 */

import { PrismaClient } from '../../src/generated/prisma/client';
import { PERMISSION_SEEDS } from '../data/permissions.data';

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

export async function seedPermissions(context: SeedContext): Promise<SeedResult> {
  const { prisma } = context;

  let created = 0;
  let skipped = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const permission of PERMISSION_SEEDS) {
        // Check if permission already exists
        const existing = await tx.permission.findUnique({
          where: { permissionCode: permission.code },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create new permission
        await tx.permission.create({
          data: {
            permissionCode: permission.code,
            permissionName: permission.name,
            description: `${permission.module} - ${permission.action}`,
            module: permission.module,
            action: permission.action,
            isActive: true,
          },
        });

        created++;
      }
    });

    return { name: 'Permissions', success: true, created, skipped };
  } catch (error: any) {
    return {
      name: 'Permissions',
      success: false,
      created,
      skipped,
      error: error.message,
    };
  }
}
