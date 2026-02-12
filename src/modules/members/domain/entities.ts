// Domain: Members
// See `docs/domain/5.membership.md` for details

import { Agent } from "@/modules/agents/domain/entities";
import { Unit } from "@/modules/organization-bodies/domain/entities";
import { Wallet } from "@/modules/wallet/domain/entities";

// Enums
export enum RegistrationStatus {
  Draft = "Draft",
  PendingApproval = "PendingApproval",
  Approved = "Approved",
  Rejected = "Rejected",
}

export enum RegistrationStep {
  PersonalDetails = "PersonalDetails",
  Nominees = "Nominees",
  DocumentsPayment = "DocumentsPayment",
  Completed = "Completed",
}

export enum MemberStatus {
  Active = "Active",
  Frozen = "Frozen",
  Suspended = "Suspended",
  Closed = "Closed",
  Deceased = "Deceased",
}

export enum Gender {
  Male = "Male",
  Female = "Female",
  Other = "Other",
}

export enum RelationType {
  Father = "Father",
  Mother = "Mother",
  Spouse = "Spouse",
  Son = "Son",
  Daughter = "Daughter",
  Brother = "Brother",
  Sister = "Sister",
  Other = "Other",
}

export enum IdProofType {
  NationalID = "NationalID",
  Passport = "Passport",
  DrivingLicense = "DrivingLicense",
  VoterID = "VoterID",
  Other = "Other",
}

export enum DocumentType {
  NationalID = "NationalID",
  Passport = "Passport",
  DrivingLicense = "DrivingLicense",
  BirthCertificate = "BirthCertificate",
  ResidenceCard = "ResidenceCard",
  AddressProof_UtilityBill = "AddressProof_UtilityBill",
  AddressProof_BankStatement = "AddressProof_BankStatement",
  AddressProof_RentalAgreement = "AddressProof_RentalAgreement",
  MemberPhoto = "MemberPhoto",
  NomineeIDProof = "NomineeIDProof",
  Other = "Other",
}

export enum DocumentCategory {
  MemberIdentity = "MemberIdentity",
  MemberAddress = "MemberAddress",
  MemberPhoto = "MemberPhoto",
  NomineeProof = "NomineeProof",
  Other = "Other",
}

export enum DocumentVerificationStatus {
  Pending = "Pending",
  Verified = "Verified",
  Rejected = "Rejected",
}

export enum CollectionMode {
  Cash = "Cash",
  BankTransfer = "BankTransfer",
  Cheque = "Cheque",
  Online = "Online",
}

export enum PaymentApprovalStatus {
  PendingApproval = "PendingApproval",
  Approved = "Approved",
  Rejected = "Rejected",
}

// Entities
export interface Member {
  memberId: string;
  memberCode: string;

  // Registration tracking
  registrationStatus: RegistrationStatus;
  registrationStep: RegistrationStep;
  approvalRequestId: string | null;

  // Personal Details
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  contactNumber: string;
  alternateContactNumber: string | null;
  email: string | null;

  // Address
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  // Membership details
  tier?: Partial<MembershipTier>;
  tierId: string;

  // Hierarchy
  agentId: string;
  agent?: Partial<Agent>;
  unitId: string;
  unit?: Partial<Unit>;
  areaId: string;
  forumId: string;

  userId?: string | null;
  // Member Status (after approval)
  memberStatus: MemberStatus | null;

  // Suspension tracking
  suspensionCounter: number;
  suspensionReason: string | null;
  suspendedAt: Date | null;

  // Timestamps
  createdAt: Date;
  registeredAt: Date | null;
  updatedAt: Date;

  wallet?: Partial<Wallet>;
  nominees?: Partial<Nominee>[];
  documents?: Partial<MemberDocument>[];

  // Audit
  createdBy: string;
  approvedBy: string | null;

  // computed optional fields (not stored in DB)
  fullName?: string;
  membershipDuration?: string; 
  contributionsPaid?: number; // total count of contributions paid (from Contributions module)
  totalContributed?: number; // total amount contributed (from Contributions module)
  
}

export interface Nominee {
  nomineeId: string;
  memberId: string;

  // Nominee details
  name: string;
  relationType: RelationType;
  dateOfBirth: Date;
  contactNumber: string;
  alternateContactNumber: string | null;

  // Address
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  // ID Proof
  idProofType: IdProofType;
  idProofNumber: string;
  idProofDocumentId: string | null;

  // Priority (Phase 2 - default to 1)
  priority: number;

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberDocument {
  documentId: string;
  memberId: string;
  nomineeId: string | null;

  // Document details
  documentType: DocumentType;
  documentCategory: DocumentCategory;
  documentName: string;

  // File storage
  fileUrl: string;
  fileSize: number;
  mimeType: string;

  // Metadata
  uploadedBy: string;
  uploadedAt: Date;

  // Verification
  verificationStatus: DocumentVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;

  // Optional
  expiryDate: Date | null;

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistrationPayment {
  paymentId: string;
  memberId: string;

  // Payment details
  registrationFee: number;
  advanceDeposit: number;
  totalAmount: number;

  // Collection details
  collectedBy: string; // AgentId
  collectionDate: Date;
  collectionMode: CollectionMode;
  referenceNumber: string | null;

  // Approval status
  approvalStatus: PaymentApprovalStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipTier {
  tierId: string;
  tierCode: string;
  tierName: string;
  description: string | null;

  // Financial amounts
  registrationFee: number;
  advanceDepositAmount: number;
  contributionAmount: number;
  deathBenefitAmount: number;

  // Status
  isActive: boolean;
  isDefault: boolean;

  // Timestamps
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}
