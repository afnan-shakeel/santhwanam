import { DomainEvent } from '@/shared/domain/events/domain-event.base';
export class AgentActivatedEvent extends DomainEvent {
    static EVENT_TYPE = 'agent.activated';
    constructor(payload, userId) {
        super(AgentActivatedEvent.EVENT_TYPE, payload.agentId, 'Agent', payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=agent-activated.event.js.map