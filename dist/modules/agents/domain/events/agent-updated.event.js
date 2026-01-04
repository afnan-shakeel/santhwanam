import { DomainEvent } from '@/shared/domain/events/domain-event.base';
export class AgentUpdatedEvent extends DomainEvent {
    static EVENT_TYPE = 'agent.updated';
    constructor(payload, userId) {
        super(AgentUpdatedEvent.EVENT_TYPE, payload.agentId, 'Agent', payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=agent-updated.event.js.map