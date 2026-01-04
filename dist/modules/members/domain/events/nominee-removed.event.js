import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class NomineeRemovedEvent extends DomainEvent {
    static EVENT_TYPE = "member.nominee.removed";
    constructor(payload, userId) {
        super(NomineeRemovedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=nominee-removed.event.js.map