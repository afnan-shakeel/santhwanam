// Domain: Members
// Repository interfaces

import {
  Member,
  Nominee,
  MemberDocument,
  RegistrationPayment,
  MembershipTier,
  RegistrationStatus,
  MemberStatus,
} from "./entities";

// Member Repository
export interface MemberRepository {
  create(member: Omit<Member, "createdAt" | "updatedAt">, tx?: any): Promise<Member>;
  findById(memberId: string, tx?: any): Promise<Member | null>;
  findByMemberCode(memberCode: string, tx?: any): Promise<Member | null>;
  update(
    memberId: string,
    data: Partial<Omit<Member, "memberId" | "memberCode" | "createdAt">>,
    tx?: any
  ): Promise<Member>;
  findAll(filters: {
    registrationStatus?: RegistrationStatus;
    memberStatus?: MemberStatus;
    unitId?: string;
    agentId?: string;
    tierId?: string;
    searchQuery?: string;
    page: number;
    limit: number;
  }): Promise<{ members: Member[]; total: number }>;
  getLastMemberCodeByYear(year: number, tx?: any): Promise<string | null>;
}

// Nominee Repository
export interface NomineeRepository {
  create(nominee: Omit<Nominee, "createdAt" | "updatedAt">, tx?: any): Promise<Nominee>;
  findById(nomineeId: string, tx?: any): Promise<Nominee | null>;
  findByMemberId(memberId: string, tx?: any): Promise<Nominee[]>;
  findActiveByMemberId(memberId: string, tx?: any): Promise<Nominee[]>;
  update(
    nomineeId: string,
    data: Partial<Omit<Nominee, "nomineeId" | "memberId" | "createdAt">>,
    tx?: any
  ): Promise<Nominee>;
  softDelete(nomineeId: string, tx?: any): Promise<void>;
  countActiveByMemberId(memberId: string, tx?: any): Promise<number>;
  search(filters: {
    name?: string;
    contactNumber?: string;
    page: number;
    limit: number;
  }): Promise<{ nominees: Nominee[]; total: number }>;
}

// Member Document Repository
export interface MemberDocumentRepository {
  create(
    document: Omit<MemberDocument, "createdAt" | "updatedAt">,
    tx?: any
  ): Promise<MemberDocument>;
  findById(documentId: string, tx?: any): Promise<MemberDocument | null>;
  findByMemberId(memberId: string, tx?: any): Promise<MemberDocument[]>;
  findActiveByMemberId(memberId: string, tx?: any): Promise<MemberDocument[]>;
  findByMemberAndCategory(
    memberId: string,
    category: string,
    tx?: any
  ): Promise<MemberDocument[]>;
  findActiveByMemberAndCategory(
    memberId: string,
    category: string,
    tx?: any
  ): Promise<MemberDocument[]>;
  findByNomineeId(nomineeId: string, tx?: any): Promise<MemberDocument[]>;
  update(
    documentId: string,
    data: Partial<Omit<MemberDocument, "documentId" | "memberId" | "createdAt">>,
    tx?: any
  ): Promise<MemberDocument>;
  softDelete(documentId: string, tx?: any): Promise<void>;
  softDeleteByNomineeId(nomineeId: string, tx?: any): Promise<void>;
}

// Registration Payment Repository
export interface RegistrationPaymentRepository {
  create(
    payment: Omit<RegistrationPayment, "createdAt" | "updatedAt">,
    tx?: any
  ): Promise<RegistrationPayment>;
  findById(paymentId: string, tx?: any): Promise<RegistrationPayment | null>;
  findByMemberId(memberId: string, tx?: any): Promise<RegistrationPayment | null>;
  update(
    paymentId: string,
    data: Partial<
      Omit<RegistrationPayment, "paymentId" | "memberId" | "createdAt">
    >,
    tx?: any
  ): Promise<RegistrationPayment>;
}

// Membership Tier Repository
export interface MembershipTierRepository {
  create(
    tier: Omit<MembershipTier, "createdAt" | "updatedAt">,
    tx?: any
  ): Promise<MembershipTier>;
  findById(tierId: string, tx?: any): Promise<MembershipTier | null>;
  findByTierCode(tierCode: string, tx?: any): Promise<MembershipTier | null>;
  findAll(filters: { isActive?: boolean }): Promise<MembershipTier[]>;
  findDefault(): Promise<MembershipTier | null>;
  update(
    tierId: string,
    data: Partial<Omit<MembershipTier, "tierId" | "tierCode" | "createdAt">>,
    tx?: any
  ): Promise<MembershipTier>;
}
