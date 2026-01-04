import { DomainEvent } from '@/shared/domain/events/domain-event.base';
export class AgentDraftUpdatedEvent extends DomainEvent {
    static EVENT_TYPE = 'agent.draft.updated';
    constructor(payload, userId) {
        super(AgentDraftUpdatedEvent.EVENT_TYPE, payload.agentId, 'Agent', payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=agent-draft-updated.event.js.map