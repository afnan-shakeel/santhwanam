import { z } from 'zod';

/**
 * Response DTOs for GL Module API
 * These schemas define the response structure for each endpoint
 */

// Chart of Account response
export const ChartOfAccountResponseDto = z.object({
  accountId: z.string(),
  accountCode: z.string(),
  accountName: z.string(),
  accountType: z.string().optional(),
  normalBalance: z.string().optional(),
  parentAccountId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  description: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  createdBy: z.string().nullable().optional(),
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
});

// Chart of Account list response
export const ChartOfAccountListResponseDto = z.array(ChartOfAccountResponseDto);

// Chart of Account search response
export const ChartOfAccountSearchResponseDto = z.object({
  items: z.array(ChartOfAccountResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Journal Entry Line response
export const JournalEntryLineResponseDto = z.object({
  lineId: z.string(),
  entryId: z.string(),
  accountId: z.string(),
  accountCode: z.string().optional(),
  accountName: z.string().optional(),
  amount: z.number().optional(),
  side: z.string().optional(),
  description: z.string().nullable().optional(),
});

// Journal Entry response
export const JournalEntryResponseDto = z.object({
  entryId: z.string(),
  entryNumber: z.string().optional(),
  entryDate: z.date().optional(),
  description: z.string().optional(),
  periodId: z.string().nullable().optional(),
  status: z.string().optional(),
  isPosted: z.boolean().optional(),
  postedBy: z.string().nullable().optional(),
  postedAt: z.date().nullable().optional(),
  reversalEntryId: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  createdBy: z.string().nullable().optional(),
});

// Journal Entry with lines response
export const JournalEntryWithLinesResponseDto = z.object({
  entry: JournalEntryResponseDto,
  lines: z.array(JournalEntryLineResponseDto),
});

// Journal Entry list response
export const JournalEntryListResponseDto = z.array(JournalEntryResponseDto);

// Journal Entry search response
export const JournalEntrySearchResponseDto = z.object({
  items: z.array(JournalEntryResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Fiscal Period response
export const FiscalPeriodResponseDto = z.object({
  periodId: z.string(),
  periodName: z.string().optional(),
  fiscalYear: z.number().optional(),
  startDate: z.date(),
  endDate: z.date(),
  isClosed: z.boolean().optional(),
  closedBy: z.string().nullable().optional(),
  closedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
});

// Fiscal Period list response
export const FiscalPeriodListResponseDto = z.array(FiscalPeriodResponseDto);

// Report responses (for getTrialBalance, getIncomeStatement, getBalanceSheet)
export const TrialBalanceResponseDto = z.object({
  asOfDate: z.date().optional(),
  accounts: z.array(
    z.object({
      accountCode: z.string(),
      accountName: z.string(),
      accountType: z.string(),
      debitBalance: z.number(),
      creditBalance: z.number(),
    })
  ),
  totalDebits: z.number(),
  totalCredits: z.number(),
});

export const IncomeStatementResponseDto = z.object({
  startDate: z.date(),
  endDate: z.date(),
  revenue: z.array(
    z.object({
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    })
  ),
  expenses: z.array(
    z.object({
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    })
  ),
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  netIncome: z.number(),
});

export const BalanceSheetResponseDto = z.object({
  asOfDate: z.date().optional(),
  assets: z.array(
    z.object({
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    })
  ),
  liabilities: z.array(
    z.object({
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    })
  ),
  equity: z.array(
    z.object({
      accountCode: z.string(),
      accountName: z.string(),
      amount: z.number(),
    })
  ),
  totalAssets: z.number(),
  totalLiabilities: z.number(),
  totalEquity: z.number(),
});

// Type exports
export type ChartOfAccountResponse = z.infer<typeof ChartOfAccountResponseDto>;
export type ChartOfAccountListResponse = z.infer<typeof ChartOfAccountListResponseDto>;
export type ChartOfAccountSearchResponse = z.infer<typeof ChartOfAccountSearchResponseDto>;
export type JournalEntryLineResponse = z.infer<typeof JournalEntryLineResponseDto>;
export type JournalEntryResponse = z.infer<typeof JournalEntryResponseDto>;
export type JournalEntryWithLinesResponse = z.infer<typeof JournalEntryWithLinesResponseDto>;
export type JournalEntryListResponse = z.infer<typeof JournalEntryListResponseDto>;
export type JournalEntrySearchResponse = z.infer<typeof JournalEntrySearchResponseDto>;
export type FiscalPeriodResponse = z.infer<typeof FiscalPeriodResponseDto>;
export type FiscalPeriodListResponse = z.infer<typeof FiscalPeriodListResponseDto>;
export type TrialBalanceResponse = z.infer<typeof TrialBalanceResponseDto>;
export type IncomeStatementResponse = z.infer<typeof IncomeStatementResponseDto>;
export type BalanceSheetResponse = z.infer<typeof BalanceSheetResponseDto>;
