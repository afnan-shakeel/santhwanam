import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class MemberRegistrationSubmittedEvent extends DomainEvent {
    static EVENT_TYPE = "member.registration.submitted";
    constructor(payload, userId) {
        super(MemberRegistrationSubmittedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=member-registration-submitted.event.js.map