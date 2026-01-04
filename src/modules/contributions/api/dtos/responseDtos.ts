import { z } from 'zod';

/**
 * Response DTOs for Contributions Module API
 */

// Member Contribution Response
export const MemberContributionResponseDto = z.object({
  contributionId: z.string(),
  cycleId: z.string(),
  memberId: z.string(),
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
        startedAt: z.date(),
        collectionDeadline: z.date(),
        claim: z.object({
          claimNumber: z.string(),
          member: z.object({
            memberCode: z.string(),
            firstName: z.string(),
            lastName: z.string(),
          }),
        }).nullable().optional(),
      }).nullable().optional(),
    })
  ),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Search Results Response (for both cycles and contributions)
export const ContributionCycleListResponseDto = z.object({
  cycles: z.array(ContributionCycleDetailsResponseDto),
  total: z.number(),
});

export const MemberContributionListResponseDto = z.object({
  contributions: z.array(MemberContributionResponseDto),
  total: z.number(),
});
