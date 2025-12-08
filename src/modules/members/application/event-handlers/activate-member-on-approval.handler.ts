import { IEventHandler } from "@/shared/domain/events/event-handler.interface";
import { DomainEvent } from "@/shared/domain/events/domain-event.base";
import { MemberRepository } from "../../domain/repositories";
import { MemberDocumentRepository } from "../../domain/repositories";
import { RegistrationPaymentRepository } from "../../domain/repositories";
import { AgentRepository } from "@/modules/agents/domain/repositories";
import { RegistrationStatus, MemberStatus, DocumentVerificationStatus, PaymentApprovalStatus } from "../../domain/entities";
import { logger } from "@/shared/utils/logger";
import { eventBus } from "@/shared/domain/events/event-bus";
import { MemberActivatedEvent } from "../../domain/events";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { v4 as uuidv4 } from "uuid";
import { JournalEntryService } from "@/modules/gl/application/journalEntryService";
import { ACCOUNT_CODES, TRANSACTION_SOURCE, TRANSACTION_TYPE } from "@/modules/gl/constants/accountCodes";

/**
 * Approval workflow emits generic approval events
 * This handler listens for approvals and activates members
 */
interface ApprovalRequestApprovedPayload {
  requestId: string;
  workflowCode: string;
  entityType: string;
  entityId: string;
  approvedBy: string;
  approvedAt: Date;
}

export class ActivateMemberOnApprovalHandler implements IEventHandler<DomainEvent> {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly memberDocumentRepository: MemberDocumentRepository,
    private readonly registrationPaymentRepository: RegistrationPaymentRepository,
    private readonly agentRepository: AgentRepository,
    private readonly journalEntryService: JournalEntryService
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as unknown as ApprovalRequestApprovedPayload;

    // Only handle member registration approvals
    if (payload.workflowCode !== "member_registration" || payload.entityType !== "Member") {
      return;
    }

    const memberId = payload.entityId;
    const approvedBy = payload.approvedBy;

    logger.info("Activating member after approval", {
      memberId,
      approvedBy,
      eventId: event.eventId,
    });

    await prisma.$transaction(async (tx: any) => {
      // 1. Get member
      const member = await this.memberRepository.findById(memberId, tx);
      if (!member) {
        logger.error("Member not found for activation", { memberId });
        throw new Error("Member not found");
      }

      // 2. Get payment details
      const payment = await this.registrationPaymentRepository.findByMemberId(memberId, tx);
      if (!payment) {
        logger.error("Payment not found for member activation", { memberId });
        throw new Error("Payment not found");
      }

      // 3. Create member wallet with advance deposit
      logger.info("Creating member wallet", { memberId, initialBalance: payment.advanceDeposit });
      await tx.memberWallet.create({
        data: {
          walletId: uuidv4(),
          memberId,
          currentBalance: payment.advanceDeposit,
          totalDeposited: payment.advanceDeposit,
          totalWithdrawn: 0,
          lastTransactionAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 4. Update member status to Active
      logger.info("Updating member status to Active", { memberId });
      await this.memberRepository.update(
        memberId,
        {
          registrationStatus: RegistrationStatus.Approved,
          memberStatus: MemberStatus.Active,
          registeredAt: new Date(),
          approvedBy,
        },
        tx
      );

      // 5. Update payment approval status
      logger.info("Marking payment as approved", { paymentId: payment.paymentId });
      await this.registrationPaymentRepository.update(
        payment.paymentId,
        {
          approvalStatus: PaymentApprovalStatus.Approved,
          approvedBy,
          approvedAt: new Date(),
        },
        tx
      );

      // 6. Mark all active member documents as verified
      logger.info("Verifying all member documents", { memberId });
      const activeDocuments = await this.memberDocumentRepository.findActiveByMemberId(memberId, tx);
      for (const doc of activeDocuments) {
        await this.memberDocumentRepository.update(
          doc.documentId,
          {
            verificationStatus: DocumentVerificationStatus.Verified,
            verifiedBy: approvedBy,
            verifiedAt: new Date(),
          },
          tx
        );
      }

      // 7. Create GL entry for registration fee and advance deposit
      logger.info("Creating GL entry for member registration", {
        memberId,
        registrationFee: payment.registrationFee,
        advanceDeposit: payment.advanceDeposit,
      });
      
      await this.journalEntryService.createJournalEntry({
        entryDate: payment.collectionDate,
        description: `Member Registration - ${member.memberCode}`,
        reference: member.memberCode,
        sourceModule: TRANSACTION_SOURCE.MEMBERSHIP,
        sourceEntityId: memberId,
        sourceTransactionType: TRANSACTION_TYPE.REGISTRATION_APPROVAL,
        lines: [
          {
            accountCode: ACCOUNT_CODES.CASH,
            debitAmount: payment.totalAmount,
            creditAmount: 0,
            description: "Registration fee and advance deposit collected",
          },
          {
            accountCode: ACCOUNT_CODES.REGISTRATION_FEE_REVENUE,
            debitAmount: 0,
            creditAmount: payment.registrationFee,
            description: "Registration fee revenue",
          },
          {
            accountCode: ACCOUNT_CODES.MEMBER_WALLET_LIABILITY,
            debitAmount: 0,
            creditAmount: payment.advanceDeposit,
            description: "Advance deposit for future contributions",
          },
        ],
        createdBy: approvedBy,
        autoPost: true,
      });

      // 8. Update agent statistics
      logger.info("Updating agent statistics", { agentId: member.agentId });
      await tx.agent.update({
        where: { agentId: member.agentId },
        data: {
          totalActiveMembers: { increment: 1 },
          totalRegistrations: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      // 9. Publish MemberActivated event
      await eventBus.publish(
        new MemberActivatedEvent(
          {
            memberId: member.memberId,
            memberCode: member.memberCode,
            agentId: member.agentId,
            unitId: member.unitId,
            areaId: member.areaId,
            forumId: member.forumId,
            approvedBy,
            walletInitialBalance: payment.advanceDeposit,
          },
          approvedBy
        )
      );

      logger.info("Member activated successfully", {
        memberId,
        memberCode: member.memberCode,
        walletBalance: payment.advanceDeposit,
      });
    });
  }
}
