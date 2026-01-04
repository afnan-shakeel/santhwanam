/**
 * Command: Create Approval Workflow
 * Creates a new workflow with stages
 */
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';
import { UnauthorizedError } from '@/shared/utils/error-handling/httpErrors';
export class CreateWorkflowCommand {
    workflowService;
    constructor(workflowService) {
        this.workflowService = workflowService;
    }
    async execute(dto) {
        const currentUserId = asyncLocalStorage.tryGetUserId();
        if (!currentUserId) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.workflowService.createWorkflow({
            ...dto,
            createdBy: currentUserId,
        });
    }
}
//# sourceMappingURL=createWorkflowCommand.js.map