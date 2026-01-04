// Domain: Contribution Collection Entities
// See docs/domain/8.death_claims_and_contribution.md (Part 2)

export enum ContributionCycleStatus {
  Active = 'Active',
  Closed = 'Closed',
}

export enum MemberContributionStatus {
  Pending = 'Pending',
  WalletDebitRequested = 'WalletDebitRequested',
  Acknowledged = 'Acknowledged',
  Collected = 'Collected',
  Missed = 'Missed',
  Exempted = 'Exempted',
}

export enum ContributionPaymentMethod {
  Wallet = 'Wallet',
  DirectCash = 'DirectCash',
}

export interface ContributionCycle {
  cycleId: string;
  cycleNumber: string;

  // Linked to death claim
  deathClaimId: string;
  claimNumber: string;
  deceasedMemberId: string;
  deceasedMemberName: string;
  benefitAmount: number;

  // Hierarchy
  forumId: string;

  // Cycle details
  startDate: Date;
  collectionDeadline: Date;

  // Status
  cycleStatus: ContributionCycleStatus;

  // Statistics
  totalMembers: number;
  totalExpectedAmount: number;
  totalCollectedAmount: number;
  totalPendingAmount: number;
  membersCollected: number;
  membersPending: number;
  membersMissed: number;

  // Closure
  closedDate?: Date | null;
  closedBy?: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface MemberContribution {
  contributionId: string;
  cycleId: string;

  // Member info
  memberId: string;
  memberCode: string;
  memberName: string;
  tierId: string;
  agentId: string;

  // Amount
  expectedAmount: number;

  // Status
  contributionStatus: MemberContributionStatus;

  // Payment details
  paymentMethod?: ContributionPaymentMethod | null;
  collectionDate?: Date | null;
  collectedBy?: string | null;

  // Wallet tracking
  walletDebitRequestId?: string | null;
  debitAcknowledgedAt?: Date | null;

  // Direct cash tracking
  cashReceiptReference?: string | null;

  // Financial
  journalEntryId?: string | null;

  // Consecutive miss tracking
  isConsecutiveMiss: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface ContributionCycleWithStats extends ContributionCycle {
  contributions?: MemberContribution[];
}

export interface MemberContributionWithRelations extends MemberContribution {
  cycle?: ContributionCycle;
  member?: {
    memberId: string;
    memberCode: string;
    firstName: string;
    lastName: string;
    agentId: string;
  };
  agent?: {
    agentId: string;
    agentCode: string;
    firstName: string;
    lastName: string;
  };
}
