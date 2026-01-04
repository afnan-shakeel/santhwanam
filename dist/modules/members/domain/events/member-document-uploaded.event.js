import { DomainEvent } from "@/shared/domain/events/domain-event.base";
export class MemberDocumentUploadedEvent extends DomainEvent {
    static EVENT_TYPE = "member.document.uploaded";
    constructor(payload, userId) {
        super(MemberDocumentUploadedEvent.EVENT_TYPE, payload.memberId, "Member", payload, { userId });
    }
    get data() {
        return this.payload;
    }
}
//# sourceMappingURL=member-document-uploaded.event.js.map