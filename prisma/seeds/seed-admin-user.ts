/**
 * Seed: Admin User
 * Creates initial super admin user
 * Order: 3
 * Dependencies: System Roles must be seeded first
 */

import { PrismaClient } from '../../src/generated/prisma/client';

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

// Admin configuration - can be overridden via environment variables
const ADMIN_CONFIG = {
  email: process.env.ADMIN_EMAIL || 'admin@santhwanam.local',
  firstName: 'System',
  lastName: 'Administrator',
  externalAuthId: process.env.ADMIN_EXTERNAL_ID || 'system-admin-001',
};

export async function seedAdminUser(context: SeedContext): Promise<SeedResult> {
  const { prisma } = context;

  try {
    // Check if admin user already exists in local DB
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: ADMIN_CONFIG.email },
          { externalAuthId: ADMIN_CONFIG.externalAuthId },
        ],
      },
    });

    if (existingUser) {
      // Store adminUserId in context for subsequent seeds
      context.adminUserId = existingUser.userId;
      return { name: 'Admin User', success: true, created: 0, skipped: 1 };
    }

    let created = 0;

    await prisma.$transaction(async (tx) => {
      // Get super_admin role
      const superAdminRole = await tx.role.findUnique({
        where: { roleCode: 'super_admin' },
      });

      if (!superAdminRole) {
        throw new Error('Super Admin role not found. Ensure seed-system-roles has been run first.');
      }

      // Create user
      const userId = crypto.randomUUID();

      const user = await tx.user.create({
        data: {
          userId,
          externalAuthId: ADMIN_CONFIG.externalAuthId,
          email: ADMIN_CONFIG.email,
          firstName: ADMIN_CONFIG.firstName,
          lastName: ADMIN_CONFIG.lastName,
          isActive: true,
        },
      });

      // Assign super_admin role
      await tx.userRole.create({
        data: {
          user: { connect: { userId: user.userId } },
          role: { connect: { roleId: superAdminRole.roleId } },
          scopeEntityType: 'None',
        },
      });

      // Store adminUserId in context for subsequent seeds
      context.adminUserId = user.userId;
      created++;
    });

    return { name: 'Admin User', success: true, created, skipped: 0 };
  } catch (error: any) {
    return {
      name: 'Admin User',
      success: false,
      created: 0,
      skipped: 0,
      error: error.message,
    };
  }
}
