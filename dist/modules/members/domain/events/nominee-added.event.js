import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class NomineeAddedEvent extends DomainEvent {
    static EVENT_TYPE = "member.nominee.added";
    constructor(payload, userId) {
        super(NomineeAddedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=nominee-added.event.js.map