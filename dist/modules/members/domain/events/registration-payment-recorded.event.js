import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class RegistrationPaymentRecordedEvent extends DomainEvent {
    static EVENT_TYPE = "member.payment.recorded";
    constructor(payload, userId) {
        super(RegistrationPaymentRecordedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=registration-payment-recorded.event.js.map