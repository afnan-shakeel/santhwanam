import { v4 as uuidv4 } from 'uuid';
export class DomainEvent {
    eventType;
    aggregateId;
    aggregateType;
    payload;
    metadata;
    eventId;
    occurredAt;
    version = 1;
    constructor(eventType, aggregateId, aggregateType, payload, metadata) {
        this.eventType = eventType;
        this.aggregateId = aggregateId;
        this.aggregateType = aggregateType;
        this.payload = payload;
        this.metadata = metadata;
        this.eventId = uuidv4();
        this.occurredAt = new Date();
    }
}
//# sourceMappingURL=domain-event.base.js.map