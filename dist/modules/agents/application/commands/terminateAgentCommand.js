// Command: Terminate Agent
// Terminates agent (only if totalActiveMembers = 0)
import { asyncLocalStorage } from "@/shared/infrastructure/context/AsyncLocalStorageManager";
import { BadRequestError } from "@/shared/utils/error-handling/httpErrors";
export class TerminateAgentHandler {
    agentService;
    constructor(agentService) {
        this.agentService = agentService;
    }
    async execute(cmd) {
        const actorId = asyncLocalStorage.tryGetUserId();
        if (!actorId) {
            throw new BadRequestError("Unauthenticated");
        }
        return this.agentService.terminateAgent(cmd.agentId, cmd.terminationReason, actorId);
    }
}
//# sourceMappingURL=terminateAgentCommand.js.map