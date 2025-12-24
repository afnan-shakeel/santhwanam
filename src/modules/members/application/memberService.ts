// Application: Member Service
// Handles member registration workflow (Steps 1-3)

import { v4 as uuidv4 } from "uuid";
import {
  MemberRepository,
  NomineeRepository,
  MemberDocumentRepository,
  RegistrationPaymentRepository,
  MembershipTierRepository,
} from "../domain/repositories";
import {
  Member,
  Nominee,
  MemberDocument,
  RegistrationPayment,
  RegistrationStatus,
  RegistrationStep,
  Gender,
  RelationType,
  IdProofType,
  DocumentType,
  DocumentCategory,
  CollectionMode,
} from "../domain/entities";
import {
  BadRequestError,
  NotFoundError,
} from "@/shared/utils/error-handling/httpErrors";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { eventBus } from "@/shared/domain/events/event-bus";
import { searchService, SearchRequest } from "@/shared/infrastructure/search";
import {
  MemberRegistrationStartedEvent,
  MemberDraftSavedEvent,
  PersonalDetailsCompletedEvent,
  NomineeAddedEvent,
  NomineeUpdatedEvent,
  NomineeRemovedEvent,
  NomineesStepCompletedEvent,
  MemberDocumentUploadedEvent,
  MemberDocumentRemovedEvent,
  RegistrationPaymentRecordedEvent,
} from "../domain/events";
import { generateMemberCode, calculateAge } from "./helpers";
import { asyncLocalStorage } from "@/shared/infrastructure/context";

// ===== Step 1: Personal Details =====

interface StartRegistrationInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  contactNumber: string;
  alternateContactNumber?: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  tierId: string;
  unitId: string;
  agentId: string;
  createdBy: string;
}

interface SavePersonalDetailsInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  contactNumber?: string;
  alternateContactNumber?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// ===== Step 2: Nominees =====

interface AddNomineeInput {
  memberId: string;
  name: string;
  relationType: RelationType;
  dateOfBirth: Date;
  contactNumber: string;
  alternateContactNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  idProofType: IdProofType;
  idProofNumber: string;
}

interface UpdateNomineeInput {
  name?: string;
  relationType?: RelationType;
  dateOfBirth?: Date;
  contactNumber?: string;
  alternateContactNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  idProofType?: IdProofType;
  idProofNumber?: string;
}

// ===== Step 3: Documents & Payment =====

interface UploadDocumentInput {
  memberId: string;
  nomineeId?: string;
  documentType: DocumentType;
  documentCategory: DocumentCategory;
  documentName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  expiryDate?: Date;
}

interface RecordPaymentInput {
  memberId: string;
  registrationFee: number;
  advanceDeposit: number;
  collectedBy: string;
  collectionDate: Date;
  collectionMode: CollectionMode;
  referenceNumber?: string;
}

export class MemberService {
  constructor(
    private memberRepository: MemberRepository,
    private nomineeRepository: NomineeRepository,
    private memberDocumentRepository: MemberDocumentRepository,
    private registrationPaymentRepository: RegistrationPaymentRepository,
    private membershipTierRepository: MembershipTierRepository
  ) {}

  // ===== STEP 1: PERSONAL DETAILS =====

  /**
   * Start member registration in Draft status
   */
  async startRegistration(input: StartRegistrationInput): Promise<Member> {
    return prisma.$transaction(async (tx: any) => {
      // Validate age >= 18
      const age = calculateAge(input.dateOfBirth);
      if (age < 18) {
        throw new BadRequestError("Member must be at least 18 years old");
      }

      // Validate tier exists and is active
      const tier = await this.membershipTierRepository.findById(
        input.tierId,
        tx
      );
      if (!tier || !tier.isActive) {
        throw new BadRequestError("Invalid or inactive membership tier");
      }

      // Generate member code
      const memberCode = await generateMemberCode(this.memberRepository);

      // Get unit details for denormalization (assuming unit exists from validation in controller)
      // In production, fetch unit to get areaId and forumId
      // For now, we'll need to pass these or fetch from a unit repository

      // if not createdBy, add it
      const userId = asyncLocalStorage.getUserId()

      // Create member record
      const memberId = uuidv4();
      const member = await this.memberRepository.create(
        {
          memberId,
          memberCode,
          registrationStatus: RegistrationStatus.Draft,
          registrationStep: RegistrationStep.PersonalDetails,
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
          unitId: input.unitId,
          areaId: "", // TODO: Get from unit
          forumId: "", // TODO: Get from unit
          memberStatus: null,
          suspensionCounter: 0,
          suspensionReason: null,
          suspendedAt: null,
          registeredAt: null,
          createdBy: userId,
          approvedBy: null,
        },
        tx
      );

      // Emit event
      await eventBus.publish(
        new MemberRegistrationStartedEvent({
          memberId: member.memberId,
          memberCode: member.memberCode,
          unitId: member.unitId,
          areaId: member.areaId,
          forumId: member.forumId,
          agentId: member.agentId,
          tierId: member.tierId,
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          createdBy: member.createdBy,
        })
      );

      return member;
    });
  }

  /**
   * Save personal details as draft
   */
  async savePersonalDetailsAsDraft(
    memberId: string,
    input: SavePersonalDetailsInput
  ): Promise<Member> {
    return prisma.$transaction(async (tx: any) => {
      const member = await this.memberRepository.findById(memberId, tx);

      if (!member || member.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError("Invalid member or status");
      }

      if (member.registrationStep !== RegistrationStep.PersonalDetails) {
        throw new BadRequestError("Cannot save personal details at this step");
      }

      // Validate age if dateOfBirth provided
      if (input.dateOfBirth) {
        const age = calculateAge(input.dateOfBirth);
        if (age < 18) {
          throw new BadRequestError("Member must be at least 18 years old");
        }
      }

      // Update member
      const updated = await this.memberRepository.update(
        memberId,
        {
          ...input,
          updatedAt: new Date(),
        },
        tx
      );

      // Emit event
      await eventBus.publish(
        new MemberDraftSavedEvent({
          memberId: updated.memberId,
          memberCode: updated.memberCode,
          step: "PersonalDetails",
        })
      );

      return updated;
    });
  }

  /**
   * Complete personal details step
   */
  async completePersonalDetailsStep(memberId: string): Promise<Member> {
    return prisma.$transaction(async (tx: any) => {
      const member = await this.memberRepository.findById(memberId, tx);

      if (!member || member.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError("Invalid member or status");
      }

      if (member.registrationStep !== RegistrationStep.PersonalDetails) {
        throw new BadRequestError("Invalid registration step");
      }

      // Validate all required fields
      if (!member.firstName || !member.lastName) {
        throw new BadRequestError("First name and last name are required");
      }

      if (!member.dateOfBirth) {
        throw new BadRequestError("Date of birth is required");
      }

      const age = calculateAge(member.dateOfBirth);
      if (age < 18) {
        throw new BadRequestError("Member must be at least 18 years old");
      }

      if (!member.contactNumber) {
        throw new BadRequestError("Contact number is required");
      }

      if (
        !member.addressLine1 ||
        !member.city ||
        !member.state ||
        !member.postalCode ||
        !member.country
      ) {
        throw new BadRequestError("Complete address is required");
      }

      // Move to next step
      const updated = await this.memberRepository.update(
        memberId,
        {
          registrationStep: RegistrationStep.Nominees,
        },
        tx
      );

      // Emit event
      await eventBus.publish(
        new PersonalDetailsCompletedEvent({
          memberId: updated.memberId,
          memberCode: updated.memberCode,
        })
      );

      return updated;
    });
  }

  // ===== STEP 2: NOMINEES =====

  /**
   * Add nominee
   */
  async addNominee(input: AddNomineeInput): Promise<Nominee> {
    return prisma.$transaction(async (tx: any) => {
      const member = await this.memberRepository.findById(input.memberId, tx);

      if (!member || member.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError("Invalid member or status");
      }

      if (
        ![RegistrationStep.Nominees, RegistrationStep.DocumentsPayment].includes(
          member.registrationStep
        )
      ) {
        throw new BadRequestError("Cannot add nominees at this step");
      }

      // Create nominee with priority = 1 (Phase 1: no priority logic)
      const nomineeId = uuidv4();
      const nominee = await this.nomineeRepository.create(
        {
          nomineeId,
          memberId: input.memberId,
          name: input.name,
          relationType: input.relationType,
          dateOfBirth: input.dateOfBirth,
          contactNumber: input.contactNumber,
          alternateContactNumber: input.alternateContactNumber || null,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 || null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country,
          idProofType: input.idProofType,
          idProofNumber: input.idProofNumber,
          idProofDocumentId: null,
          priority: 1,
          isActive: true,
        },
        tx
      );

      // Emit event
      await eventBus.publish(
        new NomineeAddedEvent({
          nomineeId: nominee.nomineeId,
          memberId: member.memberId,
          memberCode: member.memberCode,
          nomineeName: nominee.name,
          relationType: nominee.relationType,
        })
      );

      return nominee;
    });
  }

  /**
   * Update nominee
   */
  async updateNominee(
    nomineeId: string,
    input: UpdateNomineeInput
  ): Promise<Nominee> {
    return prisma.$transaction(async (tx: any) => {
      const nominee = await this.nomineeRepository.findById(nomineeId, tx);

      if (!nominee || !nominee.isActive) {
        throw new NotFoundError("Nominee not found or inactive");
      }

      const member = await this.memberRepository.findById(nominee.memberId, tx);

      if (!member || member.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError("Cannot update nominee after submission");
      }

      // Update nominee
      const updated = await this.nomineeRepository.update(
        nomineeId,
        input,
        tx
      );

      // Emit event
      await eventBus.publish(
        new NomineeUpdatedEvent({
          nomineeId: updated.nomineeId,
          memberId: member.memberId,
          memberCode: member.memberCode,
          nomineeName: updated.name,
        })
      );

      return updated;
    });
  }

  /**
   * Remove nominee
   */
  async removeNominee(nomineeId: string): Promise<void> {
    return prisma.$transaction(async (tx: any) => {
      const nominee = await this.nomineeRepository.findById(nomineeId, tx);

      if (!nominee || !nominee.isActive) {
        throw new NotFoundError("Nominee not found or inactive");
      }

      const member = await this.memberRepository.findById(nominee.memberId, tx);

      if (!member || member.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError("Cannot remove nominee after submission");
      }

      // Check if this is the only nominee (Phase 1: at least 1 required)
      const nomineeCount = await this.nomineeRepository.countActiveByMemberId(
        nominee.memberId,
        tx
      );

      if (nomineeCount <= 1) {
        throw new BadRequestError(
          "Cannot remove the only nominee (at least 1 required)"
        );
      }

      // Soft delete nominee
      await this.nomineeRepository.softDelete(nomineeId, tx);

      // Soft delete associated documents
      await this.memberDocumentRepository.softDeleteByNomineeId(nomineeId, tx);

      // Emit event
      await eventBus.publish(
        new NomineeRemovedEvent({
          nomineeId: nominee.nomineeId,
          memberId: member.memberId,
          memberCode: member.memberCode,
        })
      );
    });
  }

  /**
   * Complete nominees step
   */
  async completeNomineesStep(memberId: string): Promise<Member> {
    return prisma.$transaction(async (tx: any) => {
      const member = await this.memberRepository.findById(memberId, tx);

      if (!member || member.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError("Invalid member or status");
      }

      // commenting to allow backward compatibility
      // if (member.registrationStep !== RegistrationStep.Nominees) {
      //   throw new BadRequestError("Invalid registration step");
      // }

      // Validate nominees exist
      const nominees = await this.nomineeRepository.findActiveByMemberId(
        memberId,
        tx
      );

      if (nominees.length === 0) {
        throw new BadRequestError("At least 1 nominee is required");
      }

      // Move to next step
      const updated = await this.memberRepository.update(
        memberId,
        {
          registrationStep: RegistrationStep.DocumentsPayment,
        },
        tx
      );

      // Emit event
      await eventBus.publish(
        new NomineesStepCompletedEvent({
          memberId: updated.memberId,
          memberCode: updated.memberCode,
          nomineeCount: nominees.length,
        })
      );

      return updated;
    });
  }

  // ===== STEP 3: DOCUMENTS & PAYMENT =====

  /**
   * Upload member document
   */
  async uploadMemberDocument(input: UploadDocumentInput): Promise<MemberDocument> {
    return prisma.$transaction(async (tx: any) => {
      const member = await this.memberRepository.findById(input.memberId, tx);

      if (!member || member.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError("Invalid member or status");
      }

      if (member.registrationStep !== RegistrationStep.DocumentsPayment) {
        throw new BadRequestError("Cannot upload documents at this step");
      }

      // If uploading member photo, check if one already exists
      if (input.documentCategory === DocumentCategory.MemberPhoto) {
        const existingPhotos =
          await this.memberDocumentRepository.findActiveByMemberAndCategory(
            input.memberId,
            DocumentCategory.MemberPhoto,
            tx
          );

        if (existingPhotos.length > 0) {
          // Soft delete old photo
          await this.memberDocumentRepository.softDelete(
            existingPhotos[0].documentId,
            tx
          );
        }
      }

      // Validate nominee if nominee proof
      if (
        input.documentCategory === DocumentCategory.NomineeProof &&
        input.nomineeId
      ) {
        const nominee = await this.nomineeRepository.findById(
          input.nomineeId,
          tx
        );

        if (!nominee || !nominee.isActive) {
          throw new NotFoundError("Nominee not found");
        }
      }

      const uploadedBy = asyncLocalStorage.getUserId()
      // Create document record
      const documentId = uuidv4();
      const document = await this.memberDocumentRepository.create(
        {
          documentId,
          memberId: input.memberId,
          nomineeId: input.nomineeId || null,
          documentType: input.documentType,
          documentCategory: input.documentCategory,
          documentName: input.documentName,
          fileUrl: input.fileUrl,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          uploadedBy: uploadedBy,
          uploadedAt: new Date(),
          verificationStatus: "Pending" as any,
          verifiedBy: null,
          verifiedAt: null,
          rejectionReason: null,
          expiryDate: input.expiryDate || null,
          isActive: true,
        },
        tx
      );

      // If nominee ID proof, link to nominee
      if (
        input.documentCategory === DocumentCategory.NomineeProof &&
        input.nomineeId
      ) {
        await this.nomineeRepository.update(
          input.nomineeId,
          {
            idProofDocumentId: document.documentId,
          },
          tx
        );
      }

      // Emit event
      await eventBus.publish(
        new MemberDocumentUploadedEvent({
          documentId: document.documentId,
          memberId: member.memberId,
          memberCode: member.memberCode,
          nomineeId: document.nomineeId,
          documentCategory: document.documentCategory,
          documentType: document.documentType,
          documentName: document.documentName,
          uploadedBy: document.uploadedBy,
        })
      );

      return document;
    });
  }

  /**
   * Remove member document
   */
  async removeMemberDocument(documentId: string): Promise<void> {
    return prisma.$transaction(async (tx: any) => {
      const document = await this.memberDocumentRepository.findById(
        documentId,
        tx
      );

      if (!document || !document.isActive) {
        throw new NotFoundError("Document not found or inactive");
      }

      const member = await this.memberRepository.findById(
        document.memberId,
        tx
      );

      if (!member || member.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError("Cannot remove documents after submission");
      }

      // Soft delete document
      await this.memberDocumentRepository.softDelete(documentId, tx);

      // If this was a nominee ID proof, unlink from nominee
      if (document.nomineeId) {
        const nominee = await this.nomineeRepository.findById(
          document.nomineeId,
          tx
        );
        if (nominee && nominee.idProofDocumentId === document.documentId) {
          await this.nomineeRepository.update(
            document.nomineeId,
            {
              idProofDocumentId: null,
            },
            tx
          );
        }
      }

      // Emit event
      await eventBus.publish(
        new MemberDocumentRemovedEvent({
          documentId: document.documentId,
          memberId: member.memberId,
          memberCode: member.memberCode,
          documentCategory: document.documentCategory,
        })
      );
    });
  }

  /**
   * Record registration payment
   */
  async recordRegistrationPayment(
    input: RecordPaymentInput
  ): Promise<RegistrationPayment> {
    return prisma.$transaction(async (tx: any) => {
      const member = await this.memberRepository.findById(input.memberId, tx);

      if (!member || member.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError("Invalid member or status");
      }

      if (member.registrationStep !== RegistrationStep.DocumentsPayment) {
        throw new BadRequestError("Cannot record payment at this step");
      }

      // // Verify agent
      // if (member.agentId !== input.collectedBy) {
      //   throw new BadRequestError("Only assigned agent can record payment");
      // } temp commentingg

      // Validate amounts match tier
      const tier = await this.membershipTierRepository.findById(
        member.tierId,
        tx
      );

      if (!tier) {
        throw new NotFoundError("Membership tier not found");
      }

      if (input.registrationFee !== tier.registrationFee) {
        throw new BadRequestError(
          `Registration fee must be ${tier.registrationFee}`
        );
      }

      if (input.advanceDeposit !== tier.advanceDepositAmount) {
        throw new BadRequestError(
          `Advance deposit must be ${tier.advanceDepositAmount}`
        );
      }

      const totalAmount = input.registrationFee + input.advanceDeposit;

      // Check if payment already exists
      const existingPayment =
        await this.registrationPaymentRepository.findByMemberId(
          input.memberId,
          tx
        );

      if (existingPayment) {
        throw new BadRequestError("Payment already recorded");
      }

      // Create payment record
      const paymentId = uuidv4();
      const payment = await this.registrationPaymentRepository.create(
        {
          paymentId,
          memberId: input.memberId,
          registrationFee: input.registrationFee,
          advanceDeposit: input.advanceDeposit,
          totalAmount,
          collectedBy: input.collectedBy,
          collectionDate: input.collectionDate,
          collectionMode: input.collectionMode,
          referenceNumber: input.referenceNumber || null,
          approvalStatus: "PendingApproval" as any,
          approvedBy: null,
          approvedAt: null,
          rejectionReason: null,
        },
        tx
      );

      // Emit event
      await eventBus.publish(
        new RegistrationPaymentRecordedEvent({
          paymentId: payment.paymentId,
          memberId: member.memberId,
          memberCode: member.memberCode,
          totalAmount,
          registrationFee: input.registrationFee,
          advanceDeposit: input.advanceDeposit,
          collectedBy: input.collectedBy,
          collectionMode: input.collectionMode,
        })
      );

      return payment;
    });
  }

  // ===== HELPER METHODS =====

  async getMemberById(memberId: string): Promise<Member | null> {
    return this.memberRepository.findById(memberId);
  }

  async getNomineesByMemberId(memberId: string): Promise<Nominee[]> {
    return this.nomineeRepository.findActiveByMemberId(memberId);
  }

  async getDocumentsByMemberId(memberId: string): Promise<MemberDocument[]> {
    return this.memberDocumentRepository.findActiveByMemberId(memberId);
  }

  async getPaymentByMemberId(
    memberId: string
  ): Promise<RegistrationPayment | null> {
    return this.registrationPaymentRepository.findByMemberId(memberId);
  }

  // ===== DETAILED QUERIES =====

  async getMemberDetails(memberId: string): Promise<any> {
    const member = await prisma.member.findUnique({
      where: { memberId },
      include: {
        agent: {
          select: {
            agentId: true,
            agentCode: true,
            firstName: true,
            lastName: true,
            contactNumber: true,
            email: true,
          },
        },
        unit: {
          select: {
            unitId: true,
            unitCode: true,
            unitName: true,
            forumId: true,
            area: {
              select: {
                areaId: true,
                areaCode: true,
                areaName: true,
              },
            },
          },
        },
        tier: {
          select: {
            tierId: true,
            tierCode: true,
            tierName: true,
            registrationFee: true,
            advanceDepositAmount: true,
            contributionAmount: true,
            deathBenefitAmount: true,
          },
        },
        nominees: {
          where: { isActive: true },
          orderBy: { priority: "asc" },
        },
        documents: {
          where: { isActive: true },
          orderBy: { uploadedAt: "desc" },
        },
        payment: true,
      },
    });

    if (!member) {
      throw new NotFoundError("Member not found");
    }

    return member;
  }

  async listMembers(filters: {
    page?: number;
    limit?: number;
    memberStatus?: string;
    registrationStatus?: string;
    agentId?: string;
    unitId?: string;
    areaId?: string;
    forumId?: string;
    tierId?: string;
    searchQuery?: string;
  }): Promise<{ members: any[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.memberStatus) {
      where.memberStatus = filters.memberStatus;
    }

    if (filters.registrationStatus) {
      where.registrationStatus = filters.registrationStatus;
    }

    if (filters.agentId) {
      where.agentId = filters.agentId;
    }

    if (filters.unitId) {
      where.unitId = filters.unitId;
    }

    if (filters.areaId) {
      where.areaId = filters.areaId;
    }

    if (filters.forumId) {
      where.forumId = filters.forumId;
    }

    if (filters.tierId) {
      where.tierId = filters.tierId;
    }

    if (filters.searchQuery) {
      where.OR = [
        { memberCode: { contains: filters.searchQuery, mode: "insensitive" } },
        { firstName: { contains: filters.searchQuery, mode: "insensitive" } },
        { lastName: { contains: filters.searchQuery, mode: "insensitive" } },
        { email: { contains: filters.searchQuery, mode: "insensitive" } },
        {
          contactNumber: {
            contains: filters.searchQuery,
            mode: "insensitive",
          },
        },
      ];
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          agent: {
            select: {
              agentId: true,
              agentCode: true,
              firstName: true,
              lastName: true,
            },
          },
          unit: {
            select: {
              unitId: true,
              unitCode: true,
              unitName: true,
            },
          },
          tier: {
            select: {
              tierId: true,
              tierCode: true,
              tierName: true,
            },
          },
        },
      }),
      prisma.member.count({ where }),
    ]);

    return {
      members,
      total,
      page,
      limit,
    };
  }

  /**
   * Search members with advanced filtering
   */
  async searchMembers(searchRequest: Omit<SearchRequest, 'model'>) {
    return searchService.execute({
      ...searchRequest,
      model: "Member"
    });
  }

  /**
   * Get metadata for member documents and payments
   * Returns lists of document types, categories, and collection modes
   */
  async getMetadata() {
    return {
      documentTypes: Object.values(DocumentType).map(type => ({
        value: type,
        label: type.replace(/([A-Z])/g, ' $1').trim()
      })),
      documentCategories: Object.values(DocumentCategory).map(category => ({
        value: category,
        label: category.replace(/([A-Z])/g, ' $1').trim()
      })),
      collectionModes: Object.values(CollectionMode).map(mode => ({
        value: mode,
        label: mode.replace(/([A-Z])/g, ' $1').trim()
      }))
    };
  }
}
