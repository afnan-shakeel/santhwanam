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
  verifiedAt: z.coerce.date().nullable().optional(),
  verificationNotes: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  uploadedBy: z.string(),
  uploadedAt: z.coerce.date(),
}).passthrough();

export const ClaimDocumentListResponseDto = z.array(ClaimDocumentResponseDto);

// Nominee address (embedded)
const NomineeAddressDto = z.object({
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
}).passthrough();

// Member details (embedded in claim details response)
const MemberDetailsDto = z.object({
  memberId: z.string(),
  memberCode: z.string(),
  fullName: z.string(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  tier: z.object({
    tierId: z.string(),
    tierName: z.string(),
    deathBenefit: z.any(),
    contributionAmount: z.any().nullable().optional(),
  }).nullable().optional(),
  agent: z.object({
    agentId: z.string(),
    agentCode: z.string(),
    fullName: z.string(),
  }).nullable().optional(),
  unit: z.object({
    unitId: z.string(),
    unitName: z.string(),
    area: z.object({
      areaId: z.string(),
      areaName: z.string(),
      forum: z.object({
        forumId: z.string(),
        forumName: z.string(),
      }).nullable().optional(),
    }).nullable().optional(),
  }).nullable().optional(),
  membershipStartDate: z.coerce.date().nullable().optional(),
  membershipDuration: z.string().nullable().optional(),
  contributionsPaid: z.number().nullable().optional(),
  totalContributed: z.any().nullable().optional(),
  walletBalance: z.any().nullable().optional(),
}).passthrough();

// Nominee info (in nominees array)
const NomineeDto = z.object({
  nomineeId: z.string(),
  fullName: z.string(),
  relationship: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  idNumber: z.string().nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  priority: z.number().nullable().optional(),
}).passthrough();

// Contribution cycle info (embedded in claim)
const ContributionCycleDto = z.object({
  cycleId: z.string(),
  benefitAmount: z.any(),
  totalCollectedAmount: z.any(),
  membersCollected: z.number(),
  membersPending: z.number(),
  membersMissed: z.number(),
  collectionDeadline: z.coerce.date(),
  cycleStatus: z.string(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable().optional(),
}).passthrough();

// Single death claim response (basic)
export const DeathClaimResponseDto = z.object({
  claimId: z.string(),
  claimNumber: z.string(),
  claimStatus: z.string(),
  approvalRequestId: z.string().nullable().optional(),
  memberId: z.string(),
  memberCode: z.string().nullable().optional(),
  memberName: z.string().nullable().optional(),
  tierId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  areaId: z.string().nullable().optional(),
  forumId: z.string().nullable().optional(),
  deathDate: z.coerce.date(),
  deathPlace: z.string().nullable().optional(),
  causeOfDeath: z.string().nullable().optional(),
  reportedBy: z.string(),
  reportedByRole: z.string().nullable().optional(),
  reportedDate: z.coerce.date(),
  initialNotes: z.string().nullable().optional(),
  nomineeId: z.string(),
  nomineeName: z.string().nullable().optional(),
  nomineeRelation: z.string().nullable().optional(),
  nomineeContactNumber: z.string().nullable().optional(),
  nomineeAddress: NomineeAddressDto.nullable().optional(),
  benefitAmount: z.any().nullable().optional(),
  verificationStatus: z.string().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  verifiedDate: z.coerce.date().nullable().optional(),
  verificationNotes: z.string().nullable().optional(),
  settlementStatus: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  paymentDate: z.coerce.date().nullable().optional(),
  paidBy: z.string().nullable().optional(),
  nomineeAcknowledgment: z.string().nullable().optional(),
  journalEntryId: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  approvedAt: z.coerce.date().nullable().optional(),
  settledAt: z.coerce.date().nullable().optional(),
  updatedAt: z.coerce.date().nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  rejectedBy: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
}).passthrough();

// Death claim with full details (member, nominees, cycle, documents)
export const DeathClaimDetailsResponseDto = DeathClaimResponseDto.extend({
  memberDetails: MemberDetailsDto.nullable().optional(),
  nominees: z.array(NomineeDto).optional(),
  documents: z.array(ClaimDocumentResponseDto).optional(),
  contributionCycle: ContributionCycleDto.nullable().optional(),
}).passthrough();

// Death claim list response
export const DeathClaimListResponseDto = z.object({
  items: z.array(DeathClaimDetailsResponseDto),
  total: z.number(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  totalPages: z.number().optional(),
}).passthrough();

// Dashboard stats response
export const DashboardStatsResponseDto = z.object({
  pendingVerification: z.number(),
  underContribution: z.number(),
  approvedForPayout: z.number(),
  totalThisYear: z.number(),
  totalBenefitsPaidYTD: z.any(),
  pendingCollections: z.any(),
  successRate: z.any(),
}).passthrough();

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
