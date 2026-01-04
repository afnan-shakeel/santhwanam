// Command: Start Agent Registration
// Creates agent in Draft status
import { asyncLocalStorage } from "@/shared/infrastructure/context/AsyncLocalStorageManager";
import { BadRequestError } from "@/shared/utils/error-handling/httpErrors";
export class StartAgentRegistrationHandler {
    agentService;
    constructor(agentService) {
        this.agentService = agentService;
    }
    async execute(cmd) {
        const actorId = asyncLocalStorage.tryGetUserId();
        if (!actorId) {
            throw new BadRequestError("Unauthenticated");
        }
        return this.agentService.startRegistration({
            ...cmd,
            createdBy: actorId,
        });
    }
}
//# sourceMappingURL=startAgentRegistrationCommand.js.map