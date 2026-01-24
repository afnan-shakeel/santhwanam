/**
 * Seed: System Roles
 * Creates core system roles
 * Order: 2
 * Dependencies: None
 */

import { PrismaClient } from '../../src/generated/prisma/client';
import { SYSTEM_ROLES } from '../data/system-roles.data';

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

export async function seedSystemRoles(context: SeedContext): Promise<SeedResult> {
  const { prisma } = context;

  let created = 0;
  let skipped = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const role of SYSTEM_ROLES) {
        // Check if role already exists
        const existing = await tx.role.findUnique({
          where: { roleCode: role.code },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create new role
        await tx.role.create({
          data: {
            roleCode: role.code,
            roleName: role.name,
            description: role.description,
            scopeType: role.scopeType,
            isSystemRole: true,
            isActive: true,
          },
        });

        created++;
      }
    });

    return { name: 'System Roles', success: true, created, skipped };
  } catch (error: any) {
    return {
      name: 'System Roles',
      success: false,
      created,
      skipped,
      error: error.message,
    };
  }
}
