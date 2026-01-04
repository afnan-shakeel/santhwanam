// Command: Update Agent
// Updates approved agent details
import { asyncLocalStorage } from "@/shared/infrastructure/context/AsyncLocalStorageManager";
import { BadRequestError } from "@/shared/utils/error-handling/httpErrors";
export class UpdateAgentHandler {
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
        return this.agentService.updateAgent(agentId, {
            ...input,
            updatedBy: actorId,
        });
    }
}
//# sourceMappingURL=updateAgentCommand.js.map