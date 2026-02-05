/**
 * Service for managing approval requests
 * Handles request submission, approver resolution, and approval processing
 */
import { BadRequestError, NotFoundError, ForbiddenError } from '@/shared/utils/error-handling/httpErrors';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { searchService } from '@/shared/infrastructure/search';
import { eventBus } from '@/shared/domain/events/event-bus';
import { ApprovalRequestApprovedEvent, ApprovalRequestRejectedEvent, } from '../domain/events';
export class ApprovalRequestService {
    workflowRepo;
    stageRepo;
    requestRepo;
    executionRepo;
    forumRepo;
    areaRepo;
    unitRepo;
    constructor(workflowRepo, stageRepo, requestRepo, executionRepo, forumRepo, areaRepo, unitRepo) {
        this.workflowRepo = workflowRepo;
        this.stageRepo = stageRepo;
        this.requestRepo = requestRepo;
        this.executionRepo = executionRepo;
        this.forumRepo = forumRepo;
        this.areaRepo = areaRepo;
        this.unitRepo = unitRepo;
    }
    /**
     * Submit a new approval request
     * Creates request and stage executions with approver resolution
     */
    async submitRequest(data) {
        // Get workflow with stages
        const workflow = await this.workflowRepo.findByCode(data.workflowCode);
        if (!workflow) {
            throw new NotFoundError(`Workflow ${data.workflowCode} not found`);
        }
        if (!workflow.isActive) {
            throw new BadRequestError(`Workflow ${data.workflowCode} is not active`);
        }
        const stages = await this.stageRepo.findByWorkflow(workflow.workflowId);
        if (stages.length === 0) {
            throw new BadRequestError('Workflow has no approval stages configured');
        }
        // Check for existing pending request
        const existingRequest = await this.requestRepo.findPendingByEntity(data.entityType, data.entityId);
        if (existingRequest) {
            throw new BadRequestError(`An approval request for this ${data.entityType} is already pending`);
        }
        // Create request and executions in transaction
        return await prisma.$transaction(async (tx) => {
            const request = await this.requestRepo.create({
                workflowId: workflow.workflowId,
                entityType: data.entityType,
                entityId: data.entityId,
                forumId: data.forumId,
                areaId: data.areaId,
                unitId: data.unitId,
                requestedBy: data.requestedBy,
                requestedAt: new Date(),
                currentStageOrder: 1,
            }, tx);
            // Create executions for all stages with approver resolution
            const executionData = await Promise.all(stages.map(async (stage) => {
                const approverId = await this.resolveApprover(stage, {
                    forumId: data.forumId,
                    areaId: data.areaId,
                    unitId: data.unitId,
                }, tx);
                return {
                    requestId: request.requestId,
                    stageId: stage.stageId,
                    stageOrder: stage.stageOrder,
                    assignedApproverId: approverId,
                };
            }));
            await this.executionRepo.createMany(executionData, tx);
            const executions = await this.executionRepo.findByRequest(request.requestId, tx);
            return { request, executions };
        });
    }
    async searchRequests(searchRequest) {
        return searchService.execute({
            ...searchRequest,
            model: 'ApprovalRequest',
        });
    }
    /**
     * Resolve approver for a stage based on approver type and hierarchy
     */
    async resolveApprover(stage, context, tx) {
        const approverType = stage.approverType;
        switch (approverType) {
            case 'SpecificUser':
                return stage.userId || null;
            case 'Role':
                // For Role-based approval with hierarchy, find user with role at the hierarchy level
                if (stage.organizationBody && context) {
                    return this.resolveHierarchyApprover(stage.organizationBody, context, stage.roleId ?? null, tx);
                }
                return null;
            case 'Hierarchy':
                // Direct hierarchy resolution
                if (stage.organizationBody && context) {
                    return this.resolveHierarchyApprover(stage.organizationBody, context, null, tx);
                }
                return null;
            default:
                return null;
        }
    }
    /**
     * Resolve approver based on hierarchy level
     * Integrates with Organization Bodies module to find admin users
     */
    async resolveHierarchyApprover(organizationBody, context, roleId, tx) {
        switch (organizationBody) {
            case 'Unit':
                if (!this.unitRepo || !context.unitId)
                    return null;
                const unit = await this.unitRepo.findById(context.unitId, tx);
                return unit?.adminUserId || null;
            case 'Area':
                if (!this.areaRepo || !context.areaId)
                    return null;
                const area = await this.areaRepo.findById(context.areaId, tx);
                return area?.adminUserId || null;
            case 'Forum':
                if (!this.forumRepo || !context.forumId)
                    return null;
                const forum = await this.forumRepo.findById(context.forumId, tx);
                return forum?.adminUserId || null;
            default:
                return null;
        }
    }
    /**
     * Process approval/rejection for a stage
     */
    async processApproval(data) {
        console.log('Processing approval for execution:', data.executionId);
        const execution = await this.executionRepo.findById(data.executionId);
        if (!execution) {
            throw new NotFoundError('Approval execution not found');
        }
        if (execution.status !== 'Pending') {
            throw new BadRequestError(`This approval stage is already ${execution.status}`);
        }
        // Verify reviewer is the assigned approver
        if (execution.assignedApproverId && execution.assignedApproverId !== data.reviewedBy) {
            throw new ForbiddenError('You are not authorized to approve this request');
        }
        const request = await this.requestRepo.findById(execution.requestId);
        if (!request) {
            throw new NotFoundError('Approval request not found');
        }
        if (request.status !== 'Pending') {
            throw new BadRequestError(`Request is already ${request.status}`);
        }
        console.log('Fetched request for execution:', request.requestId);
        // Process in transaction
        return await prisma.$transaction(async (tx) => {
            // Fetch workflow first (needed for events)
            const workflow = await this.workflowRepo.findById(request.workflowId, tx);
            // Update execution
            const updatedExecution = await this.executionRepo.updateDecision(data.executionId, {
                status: (data.decision === 'Approve' ? 'Approved' : 'Rejected'),
                reviewedBy: data.reviewedBy,
                reviewedAt: new Date(),
                decision: data.decision,
                comments: data.comments || null,
            }, tx);
            // If rejected, mark request as rejected
            if (data.decision === 'Reject') {
                const updatedRequest = await this.requestRepo.updateStatus(request.requestId, {
                    status: 'Rejected',
                    rejectedBy: data.reviewedBy,
                    rejectedAt: new Date(),
                    rejectionReason: data.comments || null,
                }, tx);
                console.log('Request rejected:', updatedRequest.requestId);
                // Publish rejection event
                await eventBus.publish(new ApprovalRequestRejectedEvent({
                    requestId: request.requestId,
                    workflowCode: workflow?.workflowCode || '',
                    entityType: request.entityType,
                    entityId: request.entityId,
                    rejectedBy: data.reviewedBy,
                    rejectedAt: new Date(),
                    rejectionReason: data.comments || null,
                }));
                return { execution: updatedExecution, request: updatedRequest };
            }
            // If approved, check if all stages are complete
            const allExecutions = await this.executionRepo.findByRequest(request.requestId, tx);
            const allApproved = allExecutions.every(exec => exec.status === 'Approved' || exec.status === 'Skipped');
            const currentStageApproved = allExecutions.find(exec => exec.stageOrder === request.currentStageOrder)?.status === 'Approved';
            if (allApproved || (workflow && !workflow.requiresAllStages && currentStageApproved)) {
                // All stages approved or workflow allows any stage approval
                const updatedRequest = await this.requestRepo.updateStatus(request.requestId, {
                    status: 'Approved',
                    approvedBy: data.reviewedBy,
                    approvedAt: new Date(),
                }, tx);
                console.log('Request approved:', updatedRequest.requestId);
                // Publish approval event
                await eventBus.publish(new ApprovalRequestApprovedEvent({
                    requestId: request.requestId,
                    workflowCode: workflow?.workflowCode || '',
                    entityType: request.entityType,
                    entityId: request.entityId,
                    approvedBy: data.reviewedBy,
                    approvedAt: new Date(),
                }));
                return { execution: updatedExecution, request: updatedRequest };
            }
            else {
                // Move to next stage
                const nextStageOrder = (request.currentStageOrder || 0) + 1;
                const updatedRequest = await this.requestRepo.updateStatus(request.requestId, {
                    status: 'Pending',
                    currentStageOrder: nextStageOrder,
                }, tx);
                return { execution: updatedExecution, request: updatedRequest };
            }
        });
    }
    /**
     * Get pending approvals for a user
     */
    async getPendingApprovals(approverId) {
        return this.executionRepo.findPendingByApprover(approverId);
    }
    /**
     * Get request history for an entity
     */
    async getRequestByEntity(entityType, entityId) {
        const request = await this.requestRepo.findPendingByEntity(entityType, entityId);
        if (!request) {
            return { request: null, executions: [] };
        }
        const executions = await this.executionRepo.findByRequest(request.requestId);
        return { request, executions };
    }
    /**
     * Get request by ID with executions
     */
    async getRequestById(requestId) {
        const request = await this.requestRepo.findById(requestId);
        if (!request) {
            throw new NotFoundError('Approval request not found');
        }
        const executions = await this.executionRepo.findByRequest(requestId);
        const workflow = await this.workflowRepo.findById(request.workflowId);
        return { request, executions, workflow };
    }
    /**
     * Get pending approval counts for a user, broken down by workflow
     */
    async getPendingApprovalsCount(userId) {
        // Get all pending stage executions assigned to this user
        const pendingExecutions = await prisma.approvalStageExecution.findMany({
            where: {
                assignedApproverId: userId,
                status: 'Pending',
            },
            include: {
                request: {
                    include: {
                        workflow: true,
                    },
                },
            },
        });
        // Group by workflow code and count
        const countByWorkflow = {};
        let totalPending = 0;
        for (const execution of pendingExecutions) {
            const workflowCode = execution.request.workflow.workflowCode;
            countByWorkflow[workflowCode] = (countByWorkflow[workflowCode] || 0) + 1;
            totalPending++;
        }
        return {
            pendingCount: totalPending,
            byWorkflow: countByWorkflow,
        };
    }
}
//# sourceMappingURL=approvalRequestService.js.map