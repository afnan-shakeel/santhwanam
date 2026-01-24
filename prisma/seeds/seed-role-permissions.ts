/**
 * Seed: Role Permissions
 * Assigns permissions to roles based on configuration
 * Order: 4
 * Dependencies: Permissions and System Roles must be seeded first
 */

import { PrismaClient } from '../../src/generated/prisma/client';
import { ROLE_PERMISSIONS } from '../data/system-roles.data';

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

export async function seedRolePermissions(context: SeedContext): Promise<SeedResult> {
  const { prisma } = context;

  let created = 0;
  let skipped = 0;

  try {
    await prisma.$transaction(async (tx) => {
      // Get all roles
      const roles = await tx.role.findMany({
        where: { isSystemRole: true },
      });

      if (roles.length === 0) {
        throw new Error('No system roles found. Ensure seed-system-roles has been run first.');
      }

      // Get all permissions
      const allPermissions = await tx.permission.findMany();
      const permissionMap = new Map(allPermissions.map((p) => [p.permissionCode, p]));

      if (permissionMap.size === 0) {
        throw new Error('No permissions found. Ensure seed-permissions has been run first.');
      }

      for (const role of roles) {
        const permissionCodes = ROLE_PERMISSIONS[role.roleCode] || [];

        // Get permissions for this role
        const rolePermissions = permissionCodes.flatMap((code) => {
          if (code === '*') {
            // Super admin - add all permissions
            return Array.from(permissionMap.values());
          }

          const permission = permissionMap.get(code);
          return permission ? [permission] : [];
        });

        // Assign permissions to role
        for (const permission of rolePermissions) {
          // Check if role-permission link already exists
          const existing = await tx.rolePermission.findFirst({
            where: {
              roleId: role.roleId,
              permissionId: permission.permissionId,
            },
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Create role-permission link
          await tx.rolePermission.create({
            data: {
              roleId: role.roleId,
              permissionId: permission.permissionId,
            },
          });

          created++;
        }
      }
    });

    return { name: 'Role Permissions', success: true, created, skipped };
  } catch (error: any) {
    return {
      name: 'Role Permissions',
      success: false,
      created,
      skipped,
      error: error.message,
    };
  }
}
