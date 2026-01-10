import { z } from 'zod';

/**
 * Response DTOs for Contributions Module API
 */

// Member Contribution Response
export const MemberContributionResponseDto = z.object({
  contributionId: z.string(),
  cycleId: z.string(),
  memberId: z.string(),
  agentId: z.string(),
  expectedAmount: z.any(),
  actualAmount: z.any().nullable().optional(),
  contributionStatus: z.string(),
  contributionMethod: z.string().nullable().optional(),
  debitRequestId: z.string().nullable().optional(),
  cashReceiptReference: z.string().nullable().optional(),
  contributedAt: z.date().nullable().optional(),
  recordedBy: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
  member: z.object({
    firstName: z.string(),
    middleName: z.string().nullable().optional(),
    lastName: z.string(),
    dateOfBirth: z.date(),
    gender: z.string(),
    contactNumber: z.string(),
    alternateContactNumber: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  }).passthrough().nullable().optional(),
  agent: z.object({
    firstName: z.string().nullable().optional(),
    middleName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    dateOfBirth: z.date().nullable().optional(),
    gender: z.string().nullable().optional(),
    contactNumber: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  }).passthrough().nullable().optional(),
});

// Contribution Cycle Response
export const ContributionCycleResponseDto = z.object({
  cycleId: z.string(),
  claimId: z.string(),
  benefitAmount: z.any(),
  totalCollectedAmount: z.any(),
  membersCollected: z.number(),
  membersPending: z.number(),
  membersMissed: z.number(),
  collectionDeadline: z.date(),
  cycleStatus: z.string(),
  startedAt: z.date(),
  completedAt: z.date().nullable().optional(),
  closedBy: z.string().nullable().optional(),
});

// Contribution Cycle with Contributions (detailed view)
export const ContributionCycleDetailsResponseDto = ContributionCycleResponseDto.extend({
  claim: z.object({
    claimId: z.string(),
    claimNumber: z.string(),
    memberId: z.string(),
    member: z.object({
      memberCode: z.string(),
      firstName: z.string(),
      lastName: z.string(),
    }),
  }).nullable().optional(),
  contributions: z.array(
    MemberContributionResponseDto.extend({
      member: z.object({
        memberCode: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        contactNumber: z.string(),
      }).nullable().optional(),
    })
  ).optional(),
});

// Member Contribution History Response
export const MemberContributionHistoryResponseDto = z.object({
  contributions: z.array(
    MemberContributionResponseDto.extend({
      cycle: z.object({
        cycleId: z.string(),
        benefitAmount: z.any(),
        cycleStatus: z.string(),
        collectionDeadline: z.date(),
        claim: z.object({
          claimNumber: z.string(),
          member: z.object({
            memberCode: z.string(),
            firstName: z.string(),
            lastName: z.string(),
          }).passthrough(),
        }).passthrough().nullable().optional(),
      }).nullable().optional(),
    })
  ),
  total: z.number(),
});

// Search Results Response (for both cycles and contributions)
export const ContributionCycleListResponseDto = z.object({
  cycles: z.array(ContributionCycleDetailsResponseDto),
  total: z.number(),
});

export const MemberContributionListResponseDto = z.object({
  items: z.array(MemberContributionResponseDto),
  total: z.number(),
}).passthrough();

// Member Contribution with Relations Response
export const MemberContributionWithRelationsResponseDto = z.object({
  contributionId: z.string(),
  cycleId: z.string(),
  memberId: z.string(),
  memberCode: z.string(),
  memberName: z.string(),
  tierId: z.string(),
  agentId: z.string(),
  expectedAmount: z.number(),
  contributionStatus: z.string(),
  paymentMethod: z.string().nullable().optional(),
  collectionDate: z.date().nullable().optional(),
  collectedBy: z.string().nullable().optional(),
  walletDebitRequestId: z.string().nullable().optional(),
  debitAcknowledgedAt: z.date().nullable().optional(),
  cashReceiptReference: z.string().nullable().optional(),
  journalEntryId: z.string().nullable().optional(),
  isConsecutiveMiss: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
  cycle: z.object({
    cycleId: z.string(),
    cycleNumber: z.string(),
    deathClaimId: z.string(),
    claimNumber: z.string(),
    deceasedMemberId: z.string(),
    deceasedMemberName: z.string(),
    benefitAmount: z.number(),
    forumId: z.string(),
    startDate: z.date(),
    collectionDeadline: z.date(),
    cycleStatus: z.string(),
    totalMembers: z.number(),
    totalExpectedAmount: z.number(),
    totalCollectedAmount: z.number(),
    totalPendingAmount: z.number(),
    membersCollected: z.number(),
    membersPending: z.number(),
    membersMissed: z.number(),
    closedDate: z.date().nullable().optional(),
    closedBy: z.string().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date().nullable().optional(),
  }).passthrough().optional(),
  member: z.object({
    memberId: z.string(),
    memberCode: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    agentId: z.string(),
  }).passthrough().optional(),
  agent: z.object({
    agentId: z.string(),
    agentCode: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }).passthrough().optional(),
}).passthrough();

// Cycle Contributions List Response
export const CycleContributionsListResponseDto = z.object({
  contributions: z.array(MemberContributionWithRelationsResponseDto),
  total: z.number(),
}).passthrough();

// My Contributions Summary Response
export const MyContributionsSummaryResponseDto = z.object({
  memberId: z.string(),
  memberCode: z.string(),
  totalContributed: z.number(),
  thisYear: z.number(),
  pendingCount: z.number(),
  averagePerMonth: z.number(),
  walletBalance: z.number(),
}).passthrough();

// Active Cycles Summary Response (Admin Dashboard)
export const ActiveCyclesSummaryResponseDto = z.object({
  activeCyclesCount: z.number(),
  totalCollecting: z.number(),
  totalExpected: z.number(),
  avgCompletionPercentage: z.number(),
}).passthrough();

// My Pending Contributions Response
export const MyPendingContributionsResponseDto = z.object({
  pendingContributions: z.array(z.object({
    contributionId: z.string(),
    cycleCode: z.string(),
    claimId: z.string(),
    deceasedMember: z.object({
      memberId: z.string(),
      memberCode: z.string(),
      fullName: z.string(),
    }).passthrough(),
    tierName: z.string(),
    contributionAmount: z.number(),
    dueDate: z.date(),
    daysLeft: z.number(),
    contributionStatus: z.string(),
    agent: z.object({
      agentId: z.string(),
      agentCode: z.string(),
      fullName: z.string(),
      contactNumber: z.string(),
    }).passthrough().nullable(),
    cycle: z.object({
      cycleId: z.string(),
      cycleNumber: z.string(),
      claimNumber: z.string(),
      deceasedMemberName: z.string(),
      benefitAmount: z.number(),
      startDate: z.date(),
      collectionDeadline: z.date(),
      cycleStatus: z.string(),
    }).passthrough(),
  }).passthrough()),
}).passthrough();
