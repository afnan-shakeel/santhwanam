import { DomainEvent } from '@/shared/domain/events/domain-event.base';
export class AgentRegistrationSubmittedEvent extends DomainEvent {
    static EVENT_TYPE = 'agent.registration.submitted';
    constructor(payload, userId) {
        super(AgentRegistrationSubmittedEvent.EVENT_TYPE, payload.agentId, 'Agent', payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=agent-registration-submitted.event.js.map