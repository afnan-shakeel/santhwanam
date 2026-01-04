import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class PersonalDetailsCompletedEvent extends DomainEvent {
    static EVENT_TYPE = "member.personal_details.completed";
    constructor(payload, userId) {
        super(PersonalDetailsCompletedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=personal-details-completed.event.js.map