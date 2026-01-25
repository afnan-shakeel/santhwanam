// API: Cash Management Validations
// Zod schemas for request validation

import { z } from 'zod';
import { CashCustodyUserRole, CashCustodyStatus, CashHandoverStatus, CashHandoverType } from '../../domain/entities';

// ==================== HANDOVER SCHEMAS ====================

/**
 * Initiate handover body schema
 */
export const initiateHandoverBodySchema = z.object({
  toUserId: z.string().uuid('Invalid receiver user ID'),
  toUserRole: z.enum(['UnitAdmin', 'AreaAdmin', 'ForumAdmin', 'SuperAdmin']),
  amount: z.number().positive('Amount must be positive'),
  initiatorNotes: z.string().max(500).optional(),
  handoverType: z
    .enum([CashHandoverType.Normal, CashHandoverType.AdminTransition])
    .optional()
    .default(CashHandoverType.Normal),
  sourceHandoverId: z.string().uuid().optional(),
});

/**
 * Handover ID params schema
 */
export const handoverIdParamsSchema = z.object({
  handoverId: z.string().uuid('Invalid handover ID'),
});

/**
 * Acknowledge handover body schema
 */
export const acknowledgeHandoverBodySchema = z.object({
  receiverNotes: z.string().max(500).optional(),
});

/**
 * Reject handover body schema
 */
export const rejectHandoverBodySchema = z.object({
  rejectionReason: z.string().min(5, 'Rejection reason is required').max(500),
});

/**
 * List handovers query schema
 */
export const listHandoversQuerySchema = z.object({
  fromUserId: z.string().uuid().optional(),
  toUserId: z.string().uuid().optional(),
  status: z
    .enum([
      CashHandoverStatus.Initiated,
      CashHandoverStatus.Acknowledged,
      CashHandoverStatus.Rejected,
      CashHandoverStatus.Cancelled,
    ])
    .optional(),
  forumId: z.string().uuid().optional(),
  requiresApproval: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional()
    .default(1),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100))
    .optional()
    .default(20),
});

// ==================== CUSTODY SCHEMAS ====================

/**
 * User ID params schema
 */
export const userIdParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

/**
 * Custody ID params schema
 */
export const custodyIdParamsSchema = z.object({
  custodyId: z.string().uuid('Invalid custody ID'),
});

/**
 * GL account code params schema
 */
export const glAccountCodeParamsSchema = z.object({
  glAccountCode: z.string().regex(/^100[1-4]$/, 'Invalid GL account code'),
});

/**
 * List custodies query schema
 */
export const listCustodiesQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  userRole: z
    .enum([
      CashCustodyUserRole.Agent,
      CashCustodyUserRole.UnitAdmin,
      CashCustodyUserRole.AreaAdmin,
      CashCustodyUserRole.ForumAdmin,
    ])
    .optional(),
  status: z
    .enum([
      CashCustodyStatus.Active,
      CashCustodyStatus.Inactive,
      CashCustodyStatus.Suspended,
    ])
    .optional(),
  forumId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional()
    .default(1),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100))
    .optional()
    .default(20),
});

// ==================== TYPE EXPORTS ====================

export type InitiateHandoverBody = z.infer<typeof initiateHandoverBodySchema>;
export type AcknowledgeHandoverBody = z.infer<typeof acknowledgeHandoverBodySchema>;
export type RejectHandoverBody = z.infer<typeof rejectHandoverBodySchema>;
export type ListHandoversQuery = z.infer<typeof listHandoversQuerySchema>;
export type ListCustodiesQuery = z.infer<typeof listCustodiesQuerySchema>;
