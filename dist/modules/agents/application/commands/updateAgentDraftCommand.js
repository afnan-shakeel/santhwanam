// Command: Update Agent Draft
// Updates agent while in Draft status
import { asyncLocalStorage } from "@/shared/infrastructure/context/AsyncLocalStorageManager";
import { BadRequestError } from "@/shared/utils/error-handling/httpErrors";
export class UpdateAgentDraftHandler {
    agentService;
    constructor(agentService) {
        this.agentService = agentService;
    }
    async execute(cmd) {
        const actorId = asyncLocalStorage.tryGetUserId();
        if (!actorId) {
            throw new BadRequestError("Unauthenticated");
        }
        const { agentId, ...input } = cmd;
        return this.agentService.updateDraft(agentId, {
            ...input,
            updatedBy: actorId,
        });
    }
}
//# sourceMappingURL=updateAgentDraftCommand.js.map