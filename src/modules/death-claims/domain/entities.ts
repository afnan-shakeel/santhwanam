/**
 * Domain entities for Death Claims Module
 * See docs/domain/8.death_claims_and_contribution.md
 */

// Enums
export enum DeathClaimStatus {
  Reported = 'Reported',
  UnderVerification = 'UnderVerification',
  Verified = 'Verified',
  PendingApproval = 'PendingApproval',
  Approved = 'Approved',
  Settled = 'Settled',
  Rejected = 'Rejected',
}

export enum DeathClaimVerificationStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Rejected = 'Rejected',
}

export enum DeathClaimSettlementStatus {
  Pending = 'Pending',
  Completed = 'Completed',
}

export enum PaymentMethod {
  Cash = 'Cash',
  BankTransfer = 'BankTransfer',
  Cheque = 'Cheque',
}

export enum ClaimDocumentType {
  DeathCertificate = 'DeathCertificate',
  NewspaperClipping = 'NewspaperClipping',
  PoliceReport = 'PoliceReport',
  MedicalReport = 'MedicalReport',
  PostMortemReport = 'PostMortemReport',
  Other = 'Other',
}

export enum ClaimDocumentVerificationStatus {
  Pending = 'Pending',
  Verified = 'Verified',
  Rejected = 'Rejected',
}

// Entities
export interface DeathClaim {
  claimId: string;
  claimNumber: string;
  
  // Registration tracking
  claimStatus: DeathClaimStatus;
  
  // Approval tracking
  approvalRequestId: string | null;
  
  // Member info
  memberId: string;
  memberCode: string;
  memberName: string;
  tierId: string;
  
  // Hierarchy
  agentId: string;
  unitId: string;
  areaId: string;
  forumId: string;
  
  // Death details
  deathDate: Date;
  deathPlace: string | null;
  causeOfDeath: string | null;
  
  // Reporting
  reportedBy: string;
  reportedByRole: string;
  reportedDate: Date;
  initialNotes: string | null;
  
  // Nominee info (snapshot at time of death)
  nomineeId: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineeContactNumber: string;
  nomineeAddress: Record<string, unknown>;
  
  // Benefit
  benefitAmount: number | null;
  
  // Verification
  verificationStatus: DeathClaimVerificationStatus;
  verifiedBy: string | null;
  verifiedDate: Date | null;
  verificationNotes: string | null;
  
  // Settlement
  settlementStatus: DeathClaimSettlementStatus;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  paymentDate: Date | null;
  paidBy: string | null;
  nomineeAcknowledgment: string | null;
  
  // Financial
  journalEntryId: string | null;
  
  // Timestamps
  createdAt: Date;
  approvedAt: Date | null;
  settledAt: Date | null;
  updatedAt: Date | null;
  
  // Audit
  approvedBy: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
}

export interface DeathClaimDocument {
  documentId: string;
  claimId: string;
  
  documentType: ClaimDocumentType;
  documentName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  
  uploadedBy: string;
  uploadedAt: Date;
  
  verificationStatus: ClaimDocumentVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
}
