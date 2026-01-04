/**
 * Zod validation schemas for Death Claims API
 */

import { z } from 'zod';
import {
  DeathClaimStatus,
  ClaimDocumentType,
  PaymentMethod,
} from '../domain/entities';

// ===== Report Death =====
export const reportDeathSchema = z.object({
  body: z.object({
    memberId: z.string().uuid('Invalid member ID'),
    deathDate: z.coerce.date(),
    deathPlace: z.string().optional(),
    causeOfDeath: z.string().optional(),
    initialNotes: z.string().optional(),
  }),
});

// ===== Upload Document =====
export const uploadClaimDocumentSchema = z.object({
  params: z.object({
    claimId: z.string().uuid('Invalid claim ID'),
  }),
  body: z.object({
    documentType: z.nativeEnum(ClaimDocumentType),
    documentName: z.string().min(1),
    fileUrl: z.string(), // Will be replaced with actual file upload
    fileSize: z.number().int().positive().max(5 * 1024 * 1024), // 5MB max
    mimeType: z.string(),
  }),
});

// ===== Verify Documents =====
export const verifyClaimDocumentsSchema = z.object({
  params: z.object({
    claimId: z.string().uuid('Invalid claim ID'),
  }),
  body: z.object({
    verificationNotes: z.string().optional(),
  }),
});

// ===== Submit For Approval =====
export const submitClaimForApprovalSchema = z.object({
  params: z.object({
    claimId: z.string().uuid('Invalid claim ID'),
  }),
});

// ===== Settle Claim =====
export const settleDeathClaimSchema = z.object({
  params: z.object({
    claimId: z.string().uuid('Invalid claim ID'),
  }),
  body: z.object({
    paymentMethod: z.nativeEnum(PaymentMethod),
    paymentReference: z.string().optional(),
    paymentDate: z.coerce.date(),
    // nomineeAcknowledgmentFile will be handled separately as file upload
  }),
});

// ===== Get Claim =====
export const getClaimByIdSchema = z.object({
  params: z.object({
    claimId: z.string().uuid('Invalid claim ID'),
  }),
});

// ===== List Claims =====
export const listClaimsSchema = z.object({
  query: z.object({
    claimStatus: z.nativeEnum(DeathClaimStatus).optional(),
    forumId: z.string().uuid().optional(),
    areaId: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

// ===== Get Claim Documents =====
export const getClaimDocumentsSchema = z.object({
  params: z.object({
    claimId: z.string().uuid('Invalid claim ID'),
  }),
});
