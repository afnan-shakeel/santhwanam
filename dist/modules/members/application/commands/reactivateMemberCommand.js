import { MemberStatus } from "../../domain/entities";
import { logger } from "@/shared/utils/logger";
import { eventBus } from "@/shared/domain/events/event-bus";
import { MemberReactivatedEvent } from "../../domain/events";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { AppError } from "@/shared/utils/error-handling/AppError";
export class ReactivateMemberCommand {
    memberRepository;
    agentRepository;
    constructor(memberRepository, agentRepository) {
        this.memberRepository = memberRepository;
        this.agentRepository = agentRepository;
    }
    async execute(input) {
        logger.info("Reactivating member", {
            memberId: input.memberId,
            reactivatedBy: input.reactivatedBy,
        });
        await prisma.$transaction(async (tx) => {
            // 1. Get member
            const member = await this.memberRepository.findById(input.memberId, tx);
            if (!member) {
                throw new AppError("Member not found", 404);
            }
            if (member.memberStatus !== MemberStatus.Suspended) {
                throw new AppError("Only suspended members can be reactivated", 400);
            }
            // 2. Check for outstanding contributions (business rule)
            const outstandingContributions = await tx.memberContribution.count({
                where: {
                    memberId: input.memberId,
                    contributionStatus: "Missed",
                },
            });
            if (outstandingContributions > 0) {
                throw new AppError("Member has outstanding contributions. Cannot reactivate.", 400);
            }
            // 3. Update member status to Active
            await this.memberRepository.update(input.memberId, {
                memberStatus: MemberStatus.Active,
                suspensionCounter: 0,
                suspensionReason: null,
                suspendedAt: null,
            }, tx);
            // 4. Increment agent's active member count
            await tx.agent.update({
                where: { agentId: member.agentId },
                data: {
                    totalActiveMembers: { increment: 1 },
                    updatedAt: new Date(),
                },
            });
            // 5. Publish MemberReactivated event
            await eventBus.publish(new MemberReactivatedEvent({
                memberId: member.memberId,
                memberCode: member.memberCode,
                agentId: member.agentId,
                reactivatedBy: input.reactivatedBy,
            }, input.reactivatedBy));
            logger.info("Member reactivated successfully", {
                memberId: input.memberId,
                memberCode: member.memberCode,
            });
        });
    }
}
//# sourceMappingURL=reactivateMemberCommand.js.map