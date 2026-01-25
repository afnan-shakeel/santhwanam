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

// ==================== NEW ENDPOINT SCHEMAS ====================

/**
 * Custody activity query schema
 */
export const custodyActivityQuerySchema = z.object({
  type: z.enum(['collection', 'handover_in', 'handover_out']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
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

/**
 * Handover history query schema
 */
export const handoverHistoryQuerySchema = z.object({
  direction: z.enum(['sent', 'received', 'all']).optional().default('all'),
  status: z
    .enum([
      CashHandoverStatus.Initiated,
      CashHandoverStatus.Acknowledged,
      CashHandoverStatus.Rejected,
      CashHandoverStatus.Cancelled,
    ])
    .optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
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

/**
 * Admin dashboard query schema
 */
export const adminDashboardQuerySchema = z.object({
  forumId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
});

/**
 * Custody by level query schema
 */
export const custodyByLevelQuerySchema = z.object({
  forumId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
});

/**
 * Custody report query schema
 */
export const custodyReportQuerySchema = z.object({
  forumId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  level: z
    .enum([
      CashCustodyUserRole.Agent,
      CashCustodyUserRole.UnitAdmin,
      CashCustodyUserRole.AreaAdmin,
      CashCustodyUserRole.ForumAdmin,
    ])
    .optional(),
  minBalance: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().nonnegative())
    .optional(),
  status: z.enum([CashCustodyStatus.Active, CashCustodyStatus.Inactive]).optional(),
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
    .default(50),
});

/**
 * Overdue query schema
 */
export const overdueQuerySchema = z.object({
  thresholdDays: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional()
    .default(7),
  forumId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  level: z
    .enum([
      CashCustodyUserRole.Agent,
      CashCustodyUserRole.UnitAdmin,
      CashCustodyUserRole.AreaAdmin,
      CashCustodyUserRole.ForumAdmin,
    ])
    .optional(),
});

/**
 * Reconciliation query schema
 */
export const reconciliationQuerySchema = z.object({
  forumId: z.string().uuid().optional(),
});

/**
 * Pending transfers query schema
 */
export const pendingTransfersQuerySchema = z.object({
  forumId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  fromRole: z
    .enum([
      CashCustodyUserRole.Agent,
      CashCustodyUserRole.UnitAdmin,
      CashCustodyUserRole.AreaAdmin,
      CashCustodyUserRole.ForumAdmin,
    ])
    .optional(),
  toRole: z
    .enum([
      CashCustodyUserRole.UnitAdmin,
      CashCustodyUserRole.AreaAdmin,
      CashCustodyUserRole.ForumAdmin,
      'SuperAdmin',
    ])
    .optional(),
  minAge: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().nonnegative())
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

/**
 * Approve handover body schema
 */
export const approveHandoverBodySchema = z.object({
  approverNotes: z.string().max(500).optional(),
});

// ==================== TYPE EXPORTS ====================

export type InitiateHandoverBody = z.infer<typeof initiateHandoverBodySchema>;
export type AcknowledgeHandoverBody = z.infer<typeof acknowledgeHandoverBodySchema>;
export type RejectHandoverBody = z.infer<typeof rejectHandoverBodySchema>;
export type ListHandoversQuery = z.infer<typeof listHandoversQuerySchema>;
export type ListCustodiesQuery = z.infer<typeof listCustodiesQuerySchema>;
export type CustodyActivityQuery = z.infer<typeof custodyActivityQuerySchema>;
export type HandoverHistoryQuery = z.infer<typeof handoverHistoryQuerySchema>;
export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;
export type CustodyByLevelQuery = z.infer<typeof custodyByLevelQuerySchema>;
export type CustodyReportQuery = z.infer<typeof custodyReportQuerySchema>;
export type OverdueQuery = z.infer<typeof overdueQuerySchema>;
export type ReconciliationQuery = z.infer<typeof reconciliationQuerySchema>;
export type PendingTransfersQuery = z.infer<typeof pendingTransfersQuerySchema>;
export type ApproveHandoverBody = z.infer<typeof approveHandoverBodySchema>;
