import { MemberStatus } from "../../domain/entities";
import { logger } from "@/shared/utils/logger";
import { eventBus } from "@/shared/domain/events/event-bus";
import { MemberSuspendedEvent } from "../../domain/events";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { AppError } from "@/shared/utils/error-handling/AppError";
export class SuspendMemberCommand {
    memberRepository;
    agentRepository;
    constructor(memberRepository, agentRepository) {
        this.memberRepository = memberRepository;
        this.agentRepository = agentRepository;
    }
    async execute(input) {
        logger.info("Suspending member", {
            memberId: input.memberId,
            reason: input.reason,
            suspendedBy: input.suspendedBy,
        });
        await prisma.$transaction(async (tx) => {
            // 1. Get member
            const member = await this.memberRepository.findById(input.memberId, tx);
            if (!member) {
                throw new AppError("Member not found", 404);
            }
            if (member.memberStatus !== MemberStatus.Active) {
                throw new AppError("Only active members can be suspended", 400);
            }
            // 2. Update member status to Suspended
            await this.memberRepository.update(input.memberId, {
                memberStatus: MemberStatus.Suspended,
                suspensionReason: input.reason,
                suspendedAt: new Date(),
            }, tx);
            // 3. Decrement agent's active member count
            await tx.agent.update({
                where: { agentId: member.agentId },
                data: {
                    totalActiveMembers: { decrement: 1 },
                    updatedAt: new Date(),
                },
            });
            // 4. Publish MemberSuspended event
            await eventBus.publish(new MemberSuspendedEvent({
                memberId: member.memberId,
                memberCode: member.memberCode,
                agentId: member.agentId,
                reason: input.reason,
                suspendedBy: input.suspendedBy || "SYSTEM",
            }, input.suspendedBy || "SYSTEM"));
            logger.info("Member suspended successfully", {
                memberId: input.memberId,
                memberCode: member.memberCode,
            });
        });
    }
}
//# sourceMappingURL=suspendMemberCommand.js.map