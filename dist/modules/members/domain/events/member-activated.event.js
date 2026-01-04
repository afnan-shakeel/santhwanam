import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class MemberActivatedEvent extends DomainEvent {
    static EVENT_TYPE = "member.activated";
    constructor(payload, userId) {
        super(MemberActivatedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=member-activated.event.js.map