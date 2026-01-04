/**
 * Zod validators for Approval Workflow API
 */
import { z } from 'zod';
import { WorkflowModule, ApproverType, ApprovalDecision, organizationBody, } from '../domain/entities';
export const createWorkflowSchema = z.object({
    workflowCode: z.string().min(1),
    workflowName: z.string().min(1),
    description: z.string().optional(),
    module: z.nativeEnum(WorkflowModule),
    entityType: z.string().min(1),
    isActive: z.boolean().optional(),
    requiresAllStages: z.boolean().optional(),
    stages: z.array(z.object({
        stageName: z.string().min(1),
        stageOrder: z.number().int().positive(),
        approverType: z.nativeEnum(ApproverType),
        roleId: z.string().uuid().nullable().optional(),
        userId: z.string().uuid().nullable().optional(),
        organizationBody: z.nativeEnum(organizationBody).nullable().optional(),
        isOptional: z.boolean().optional(),
        autoApprove: z.boolean().optional(),
    })).min(1),
});
export const updateWorkflowSchema = z.object({
    workflowName: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    requiresAllStages: z.boolean().optional(),
    stages: z.array(z.object({
        stageId: z.string().uuid().nullable().optional(), // null/undefined = new stage, uuid = update existing
        stageName: z.string().min(1),
        stageOrder: z.number().int().positive(),
        approverType: z.nativeEnum(ApproverType),
        roleId: z.string().uuid().nullable().optional(),
        userId: z.string().uuid().nullable().optional(),
        organizationBody: z.nativeEnum(organizationBody).nullable().optional(),
        isOptional: z.boolean().optional(),
        autoApprove: z.boolean().optional(),
    })).min(1).optional(),
});
export const submitRequestSchema = z.object({
    workflowCode: z.string().min(1),
    entityType: z.string().min(1),
    entityId: z.string().uuid(),
    forumId: z.string().uuid().nullable().optional(),
    areaId: z.string().uuid().nullable().optional(),
    unitId: z.string().uuid().nullable().optional(),
});
export const processApprovalSchema = z.object({
    executionId: z.string().uuid(),
    decision: z.nativeEnum(ApprovalDecision),
    comments: z.string().optional(),
});
//# sourceMappingURL=validators.js.map