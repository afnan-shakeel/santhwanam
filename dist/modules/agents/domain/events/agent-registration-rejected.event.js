import { DomainEvent } from '@/shared/domain/events/domain-event.base';
export class AgentRegistrationRejectedEvent extends DomainEvent {
    static EVENT_TYPE = 'agent.registration.rejected';
    constructor(payload, userId) {
        super(AgentRegistrationRejectedEvent.EVENT_TYPE, payload.agentId, 'Agent', payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=agent-registration-rejected.event.js.map