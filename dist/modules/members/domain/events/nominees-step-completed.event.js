import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class NomineesStepCompletedEvent extends DomainEvent {
    static EVENT_TYPE = "member.nominees_step.completed";
    constructor(payload, userId) {
        super(NomineesStepCompletedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=nominees-step-completed.event.js.map