import { z } from 'zod';
import { MemberDto, NomineeDto, MemberDocumentDto, RegistrationPaymentDto } from './memberDtos';

/**
 * Response DTOs for Members Module API
 * These schemas define the response structure for each endpoint
 */

// Single member response
export const MemberResponseDto = z.object({
  memberId: z.string(),
  memberCode: z.string(),

  // Registration tracking
  registrationStatus: z.string(),
  registrationStep: z.string(),
  approvalRequestId: z.string().nullable().optional(),

  // Personal Details
  firstName: z.string(),
  middleName: z.string().nullable().optional(),
  lastName: z.string(),
  dateOfBirth: z.date(),
  gender: z.string(),
  contactNumber: z.string(),
  alternateContactNumber: z.string().nullable().optional(),
  email: z.string().nullable().optional(),

  // Address
  addressLine1: z.string(),
  addressLine2: z.string().nullable().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),

  // Membership details
  tierId: z.string(),
  tier: z
    .object({
      tierId: z.string(),
      tierCode: z.string(),
      tierName: z.string(),
      registrationFee: z.any(),
      advanceDepositAmount: z.any(),
      contributionAmount: z.any(),
      deathBenefitAmount: z.any(),
    })
    .nullable()
    .optional(),

  // Hierarchy
  agentId: z.string(),
  agent: z
    .object({
      agentId: z.string(),
      agentCode: z.string(),
      firstName: z.string(),
      middleName: z.string().nullable().optional(),
      lastName: z.string(),
    })
    .nullable()
    .optional(),
  unitId: z.string(),
  unit: z
    .object({
      unitId: z.string(),
      unitCode: z.string(),
      unitName: z.string(),
    })
    .nullable()
    .optional(),
  nominees: z
    .array(
      z.object({
        nomineeId: z.string(),
        memberId: z.string(),
        name: z.string(),
        relation: z.string().nullable().optional(),
        dateOfBirth: z.date().nullable().optional(),
        contactNumber: z.string().nullable().optional(),
        alternateContactNumber: z.string().nullable().optional(),
        addressLine1: z.string().nullable().optional(),
        addressLine2: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        postalCode: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
      })
    )
    .optional()
    .nullable()
    .optional(),
  documents: z
    .array(z.object({
      documentId: z.string(),
      documentType: z.string().optional().nullable(),
      documentCategory: z.string().optional().nullable(),
      documentName: z.string().min(1).max(255),
      memberId: z.string(),
      fileName: z.string().optional().nullable(),
      fileType: z.string().optional(),
      fileUrl: z.string(),
      fileSize: z.number().optional().nullable(),
      expiryDate: z.date().optional().nullable(),
      uploadedAt: z.date(),
    }))
    .optional()
    .nullable(),
  areaId: z.string(),
  forumId: z.string(),

  // Wallet (optional, only for approved members)
  wallet: z
    .object({
      walletId: z.string(),
      currentBalance: z.any(),
      createdAt: z.date(),
      updatedAt: z.date().nullable().optional(),
    })
    .nullable()
    .optional(),

  // Member Status (after approval)
  memberStatus: z.string().nullable().optional(),

  // Suspension tracking
  suspensionCounter: z.number().optional(),
  suspensionReason: z.string().nullable().optional(),
  suspendedAt: z.date().nullable().optional(),

  // Timestamps
  createdAt: z.date(),
  registeredAt: z.date().nullable().optional(),
  updatedAt: z.date().nullable().optional(),
});

// Nominee responses
export const NomineeResponseDto = z.object({
  nomineeId: z.string(),
  memberId: z.string(),
  name: z.string(),
  relation: z.string().nullable().optional(),
  dateOfBirth: z.date().nullable().optional(),
  contactNumber: z.string().nullable().optional(),
  alternateContactNumber: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

export const NomineeListResponseDto = z.array(NomineeResponseDto);

// Document responses
export const MemberDocumentResponseDto = z.object({
  documentId: z.string(),
  documentType: z.string().optional().nullable(),
  documentCategory: z.string().optional().nullable(),
  documentName: z.string().min(1).max(255),
  memberId: z.string(),
  fileName: z.string().optional().nullable(),
  fileType: z.string().optional(),
  fileUrl: z.string(),
  fileSize: z.number().optional().nullable(),
  expiryDate: z.date().optional().nullable(),
});

export const MemberDocumentListResponseDto = z.array(MemberDocumentResponseDto);

// Payment response
export const RegistrationPaymentResponseDto = z.object({
  paymentId: z.string(),
  memberId: z.string(),
  totalAmount: z.number(),
  collectionDate: z.date().optional(),
  collectionMode: z.string().optional(),
  referenceNumber: z.string().optional().nullable(),
});

// Submission response
export const MemberSubmissionResponseDto = z.object({
  submissionId: z.string().optional(),
  memberId: z.string().optional(),
  status: z.string().optional(),
  approvalRequestId: z.string().optional(),
});

// Member details response (with relations)
export const MemberDetailsResponseDto = z.object({
  member: MemberResponseDto,
  nominees: z.array(NomineeResponseDto).optional(),
  documents: z.array(MemberDocumentResponseDto).optional(),
  payment: RegistrationPaymentResponseDto.nullable().optional(),
});

// Search/List response
export const MemberListResponseDto = z.object({
  items: z.array(MemberResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Success response for operations without data
export const SuccessResponseDto = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Member metadata response (for dropdown/select options)
export const MemberMetadataResponseDto = z.object({
  documentTypes: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
  documentCategories: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
  collectionModes: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
});

// Type exports
export type MemberResponse = z.infer<typeof MemberResponseDto>;
export type NomineeResponse = z.infer<typeof NomineeResponseDto>;
export type NomineeListResponse = z.infer<typeof NomineeListResponseDto>;
export type MemberDocumentResponse = z.infer<typeof MemberDocumentResponseDto>;
export type MemberDocumentListResponse = z.infer<typeof MemberDocumentListResponseDto>;
export type RegistrationPaymentResponse = z.infer<typeof RegistrationPaymentResponseDto>;
export type MemberSubmissionResponse = z.infer<typeof MemberSubmissionResponseDto>;
export type MemberDetailsResponse = z.infer<typeof MemberDetailsResponseDto>;
export type MemberListResponse = z.infer<typeof MemberListResponseDto>;
export type SuccessResponse = z.infer<typeof SuccessResponseDto>;
export type MemberMetadataResponse = z.infer<typeof MemberMetadataResponseDto>;
