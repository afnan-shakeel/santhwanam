// API: Contribution Validators
// Zod schemas for request validation

import { z } from 'zod';
import { MemberContributionStatus, ContributionCycleStatus } from '../domain/entities';

// ==================== Contribution Cycle Validators ====================

export const getCycleByIdParamsSchema = z.object({
  cycleId: z.string().uuid('Invalid cycle ID format'),
});

export const searchCyclesBodySchema = z.object({
  filters: z.array(z.any()).optional(),
  sorts: z.array(z.any()).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const closeCycleParamsSchema = z.object({
  cycleId: z.string().uuid('Invalid cycle ID format'),
});

// ==================== Member Contribution Validators ====================

export const getContributionByIdParamsSchema = z.object({
  contributionId: z.string().uuid('Invalid contribution ID format'),
});

export const acknowledgeDebitParamsSchema = z.object({
  contributionId: z.string().uuid('Invalid contribution ID format'),
});

export const recordCashParamsSchema = z.object({
  contributionId: z.string().uuid('Invalid contribution ID format'),
});

export const recordCashBodySchema = z.object({
  cashReceiptReference: z.string().optional(),
});

export const markMissedParamsSchema = z.object({
  contributionId: z.string().uuid('Invalid contribution ID format'),
});

export const searchContributionsBodySchema = z.object({
  filters: z.array(z.any()).optional(),
  sorts: z.array(z.any()).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const getMemberHistoryParamsSchema = z.object({
  memberId: z.string().uuid('Invalid member ID format'),
});

export const getMemberHistoryQuerySchema = z.object({
  status: z.nativeEnum(MemberContributionStatus).optional(),
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
});

// ==================== Cycle Contributions Validators ====================

export const getCycleContributionsParamsSchema = z.object({
  cycleId: z.string().uuid('Invalid cycle ID format'),
});

export const getCycleContributionsQuerySchema = z.object({
  status: z.nativeEnum(MemberContributionStatus).optional(),
  agentId: z.string().uuid().optional(),
  searchTerm: z.string().optional(),
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
});

// ==================== My Contributions Validators ====================

export const myContributionsHistoryQuerySchema = z.object({
  status: z.nativeEnum(MemberContributionStatus).optional(),
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
});
