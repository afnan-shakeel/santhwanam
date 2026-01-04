import { RegistrationStatus, MemberStatus, DocumentVerificationStatus, PaymentApprovalStatus } from "../../domain/entities";
import { logger } from "@/shared/utils/logger";
import { supabaseAdmin } from "@/shared/infrastructure/auth/client/supaBaseClient";
import { eventBus } from "@/shared/domain/events/event-bus";
import { MemberActivatedEvent } from "../../domain/events";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { v4 as uuidv4 } from "uuid";
import { ACCOUNT_CODES, TRANSACTION_SOURCE, TRANSACTION_TYPE } from "@/modules/gl/constants/accountCodes";
export class ActivateMemberOnApprovalHandler {
    memberRepository;
    memberDocumentRepository;
    registrationPaymentRepository;
    agentRepository;
    userRepository;
    roleRepository;
    userRoleRepository;
    journalEntryService;
    constructor(memberRepository, memberDocumentRepository, registrationPaymentRepository, agentRepository, userRepository, roleRepository, userRoleRepository, journalEntryService) {
        this.memberRepository = memberRepository;
        this.memberDocumentRepository = memberDocumentRepository;
        this.registrationPaymentRepository = registrationPaymentRepository;
        this.agentRepository = agentRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.journalEntryService = journalEntryService;
    }
    async handle(event) {
        const payload = event.payload;
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
        await prisma.$transaction(async (tx) => {
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
            const walletId = uuidv4();
            await tx.wallet.create({
                data: {
                    walletId,
                    memberId,
                    currentBalance: payment.advanceDeposit,
                    createdAt: new Date(),
                    updatedAt: null,
                },
            });
            // Create initial wallet transaction for advance deposit
            if (Number(payment.advanceDeposit) > 0) {
                await tx.walletTransaction.create({
                    data: {
                        transactionId: uuidv4(),
                        walletId,
                        transactionType: "Deposit",
                        amount: payment.advanceDeposit,
                        balanceAfter: payment.advanceDeposit,
                        sourceModule: "Membership",
                        sourceEntityId: memberId,
                        description: "Initial deposit from registration",
                        journalEntryId: null,
                        status: "Completed",
                        createdBy: approvedBy,
                        createdAt: new Date(),
                    },
                });
            }
            // 4. Create user in Supabase (if email is provided)
            let userId = null;
            if (member.email) {
                logger.info("Creating Supabase user for member", { email: member.email });
                const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
                    email: member.email,
                    email_confirm: true,
                    user_metadata: {
                        firstName: member.firstName,
                        lastName: member.lastName,
                        memberId: member.memberId,
                    }
                });
                if (supabaseError || !supabaseUser.user) {
                    logger.error("Supabase user creation failed", {
                        error: supabaseError?.message,
                        email: member.email
                    });
                    // Don't fail the whole transaction - log and continue
                    logger.warn("Member activation continuing without user account");
                }
                else {
                    // 5. Create local user
                    logger.info("Creating local user", { externalAuthId: supabaseUser.user.id });
                    const localUser = await this.userRepository.create({
                        externalAuthId: supabaseUser.user.id,
                        email: member.email,
                        firstName: member.firstName,
                        lastName: member.lastName,
                        isActive: true,
                        userMetadata: null,
                        lastSyncedAt: new Date(),
                    }, tx);
                    userId = localUser.userId;
                    // 6. Get Member role
                    const memberRole = await this.roleRepository.findByCode("member", tx);
                    if (memberRole) {
                        // 7. Assign Member role
                        logger.info("Assigning Member role", {
                            userId: localUser.userId,
                            roleId: memberRole.roleId,
                            memberId
                        });
                        await this.userRoleRepository.create({
                            userId: localUser.userId,
                            roleId: memberRole.roleId,
                            scopeEntityType: "Agent",
                            scopeEntityId: member.agentId,
                            assignedBy: approvedBy,
                        }, tx);
                    }
                    else {
                        logger.warn("Member role not found in system - skipping role assignment");
                    }
                    // 8. Generate invitation link
                    try {
                        const { data: inviteLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                            type: "invite",
                            email: member.email,
                            options: {
                                redirectTo: `${process.env.APP_URL || "http://localhost:3000"}/auth/set-password`
                            }
                        });
                        if (linkError) {
                            logger.error("Failed to generate invite link", { error: linkError.message });
                        }
                        else {
                            logger.info("Invitation link generated", { email: member.email });
                            // TODO: Send invitation email with inviteLink.properties.action_link
                        }
                    }
                    catch (error) {
                        logger.error("Error generating invite link", { error: error.message });
                    }
                }
            }
            else {
                logger.info("No email provided for member - skipping user account creation", { memberId });
            }
            // 9. Update member status to Active
            logger.info("Updating member status to Active", { memberId, userId });
            await this.memberRepository.update(memberId, {
                registrationStatus: RegistrationStatus.Approved,
                memberStatus: MemberStatus.Active,
                registeredAt: new Date(),
                approvedBy,
                userId,
            }, tx);
            // 10. Update payment approval status
            logger.info("Marking payment as approved", { paymentId: payment.paymentId });
            await this.registrationPaymentRepository.update(payment.paymentId, {
                approvalStatus: PaymentApprovalStatus.Approved,
                approvedBy,
                approvedAt: new Date(),
            }, tx);
            // 6. Mark all active member documents as verified
            logger.info("Verifying all member documents", { memberId });
            const activeDocuments = await this.memberDocumentRepository.findActiveByMemberId(memberId, tx);
            for (const doc of activeDocuments) {
                await this.memberDocumentRepository.update(doc.documentId, {
                    verificationStatus: DocumentVerificationStatus.Verified,
                    verifiedBy: approvedBy,
                    verifiedAt: new Date(),
                }, tx);
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
            await eventBus.publish(new MemberActivatedEvent({
                memberId: member.memberId,
                memberCode: member.memberCode,
                agentId: member.agentId,
                unitId: member.unitId,
                areaId: member.areaId,
                forumId: member.forumId,
                approvedBy,
                walletInitialBalance: payment.advanceDeposit,
            }, approvedBy));
            logger.info("Member activated successfully", {
                memberId,
                memberCode: member.memberCode,
                walletBalance: payment.advanceDeposit,
            });
        });
    }
}
//# sourceMappingURL=activate-member-on-approval.handler.js.map