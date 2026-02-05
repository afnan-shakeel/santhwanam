import { z } from 'zod';

/**
 * Response DTOs for Approval Workflow Module API
 * These schemas define the response structure for each endpoint
 */

// Approval stage response
export const ApprovalStageResponseDto = z.object({
  stageId: z.string(),
  stageName: z.string(),
  stageOrder: z.number(),
  approverType: z.string(),
  roleId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  organizationBody: z.string().nullable().optional(),
  isOptional: z.boolean().optional(),
  autoApprove: z.boolean().optional(),
});

// Single workflow response
export const ApprovalWorkflowResponseDto = z.object({
  workflowId: z.string(),
  workflowCode: z.string(),
  workflowName: z.string(),
  description: z.string().nullable().optional(),
  module: z.string(),
  entityType: z.string(),
  isActive: z.boolean(),
  requiresAllStages: z.boolean(),
  createdAt: z.date(),
  createdBy: z.string().nullable().optional(),
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  stages: z.array(ApprovalStageResponseDto).optional(),
});

// Workflow list response
export const ApprovalWorkflowListResponseDto = z.array(ApprovalWorkflowResponseDto);

// Workflow search response
export const ApprovalWorkflowsSearchResponseDto = z.object({
  items: z.array(ApprovalWorkflowResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Approval request response
export const ApprovalRequestResponseDto = z.object({
  requestId: z.string(),
  workflowId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  forumId: z.string().nullable().optional(),
  areaId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  requestedBy: z.string(),
  requestedAt: z.date(),
  status: z.string(),
  currentStageOrder: z.number().nullable().optional(),
  workflow: ApprovalWorkflowResponseDto.nullable().optional(),
  requestedByUser: z.object({
    userId: z.string(),
    firstName: z.string(),
    lastName: z.string()
  }).nullable().optional()
});

// Approval requests search response
export const ApprovalRequestsSearchResponseDto = z.object({
  items: z.array(ApprovalRequestResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Submit request response
export const SubmitRequestResponseDto = z.object({
  requestId: z.string(),
  status: z.string(),
  message: z.string().optional(),
});

// Approval execution response
export const ApprovalExecutionResponseDto = z.object({
  executionId: z.string(),
  stageId: z.string(),
  stageOrder: z.number(),
  stageName: z.string().optional(),
  assignedApproverId: z.string().nullable().optional(),
  status: z.string(),
  decision: z.string().nullable().optional(),
  reviewedBy: z.string().nullable().optional(),
  reviewedAt: z.date().nullable().optional(),
  comments: z.string().nullable().optional(),
  reviewedByUser: z.object({
    userId: z.string(),
    firstName: z.string(),
    lastName: z.string()
  }).nullable().optional()
});

// Process approval response
export const ProcessApprovalResponseDto = z.object({
  execution: ApprovalExecutionResponseDto,
  request: ApprovalRequestResponseDto,
  nextStage: ApprovalStageResponseDto.nullable().optional(),
});

// Pending approvals list response
export const PendingApprovalsListResponseDto = z.array(
  z.object({
    executionId: z.string(),
    requestId: z.string(),
    stageName: z.string().optional(),
    stageOrder: z.number().optional(),
    status: z.string().optional(),
    assignedApproverId: z.string().nullable().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    requestedAt: z.date().optional(),
  })
);

// Pending approvals count response
export const PendingApprovalsCountResponseDto = z.object({
  pendingCount: z.number(),
  byWorkflow: z.record(z.string(), z.number()),
});

// Approval request with executions response
export const ApprovalRequestWithExecutionsResponseDto = z.object({
  request: ApprovalRequestResponseDto.nullable(),
  executions: z.array(ApprovalExecutionResponseDto),
  workflow: ApprovalWorkflowResponseDto.nullable().optional(),
});

// Success response
export const SuccessResponseDto = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Type exports
export type ApprovalStageResponse = z.infer<typeof ApprovalStageResponseDto>;
export type ApprovalWorkflowResponse = z.infer<typeof ApprovalWorkflowResponseDto>;
export type ApprovalWorkflowListResponse = z.infer<typeof ApprovalWorkflowListResponseDto>;
export type ApprovalWorkflowsSearchResponse = z.infer<typeof ApprovalWorkflowsSearchResponseDto>;
export type ApprovalRequestResponse = z.infer<typeof ApprovalRequestResponseDto>;
export type ApprovalRequestsSearchResponse = z.infer<typeof ApprovalRequestsSearchResponseDto>;
export type SubmitRequestResponse = z.infer<typeof SubmitRequestResponseDto>;
export type ApprovalExecutionResponse = z.infer<typeof ApprovalExecutionResponseDto>;
export type ProcessApprovalResponse = z.infer<typeof ProcessApprovalResponseDto>;
export type PendingApprovalsListResponse = z.infer<typeof PendingApprovalsListResponseDto>;
export type PendingApprovalsCountResponse = z.infer<typeof PendingApprovalsCountResponseDto>;
export type ApprovalRequestWithExecutionsResponse = z.infer<typeof ApprovalRequestWithExecutionsResponseDto>;
export type SuccessResponse = z.infer<typeof SuccessResponseDto>;
