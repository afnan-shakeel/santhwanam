/**
 * Command: Submit Approval Request
 * Creates approval request with stage executions
 */
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';
import { UnauthorizedError } from '@/shared/utils/error-handling/httpErrors';
export class SubmitRequestCommand {
    requestService;
    constructor(requestService) {
        this.requestService = requestService;
    }
    async execute(dto) {
        const currentUserId = asyncLocalStorage.tryGetUserId();
        if (!currentUserId) {
            throw new UnauthorizedError('User not authenticated');
        }
        return this.requestService.submitRequest({
            ...dto,
            requestedBy: currentUserId,
        });
    }
}
//# sourceMappingURL=submitRequestCommand.js.map