import { DomainEvent } from '@/shared/domain/events/domain-event.base';

// ===== Death Reported =====
export interface DeathReportedPayload {
  claimId: string;
  claimNumber: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  deathDate: Date;
  reportedBy: string;
  nomineeId: string;
  nomineeName: string;
}

export class DeathReportedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'death.claim.reported';

  constructor(payload: DeathReportedPayload, userId?: string) {
    super(
      DeathReportedEvent.EVENT_TYPE,
      payload.claimId,
      'DeathClaim',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): DeathReportedPayload {
    return this.payload as unknown as DeathReportedPayload;
  }
}

// ===== Claim Document Uploaded =====
export interface ClaimDocumentUploadedPayload {
  documentId: string;
  claimId: string;
  claimNumber: string;
  documentType: string;
  uploadedBy: string;
}

export class ClaimDocumentUploadedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'death.claim.document.uploaded';

  constructor(payload: ClaimDocumentUploadedPayload, userId?: string) {
    super(
      ClaimDocumentUploadedEvent.EVENT_TYPE,
      payload.documentId,
      'DeathClaimDocument',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): ClaimDocumentUploadedPayload {
    return this.payload as unknown as ClaimDocumentUploadedPayload;
  }
}

// ===== Claim Documents Verified =====
export interface ClaimDocumentsVerifiedPayload {
  claimId: string;
  claimNumber: string;
  verifiedBy: string;
  verifiedDate: Date;
}

export class ClaimDocumentsVerifiedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'death.claim.documents.verified';

  constructor(payload: ClaimDocumentsVerifiedPayload, userId?: string) {
    super(
      ClaimDocumentsVerifiedEvent.EVENT_TYPE,
      payload.claimId,
      'DeathClaim',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): ClaimDocumentsVerifiedPayload {
    return this.payload as unknown as ClaimDocumentsVerifiedPayload;
  }
}

// ===== Death Claim Submitted For Approval =====
export interface DeathClaimSubmittedForApprovalPayload {
  claimId: string;
  claimNumber: string;
  approvalRequestId: string;
  memberId: string;
  memberName: string;
}

export class DeathClaimSubmittedForApprovalEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'death.claim.submitted.for.approval';

  constructor(payload: DeathClaimSubmittedForApprovalPayload, userId?: string) {
    super(
      DeathClaimSubmittedForApprovalEvent.EVENT_TYPE,
      payload.claimId,
      'DeathClaim',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): DeathClaimSubmittedForApprovalPayload {
    return this.payload as unknown as DeathClaimSubmittedForApprovalPayload;
  }
}

// ===== Death Claim Approved =====
export interface DeathClaimApprovedPayload {
  claimId: string;
  claimNumber: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  benefitAmount: number;
  forumId: string;
  approvedBy: string;
  approvedAt: Date;
}

export class DeathClaimApprovedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'death.claim.approved';

  constructor(payload: DeathClaimApprovedPayload, userId?: string) {
    super(
      DeathClaimApprovedEvent.EVENT_TYPE,
      payload.claimId,
      'DeathClaim',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): DeathClaimApprovedPayload {
    return this.payload as unknown as DeathClaimApprovedPayload;
  }
}

// ===== Death Claim Rejected =====
export interface DeathClaimRejectedPayload {
  claimId: string;
  claimNumber: string;
  memberId: string;
  rejectedBy: string;
  rejectionReason: string | null;
}

export class DeathClaimRejectedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'death.claim.rejected';

  constructor(payload: DeathClaimRejectedPayload, userId?: string) {
    super(
      DeathClaimRejectedEvent.EVENT_TYPE,
      payload.claimId,
      'DeathClaim',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): DeathClaimRejectedPayload {
    return this.payload as unknown as DeathClaimRejectedPayload;
  }
}

// ===== Death Claim Settled =====
export interface DeathClaimSettledPayload {
  claimId: string;
  claimNumber: string;
  memberId: string;
  benefitAmount: number;
  paymentMethod: string;
  paidBy: string;
  journalEntryId: string;
}

export class DeathClaimSettledEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'death.claim.settled';

  constructor(payload: DeathClaimSettledPayload, userId?: string) {
    super(
      DeathClaimSettledEvent.EVENT_TYPE,
      payload.claimId,
      'DeathClaim',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): DeathClaimSettledPayload {
    return this.payload as unknown as DeathClaimSettledPayload;
  }
}
