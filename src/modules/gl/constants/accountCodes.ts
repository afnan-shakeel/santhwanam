/**
 * Standard Chart of Accounts - Account Codes and Types
 */

export enum AccountType {
  Asset = 'Asset',
  Liability = 'Liability',
  Equity = 'Equity',
  Revenue = 'Revenue',
  Expense = 'Expense',
}

export enum NormalBalance {
  Debit = 'Debit',
  Credit = 'Credit',
}

/**
 * Standard Account Codes used across the system
 */
export const ACCOUNT_CODES = {
  // ASSETS (1000-1999)
  CASH: '1000',
  CASH_AGENT_CUSTODY: '1001',
  CASH_UNIT_ADMIN_CUSTODY: '1002',
  CASH_AREA_ADMIN_CUSTODY: '1003',
  CASH_FORUM_ADMIN_CUSTODY: '1004',
  BANK_ACCOUNT: '1100',

  // LIABILITIES (2000-2999)
  MEMBER_WALLET_LIABILITY: '2100',

  // REVENUE (4000-4999)
  REGISTRATION_FEE_REVENUE: '4100',
  CONTRIBUTION_INCOME: '4200',

  // EXPENSES (5000-5999)
  DEATH_BENEFIT_EXPENSE: '5100',
  OPERATING_EXPENSES: '5200',
} as const;

/**
 * Account code categories for validation and reporting
 */
export const ACCOUNT_CODE_RANGES = {
  ASSETS: { min: 1000, max: 1999 },
  LIABILITIES: { min: 2000, max: 2999 },
  EQUITY: { min: 3000, max: 3999 },
  REVENUE: { min: 4000, max: 4999 },
  EXPENSES: { min: 5000, max: 5999 },
} as const;

/**
 * System accounts that cannot be deleted or modified
 */
export const SYSTEM_ACCOUNT_CODES = [
  ACCOUNT_CODES.CASH,
  ACCOUNT_CODES.CASH_AGENT_CUSTODY,
  ACCOUNT_CODES.CASH_UNIT_ADMIN_CUSTODY,
  ACCOUNT_CODES.CASH_AREA_ADMIN_CUSTODY,
  ACCOUNT_CODES.CASH_FORUM_ADMIN_CUSTODY,
  ACCOUNT_CODES.MEMBER_WALLET_LIABILITY,
  ACCOUNT_CODES.REGISTRATION_FEE_REVENUE,
  ACCOUNT_CODES.CONTRIBUTION_INCOME,
  ACCOUNT_CODES.DEATH_BENEFIT_EXPENSE,
] as const;

/**
 * Helper function to determine account type from account code
 */
export function getAccountTypeFromCode(accountCode: string): AccountType | null {
  const code = parseInt(accountCode, 10);

  if (code >= ACCOUNT_CODE_RANGES.ASSETS.min && code <= ACCOUNT_CODE_RANGES.ASSETS.max) {
    return AccountType.Asset;
  }
  if (code >= ACCOUNT_CODE_RANGES.LIABILITIES.min && code <= ACCOUNT_CODE_RANGES.LIABILITIES.max) {
    return AccountType.Liability;
  }
  if (code >= ACCOUNT_CODE_RANGES.EQUITY.min && code <= ACCOUNT_CODE_RANGES.EQUITY.max) {
    return AccountType.Equity;
  }
  if (code >= ACCOUNT_CODE_RANGES.REVENUE.min && code <= ACCOUNT_CODE_RANGES.REVENUE.max) {
    return AccountType.Revenue;
  }
  if (code >= ACCOUNT_CODE_RANGES.EXPENSES.min && code <= ACCOUNT_CODE_RANGES.EXPENSES.max) {
    return AccountType.Expense;
  }

  return null;
}

/**
 * Helper function to determine normal balance from account type
 */
export function getNormalBalanceForType(accountType: AccountType): NormalBalance {
  switch (accountType) {
    case AccountType.Asset:
    case AccountType.Expense:
      return NormalBalance.Debit;
    case AccountType.Liability:
    case AccountType.Equity:
    case AccountType.Revenue:
      return NormalBalance.Credit;
  }
}

/**
 * Helper function to check if account code is a system account
 */
export function isSystemAccount(accountCode: string): boolean {
  return SYSTEM_ACCOUNT_CODES.includes(accountCode as any);
}

/**
 * Transaction source types for GL integration
 */
export const TRANSACTION_SOURCE = {
  MEMBERSHIP: 'Membership',
  WALLET: 'Wallet',
  CONTRIBUTION: 'Contribution',
  CLAIM: 'Claim',
  DONATION: 'Donation',
  MANUAL_ADJUSTMENT: 'ManualAdjustment',
  CASH_MANAGEMENT: 'CashManagement',
} as const;

/**
 * Transaction types for audit trail
 */
export const TRANSACTION_TYPE = {
  // Membership
  REGISTRATION_APPROVAL: 'RegistrationApproval',
  REGISTRATION_FEE: 'RegistrationFee',
  ADVANCE_DEPOSIT: 'AdvanceDeposit',
  ACCOUNT_CLOSURE_REFUND: 'AccountClosureRefund',

  // Wallet
  WALLET_DEPOSIT: 'WalletDeposit',
  WALLET_WITHDRAWAL: 'WalletWithdrawal',

  // Contribution
  CONTRIBUTION_FROM_WALLET: 'ContributionFromWallet',
  CONTRIBUTION_DIRECT_CASH: 'ContributionDirectCash',

  // Claims
  DEATH_BENEFIT_PAYOUT: 'DeathBenefitPayout',

  // Donations
  DONATION_RECEIVED: 'DonationReceived',
  CHARITABLE_DONATION: 'CharitableDonation',

  // Operating
  OPERATING_EXPENSE: 'OperatingExpense',
  ADMINISTRATIVE_EXPENSE: 'AdministrativeExpense',

  // Cash Management
  CASH_HANDOVER: 'CashHandover',
  CASH_HANDOVER_TO_BANK: 'CashHandoverToBank',

  // Manual
  MANUAL_JOURNAL_ENTRY: 'ManualJournalEntry',
  REVERSAL: 'Reversal',
} as const;

export type TransactionSource = (typeof TRANSACTION_SOURCE)[keyof typeof TRANSACTION_SOURCE];
export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];
