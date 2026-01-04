/**
 * Validation schemas for GL API endpoints
 */
import { z } from 'zod';
// Chart of Account schemas
export const createAccountSchema = z.object({
    accountCode: z.string().min(1).max(20),
    accountName: z.string().min(1).max(200),
    accountType: z.enum(['Asset', 'Liability', 'Revenue', 'Expense', 'Equity']),
    accountCategory: z.string().max(100).optional(),
    parentAccountId: z.string().uuid().optional(),
    normalBalance: z.enum(['Debit', 'Credit']),
    isSystemAccount: z.boolean().optional(),
});
export const updateAccountSchema = z.object({
    params: z.object({
        accountId: z.string().uuid(),
    }),
    body: z.object({
        accountName: z.string().min(1).max(200).optional(),
        accountCategory: z.string().max(100).optional(),
    }),
});
export const accountIdSchema = z.object({
    params: z.object({
        accountId: z.string().uuid(),
    }),
});
export const accountCodeSchema = z.object({
    params: z.object({
        accountCode: z.string(),
    }),
});
export const accountTypeSchema = z.object({
    params: z.object({
        accountType: z.enum(['Asset', 'Liability', 'Revenue', 'Expense', 'Equity']),
    }),
});
// Journal Entry schemas
export const createJournalEntrySchema = z.object({
    body: z.object({
        entryDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format',
        }),
        description: z.string().min(1).max(500),
        reference: z.string().max(100).optional(),
        sourceModule: z.string().min(1).max(50),
        sourceEntityId: z.string().uuid().optional(),
        sourceTransactionType: z.string().min(1).max(50),
        lines: z
            .array(z.object({
            accountCode: z.string().min(1),
            debitAmount: z.number().min(0),
            creditAmount: z.number().min(0),
            description: z.string().min(1).max(500),
        }))
            .min(2),
        autoPost: z.boolean().optional(),
    }),
});
export const entryIdSchema = z.object({
    params: z.object({
        entryId: z.string().uuid(),
    }),
});
export const postJournalEntrySchema = z.object({
    params: z.object({
        entryId: z.string().uuid(),
    }),
});
export const reverseJournalEntrySchema = z.object({
    params: z.object({
        entryId: z.string().uuid(),
    }),
    body: z.object({
        reason: z.string().min(1).max(500),
    }),
});
export const dateRangeSchema = z.object({
    query: z.object({
        startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid start date format',
        }),
        endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid end date format',
        }),
    }),
});
// Fiscal Period schemas
export const createFiscalPeriodSchema = z.object({
    body: z.object({
        fiscalYear: z.number().int().min(2000).max(2100),
        periodNumber: z.number().int().min(1).max(12),
        periodName: z.string().min(1).max(50),
        startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid start date format',
        }),
        endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid end date format',
        }),
    }),
});
export const periodIdSchema = z.object({
    params: z.object({
        periodId: z.string().uuid(),
    }),
});
export const fiscalYearSchema = z.object({
    params: z.object({
        fiscalYear: z.coerce.number().int().min(2000).max(2100),
    }),
});
export const closePeriodSchema = z.object({
    params: z.object({
        periodId: z.string().uuid(),
    }),
});
// Report schemas
export const trialBalanceSchema = z.object({
    query: z.object({
        asOfDate: z
            .string()
            .refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format',
        })
            .optional(),
    }),
});
export const incomeStatementSchema = z.object({
    query: z.object({
        startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid start date format',
        }),
        endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid end date format',
        }),
    }),
});
export const balanceSheetSchema = z.object({
    query: z.object({
        asOfDate: z
            .string()
            .refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format',
        })
            .optional(),
    }),
});
//# sourceMappingURL=validators.js.map