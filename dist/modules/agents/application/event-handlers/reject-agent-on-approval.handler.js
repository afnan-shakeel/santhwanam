import { logger } from '@/shared/utils/logger';
export class RejectAgentOnApprovalHandler {
    agentService;
    constructor(agentService) {
        this.agentService = agentService;
    }
    async handle(event) {
        const payload = event.payload;
        // Only handle agent registration rejections
        if (payload.workflowCode !== 'agent_registration' || payload.entityType !== 'Agent') {
            return;
        }
        const agentId = payload.entityId;
        const rejectedBy = payload.rejectedBy;
        const rejectionReason = payload.rejectionReason;
        logger.info('Rejecting agent registration', {
            agentId,
            rejectedBy,
            rejectionReason,
            eventId: event.eventId
        });
        await this.agentService.handleApprovalRejected(agentId, rejectedBy, rejectionReason);
        logger.info('Agent registration rejected successfully', { agentId });
    }
}
//# sourceMappingURL=reject-agent-on-approval.handler.js.map