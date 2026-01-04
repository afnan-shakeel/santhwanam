import { DomainEvent } from '@/shared/domain/events/domain-event.base';
export class AgentTerminatedEvent extends DomainEvent {
    static EVENT_TYPE = 'agent.terminated';
    constructor(payload, userId) {
        super(AgentTerminatedEvent.EVENT_TYPE, payload.agentId, 'Agent', payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=agent-terminated.event.js.map