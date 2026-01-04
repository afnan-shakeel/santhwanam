import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class MemberAccountClosedEvent extends DomainEvent {
    static EVENT_TYPE = "member.account.closed";
    constructor(payload, userId) {
        super(MemberAccountClosedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=member-account-closed.event.js.map