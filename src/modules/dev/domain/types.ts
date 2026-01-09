// Domain: Dev Module Types
// Types for quick member registration (dev-only endpoint)

import {
  Gender,
  RelationType,
  IdProofType,
  CollectionMode,
} from "@/modules/members/domain/entities";

// Input for quick member registration
export interface QuickMemberRegistrationInput {
  // Personal Information (Required)
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  contactNumber: string;
  alternateContactNumber?: string;
  email?: string;

  // Address (Required)
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  // Membership (Required)
  tierId: string;
  agentId: string;

  // Registration Payment (Optional - will use tier defaults)
  registrationFee?: number;
  advanceDeposit?: number;
  collectionMode?: CollectionMode;
  collectionDate?: Date;
  referenceNumber?: string;

  // Nominees (Optional - can add 1-3)
  nominees?: QuickNomineeInput[];

  // Control flags
  autoApprove?: boolean; // Default: true (skip approval workflow)
  createWallet?: boolean; // Default: true
}

export interface QuickNomineeInput {
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

// Response for quick member registration
export interface QuickMemberRegistrationResult {
  member: {
    memberId: string;
    memberCode: string;
    firstName: string;
    lastName: string;
    memberStatus: string | null;
    registrationStatus: string;
  };
  wallet: {
    walletId: string;
    balance: number;
  } | null;
  nominees: Array<{
    nomineeId: string;
    name: string;
    relationType: string;
  }>;
  registrationPayment: {
    paymentId: string;
    registrationFee: number;
    advanceDeposit: number;
    totalAmount: number;
    approvalStatus: string;
  };
}
