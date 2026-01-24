/**
 * Seed: Approval Workflows
 * Creates default approval workflows and stages
 * Order: 7
 * Dependencies: Admin User and System Roles must be seeded first
 */

import { PrismaClient } from '../../src/generated/prisma/client';
import { DEFAULT_WORKFLOWS } from '../data/approval-workflows.data';

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

export async function seedApprovalWorkflows(context: SeedContext): Promise<SeedResult> {
  const { prisma, adminUserId } = context;

  if (!adminUserId) {
    return {
      name: 'Approval Workflows',
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
      // Get roles for stage assignment
      const roleMap = new Map();
      const roles = await tx.role.findMany({
        where: { isSystemRole: true },
      });

      roles.forEach((role) => {
        roleMap.set(role.roleCode, role.roleId);
      });

      for (const workflowData of DEFAULT_WORKFLOWS) {
        // Check if workflow already exists
        const existing = await tx.approvalWorkflow.findUnique({
          where: { workflowCode: workflowData.code },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create workflow
        const workflow = await tx.approvalWorkflow.create({
          data: {
            workflowCode: workflowData.code,
            workflowName: workflowData.name,
            description: workflowData.description,
            module: workflowData.module as any,
            entityType: workflowData.code,
            isActive: true,
            requiresAllStages: true,
            createdBy: adminUserId,
          },
        });

        // Create stages
        for (const stageData of workflowData.stages) {
          let stageRoleId: string | undefined;

          // Resolve role ID if stage is Role-based
          if (stageData.approverType === 'Role' && stageData.roleCode) {
            stageRoleId = roleMap.get(stageData.roleCode);

            if (!stageRoleId) {
              throw new Error(`Role '${stageData.roleCode}' not found for workflow '${workflowData.code}'`);
            }
          }

          await tx.approvalStage.create({
            data: {
              workflowId: workflow.workflowId,
              stageName: stageData.stageName,
              stageOrder: stageData.stageOrder,
              approverType: stageData.approverType as any,
              roleId: stageRoleId,
              isOptional: stageData.isOptional,
              autoApprove: stageData.autoApprove,
              createdBy: adminUserId,
            },
          });
        }

        created++;
      }
    });

    return { name: 'Approval Workflows', success: true, created, skipped };
  } catch (error: any) {
    return {
      name: 'Approval Workflows',
      success: false,
      created,
      skipped,
      error: error.message,
    };
  }
}
