import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class MemberReactivatedEvent extends DomainEvent {
    static EVENT_TYPE = "member.reactivated";
    constructor(payload, userId) {
        super(MemberReactivatedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=member-reactivated.event.js.map