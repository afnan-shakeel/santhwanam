import { z } from 'zod';

/**
 * Response DTOs for Death Claims Module API
 */

// Claim document response
export const ClaimDocumentResponseDto = z.object({
  documentId: z.string(),
  claimId: z.string(),
  documentType: z.string(),
  documentName: z.string(),
  fileUrl: z.string(),
  mimeType: z.string(),
  fileSize: z.number().nullable().optional(),
  verificationStatus: z.string(),
  verifiedBy: z.string().nullable().optional(),
  verifiedAt: z.date().nullable().optional(),
  verificationNotes: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  uploadedBy: z.string(),
  uploadedAt: z.date(),
});

export const ClaimDocumentListResponseDto = z.array(ClaimDocumentResponseDto);

// Member info (embedded in claim)
const MemberInfoDto = z.object({
  memberId: z.string(),
  memberCode: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable().optional(),
  lastName: z.string(),
  dateOfBirth: z.date(),
  contactNumber: z.string(),
  tier: z.object({
    tierName: z.string(),
    tierCode: z.string(),
    deathBenefitAmount: z.any(),
  }).nullable().optional(),
  agent: z.object({
    agentCode: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }).nullable().optional(),
});

// Nominee info (embedded in claim)
const NomineeInfoDto = z.object({
  nomineeId: z.string(),
  name: z.string(),
  relationType: z.string(),
  contactNumber: z.string().nullable().optional(),
  idProofNumber: z.string().nullable().optional(),
  priority: z.number(),
});

// Contribution cycle info (embedded in claim)
const ContributionCycleInfoDto = z.object({
  cycleId: z.string(),
  benefitAmount: z.any(),
  totalCollectedAmount: z.any(),
  membersCollected: z.number(),
  membersPending: z.number(),
  membersMissed: z.number(),
  collectionDeadline: z.date(),
  cycleStatus: z.string(),
  startedAt: z.date(),
  completedAt: z.date().nullable().optional(),
});

// Single death claim response
export const DeathClaimResponseDto = z.object({
  claimId: z.string(),
  memberId: z.string(),
  claimNumber: z.string(),
  deathDate: z.date(),
  deathPlace: z.string().nullable().optional(),
  causeOfDeath: z.string().nullable().optional(),
  nomineeId: z.string(),
  claimStatus: z.string(),
  reportedBy: z.string(),
  reportedDate: z.date(),
  verifiedBy: z.string().nullable().optional(),
  verifiedDate: z.date().nullable().optional(),
  verificationNotes: z.string().nullable().optional(),
  approvalRequestId: z.string().nullable().optional(),
  approvedAt: z.date().nullable().optional(),
  contributionCycleId: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  paymentDate: z.date().nullable().optional(),
  paidBy: z.string().nullable().optional(),
  acknowledgmentFileUrl: z.string().nullable().optional(),
  settledAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

// Death claim with full details (member, nominee, cycle, documents)
export const DeathClaimDetailsResponseDto = DeathClaimResponseDto.extend({
  member: MemberInfoDto.nullable().optional(),
  nominee: NomineeInfoDto.nullable().optional(),
  contributionCycle: ContributionCycleInfoDto.nullable().optional(),
  documents: z.array(ClaimDocumentResponseDto).optional(),
});

// Death claim list response
export const DeathClaimListResponseDto = z.object({
  items: z.array(DeathClaimDetailsResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Dashboard stats response
export const DashboardStatsResponseDto = z.object({
  pendingVerification: z.number(),
  underContribution: z.number(),
  approvedForPayout: z.number(),
  totalThisYear: z.number(),
  totalBenefitsPaidYTD: z.number(),
  pendingCollections: z.any(),
  successRate: z.any(),
});

// Member benefit response
export const MemberBenefitResponseDto = z.object({
  memberId: z.string(),
  memberCode: z.string(),
  tierName: z.string(),
  deathBenefitAmount: z.any(),
});

// Success response (used for actions)
export const SuccessResponseDto = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
