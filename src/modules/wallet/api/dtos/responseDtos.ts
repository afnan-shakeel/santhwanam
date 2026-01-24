/**
 * Response DTOs for Wallet Module API
 */

import { z } from "zod";

// ===== WALLET =====

export const WalletDto = z.object({
  walletId: z.string(),
  memberId: z.string(),
  currentBalance: z.number(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

export const WalletWithMemberDto = WalletDto.extend({
  member: z
    .object({
      memberId: z.string(),
      memberCode: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      agent: z
        .object({
          agentId: z.string(),
          firstName: z.string(),
          lastName: z.string(),
        }).nullable().optional(),
      tier: z
        .object({
          tierId: z.string(),
          tierName: z.string(),
          contributionAmount: z.number(),
          advanceDepositAmount: z.number(),
        }).nullable().optional(),
    })
    .optional(),
});

export const WalletResponseDto = WalletDto;

export const WalletListResponseDto = z.object({
  wallets: z.array(WalletWithMemberDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// ===== WALLET SUMMARY =====

export const WalletTransactionDto = z.object({
  transactionId: z.string(),
  walletId: z.string(),
  transactionType: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  sourceModule: z.string(),
  sourceEntityId: z.string().nullable(),
  description: z.string(),
  journalEntryId: z.string().nullable(),
  status: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
});

export const WalletSummaryResponseDto = z.object({
  walletId: z.string(),
  memberId: z.string(),
  currentBalance: z.number(),
  recentTransactions: z.array(WalletTransactionDto),
});

// ===== TRANSACTION HISTORY =====

export const TransactionHistoryResponseDto = z.object({
  transactions: z.array(WalletTransactionDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// ===== WALLET STATISTICS =====

export const WalletStatisticsResponseDto = z.object({
  totalWallets: z.number(),
  totalBalance: z.number(),
  averageBalance: z.number(),
  lowBalanceCount: z.number(),
});

// ===== DEPOSIT REQUEST =====

export const WalletDepositRequestDto = z.object({
  depositRequestId: z.string(),
  memberId: z.string(),
  walletId: z.string(),
  amount: z.number(),
  collectionDate: z.date(),
  collectedBy: z.string(),
  notes: z.string().nullable(),
  requestStatus: z.string(),
  approvalRequestId: z.string().nullable(),
  journalEntryId: z.string().nullable(),
  createdAt: z.date(),
  approvedAt: z.date().nullable(),
  rejectedAt: z.date().nullable(),
  member: z
    .object({
      memberId: z.string(),
      memberCode: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      agent: z
        .object({
          agentId: z.string(),
          firstName: z.string(),
          lastName: z.string(),
        }).nullable().optional(),
    })
    .nullable().optional(),
});

export const DepositRequestResponseDto = WalletDepositRequestDto;

export const DepositRequestListResponseDto = z.object({
  requests: z.array(WalletDepositRequestDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// ===== DEBIT REQUEST =====

export const WalletDebitRequestDto = z.object({
  debitRequestId: z.string(),
  memberId: z.string(),
  walletId: z.string(),
  amount: z.number(),
  purpose: z.string(),
  contributionCycleId: z.string().nullable(),
  contributionId: z.string().nullable(),
  status: z.string(),
  createdAt: z.date(),
  acknowledgedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
});

export const DebitRequestResponseDto = WalletDebitRequestDto;

export const DebitRequestListResponseDto = z.object({
  requests: z.array(WalletDebitRequestDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// ===== SUCCESS RESPONSE =====

export const SuccessResponseDto = z.object({
  success: z.boolean(),
  message: z.string(),
});
