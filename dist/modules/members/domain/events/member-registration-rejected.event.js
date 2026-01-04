import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class MemberRegistrationRejectedEvent extends DomainEvent {
    static EVENT_TYPE = "member.registration.rejected";
    constructor(payload, userId) {
        super(MemberRegistrationRejectedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=member-registration-rejected.event.js.map