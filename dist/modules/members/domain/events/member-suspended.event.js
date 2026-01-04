import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class MemberSuspendedEvent extends DomainEvent {
    static EVENT_TYPE = "member.suspended";
    constructor(payload, userId) {
        super(MemberSuspendedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=member-suspended.event.js.map