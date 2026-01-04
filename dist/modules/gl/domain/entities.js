/**
 * Domain entities for General Ledger Module
 * See docs/domain/6.gl.md
 */
// Enums
export var AccountType;
(function (AccountType) {
    AccountType["Asset"] = "Asset";
    AccountType["Liability"] = "Liability";
    AccountType["Revenue"] = "Revenue";
    AccountType["Expense"] = "Expense";
    AccountType["Equity"] = "Equity";
})(AccountType || (AccountType = {}));
export var NormalBalance;
(function (NormalBalance) {
    NormalBalance["Debit"] = "Debit";
    NormalBalance["Credit"] = "Credit";
})(NormalBalance || (NormalBalance = {}));
export var EntryStatus;
(function (EntryStatus) {
    EntryStatus["Draft"] = "Draft";
    EntryStatus["Posted"] = "Posted";
    EntryStatus["Reversed"] = "Reversed";
})(EntryStatus || (EntryStatus = {}));
export var PeriodStatus;
(function (PeriodStatus) {
    PeriodStatus["Open"] = "Open";
    PeriodStatus["Closed"] = "Closed";
})(PeriodStatus || (PeriodStatus = {}));
// Standard Chart of Accounts Configuration
export const STANDARD_CHART_OF_ACCOUNTS = [
    // ASSETS (1000-1999)
    {
        accountCode: '1000',
        accountName: 'Cash',
        accountType: AccountType.Asset,
        accountCategory: 'Current Assets',
        normalBalance: NormalBalance.Debit,
        isSystemAccount: true,
    },
    {
        accountCode: '1100',
        accountName: 'Bank Account',
        accountType: AccountType.Asset,
        accountCategory: 'Current Assets',
        normalBalance: NormalBalance.Debit,
        isSystemAccount: false,
    },
    // LIABILITIES (2000-2999)
    {
        accountCode: '2100',
        accountName: 'Member Wallet Liability',
        accountType: AccountType.Liability,
        accountCategory: 'Current Liabilities',
        normalBalance: NormalBalance.Credit,
        isSystemAccount: true,
    },
    // REVENUE (4000-4999)
    {
        accountCode: '4100',
        accountName: 'Registration Fee Revenue',
        accountType: AccountType.Revenue,
        accountCategory: 'Operating Revenue',
        normalBalance: NormalBalance.Credit,
        isSystemAccount: true,
    },
    {
        accountCode: '4200',
        accountName: 'Contribution Income',
        accountType: AccountType.Revenue,
        accountCategory: 'Operating Revenue',
        normalBalance: NormalBalance.Credit,
        isSystemAccount: true,
    },
    {
        accountCode: '4300',
        accountName: 'Donation Income',
        accountType: AccountType.Revenue,
        accountCategory: 'Other Revenue',
        normalBalance: NormalBalance.Credit,
        isSystemAccount: false,
    },
    // EXPENSES (5000-5999)
    {
        accountCode: '5100',
        accountName: 'Death Benefit Expense',
        accountType: AccountType.Expense,
        accountCategory: 'Operating Expenses',
        normalBalance: NormalBalance.Debit,
        isSystemAccount: true,
    },
    {
        accountCode: '5200',
        accountName: 'Operating Expenses',
        accountType: AccountType.Expense,
        accountCategory: 'Operating Expenses',
        normalBalance: NormalBalance.Debit,
        isSystemAccount: false,
    },
    {
        accountCode: '5300',
        accountName: 'Charitable Donations',
        accountType: AccountType.Expense,
        accountCategory: 'Other Expenses',
        normalBalance: NormalBalance.Debit,
        isSystemAccount: false,
    },
];
//# sourceMappingURL=entities.js.map