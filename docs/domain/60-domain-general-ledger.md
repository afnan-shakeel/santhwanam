# General Ledger (GL) Module - Complete Specification

---

## **Domain Model**

### **Entity: ChartOfAccount**

```typescript
ChartOfAccount {
  accountId: UUID
  accountCode: string // "1000", "2100", "4100"
  accountName: string // "Cash", "Member Wallet Liability", "Registration Fee Revenue"
  accountType: enum [Asset, Liability, Revenue, Expense]
  accountCategory: string? // "Current Assets", "Operating Revenue", etc.
  
  // Hierarchy (for future sub-accounts)
  parentAccountId: UUID?
  accountLevel: int // 1 = parent, 2 = child
  
  // Balance tracking
  normalBalance: enum [Debit, Credit]
  currentBalance: decimal // Running balance
  
  // Status
  isActive: boolean
  isSystemAccount: boolean // Cannot be deleted/modified if true
  
  // Timestamps
  createdAt: timestamp
  createdBy: UUID
  updatedAt: timestamp
  updatedBy: UUID?
}
```

**Business Rules:**
- Account code must be unique
- System accounts (isSystemAccount = true) cannot be deleted
- System accounts: 1000, 2100, 4100, 4200, 5100
- Account code must be 4 digits (1000-9999)
- Normal balance must match account type:
  - Asset, Expense → Debit
  - Liability, Equity, Revenue → Credit
- Cannot deactivate account if it has transactions and non-zero balance
- Parent account can have children, children cannot have children (max 2 levels)

---

### **Entity: JournalEntry**

```typescript
JournalEntry {
  entryId: UUID
  entryNumber: string // Auto-generated: "JE-2025-00001"
  
  // Entry details
  entryDate: date // Transaction date
  postingDate: date? // When posted to GL
  description: string
  reference: string? // External reference
  
  // Source tracking
  sourceModule: string // "Membership", "Wallets", "Contributions", "Claims"
  sourceEntityId: UUID? // memberId, contributionId, etc.
  sourceTransactionType: string // "RegistrationApproval", "WalletDeposit", etc.
  
  // Status
  entryStatus: enum [Draft, Posted, Reversed]
  
  // Reversal tracking
  reversedEntryId: UUID? // Points to original if this is a reversal
  reversalReason: string?
  reversedAt: timestamp?
  reversedBy: UUID?
  
  // Validation
  totalDebit: decimal
  totalCredit: decimal
  isBalanced: boolean // Must be true: totalDebit === totalCredit
  
  // Timestamps
  createdAt: timestamp
  createdBy: UUID
  postedAt: timestamp?
  postedBy: UUID?
  updatedAt: timestamp?
}
```

**Business Rules:**
- Entry number must be unique, auto-generated: JE-YYYY-NNNNN
- totalDebit must equal totalCredit (balanced entry)
- Entry must have at least 2 lines (one debit, one credit minimum)
- Once Posted, cannot be edited (only reversed)
- entryDate cannot be in the future
- All lines must reference active accounts
- If status = Reversed, must have reversedEntryId

---

### **Entity: JournalEntryLine**

```typescript
JournalEntryLine {
  lineId: UUID
  entryId: UUID // References JournalEntry
  
  lineNumber: int // 1, 2, 3... (order within entry)
  
  // Account reference
  accountId: UUID
  accountCode: string // Denormalized for reporting
  accountName: string // Denormalized for reporting
  
  // Amounts
  debitAmount: decimal
  creditAmount: decimal
  
  description: string
  
  // Timestamps
  createdAt: timestamp
}
```

**Business Rules:**
- Each line must have EITHER debit OR credit (not both, not neither)
- If debitAmount > 0, then creditAmount must = 0
- If creditAmount > 0, then debitAmount must = 0
- Line numbers must be sequential (1, 2, 3...)
- Cannot delete lines once entry is Posted
- Account must exist and be active
- Amounts must be positive (> 0)

---

### **Entity: FiscalPeriod** (Optional - for period closing)

```typescript
FiscalPeriod {
  periodId: UUID
  fiscalYear: int // 2025
  periodNumber: int // 1-12 (monthly) or 1-4 (quarterly)
  periodName: string // "January 2025", "Q1 2025"
  
  startDate: date
  endDate: date
  
  status: enum [Open, Closed]
  
  closedAt: timestamp?
  closedBy: UUID?
  
  createdAt: timestamp
}
```

**Business Rules:**
- Fiscal year + period number must be unique
- Cannot have overlapping date ranges
- Cannot post entries to closed periods
- Must close periods sequentially (cannot close March if February is open)
- Once closed, period cannot be reopened (Phase 1)

---

## **Standard Chart of Accounts**

```typescript
const STANDARD_CHART_OF_ACCOUNTS = [
  // ASSETS (1000-1999)
  {
    accountCode: "1000",
    accountName: "Cash",
    accountType: "Asset",
    accountCategory: "Current Assets",
    normalBalance: "Debit",
    isSystemAccount: true
  },
  {
    accountCode: "1100",
    accountName: "Bank Account",
    accountType: "Asset",
    accountCategory: "Current Assets",
    normalBalance: "Debit",
    isSystemAccount: false
  },
  
  // LIABILITIES (2000-2999)
  {
    accountCode: "2100",
    accountName: "Member Wallet Liability",
    accountType: "Liability",
    accountCategory: "Current Liabilities",
    normalBalance: "Credit",
    isSystemAccount: true
  },
  
  // REVENUE (4000-4999)
  {
    accountCode: "4100",
    accountName: "Registration Fee Revenue",
    accountType: "Revenue",
    accountCategory: "Operating Revenue",
    normalBalance: "Credit",
    isSystemAccount: true
  },
  {
    accountCode: "4200",
    accountName: "Contribution Income",
    accountType: "Revenue",
    accountCategory: "Operating Revenue",
    normalBalance: "Credit",
    isSystemAccount: true
  },
  {
    accountCode: "4300",
    accountName: "Donation Income",
    accountType: "Revenue",
    accountCategory: "Other Revenue",
    normalBalance: "Credit",
    isSystemAccount: false
  },
  
  // EXPENSES (5000-5999)
  {
    accountCode: "5100",
    accountName: "Death Benefit Expense",
    accountType: "Expense",
    accountCategory: "Operating Expenses",
    normalBalance: "Debit",
    isSystemAccount: true
  },
  {
    accountCode: "5200",
    accountName: "Operating Expenses",
    accountType: "Expense",
    accountCategory: "Operating Expenses",
    normalBalance: "Debit",
    isSystemAccount: false
  },
  {
    accountCode: "5300",
    accountName: "Charitable Donations",
    accountType: "Expense",
    accountCategory: "Other Expenses",
    normalBalance: "Debit",
    isSystemAccount: false
  }
];
```

---

## **Commands**

### **1. CreateAccount**

**Triggered by:** Super Admin, Finance Admin

**Input:**
```json
{
  "accountCode": "1200",
  "accountName": "Accounts Receivable",
  "accountType": "Asset",
  "accountCategory": "Current Assets",
  "parentAccountId": null,
  "createdBy": "uuid"
}
```

**Preconditions:**
- User has `gl.account.create` permission
- Account code is unique
- Account code is 4 digits (1000-9999)
- Account type matches normal balance convention

**Business Logic:**
```typescript
async function createAccount(input) {
  // 1. Validate account code format (4 digits)
  if (!/^\d{4}$/.test(input.accountCode)) {
    throw new Error('Account code must be 4 digits');
  }
  
  // 2. Check uniqueness
  const existing = await db.chartOfAccounts.findOne({
    where: { accountCode: input.accountCode }
  });
  
  if (existing) {
    throw new Error('Account code already exists');
  }
  
  // 3. Validate account type vs. normal balance
  const normalBalance = ['Asset', 'Expense'].includes(input.accountType) 
    ? 'Debit' 
    : 'Credit';
  
  // 4. If has parent, validate parent exists
  if (input.parentAccountId) {
    const parent = await db.chartOfAccounts.findByPk(input.parentAccountId);
    if (!parent) {
      throw new Error('Parent account not found');
    }
    if (parent.parentAccountId) {
      throw new Error('Cannot create sub-account under sub-account (max 2 levels)');
    }
  }
  
  // 5. Create account
  const account = await db.chartOfAccounts.create({
    accountId: generateUUID(),
    accountCode: input.accountCode,
    accountName: input.accountName,
    accountType: input.accountType,
    accountCategory: input.accountCategory,
    parentAccountId: input.parentAccountId,
    accountLevel: input.parentAccountId ? 2 : 1,
    normalBalance,
    currentBalance: 0,
    isActive: true,
    isSystemAccount: false,
    createdAt: new Date(),
    createdBy: input.createdBy
  });
  
  await emitEvent('AccountCreated', {
    accountId: account.accountId,
    accountCode: account.accountCode
  });
  
  return account;
}
```

**Outcome:**
- New account created in chart of accounts
- Event: `AccountCreated`

---

### **2. UpdateAccount**

**Triggered by:** Super Admin, Finance Admin

**Input:**
```json
{
  "accountId": "uuid",
  "accountName": "Updated Name",
  "accountCategory": "Updated Category",
  "updatedBy": "uuid"
}
```

**Preconditions:**
- Account exists
- Account is not a system account (cannot update system accounts)
- User has `gl.account.update` permission

**Business Logic:**
```typescript
async function updateAccount(input) {
  const account = await db.chartOfAccounts.findByPk(input.accountId);
  
  if (!account) {
    throw new Error('Account not found');
  }
  
  if (account.isSystemAccount) {
    throw new Error('Cannot update system accounts');
  }
  
  // Can only update: name, category
  // Cannot update: code, type, normalBalance
  await db.chartOfAccounts.update({
    accountName: input.accountName,
    accountCategory: input.accountCategory,
    updatedAt: new Date(),
    updatedBy: input.updatedBy
  }, {
    where: { accountId: input.accountId }
  });
  
  await emitEvent('AccountUpdated', {
    accountId: input.accountId
  });
}
```

**Outcome:**
- Account name/category updated
- Event: `AccountUpdated`

---

### **3. DeactivateAccount**

**Triggered by:** Super Admin, Finance Admin

**Input:**
```json
{
  "accountId": "uuid",
  "deactivatedBy": "uuid"
}
```

**Preconditions:**
- Account exists and is active
- Account is not a system account
- Account has zero balance OR no transactions in open periods
- User has `gl.account.deactivate` permission

**Business Logic:**
```typescript
async function deactivateAccount(input) {
  const account = await db.chartOfAccounts.findByPk(input.accountId);
  
  if (!account || !account.isActive) {
    throw new Error('Account not found or already inactive');
  }
  
  if (account.isSystemAccount) {
    throw new Error('Cannot deactivate system accounts');
  }
  
  // Check balance
  if (Math.abs(account.currentBalance) > 0.01) {
    throw new Error('Cannot deactivate account with non-zero balance');
  }
  
  // Check for recent transactions (optional - business decision)
  const recentTransactions = await db.journalEntryLines.count({
    where: { accountId: input.accountId },
    include: [{
      model: db.journalEntries,
      where: { entryDate: { gte: getStartOfYear() } }
    }]
  });
  
  if (recentTransactions > 0) {
    throw new Error('Cannot deactivate account with transactions in current year');
  }
  
  await db.chartOfAccounts.update({
    isActive: false,
    updatedAt: new Date(),
    updatedBy: input.deactivatedBy
  }, {
    where: { accountId: input.accountId }
  });
  
  await emitEvent('AccountDeactivated', {
    accountId: input.accountId
  });
}
```

**Outcome:**
- Account deactivated (cannot be used in new entries)
- Event: `AccountDeactivated`

---

### **4. CreateJournalEntry**

**Triggered by:** Application services (not direct user action)

**Input:**
```json
{
  "entries": [
    {
      "accountCode": "1000",
      "debit": 1500,
      "credit": 0,
      "description": "Cash collected"
    },
    {
      "accountCode": "4100",
      "debit": 0,
      "credit": 500,
      "description": "Registration fee"
    },
    {
      "accountCode": "2100",
      "debit": 0,
      "credit": 1000,
      "description": "Advance deposit"
    }
  ],
  "reference": "Member Registration - MEM-2025-00001",
  "transactionDate": "2025-01-15",
  "sourceModule": "Membership",
  "sourceEntityId": "uuid",
  "sourceTransactionType": "RegistrationApproval",
  "createdBy": "uuid"
}
```

**Preconditions:**
- All account codes exist and are active
- Total debits = Total credits
- At least 2 lines
- All amounts > 0
- Transaction date not in future
- Transaction date not in closed fiscal period

**Business Logic:**
```typescript
async function createJournalEntry(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Validate balance
    const totalDebit = input.entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = input.entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Entry not balanced. Dr: ${totalDebit}, Cr: ${totalCredit}`);
    }
    
    if (input.entries.length < 2) {
      throw new Error('Entry must have at least 2 lines');
    }
    
    // 2. Validate all accounts exist and are active
    const accountCodes = input.entries.map(e => e.accountCode);
    const accounts = await trx.chartOfAccounts.findMany({
      where: { accountCode: { in: accountCodes } }
    });
    
    if (accounts.length !== accountCodes.length) {
      throw new Error('One or more account codes not found');
    }
    
    const accountMap = new Map(accounts.map(a => [a.accountCode, a]));
    
    for (const account of accounts) {
      if (!account.isActive) {
        throw new Error(`Account ${account.accountCode} is inactive`);
      }
    }
    
    // 3. Validate transaction date
    if (input.transactionDate > new Date()) {
      throw new Error('Transaction date cannot be in future');
    }
    
    // Check if period is closed
    const period = await trx.fiscalPeriods.findOne({
      where: {
        startDate: { lte: input.transactionDate },
        endDate: { gte: input.transactionDate }
      }
    });
    
    if (period && period.status === 'Closed') {
      throw new Error('Cannot post entries to closed fiscal period');
    }
    
    // 4. Validate each line
    for (const line of input.entries) {
      if ((line.debit || 0) > 0 && (line.credit || 0) > 0) {
        throw new Error('Line cannot have both debit and credit');
      }
      if ((line.debit || 0) === 0 && (line.credit || 0) === 0) {
        throw new Error('Line must have either debit or credit');
      }
      if ((line.debit || 0) < 0 || (line.credit || 0) < 0) {
        throw new Error('Amounts must be positive');
      }
    }
    
    // 5. Generate entry number
    const entryNumber = await generateEntryNumber(trx);
    
    // 6. Create journal entry
    const entry = await trx.journalEntries.create({
      entryId: generateUUID(),
      entryNumber,
      entryDate: input.transactionDate,
      postingDate: input.transactionDate,
      description: input.reference,
      reference: input.reference,
      sourceModule: input.sourceModule,
      sourceEntityId: input.sourceEntityId,
      sourceTransactionType: input.sourceTransactionType,
      entryStatus: 'Posted',
      totalDebit,
      totalCredit,
      isBalanced: true,
      createdAt: new Date(),
      createdBy: input.createdBy,
      postedAt: new Date(),
      postedBy: input.createdBy
    });
    
    // 7. Create entry lines
    let lineNumber = 1;
    for (const line of input.entries) {
      const account = accountMap.get(line.accountCode)!;
      
      await trx.journalEntryLines.create({
        lineId: generateUUID(),
        entryId: entry.entryId,
        lineNumber: lineNumber++,
        accountId: account.accountId,
        accountCode: account.accountCode,
        accountName: account.accountName,
        debitAmount: line.debit || 0,
        creditAmount: line.credit || 0,
        description: line.description,
        createdAt: new Date()
      });
    }
    
    // 8. Update account balances
    await updateAccountBalances(entry.entryId, trx);
    
    await emitEvent('JournalEntryPosted', {
      entryId: entry.entryId,
      entryNumber: entry.entryNumber,
      totalAmount: totalDebit,
      sourceModule: input.sourceModule
    });
    
    return entry;
  });
}

// Helper: Update account balances
async function updateAccountBalances(entryId: string, trx: any) {
  const lines = await trx.journalEntryLines.findMany({
    where: { entryId },
    include: { account: true }
  });
  
  for (const line of lines) {
    const account = line.account;
    let balanceChange = 0;
    
    if (account.normalBalance === 'Debit') {
      // Assets, Expenses: Debit increases, Credit decreases
      balanceChange = line.debitAmount - line.creditAmount;
    } else {
      // Liabilities, Equity, Revenue: Credit increases, Debit decreases
      balanceChange = line.creditAmount - line.debitAmount;
    }
    
    await trx.chartOfAccounts.update({
      where: { accountId: account.accountId },
      data: {
        currentBalance: { increment: balanceChange }
      }
    });
  }
}

// Helper: Generate entry number
async function generateEntryNumber(trx: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JE-${year}-`;
  
  const lastEntry = await trx.journalEntries.findFirst({
    where: { entryNumber: { startsWith: prefix } },
    orderBy: { entryNumber: 'desc' }
  });
  
  let sequence = 1;
  if (lastEntry) {
    const parts = lastEntry.entryNumber.split('-');
    sequence = parseInt(parts[2]) + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(5, '0')}`;
}
```

**Outcome:**
- Journal entry created with status "Posted"
- Entry lines created
- Account balances updated
- Event: `JournalEntryPosted`

---

### **5. ReverseJournalEntry** (Phase 2)

**Triggered by:** Super Admin, Finance Admin

**Input:**
```json
{
  "entryId": "uuid",
  "reversalReason": "Correction - duplicate entry",
  "reversedBy": "uuid"
}
```

**Preconditions:**
- Entry exists with status = "Posted"
- User has `gl.entry.reverse` permission
- Entry not already reversed

**Business Logic:**
```typescript
async function reverseJournalEntry(input) {
  return await db.transaction(async (trx) => {
    
    const originalEntry = await trx.journalEntries.findByPk(input.entryId, {
      include: [{ model: trx.journalEntryLines, as: 'lines' }]
    });
    
    if (!originalEntry || originalEntry.entryStatus !== 'Posted') {
      throw new Error('Invalid entry or already reversed');
    }
    
    if (originalEntry.reversedEntryId) {
      throw new Error('Entry already reversed');
    }
    
    // Create reversal entry with opposite signs
    const reversalLines = originalEntry.lines.map(line => ({
      accountCode: line.accountCode,
      debit: line.creditAmount, // Swap
      credit: line.debitAmount,  // Swap
      description: `Reversal: ${line.description}`
    }));
    
    const reversalEntry = await createJournalEntry({
      entries: reversalLines,
      reference: `Reversal of ${originalEntry.reference}`,
      transactionDate: new Date(),
      sourceModule: originalEntry.sourceModule,
      sourceEntityId: originalEntry.sourceEntityId,
      sourceTransactionType: 'Reversal',
      createdBy: input.reversedBy
    }, trx);
    
    // Mark original as reversed
    await trx.journalEntries.update({
      entryStatus: 'Reversed',
      reversedEntryId: reversalEntry.entryId,
      reversalReason: input.reversalReason,
      reversedAt: new Date(),
      reversedBy: input.reversedBy
    }, {
      where: { entryId: input.entryId }
    });
    
    await emitEvent('JournalEntryReversed', {
      originalEntryId: input.entryId,
      reversalEntryId: reversalEntry.entryId
    });
    
    return reversalEntry;
  });
}
```

**Outcome:**
- Original entry marked as "Reversed"
- New reversal entry created
- Account balances adjusted back
- Event: `JournalEntryReversed`

---

## **Queries**

### **1. GetAccountBalance**

**Input:**
```json
{
  "accountCode": "1000",
  "asOfDate": "2025-12-31"
}
```

**Business Logic:**
```typescript
async function getAccountBalance(accountCode: string, asOfDate?: Date) {
  const account = await db.chartOfAccounts.findOne({
    where: { accountCode }
  });
  
  if (!account) {
    throw new Error('Account not found');
  }
  
  const endDate = asOfDate || new Date();
  
  // Get all posted entries up to date
  const lines = await db.journalEntryLines.findAll({
    include: [{
      model: db.journalEntries,
      as: 'entry',
      where: {
        entryStatus: 'Posted',
        entryDate: { lte: endDate }
      }
    }],
    where: { accountId: account.accountId }
  });
  
  let balance = 0;
  
  for (const line of lines) {
    if (account.normalBalance === 'Debit') {
      balance += (line.debitAmount - line.creditAmount);
    } else {
      balance += (line.creditAmount - line.debitAmount);
    }
  }
  
  return {
    accountCode: account.accountCode,
    accountName: account.accountName,
    accountType: account.accountType,
    normalBalance: account.normalBalance,
    balance,
    asOfDate: endDate
  };
}
```

---

### **2. GenerateTrialBalance**

**Input:**
```json
{
  "asOfDate": "2025-12-31"
}
```

**Business Logic:**
```typescript
async function generateTrialBalance(asOfDate: Date) {
  const accounts = await db.chartOfAccounts.findAll({
    where: { isActive: true },
    order: [['accountCode', 'ASC']]
  });
  
  const trialBalance = [];
  let totalDebits = 0;
  let totalCredits = 0;
  
  for (const account of accounts) {
    const balanceData = await getAccountBalance(account.accountCode, asOfDate);
    
    const debit = account.normalBalance === 'Debit' && balanceData.balance > 0 
      ? balanceData.balance 
      : 0;
      
    const credit = account.normalBalance === 'Credit' && balanceData.balance > 0 
      ? balanceData.balance 
      : 0;
    
    trialBalance.push({
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      debit,
      credit
    });
    
    totalDebits += debit;
    totalCredits += credit;
  }
  
  return {
    asOfDate,
    accounts: trialBalance,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
  };
}
```

---

### **3. GenerateIncomeStatement**

**Input:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**Business Logic:**
```typescript
async function generateIncomeStatement(startDate: Date, endDate: Date) {
  // Get Revenue accounts
  const revenueAccounts = await db.chartOfAccounts.findAll({
    where: { accountType: 'Revenue', isActive: true }
  });
  
  const revenues = [];
  let totalRevenue = 0;
  
  for (const account of revenueAccounts) {
    const balance = await getAccountBalanceForPeriod(
      account.accountCode,
      startDate,
      endDate
    );
    
    revenues.push({
      accountCode: account.accountCode,
      accountName: account.accountName,
      amount: balance
    });
    
    totalRevenue += balance;
  }
  
  // Get Expense accounts
  const expenseAccounts = await db.chartOfAccounts.findAll({
    where: { accountType: 'Expense', isActive: true }
  });
  
  const expenses = [];
  let totalExpense = 0;
  
  for (const account of expenseAccounts) {
    const balance = await getAccountBalanceForPeriod(
      account.accountCode,
      startDate,
      endDate
    );
    
    expenses.push({
      accountCode: account.accountCode,
      accountName: account.accountName,
      amount: balance
    });
    
    totalExpense += balance;
  }
  
  const netIncome = totalRevenue - totalExpense;
  
  return {
    periodStart: startDate,
    periodEnd: endDate,
    revenues,
    totalRevenue,
    expenses,
    totalExpense,
    netIncome
  };
}
```

---

### **4. GenerateBalanceSheet**

**Input:**
```json
{
  "asOfDate": "2025-12-31"
}
```

**Business Logic:**
```typescript
async function generateBalanceSheet(asOfDate: Date) {
  // Get Assets
  const assetAccounts = await db.chartOfAccounts.findAll({
    where: { accountType: 'Asset', isActive: true }
  });
  
  const assets = [];
  let totalAssets = 0;
  
  for (const account of assetAccounts) {
    const balance = await getAccountBalance(account.accountCode, asOfDate);
    assets.push({
      accountCode: account.accountCode,
      accountName: account.accountName,
      amount: balance.balance
    });
    totalAssets += balance.balance;
  }
  
  // Get Liabilities
  const liabilityAccounts = await db.chartOfAccounts.findAll({
    where: { accountType: 'Liability', isActive: true }
  });
  
  const liabilities = [];
  let totalLiabilities = 0;
  
  for (const account of liabilityAccounts) {
    const balance = await getAccountBalance(account.accountCode, asOfDate);
    liabilities.push({
      accountCode: account.accountCode,
      accountName: account.accountName,
      amount: balance.balance
    });
    totalLiabilities += balance.balance;
  }
  
  // Calculate Retained Earnings (Revenue - Expenses)
  const incomeStatement = await generateIncomeStatement(
    new Date(asOfDate.getFullYear(), 0, 1), // Jan 1
    asOfDate
  );
  
  const retainedEarnings = incomeStatement.netIncome;
  
  const equity = [{
    accountCode: 'CALC',
    accountName: 'Retained Earnings (Calculated)',
    amount: retainedEarnings
  }];
  
  const totalEquity = retainedEarnings;
  
  return {
    asOfDate,
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    balances: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
  };
}
```

---

### **5. GetJournalEntryDetails**

**Input:**
```json
{
  "entryId": "uuid"
}
```

**Business Logic:**
```typescript
async function getJournalEntryDetails(entryId: string) {
  const entry = await db.journalEntries.findByPk(entryId, {
    include: [
      { 
        model: db.journalEntryLines, 
        as: 'lines',
        order: [['lineNumber', 'ASC']]
      },
      { model: db.users, as: 'creator' },
      { model: db.users, as: 'poster' }
    ]
  });
  
  if (!entry) {
    throw new Error('Journal entry not found');
  }
  
  return entry;
}
```

---

## **Events**

- `AccountCreated` - New account added
- `AccountUpdate` - Account details changed
- `AccountDeactivated` - Account deactivated
- `JournalEntryPosted` - New entry posted
- `JournalEntryReversed` - Entry reversed

---

## **Permissions**

```typescript
const GL_PERMISSIONS = [
  'gl.account.create',
  'gl.account.read',
  'gl.account.update',
  'gl.account.deactivate',
  'gl.entry.create', // System only
  'gl.entry.read',
  'gl.entry.reverse',
  'gl.reports.view'
];
```

---

## **Database Schema (Prisma)**

```prisma
model ChartOfAccount {
  accountId         String   @id @default(uuid())
  accountCode       String   @unique
  accountName       String
  accountType       String
  accountCategory   String?
  parentAccountId   String?
  accountLevel      Int      @default(1)
  normalBalance     String
  currentBalance    Decimal  @default(0) @db.Decimal(15, 2)
  isActive          Boolean  @default(true)
  isSystemAccount   Boolean  @default(false)
  createdAt         DateTime @default(now())
  createdBy         String
  updatedAt         DateTime @updatedAt
  updatedBy         String?

  parent            ChartOfAccount?  @relation("AccountHierarchy", fields: [parentAccountId], references: [accountId])
  children          ChartOfAccount[] @relation("AccountHierarchy")
  lines             JournalEntryLine[]

  @@index([accountCode])
  @@index([accountType])
  @@map("chart_of_accounts")
}

model JournalEntry {
  entryId               String   @id @default(uuid())
  entryNumber           String   @unique
  entryDate             DateTime
  postingDate           DateTime?
  description           String
  reference             String?
  sourceModule          String
  sourceEntityId        String?
  sourceTransactionType String
  entryStatus           String   @default("Posted")
  reversedEntryId       String?
  reversalReason        String?
  reversedAt            DateTime?
  reversedBy            String?
  totalDebit            Decimal  @db.Decimal(15, 2)
  totalCredit           Decimal  @db.Decimal(15, 2)
  isBalanced            Boolean
  createdAt             DateTime @default(now())
  createdBy             String
  postedAt              DateTime?
  postedBy              String?
  updatedAt             DateTime @updatedAt

  lines                 JournalEntryLine[]

  @@index([entryNumber])
  @@index([entryDate])
  @@index([entryStatus])
  @@index([sourceModule, sourceEntityId])
  @@map("journal_entries")
}

model JournalEntryLine {
  lineId        String   @id @default(uuid())
  entryId       String
  lineNumber    Int
  accountId     String
  accountCode   String
  accountName   String
  debitAmount   Decimal  @default(0) @db.Decimal(15, 2)
  creditAmount  Decimal  @default(0) @db.Decimal(15, 2)
  description   String
  createdAt     DateTime @default(now())

  entry         JournalEntry     @relation(fields: [entryId], references: [entryId])
  account       ChartOfAccount   @relation(fields: [accountId], references: [accountId])

  @@index([entryId])
  @@index([accountId])
  @@map("journal_entry_lines")
}

model FiscalPeriod {
  periodId     String   @id @default(uuid())
  fiscalYear   Int
  periodNumber Int
  periodName   String
  startDate    DateTime
  endDate      DateTime
  status       String   @default("Open")
  closedAt     DateTime?
  closedBy     String?
  createdAt    DateTime @default(now())

  @@unique([fiscalYear, periodNumber])
  @@index([fiscalYear, periodNumber])
  @@index([startDate, endDate])
  @@map("fiscal_periods")
}
```

---

## **Integration Points**

### **Where GL Service is Called:**

1. **Member Registration Approval** → Creates entry (Cash, Revenue, Liability)
2. **Wallet Deposit Approval** → Creates entry (Cash, Liability)
3. **Contribution from Wallet** → Creates entry (Liability, Revenue)
4. **Contribution Direct Cash** → Creates entry (Cash, Revenue)
5. **Death Benefit Payout** → Creates entry (Expense, Cash)
6. **Account Closure Refund** → Creates entry (Liability, Cash)
7. **Donation Received** → Creates entry (Cash/Bank, Revenue)
8. **Charitable Donation** → Creates entry (Expense, Bank)
9. **Operating Expenses** → Creates entry (Expense, Bank)

---

## **Considerations**

1. **Entry Balance Validation** - Ensure debits = credits always
2. **Account Balance Updates** - Verify correct increase/decrease based on normal balance
3. **Closed Period Validation** - Cannot post to closed periods
4. **System Account Protection** - Cannot delete/modify system accounts
5. **Reversal Logic** - Verify reversal entries correctly undo originals
6. **Trial Balance** - Always balances (total debits = total credits)
7. **Balance Sheet Equation** - Assets = Liabilities + Equity always

---
