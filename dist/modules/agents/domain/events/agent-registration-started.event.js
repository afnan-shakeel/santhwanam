import { DomainEvent } from '@/shared/domain/events/domain-event.base';
export class AgentRegistrationStartedEvent extends DomainEvent {
    static EVENT_TYPE = 'agent.registration.started';
    constructor(payload, userId) {
        super(AgentRegistrationStartedEvent.EVENT_TYPE, payload.agentId, 'Agent', payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=agent-registration-started.event.js.map