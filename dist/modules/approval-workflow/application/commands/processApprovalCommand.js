/**
 * Command: Process Approval
 * Approve or reject an approval stage
 */
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';
import { UnauthorizedError } from '@/shared/utils/error-handling/httpErrors';
export class ProcessApprovalCommand {
    requestService;
    constructor(requestService) {
        this.requestService = requestService;
    }
    async execute(dto) {
        const currentUserId = asyncLocalStorage.tryGetUserId();
        if (!currentUserId) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.requestService.processApproval({
            ...dto,
            reviewedBy: currentUserId,
        });
    }
}
//# sourceMappingURL=processApprovalCommand.js.map