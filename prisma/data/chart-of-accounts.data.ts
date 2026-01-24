/**
 * Chart of Accounts Data
 * Core GL accounts for the financial system
 */

export const SYSTEM_ACCOUNTS = [
  // ===== ASSET ACCOUNTS (1xxx) =====
  {
    code: '1000',
    name: 'Cash',
    type: 'Asset' as const,
    category: 'Current Assets',
    normalBalance: 'Debit' as const,
    isSystemAccount: true,
  },
  {
    code: '1001',
    name: 'Cash - Agent Custody',
    type: 'Asset' as const,
    category: 'Current Assets',
    normalBalance: 'Debit' as const,
    isSystemAccount: true,
    parentCode: '1000',
  },
  {
    code: '1002',
    name: 'Cash - Unit Admin Custody',
    type: 'Asset' as const,
    category: 'Current Assets',
    normalBalance: 'Debit' as const,
    isSystemAccount: true,
    parentCode: '1000',
  },
  {
    code: '1003',
    name: 'Cash - Area Admin Custody',
    type: 'Asset' as const,
    category: 'Current Assets',
    normalBalance: 'Debit' as const,
    isSystemAccount: true,
    parentCode: '1000',
  },
  {
    code: '1004',
    name: 'Cash - Forum Admin Custody',
    type: 'Asset' as const,
    category: 'Current Assets',
    normalBalance: 'Debit' as const,
    isSystemAccount: true,
    parentCode: '1000',
  },
  {
    code: '1100',
    name: 'Bank Account',
    type: 'Asset' as const,
    category: 'Current Assets',
    normalBalance: 'Debit' as const,
    isSystemAccount: true,
  },
  {
    code: '1200',
    name: 'Accounts Receivable',
    type: 'Asset' as const,
    category: 'Current Assets',
    normalBalance: 'Debit' as const,
    isSystemAccount: true,
  },

  // ===== LIABILITY ACCOUNTS (2xxx) =====
  {
    code: '2100',
    name: 'Member Wallet Liability',
    type: 'Liability' as const,
    category: 'Current Liabilities',
    normalBalance: 'Credit' as const,
    isSystemAccount: true,
  },
  {
    code: '2200',
    name: 'Death Benefit Payable',
    type: 'Liability' as const,
    category: 'Current Liabilities',
    normalBalance: 'Credit' as const,
    isSystemAccount: true,
  },

  // ===== REVENUE ACCOUNTS (4xxx) =====
  {
    code: '4100',
    name: 'Registration Fee Revenue',
    type: 'Revenue' as const,
    category: 'Operating Revenue',
    normalBalance: 'Credit' as const,
    isSystemAccount: true,
  },
  {
    code: '4200',
    name: 'Contribution Revenue',
    type: 'Revenue' as const,
    category: 'Operating Revenue',
    normalBalance: 'Credit' as const,
    isSystemAccount: true,
  },
  {
    code: '4300',
    name: 'Donation Revenue',
    type: 'Revenue' as const,
    category: 'Non-Operating Revenue',
    normalBalance: 'Credit' as const,
    isSystemAccount: true,
  },

  // ===== EXPENSE ACCOUNTS (5xxx) =====
  {
    code: '5100',
    name: 'Death Benefit Expense',
    type: 'Expense' as const,
    category: 'Operating Expenses',
    normalBalance: 'Debit' as const,
    isSystemAccount: true,
  },
  {
    code: '5200',
    name: 'Administrative Expenses',
    type: 'Expense' as const,
    category: 'Operating Expenses',
    normalBalance: 'Debit' as const,
    isSystemAccount: true,
  },
];
