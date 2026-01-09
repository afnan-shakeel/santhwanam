// Application: Dev Service
// Handles dev-only operations for testing/development

import { v4 as uuidv4 } from "uuid";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { asyncLocalStorage } from "@/shared/infrastructure/context";
import {
  QuickMemberRegistrationInput,
  QuickMemberRegistrationResult,
} from "../domain/types";
import {
  RegistrationStatus,
  RegistrationStep,
  MemberStatus,
  PaymentApprovalStatus,
} from "@/modules/members/domain/entities";
import {
  MemberRepository,
  NomineeRepository,
  RegistrationPaymentRepository,
  MembershipTierRepository,
} from "@/modules/members/domain/repositories";
import { AgentRepository } from "@/modules/agents/domain/repositories";
import {
  WalletRepository,
  WalletTransactionRepository,
} from "@/modules/wallet/domain/repositories";
import {
  WalletTransactionType,
  WalletTransactionStatus,
} from "@/modules/wallet/domain/entities";
import { BadRequestError, NotFoundError } from "@/shared/utils/error-handling/httpErrors";
import { generateMemberCode, calculateAge } from "@/modules/members/application/helpers";

export class DevService {
  constructor(
    private readonly memberRepo: MemberRepository,
    private readonly nomineeRepo: NomineeRepository,
    private readonly registrationPaymentRepo: RegistrationPaymentRepository,
    private readonly membershipTierRepo: MembershipTierRepository,
    private readonly agentRepo: AgentRepository,
    private readonly walletRepo: WalletRepository,
    private readonly walletTransactionRepo: WalletTransactionRepository
  ) {}

  /**
   * Quick register a member bypassing approval workflow
   * DEV-ONLY: Creates fully approved member with wallet
   */
  async quickRegisterMember(
    input: QuickMemberRegistrationInput
  ): Promise<QuickMemberRegistrationResult> {
    const userId = asyncLocalStorage.getUserId();

    return await prisma.$transaction(async (tx: any) => {
      // 1. Validate age >= 18
      const age = calculateAge(input.dateOfBirth);
      if (age < 18) {
        throw new BadRequestError("Member must be at least 18 years old");
      }

      // 2. Check for duplicate contact number
      const existingByContact = await tx.member.findFirst({
        where: { contactNumber: input.contactNumber },
      });
      if (existingByContact) {
        throw new BadRequestError("A member with this contact number already exists");
      }

      // 3. Check for duplicate email (if provided)
      if (input.email) {
        const existingByEmail = await tx.member.findFirst({
          where: { email: input.email },
        });
        if (existingByEmail) {
          throw new BadRequestError("A member with this email already exists");
        }
      }

      // 4. Validate tier exists and is active
      const tier = await this.membershipTierRepo.findById(input.tierId, tx);
      if (!tier || !tier.isActive) {
        throw new BadRequestError("Invalid or inactive membership tier");
      }

      // 5. Validate agent exists and is active
      const agent = await this.agentRepo.findById(input.agentId, tx);
      if (!agent) {
        throw new NotFoundError("Agent not found");
      }
      if (agent.agentStatus !== "Active") {
        throw new BadRequestError("Agent is not active");
      }

      // 6. Get hierarchy from agent
      const unitId = agent.unitId;
      const areaId = agent.areaId;
      const forumId = agent.forumId;

      // 7. Generate member code
      const memberCode = await generateMemberCode(this.memberRepo);

      // 8. Determine final status based on autoApprove flag
      const autoApprove = input.autoApprove !== false; // default true
      const createWallet = input.createWallet !== false; // default true

      const registrationStatus = autoApprove
        ? RegistrationStatus.Approved
        : RegistrationStatus.Draft;
      const memberStatus = autoApprove ? MemberStatus.Active : null;
      const registrationStep = autoApprove
        ? RegistrationStep.Completed
        : RegistrationStep.PersonalDetails;

      // 9. Create member record
      const memberId = uuidv4();
      const member = await this.memberRepo.create(
        {
          memberId,
          memberCode,
          registrationStatus,
          registrationStep,
          approvalRequestId: null,
          firstName: input.firstName,
          middleName: input.middleName || null,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          contactNumber: input.contactNumber,
          alternateContactNumber: input.alternateContactNumber || null,
          email: input.email || null,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 || null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country,
          tierId: input.tierId,
          agentId: input.agentId,
          unitId,
          areaId,
          forumId,
          memberStatus,
          suspensionCounter: 0,
          suspensionReason: null,
          suspendedAt: null,
          registeredAt: autoApprove ? new Date() : null,
          createdBy: userId,
          approvedBy: autoApprove ? userId : null,
        },
        tx
      );

      // 10. Create registration payment
      const registrationFee = input.registrationFee ?? tier.registrationFee;
      const advanceDeposit = input.advanceDeposit ?? tier.advanceDepositAmount;
      const totalAmount = registrationFee + advanceDeposit;

      const paymentId = uuidv4();
      const payment = await this.registrationPaymentRepo.create(
        {
          paymentId,
          memberId: member.memberId,
          registrationFee,
          advanceDeposit,
          totalAmount,
          collectedBy: input.agentId,
          collectionDate: input.collectionDate || new Date(),
          collectionMode: input.collectionMode || "Cash",
          referenceNumber: input.referenceNumber || null,
          approvalStatus: autoApprove
            ? PaymentApprovalStatus.Approved
            : PaymentApprovalStatus.PendingApproval,
          approvedBy: autoApprove ? userId : null,
          approvedAt: autoApprove ? new Date() : null,
          rejectionReason: null,
        },
        tx
      );

      // 11. Create wallet if autoApprove and createWallet are true
      let walletResult: { walletId: string; balance: number } | null = null;

      if (autoApprove && createWallet) {
        const walletId = uuidv4();

        await this.walletRepo.create(
          {
            walletId,
            memberId: member.memberId,
            currentBalance: advanceDeposit,
          },
          tx
        );

        // Create initial wallet transaction
        if (advanceDeposit > 0) {
          await this.walletTransactionRepo.create(
            {
              transactionId: uuidv4(),
              walletId,
              transactionType: WalletTransactionType.Deposit,
              amount: advanceDeposit,
              balanceAfter: advanceDeposit,
              sourceModule: "Membership",
              sourceEntityId: member.memberId,
              description: "Initial deposit from registration",
              journalEntryId: null,
              status: WalletTransactionStatus.Completed,
              createdBy: userId,
            },
            tx
          );
        }

        walletResult = {
          walletId,
          balance: advanceDeposit,
        };
      }

      // 12. Create nominees if provided
      const createdNominees: Array<{
        nomineeId: string;
        name: string;
        relationType: string;
      }> = [];

      if (input.nominees && input.nominees.length > 0) {
        // Validate nominee count
        if (input.nominees.length > 3) {
          throw new BadRequestError("Maximum 3 nominees allowed");
        }

        for (let i = 0; i < input.nominees.length; i++) {
          const nomineeInput = input.nominees[i];
          const nomineeId = uuidv4();

          const nominee = await this.nomineeRepo.create(
            {
              nomineeId,
              memberId: member.memberId,
              name: nomineeInput.name,
              relationType: nomineeInput.relationType,
              dateOfBirth: nomineeInput.dateOfBirth,
              contactNumber: nomineeInput.contactNumber,
              alternateContactNumber: nomineeInput.alternateContactNumber || null,
              addressLine1: nomineeInput.addressLine1,
              addressLine2: nomineeInput.addressLine2 || null,
              city: nomineeInput.city,
              state: nomineeInput.state,
              postalCode: nomineeInput.postalCode,
              country: nomineeInput.country,
              idProofType: nomineeInput.idProofType,
              idProofNumber: nomineeInput.idProofNumber,
              idProofDocumentId: null,
              priority: i + 1,
              isActive: true,
            },
            tx
          );

          createdNominees.push({
            nomineeId: nominee.nomineeId,
            name: nominee.name,
            relationType: nominee.relationType,
          });
        }
      }

      // 13. Return result
      return {
        member: {
          memberId: member.memberId,
          memberCode: member.memberCode,
          firstName: member.firstName,
          lastName: member.lastName,
          memberStatus: member.memberStatus,
          registrationStatus: member.registrationStatus,
        },
        wallet: walletResult,
        nominees: createdNominees,
        registrationPayment: {
          paymentId: payment.paymentId,
          registrationFee: payment.registrationFee,
          advanceDeposit: payment.advanceDeposit,
          totalAmount: payment.totalAmount,
          approvalStatus: payment.approvalStatus,
        },
      };
    });
  }
}
