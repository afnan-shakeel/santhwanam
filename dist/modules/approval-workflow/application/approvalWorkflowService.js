/**
 * Service for managing approval workflows
 * Handles workflow CRUD operations
 */
import { BadRequestError, NotFoundError } from '@/shared/utils/error-handling/httpErrors';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { searchService } from '@/shared/infrastructure/search';
export class ApprovalWorkflowService {
    workflowRepo;
    stageRepo;
    requestRepo;
    constructor(workflowRepo, stageRepo, requestRepo) {
        this.workflowRepo = workflowRepo;
        this.stageRepo = stageRepo;
        this.requestRepo = requestRepo;
    }
    /**
     * Create a new approval workflow with stages
     */
    async createWorkflow(data) {
        // Validate workflow code uniqueness
        const existing = await this.workflowRepo.findByCode(data.workflowCode);
        if (existing) {
            throw new BadRequestError(`Workflow with code ${data.workflowCode} already exists`);
        }
        // Validate stages
        if (!data.stages || data.stages.length === 0) {
            throw new BadRequestError('At least one approval stage is required');
        }
        // Validate stage order uniqueness
        const stageOrders = data.stages.map(s => s.stageOrder);
        if (new Set(stageOrders).size !== stageOrders.length) {
            throw new BadRequestError('Stage orders must be unique');
        }
        // Create workflow and stages in transaction
        return await prisma.$transaction(async (tx) => {
            const workflow = await this.workflowRepo.create({
                workflowCode: data.workflowCode,
                workflowName: data.workflowName,
                description: data.description,
                module: data.module,
                entityType: data.entityType,
                isActive: data.isActive,
                requiresAllStages: data.requiresAllStages,
                createdBy: data.createdBy,
            }, tx);
            const stagesData = data.stages.map(stage => ({
                ...stage,
                workflowId: workflow.workflowId,
            }));
            await this.stageRepo.createMany(stagesData, tx);
            const stages = await this.stageRepo.findByWorkflow(workflow.workflowId, tx);
            return { workflow, stages };
        });
    }
    /**
     * Update workflow metadata (not stages)
     */
    async updateWorkflow(workflowId, data) {
        const workflow = await this.workflowRepo.findById(workflowId);
        if (!workflow) {
            throw new NotFoundError('Workflow not found');
        }
        return this.workflowRepo.update(workflowId, data);
    }
    /**
     * Update workflow with stages - Enhanced logic
     * Handles adding, updating, and removing stages intelligently
     */
    async updateWorkflowWithStages(data) {
        return await prisma.$transaction(async (tx) => {
            // 1. Validate workflow exists
            const workflow = await this.workflowRepo.findById(data.workflowId, tx);
            if (!workflow) {
                throw new NotFoundError('Workflow not found');
            }
            // 2. If stages are provided, validate them
            if (data.stages) {
                // Validate at least one stage
                if (data.stages.length === 0) {
                    throw new BadRequestError('Workflow must have at least one stage');
                }
                // Validate stage orders are sequential (1, 2, 3...)
                const orders = data.stages.map(s => s.stageOrder).sort((a, b) => a - b);
                for (let i = 0; i < orders.length; i++) {
                    if (orders[i] !== i + 1) {
                        throw new BadRequestError('Stage orders must be sequential (1, 2, 3...)');
                    }
                }
                // Validate no duplicate stage orders
                const uniqueOrders = new Set(data.stages.map(s => s.stageOrder));
                if (uniqueOrders.size !== data.stages.length) {
                    throw new BadRequestError('Duplicate stage orders not allowed');
                }
            }
            // 3. If deactivating workflow, check for pending requests
            if (data.isActive === false && workflow.isActive === true) {
                const pendingCount = await this.requestRepo.countPendingByWorkflow(data.workflowId, tx);
                if (pendingCount > 0) {
                    throw new BadRequestError('Cannot deactivate workflow with pending requests');
                }
            }
            // 4. Process stages if provided
            if (data.stages) {
                // Get existing stages
                const existingStages = await this.stageRepo.findByWorkflow(data.workflowId, tx);
                const existingStageIds = new Set(existingStages.map(s => s.stageId));
                const inputStageIds = new Set(data.stages.filter(s => s.stageId).map(s => s.stageId));
                // 5. Identify stages to DELETE (in existing but not in input)
                const stageIdsToDelete = [...existingStageIds].filter(id => !inputStageIds.has(id));
                // 6. Validate stages being deleted don't have executions
                if (stageIdsToDelete.length > 0) {
                    for (const stageId of stageIdsToDelete) {
                        const executionsCount = await this.stageRepo.countExecutionsByStageId(stageId, tx);
                        if (executionsCount > 0) {
                            throw new BadRequestError('Cannot delete stages that have existing approval executions. ' +
                                'Create a new workflow version instead.');
                        }
                    }
                    // Safe to delete - no executions exist
                    await this.stageRepo.deleteByIds(stageIdsToDelete, tx);
                }
                // 7. Process each stage (UPDATE existing or CREATE new)
                for (const stageInput of data.stages) {
                    if (stageInput.stageId) {
                        // UPDATE existing stage
                        const existingStage = existingStages.find(s => s.stageId === stageInput.stageId);
                        if (!existingStage) {
                            throw new NotFoundError(`Stage ${stageInput.stageId} not found in workflow`);
                        }
                        // Check if stage has executions
                        const hasExecutions = await this.stageRepo.countExecutionsByStageId(stageInput.stageId, tx);
                        if (hasExecutions > 0) {
                            // Stage has executions - limited updates allowed
                            // Can update: stageName, isOptional
                            // Cannot update: stageOrder, approverRole
                            // TODO: Temporarily disabling order change restriction
                            // if (existingStage.stageOrder !== stageInput.stageOrder) {
                            //   throw new BadRequestError(
                            //     `Cannot change order of stage "${existingStage.stageName}" ` +
                            //     `as it has existing executions`
                            //   );
                            // }
                            // TODO: Temporarily disabling approverType change restriction
                            // if (existingStage.approverType !== stageInput.approverType) {
                            //   throw new BadRequestError(
                            //     `Cannot change approver type of stage "${existingStage.stageName}" ` +
                            //     `as it has existing executions`
                            //   );
                            // }
                            // Safe to update name and optional flag
                            await this.stageRepo.update(stageInput.stageId, {
                                stageName: stageInput.stageName,
                                isOptional: stageInput.isOptional,
                                autoApprove: stageInput.autoApprove,
                                updatedBy: data.updatedBy,
                                approverType: stageInput.approverType,
                                roleId: stageInput.roleId,
                                userId: stageInput.userId,
                                organizationBody: stageInput.organizationBody,
                            }, tx);
                        }
                        else {
                            // No executions - can update everything
                            await this.stageRepo.update(stageInput.stageId, {
                                stageOrder: stageInput.stageOrder,
                                stageName: stageInput.stageName,
                                approverType: stageInput.approverType,
                                roleId: stageInput.roleId,
                                userId: stageInput.userId,
                                organizationBody: stageInput.organizationBody,
                                isOptional: stageInput.isOptional,
                                autoApprove: stageInput.autoApprove,
                                updatedBy: data.updatedBy,
                            }, tx);
                        }
                    }
                    else {
                        // CREATE new stage
                        await this.stageRepo.create({
                            workflowId: data.workflowId,
                            stageOrder: stageInput.stageOrder,
                            stageName: stageInput.stageName,
                            approverType: stageInput.approverType,
                            roleId: stageInput.roleId,
                            userId: stageInput.userId,
                            organizationBody: stageInput.organizationBody,
                            isOptional: stageInput.isOptional ?? false,
                            autoApprove: stageInput.autoApprove ?? false,
                            createdBy: data.updatedBy,
                        }, tx);
                    }
                }
            }
            // 8. Update workflow metadata
            const updatedWorkflow = await this.workflowRepo.update(data.workflowId, {
                workflowName: data.workflowName,
                description: data.description,
                isActive: data.isActive,
                requiresAllStages: data.requiresAllStages,
                updatedBy: data.updatedBy,
            }, tx);
            // 9. Fetch updated stages
            const stages = await this.stageRepo.findByWorkflow(data.workflowId, tx);
            return { workflow: updatedWorkflow, stages };
        });
    }
    /**
     * Get workflow by ID with stages
     */
    async getWorkflowById(workflowId) {
        const workflow = await this.workflowRepo.findById(workflowId);
        if (!workflow) {
            throw new NotFoundError('Workflow not found');
        }
        return workflow;
    }
    /**
     * Get workflow by code with stages
     */
    async getWorkflowByCode(workflowCode) {
        const workflow = await this.workflowRepo.findByCode(workflowCode);
        if (!workflow) {
            throw new NotFoundError('Workflow not found');
        }
        const stages = await this.stageRepo.findByWorkflow(workflow.workflowId);
        return { workflow, stages };
    }
    /**
     * List active workflows
     */
    async listActiveWorkflows(module) {
        return this.workflowRepo.listActive(module);
    }
    /**
     * List all workflows
     */
    async listAllWorkflows() {
        return this.workflowRepo.listAll();
    }
    async searchWorkflows(searchRequest) {
        return searchService.execute({
            ...searchRequest,
            model: 'ApprovalWorkflow',
        });
    }
}
//# sourceMappingURL=approvalWorkflowService.js.map