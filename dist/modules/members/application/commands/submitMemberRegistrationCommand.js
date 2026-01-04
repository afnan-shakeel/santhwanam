// Command: Submit Member Registration
// Validates all requirements and submits member for approval workflow
import { asyncLocalStorage } from "@/shared/infrastructure/context/AsyncLocalStorageManager";
import { BadRequestError } from "@/shared/utils/error-handling/httpErrors";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { eventBus } from "@/shared/domain/events/event-bus";
import { MemberRegistrationSubmittedEvent } from "../../domain/events";
import { DocumentCategory, RegistrationStatus, RegistrationStep, } from "../../domain/entities";
export class SubmitMemberRegistrationHandler {
    memberService;
    approvalRequestService;
    constructor(memberService, approvalRequestService) {
        this.memberService = memberService;
        this.approvalRequestService = approvalRequestService;
    }
    async execute(cmd) {
        const actorId = asyncLocalStorage.tryGetUserId();
        if (!actorId) {
            throw new BadRequestError("Unauthenticated");
        }
        return prisma.$transaction(async (tx) => {
            // Get member with all related data
            const member = await this.memberService.getMemberById(cmd.memberId);
            if (!member) {
                throw new BadRequestError("Member not found");
            }
            console.log("Member fetched for submission:", member.memberId);
            console.log("Regsistration Status:", member.registrationStatus, RegistrationStatus.Draft);
            if (member.registrationStatus !== RegistrationStatus.Draft) {
                throw new BadRequestError("Invalid member status");
            }
            if (member.registrationStep !== RegistrationStep.DocumentsPayment) {
                throw new BadRequestError("Complete all steps before submitting");
            }
            // Validate nominees
            const nominees = await this.memberService.getNomineesByMemberId(cmd.memberId);
            if (nominees.length === 0) {
                throw new BadRequestError("At least 1 nominee is required");
            }
            // Validate documents
            const documents = await this.memberService.getDocumentsByMemberId(cmd.memberId);
            const identityDocs = documents.filter((d) => d.documentCategory === DocumentCategory.MemberIdentity);
            if (identityDocs.length === 0) {
                // WITHDRAW TEMPORARY
                // throw new BadRequestError("At least 1 identity document is required");
            }
            const addressDocs = documents.filter((d) => d.documentCategory === DocumentCategory.MemberAddress);
            if (addressDocs.length === 0) {
                // WITHDRAW TEMPORARY
                // throw new BadRequestError("At least 1 address proof document is required");
            }
            const photoDocs = documents.filter((d) => d.documentCategory === DocumentCategory.MemberPhoto);
            if (photoDocs.length !== 1) {
                // WITHDRAW TEMPORARY
                // throw new BadRequestError("Exactly 1 member photo is required");
            }
            // Validate each nominee has ID proof
            for (const nominee of nominees) {
                const nomineeProofs = documents.filter((d) => d.nomineeId === nominee.nomineeId &&
                    d.documentCategory === DocumentCategory.NomineeProof);
                if (nomineeProofs.length === 0) {
                    // WITHDRAW TEMPORARY 
                    // throw new BadRequestError(
                    //   `Nominee ${nominee.name} must have at least 1 ID proof document`
                    // );
                }
            }
            // Validate payment
            const payment = await this.memberService.getPaymentByMemberId(cmd.memberId);
            if (!payment) {
                throw new BadRequestError("Registration payment is required");
            }
            // Update member status
            const memberRepo = new (await import("../../infrastructure/prisma/memberRepository")).PrismaMemberRepository();
            await memberRepo.update(cmd.memberId, {
                registrationStatus: RegistrationStatus.PendingApproval,
                registrationStep: RegistrationStep.Completed,
                updatedAt: new Date(),
            }, tx);
            // Create approval request
            const approvalResult = await this.approvalRequestService.submitRequest({
                workflowCode: "member_registration",
                entityType: "Member",
                entityId: cmd.memberId,
                forumId: member.forumId,
                areaId: member.areaId,
                unitId: member.unitId,
                requestedBy: actorId,
            });
            // Link approval request to member
            await memberRepo.update(cmd.memberId, {
                approvalRequestId: approvalResult.request.requestId,
            }, tx);
            // Publish event
            await eventBus.publish(new MemberRegistrationSubmittedEvent({
                memberId: member.memberId,
                memberCode: member.memberCode,
                approvalRequestId: approvalResult.request.requestId,
                unitId: member.unitId,
                areaId: member.areaId,
                forumId: member.forumId,
                agentId: member.agentId,
                submittedBy: actorId,
            }, actorId));
            return {
                member: await memberRepo.findById(cmd.memberId, tx),
                approvalRequest: approvalResult.request,
            };
        });
    }
}
//# sourceMappingURL=submitMemberRegistrationCommand.js.map