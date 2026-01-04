/**
 * Approval Workflow Module
 * Wires up repositories, services, commands, and API
 */
import { PrismaApprovalWorkflowRepository } from './infrastructure/prisma/approvalWorkflowRepository';
import { PrismaApprovalStageRepository } from './infrastructure/prisma/approvalStageRepository';
import { PrismaApprovalRequestRepository } from './infrastructure/prisma/approvalRequestRepository';
import { PrismaApprovalStageExecutionRepository } from './infrastructure/prisma/approvalStageExecutionRepository';
import { PrismaForumRepository } from '@/modules/organization-bodies/infrastructure/prisma/forumRepository';
import { PrismaAreaRepository } from '@/modules/organization-bodies/infrastructure/prisma/areaRepository';
import { PrismaUnitRepository } from '@/modules/organization-bodies/infrastructure/prisma/unitRepository';
import { ApprovalWorkflowService } from './application/approvalWorkflowService';
import { ApprovalRequestService } from './application/approvalRequestService';
import { CreateWorkflowCommand } from './application/commands/createWorkflowCommand';
import { UpdateWorkflowCommand } from './application/commands/updateWorkflowCommand';
import { SubmitRequestCommand } from './application/commands/submitRequestCommand';
import { ProcessApprovalCommand } from './application/commands/processApprovalCommand';
import { ApprovalWorkflowController } from './api/controller';
import { createApprovalWorkflowRouter } from './api/router';
// Initialize repositories
const workflowRepo = new PrismaApprovalWorkflowRepository();
const stageRepo = new PrismaApprovalStageRepository();
const requestRepo = new PrismaApprovalRequestRepository();
const executionRepo = new PrismaApprovalStageExecutionRepository();
const forumRepo = new PrismaForumRepository();
const areaRepo = new PrismaAreaRepository();
const unitRepo = new PrismaUnitRepository();
// Initialize services
const workflowService = new ApprovalWorkflowService(workflowRepo, stageRepo, requestRepo);
const requestService = new ApprovalRequestService(workflowRepo, stageRepo, requestRepo, executionRepo, forumRepo, areaRepo, unitRepo);
// Initialize commands
const createWorkflowCommand = new CreateWorkflowCommand(workflowService);
const updateWorkflowCommand = new UpdateWorkflowCommand(workflowService);
const submitRequestCommand = new SubmitRequestCommand(requestService);
const processApprovalCommand = new ProcessApprovalCommand(requestService);
// Initialize controller
const controller = new ApprovalWorkflowController(workflowService, requestService, createWorkflowCommand, updateWorkflowCommand, submitRequestCommand, processApprovalCommand);
// Export router
export const approvalWorkflowRouter = createApprovalWorkflowRouter(controller);
// Export services for use in other modules
export { workflowService, requestService };
//# sourceMappingURL=index.js.map