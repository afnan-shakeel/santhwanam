import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class MemberDraftSavedEvent extends DomainEvent {
    static EVENT_TYPE = "member.draft.saved";
    constructor(payload, userId) {
        super(MemberDraftSavedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=member-draft-saved.event.js.map