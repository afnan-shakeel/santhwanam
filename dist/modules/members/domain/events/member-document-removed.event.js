import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class MemberDocumentRemovedEvent extends DomainEvent {
    static EVENT_TYPE = "member.document.removed";
    constructor(payload, userId) {
        super(MemberDocumentRemovedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=member-document-removed.event.js.map