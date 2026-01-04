import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class MemberRegistrationStartedEvent extends DomainEvent {
    static EVENT_TYPE = "member.registration.started";
    constructor(payload, userId) {
        super(MemberRegistrationStartedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=member-registration-started.event.js.map