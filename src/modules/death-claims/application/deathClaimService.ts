// Application: Death Claim Service
// Handles death claim registration, verification, approval, and settlement workflow

import { v4 as uuidv4 } from 'uuid';
import {
  DeathClaimRepository,
  DeathClaimDocumentRepository,
} from '../domain/repositories';
import {
  DeathClaim,
  DeathClaimDocument,
  DeathClaimStatus,
  DeathClaimVerificationStatus,
  DeathClaimSettlementStatus,
  ClaimDocumentType,
  ClaimDocumentVerificationStatus,
  PaymentMethod,
} from '../domain/entities';
import { MemberRepository, NomineeRepository, MembershipTierRepository } from '@/modules/members/domain/repositories';
import { MemberStatus } from '@/modules/members/domain/entities';
import { ApprovalRequestService } from '@/modules/approval-workflow/application/approvalRequestService';
import { JournalEntryService } from '@/modules/gl/application/journalEntryService';
import { ACCOUNT_CODES } from '@/modules/gl/constants/accountCodes';
import { FileUploadService } from '@/shared/infrastructure/file-upload/fileUploadService';
import { BadRequestError, NotFoundError } from '@/shared/utils/error-handling/httpErrors';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { eventBus } from '@/shared/domain/events/event-bus';
import {
  DeathReportedEvent,
  ClaimDocumentUploadedEvent,
  ClaimDocumentsVerifiedEvent,
  DeathClaimSubmittedForApprovalEvent,
  DeathClaimApprovedEvent,
  DeathClaimRejectedEvent,
  DeathClaimSettledEvent,
} from '../domain/events';
import { generateClaimNumber } from './helpers';
import { asyncLocalStorage } from "@/shared/infrastructure/context/AsyncLocalStorageManager";

// ===== Report Death =====
interface ReportDeathInput {
  memberId: string;
  deathDate: Date;
  deathPlace?: string;
  causeOfDeath?: string;
  initialNotes?: string;
  reportedBy: string;
}

// ===== Upload Document =====
interface UploadClaimDocumentInput {
  claimId: string;
  documentType: ClaimDocumentType;
  documentName: string;
  fileBuffer: Buffer;
  mimeType: string;
  uploadedBy: string;
}

// ===== Verify Documents =====
interface VerifyClaimDocumentsInput {
  claimId: string;
  verificationNotes?: string;
  verifiedBy: string;
}

// ===== Settle Claim =====
interface SettleDeathClaimInput {
  claimId: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  paymentDate: Date;
  nomineeAcknowledgmentFile?: {
    fileBuffer: Buffer;
    fileName: string;
    mimeType: string;
  };
  paidBy: string;
}

export class DeathClaimService {
  constructor(
    private deathClaimRepo: DeathClaimRepository,
    private deathClaimDocumentRepo: DeathClaimDocumentRepository,
    private memberRepo: MemberRepository,
    private nomineeRepo: NomineeRepository,
    private tierRepo: MembershipTierRepository,
    private approvalRequestService: ApprovalRequestService,
    private journalEntryService: JournalEntryService,
    private fileUploadService: FileUploadService
  ) {}

  /**
   * Command: ReportDeath
   * Creates a new death claim for a deceased member
   */
  async reportDeath(input: ReportDeathInput): Promise<DeathClaim> {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Validate member exists and is Active
      const member = await this.memberRepo.findById(input.memberId, tx);
      if (!member) {
        throw new NotFoundError('Member not found');
      }

      if (member.memberStatus !== MemberStatus.Active) {
        throw new BadRequestError('Only active members can have death claims');
      }

      // 2. Check death date validity
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const deathDate = new Date(input.deathDate);
      deathDate.setHours(0, 0, 0, 0);

      if (deathDate > today) {
        throw new BadRequestError('Death date cannot be in the future');
      }

      const registrationDate = new Date(member.registeredAt!);
      registrationDate.setHours(0, 0, 0, 0);

      if (deathDate < registrationDate) {
        throw new BadRequestError('Death date cannot be before member registration date');
      }

      // 3. Check if death claim already exists for this member
      const existingClaim = await this.deathClaimRepo.findByMemberId(input.memberId, tx);
      if (existingClaim) {
        throw new BadRequestError('A death claim already exists for this member');
      }

      // 4. Validate member has at least one nominee
      const nominees = await this.nomineeRepo.findByMemberId(input.memberId, tx);
      if (nominees.length === 0) {
        throw new BadRequestError('Member must have at least one nominee to file a death claim');
      }

      // 5. Get primary nominee (first active nominee)
      const primaryNominee = nominees.find((n) => n.isActive);
      if (!primaryNominee) {
        throw new BadRequestError('Member must have at least one active nominee');
      }

      // 6. Get member tier details
      const tier = await this.tierRepo.findById(member.tierId, tx);
      if (!tier) {
        throw new NotFoundError('Membership tier not found');
      }

      // 7. Generate claim number
      const claimNumber = await generateClaimNumber(this.deathClaimRepo, tx);

      // 8. Create death claim
      const claimId = uuidv4();
      const claim = await this.deathClaimRepo.create(
        {
          claimId,
          claimNumber,
          claimStatus: DeathClaimStatus.Reported,
          approvalRequestId: null,
          memberId: member.memberId,
          memberCode: member.memberCode,
          memberName: `${member.firstName} ${member.middleName || ''} ${member.lastName}`.trim(),
          tierId: tier.tierId,
          agentId: member.agentId,
          unitId: member.unitId,
          areaId: member.areaId,
          forumId: member.forumId,
          deathDate: input.deathDate,
          deathPlace: input.deathPlace || null,
          causeOfDeath: input.causeOfDeath || null,
          reportedBy: input.reportedBy,
          reportedByRole: 'Agent', // TODO: Get from user roles
          reportedDate: new Date(),
          initialNotes: input.initialNotes || null,
          nomineeId: primaryNominee.nomineeId,
          nomineeName: primaryNominee.name,
          nomineeRelation: primaryNominee.relationType,
          nomineeContactNumber: primaryNominee.contactNumber,
          nomineeAddress: {
            addressLine1: primaryNominee.addressLine1,
            addressLine2: primaryNominee.addressLine2,
            city: primaryNominee.city,
            state: primaryNominee.state,
            postalCode: primaryNominee.postalCode,
            country: primaryNominee.country,
          },
          benefitAmount: null,
          verificationStatus: DeathClaimVerificationStatus.Pending,
          verifiedBy: null,
          verifiedDate: null,
          verificationNotes: null,
          settlementStatus: DeathClaimSettlementStatus.Pending,
          paymentMethod: null,
          paymentReference: null,
          paymentDate: null,
          paidBy: null,
          nomineeAcknowledgment: null,
          journalEntryId: null,
          approvedAt: null,
          settledAt: null,
          approvedBy: null,
          rejectedBy: null,
          rejectionReason: null,
        },
        tx
      );

      // 9. Emit event
      eventBus.publish(
        new DeathReportedEvent(
          {
            claimId: claim.claimId,
            claimNumber: claim.claimNumber,
            memberId: member.memberId,
            memberCode: member.memberCode,
            memberName: claim.memberName,
            deathDate: claim.deathDate,
            reportedBy: input.reportedBy,
            nomineeId: primaryNominee.nomineeId,
            nomineeName: primaryNominee.name,
          },
          input.reportedBy
        )
      );

      return claim;
    });
  }

  /**
   * Command: UploadClaimDocument
   * Uploads supporting documents for a death claim
   */
  async uploadClaimDocument(input: UploadClaimDocumentInput): Promise<DeathClaimDocument> {
    return await prisma.$transaction(async (tx: any) => {

      // 1. Validate claim exists
      const claim = await this.deathClaimRepo.findById(input.claimId, tx);
      if (!claim) {
        throw new NotFoundError('Death claim not found');
      }

      // 2. Check claim status
      if (![DeathClaimStatus.Reported, DeathClaimStatus.UnderVerification].includes(claim.claimStatus)) {
        throw new BadRequestError('Documents can only be uploaded for claims in Reported or UnderVerification status');
      }

      // 3. Validate file
      // get mimetype from file
      this.fileUploadService.validateFileSize(input.fileBuffer.length);
      this.fileUploadService.validateFileType(input.mimeType);

      // 4. Upload file
      const uploadResult = await this.fileUploadService.uploadFile({
        memberId: claim.memberId,
        category: 'death_claim_docs',
        fileName: input.documentName,
        fileBuffer: input.fileBuffer,
        mimeType: input.mimeType,
      });

      // 5. Create document record
      const documentId = uuidv4();
      const document = await this.deathClaimDocumentRepo.create(
        {
          documentId,
          claimId: input.claimId,
          documentType: input.documentType,
          documentName: input.documentName,
          fileUrl: uploadResult.fileUrl,
          fileSize: uploadResult.fileSize,
          mimeType: input.mimeType,
          uploadedBy: input.uploadedBy,
          verificationStatus: ClaimDocumentVerificationStatus.Pending,
          verifiedBy: null,
          verifiedAt: null,
          rejectionReason: null,
        },
        tx
      );

      // 6. Update claim status to UnderVerification if first document
      if (claim.claimStatus === DeathClaimStatus.Reported) {
        await this.deathClaimRepo.update(
          input.claimId,
          {
            claimStatus: DeathClaimStatus.UnderVerification,
            updatedAt: new Date(),
          },
          tx
        );
      }

      // 7. Emit event
      eventBus.publish(
        new ClaimDocumentUploadedEvent(
          {
            documentId,
            claimId: input.claimId,
            claimNumber: claim.claimNumber,
            documentType: input.documentType,
            uploadedBy: input.uploadedBy,
          },
          input.uploadedBy
        )
      );

      return document;
    });
  }

  /**
   * Command: VerifyClaimDocuments
   * Verifies uploaded documents and marks claim as ready for approval
   */
  async verifyClaimDocuments(input: VerifyClaimDocumentsInput): Promise<DeathClaim> {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Validate claim exists
      const claim = await this.deathClaimRepo.findById(input.claimId, tx);
      if (!claim) {
        throw new NotFoundError('Death claim not found');
      }

      // 2. Check claim status
      if (claim.claimStatus !== DeathClaimStatus.UnderVerification) {
        throw new BadRequestError('Only claims under verification can be verified');
      }

      // 3. Check documents
      const documents = await this.deathClaimDocumentRepo.findByClaimId(input.claimId, tx);
      if (documents.length === 0) {
        throw new BadRequestError('At least one document must be uploaded before verification');
      }

      // 4. Verify death certificate exists
      const deathCertificate = documents.find((d) => d.documentType === ClaimDocumentType.DeathCertificate);
      if (!deathCertificate) {
        throw new BadRequestError('Death certificate is required for verification');
      }

      // 5. Mark all documents as verified
      for (const doc of documents) {
        await this.deathClaimDocumentRepo.update(
          doc.documentId,
          {
            verificationStatus: ClaimDocumentVerificationStatus.Verified,
            verifiedBy: input.verifiedBy,
            verifiedAt: new Date(),
          },
          tx
        );
      }

      // 6. Update claim
      const updatedClaim = await this.deathClaimRepo.update(
        input.claimId,
        {
          claimStatus: DeathClaimStatus.Verified,
          verificationStatus: DeathClaimVerificationStatus.Completed,
          verifiedBy: input.verifiedBy,
          verifiedDate: new Date(),
          verificationNotes: input.verificationNotes || null,
          updatedAt: new Date(),
        },
        tx
      );

      // 7. Emit event
      eventBus.publish(
        new ClaimDocumentsVerifiedEvent(
          {
            claimId: claim.claimId,
            claimNumber: claim.claimNumber,
            verifiedBy: input.verifiedBy,
            verifiedDate: new Date(),
          },
          input.verifiedBy
        )
      );

      return updatedClaim;
    });
  }

  /**
   * Command: VerifyIndividualDocument
   * Verifies a single document and checks if all documents are verified
   */
  async verifyIndividualDocument(
    claimId: string,
    documentId: string,
    verifiedBy: string,
    verificationStatus: ClaimDocumentVerificationStatus,
    notes?: string,
    rejectionReason?: string
  ): Promise<DeathClaimDocument> {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Validate claim exists
      const claim = await this.deathClaimRepo.findById(claimId, tx);
      if (!claim) {
        throw new NotFoundError('Death claim not found');
      }

      // 2. Validate document exists and belongs to claim
      const document = await this.deathClaimDocumentRepo.findById(documentId, tx);
      if (!document || document.claimId !== claimId) {
        throw new NotFoundError('Document not found or does not belong to this claim');
      }

      // 3. Update document verification status
      const updatedDocument = await this.deathClaimDocumentRepo.update(
        documentId,
        {
          verificationStatus,
          verifiedBy,
          verifiedAt: new Date(),
          rejectionReason: verificationStatus === ClaimDocumentVerificationStatus.Rejected ? rejectionReason : null,
        },
        tx
      );

      // 4. Check if all documents are now verified
      const allDocuments = await this.deathClaimDocumentRepo.findByClaimId(claimId, tx);
      const allVerified = allDocuments.every(
        (doc) => doc.verificationStatus === ClaimDocumentVerificationStatus.Verified
      );

      // 5. If all documents verified, update claim status
      if (allVerified && claim.claimStatus === DeathClaimStatus.UnderVerification) {
        await this.deathClaimRepo.update(
          claimId,
          {
            claimStatus: DeathClaimStatus.Verified,
            verificationStatus: DeathClaimVerificationStatus.Completed,
            verifiedBy,
            verifiedDate: new Date(),
            verificationNotes: notes || 'All documents verified individually',
            updatedAt: new Date(),
          },
          tx
        );

        // Emit event
        eventBus.publish(
          new ClaimDocumentsVerifiedEvent(
            {
              claimId: claim.claimId,
              claimNumber: claim.claimNumber,
              verifiedBy,
              verifiedDate: new Date(),
            },
            verifiedBy
          )
        );
      }

      return updatedDocument;
    });
  }

  /**
   * Command: SubmitClaimForApproval
   * Submits a verified claim to the approval workflow
   */
  async submitClaimForApproval(claimId: string, submittedBy: string): Promise<DeathClaim> {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Validate claim exists
      const claim = await this.deathClaimRepo.findById(claimId, tx);
      if (!claim) {
        throw new NotFoundError('Death claim not found');
      }

      // 2. Check claim status
      if (claim.claimStatus !== DeathClaimStatus.Verified) {
        throw new BadRequestError('Only verified claims can be submitted for approval');
      }

      // 3. Create approval request
      const approvalRequestData = await this.approvalRequestService.submitRequest({
        workflowCode: 'death_claim_approval',
        entityType: 'DeathClaim',
        entityId: claimId,
        forumId: claim.forumId,
        areaId: claim.areaId,
        unitId: claim.unitId,
        requestedBy: submittedBy,
      });

      // 4. Update claim
      const updatedClaim = await this.deathClaimRepo.update(
        claimId,
        {
          claimStatus: DeathClaimStatus.PendingApproval,
          approvalRequestId: approvalRequestData.request.requestId,
          updatedAt: new Date(),
        },
        tx
      );

      // 5. Emit event
      eventBus.publish(
        new DeathClaimSubmittedForApprovalEvent(
          {
            claimId: claim.claimId,
            claimNumber: claim.claimNumber,
            approvalRequestId: approvalRequestData.request.requestId,
            memberId: claim.memberId,
            memberName: claim.memberName,
          },
          submittedBy
        )
      );

      return updatedClaim;
    });
  }

  /**
   * Internal: Approve death claim (called by event handler)
   */
  async approveDeathClaim(claimId: string, approvedBy: string): Promise<DeathClaim> {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Get claim
      const claim = await this.deathClaimRepo.findById(claimId, tx);
      if (!claim) {
        throw new NotFoundError('Death claim not found');
      }

      // 2. Get tier to lock benefit amount
      const tier = await this.tierRepo.findById(claim.tierId, tx);
      if (!tier) {
        throw new NotFoundError('Membership tier not found');
      }

      // 3. Update claim
      const updatedClaim = await this.deathClaimRepo.update(
        claimId,
        {
          claimStatus: DeathClaimStatus.Approved,
          benefitAmount: tier.deathBenefitAmount,
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
        tx
      );

      // 4. Update member status to Deceased
      await this.memberRepo.update(
        claim.memberId,
        {
          memberStatus: MemberStatus.Deceased,
          updatedAt: new Date(),
        },
        tx
      );

      // 5. Emit event (will trigger contribution cycle)
      eventBus.publish(
        new DeathClaimApprovedEvent(
          {
            claimId: claim.claimId,
            claimNumber: claim.claimNumber,
            memberId: claim.memberId,
            memberCode: claim.memberCode,
            memberName: claim.memberName,
            benefitAmount: tier.deathBenefitAmount,
            forumId: claim.forumId,
            approvedBy,
            approvedAt: new Date(),
          },
          approvedBy
        )
      );

      return updatedClaim;
    });
  }

  /**
   * Internal: Reject death claim (called by event handler)
   */
  async rejectDeathClaim(claimId: string, rejectedBy: string, rejectionReason: string | null): Promise<DeathClaim> {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Get claim
      const claim = await this.deathClaimRepo.findById(claimId, tx);
      if (!claim) {
        throw new NotFoundError('Death claim not found');
      }

      // 2. Update claim
      const updatedClaim = await this.deathClaimRepo.update(
        claimId,
        {
          claimStatus: DeathClaimStatus.Rejected,
          rejectedBy,
          rejectionReason,
          updatedAt: new Date(),
        },
        tx
      );

      // 3. Emit event
      eventBus.publish(
        new DeathClaimRejectedEvent(
          {
            claimId: claim.claimId,
            claimNumber: claim.claimNumber,
            memberId: claim.memberId,
            rejectedBy,
            rejectionReason,
          },
          rejectedBy
        )
      );

      return updatedClaim;
    });
  }

  /**
   * Command: SettleDeathClaim
   * Records payment to nominee and creates GL entry
   */
  async settleDeathClaim(input: SettleDeathClaimInput): Promise<DeathClaim> {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Validate claim exists
      const claim = await this.deathClaimRepo.findById(input.claimId, tx);
      if (!claim) {
        throw new NotFoundError('Death claim not found');
      }

      // 2. Check claim status
      if (claim.claimStatus !== DeathClaimStatus.Approved) {
        throw new BadRequestError('Only approved claims can be settled');
      }

      if (!claim.benefitAmount) {
        throw new BadRequestError('Benefit amount not set');
      }

      // 3. Upload nominee acknowledgment if provided
      let acknowledgmentUrl: string | null = null;
      if (input.nomineeAcknowledgmentFile) {
        this.fileUploadService.validateFileSize(input.nomineeAcknowledgmentFile.fileBuffer.length);
        this.fileUploadService.validateFileType(input.nomineeAcknowledgmentFile.mimeType);

        const uploadResult = await this.fileUploadService.uploadFile({
          memberId: claim.memberId,
          category: 'death_claim_docs',
          fileName: input.nomineeAcknowledgmentFile.fileName,
          fileBuffer: input.nomineeAcknowledgmentFile.fileBuffer,
          mimeType: input.nomineeAcknowledgmentFile.mimeType,
        });

        acknowledgmentUrl = uploadResult.fileUrl;
      }

      // 4. Create journal entry (Dr: Death Benefit Expense, Cr: Cash/Bank)
      const accountCode = input.paymentMethod === PaymentMethod.Cash ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK_ACCOUNT;

      const { entry } = await this.journalEntryService.createJournalEntry({
        entryDate: input.paymentDate,
          description: `Death benefit payment for claim ${claim.claimNumber} - ${claim.memberName}`,
          reference: input.paymentReference || claim.claimNumber,
          sourceModule: 'DeathClaims',
          sourceEntityId: claim.claimId,
          sourceTransactionType: 'DeathBenefitPayout',
          lines: [
            {
              accountCode: ACCOUNT_CODES.DEATH_BENEFIT_EXPENSE,
              debitAmount: claim.benefitAmount,
              creditAmount: 0,
              description: `Death benefit for ${claim.memberName}`,
            },
            {
              accountCode,
              debitAmount: 0,
              creditAmount: claim.benefitAmount,
              description: `Payment to nominee ${claim.nomineeName}`,
            },
          ],
          createdBy: input.paidBy,
          autoPost: true,
        });

      // 5. Update claim
      const updatedClaim = await this.deathClaimRepo.update(
        input.claimId,
        {
          claimStatus: DeathClaimStatus.Settled,
          settlementStatus: DeathClaimSettlementStatus.Completed,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference || null,
          paymentDate: input.paymentDate,
          paidBy: input.paidBy,
          nomineeAcknowledgment: acknowledgmentUrl,
          journalEntryId: entry.entryId,
          settledAt: new Date(),
          updatedAt: new Date(),
        },
        tx
      );

      // 6. Emit event
      eventBus.publish(
        new DeathClaimSettledEvent(
          {
            claimId: claim.claimId,
            claimNumber: claim.claimNumber,
            memberId: claim.memberId,
            benefitAmount: claim.benefitAmount,
            paymentMethod: input.paymentMethod,
            paidBy: input.paidBy,
            journalEntryId: entry.entryId,
          },
          input.paidBy
        )
      );

      return updatedClaim;
    });
  }

  /**
   * Query: Get claim by ID
   */
  async getClaimById(claimId: string): Promise<DeathClaim> {
    const claim = await this.deathClaimRepo.findById(claimId);
    if (!claim) {
      throw new NotFoundError('Death claim not found');
    }
    return claim;
  }

  /**
   * Query: Get claim by ID with full details
   */
  async getClaimByIdWithDetails(claimId: string): Promise<any> {
    const claim = await this.deathClaimRepo.findByIdWithDetails(claimId);
    if (!claim) {
      throw new NotFoundError('Death claim not found');
    }
    console.log(JSON.stringify(claim, null, 2));
    return claim;
  }

  /**
   * Query: Get claim documents
   */
  async getClaimDocuments(claimId: string): Promise<DeathClaimDocument[]> {
    return await this.deathClaimDocumentRepo.findByClaimId(claimId);
  }

  /**
   * Query: Get document file
   */
  async getDocumentFile(claimId: string, documentId: string): Promise<{ buffer: Buffer; document: DeathClaimDocument }> {
    // 1. Validate document exists and belongs to claim
    const document = await this.deathClaimDocumentRepo.findById(documentId);
    if (!document || document.claimId !== claimId) {
      throw new NotFoundError('Document not found or does not belong to this claim');
    }

    // 2. Get file from storage
    const fileBuffer = await this.fileUploadService.getFile(document.fileUrl);

    return { buffer: fileBuffer, document };
  }

  /**
   * Query: List claims with filters
   */
  async listClaims(filters: {
    claimStatus?: DeathClaimStatus;
    forumId?: string;
    areaId?: string;
    unitId?: string;
    agentId?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: DeathClaim[]; total: number, page: number, pageSize: number, totalPages: number }> {
     const result = await this.deathClaimRepo.list({
      claimStatus: filters.claimStatus,
      forumId: filters.forumId,
      areaId: filters.areaId,
      unitId: filters.unitId,
      agentId: filters.agentId,
      skip: filters.skip || 0,
      take: filters.take || 20,
    });

    const page = filters.skip && filters.take ? Math.floor(filters.skip / filters.take) + 1 : 1;

    return {
        items: result.claims,
        total: result.total,
        page: page,
        pageSize: result.claims.length,
        totalPages: Math.ceil(result.total / (filters.take || 20)),
    } 
  }

  /**
   * Query: Get dashboard statistics
   */
  async getDashboardStats() {
    return await this.deathClaimRepo.getDashboardStats();
  }
}
