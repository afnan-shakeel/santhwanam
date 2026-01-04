import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class NomineeUpdatedEvent extends DomainEvent {
    static EVENT_TYPE = "member.nominee.updated";
    constructor(payload, userId) {
        super(NomineeUpdatedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=nominee-updated.event.js.map