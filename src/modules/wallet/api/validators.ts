/**
 * Zod validators for Wallet API
 */

import { z } from "zod";

// Enums
const WalletDepositRequestStatusEnum = z.enum([
  "Draft",
  "PendingApproval",
  "Approved",
  "Rejected",
]);

const WalletDebitRequestStatusEnum = z.enum([
  "PendingAcknowledgment",
  "Acknowledged",
  "Completed",
  "Invalidated",
  "Failed",
]);

const TransactionTypeEnum = z.enum(["Deposit", "Debit", "Refund", "Adjustment"]);
const TransactionStatusEnum = z.enum(["Pending", "Completed", "Failed", "Reversed"]);

// ===== DEPOSIT REQUEST =====

export const requestDepositSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  collectionDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

export const submitDepositForApprovalSchema = z.object({
  depositRequestId: z.string().uuid(),
});

// ===== DEBIT REQUEST =====

export const createDebitRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  purpose: z.string().min(1).max(255),
  contributionCycleId: z.string().uuid().optional(),
  contributionId: z.string().uuid().optional(),
});

export const acknowledgeDebitSchema = z.object({
  debitRequestId: z.string().uuid(),
});

export const invalidateDebitRequestSchema = z.object({
  debitRequestId: z.string().uuid(),
});

// ===== WALLET ADJUSTMENT (ADMIN) =====

export const adjustWalletSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  adjustmentType: z.enum(["credit", "debit"]),
  reason: z.string().min(1).max(500),
});

// ===== QUERY PARAMS =====

export const walletListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  minBalance: z.coerce.number().optional(),
  maxBalance: z.coerce.number().optional(),
  search: z.string().optional(),
});

export const lowBalanceQuerySchema = z.object({
  threshold: z.coerce.number().default(200),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const transactionHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: TransactionTypeEnum.optional(),
  status: TransactionStatusEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const depositRequestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: WalletDepositRequestStatusEnum.optional(),
});

export const pendingDepositsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  collectedBy: z.string().uuid().optional(),
});

export const debitRequestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: WalletDebitRequestStatusEnum.optional(),
});

export const pendingAcknowledgmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  agentId: z.string().uuid().optional(),
});

// ===== PATH PARAMS =====

export const memberIdParamSchema = z.object({
  memberId: z.string().uuid(),
});

export const walletIdParamSchema = z.object({
  walletId: z.string().uuid(),
});

export const depositRequestIdParamSchema = z.object({
  requestId: z.string().uuid(),
});

export const debitRequestIdParamSchema = z.object({
  debitRequestId: z.string().uuid(),
});
