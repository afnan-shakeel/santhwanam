# Member Wallet Context
## Core Principles

1. **Sub-Ledger**: Member wallets track individual balances (must reconcile with GL account 2100)
2. **Prepaid Balance**: Members can deposit money in advance for future contributions
3. **Approval Workflow**: Deposits require admin approval before crediting wallet
4. **Debit Requests**: For contributions, system creates debit request → agent gets member acknowledgment → wallet debited
5. **GL Integration**: Every wallet transaction creates corresponding GL entry (atomic)
6. **Cannot go negative**: Wallet balance must always be ≥ 0

---

## Domain Model

### **Entity: Wallet**

```javascript
Wallet {
  walletId: UUID
  memberId: UUID // One-to-one with Member
  
  currentBalance: decimal
  
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

### **Entity: WalletTransaction**

```javascript
WalletTransaction {
  transactionId: UUID
  walletId: UUID
  
  transactionType: enum [
    Deposit,              // Cash deposit by agent
    Debit,               // Deduction (for contributions)
    Refund,              // Refund on account closure
    Adjustment           // Manual correction
  ]
  
  amount: decimal
  balanceAfter: decimal // Snapshot of balance after transaction
  
  // Reference
  sourceModule: string // "Wallet", "Contributions"
  sourceEntityId: UUID? // depositRequestId, contributionId, etc.
  
  // Description
  description: string
  
  // Financial
  journalEntryId: UUID? // GL entry reference
  
  // Status
  status: enum [Pending, Completed, Failed, Reversed]
  
  // Audit
  createdBy: UUID
  createdAt: timestamp
}
```

---

### **Entity: WalletDepositRequest**

```javascript
WalletDepositRequest {
  depositRequestId: UUID
  memberId: UUID
  walletId: UUID
  
  amount: decimal
  collectionDate: date
  collectedBy: UUID // AgentId
  notes: string?
  
  // Status
  requestStatus: enum [Draft, PendingApproval, Approved, Rejected]
  
  // Approval
  approvalRequestId: UUID? // Links to approval_requests
  
  // Financial
  journalEntryId: UUID?
  
  // Timestamps
  createdAt: timestamp
  approvedAt: timestamp?
  rejectedAt: timestamp?
}
```

---

### **Entity: WalletDebitRequest** (for Contributions)

```javascript
WalletDebitRequest {
  debitRequestId: UUID
  memberId: UUID
  walletId: UUID
  
  amount: decimal
  purpose: string // "Contribution for Cycle CC-2025-00001"
  
  // References
  contributionCycleId: UUID?
  contributionId: UUID?
  
  // Status
  status: enum [
    PendingAcknowledgment,
    Acknowledged,
    Completed,
    Invalidated,
    Failed
  ]
  
  // Timestamps
  createdAt: timestamp
  acknowledgedAt: timestamp?
  completedAt: timestamp?
}
```

---

## Commands

### **1. CreateWallet** (System - during member approval)

**Triggered by:** Event listener after member activation

**Input:**
```json
{
  "memberId": "uuid",
  "initialBalance": "decimal"
}
```

**Backend Logic:**
```javascript
async function createWallet(input) {
  return await db.transaction(async (trx) => {
    
    // Check if wallet already exists
    const existing = await db.wallets.findOne({
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    if (existing) {
      return existing; // Idempotent
    }
    
    // Create wallet
    const wallet = await db.wallets.create({
      walletId: generateUUID(),
      memberId: input.memberId,
      currentBalance: input.initialBalance,
      createdAt: new Date()
    }, { transaction: trx });
    
    // Create initial transaction record
    if (input.initialBalance > 0) {
      await db.walletTransactions.create({
        transactionId: generateUUID(),
        walletId: wallet.walletId,
        transactionType: 'Deposit',
        amount: input.initialBalance,
        balanceAfter: input.initialBalance,
        sourceModule: 'Membership',
        description: 'Initial deposit from registration',
        status: 'Completed',
        createdBy: input.memberId,
        createdAt: new Date()
      }, { transaction: trx });
    }
    
    await emitEvent('WalletCreated', {
      walletId: wallet.walletId,
      memberId: input.memberId,
      initialBalance: input.initialBalance
    });
    
    return wallet;
  });
}
```

**Outcome:**
- Wallet created with initial balance
- Initial transaction recorded

---

### **2. RequestWalletDeposit**

**Triggered by:** Agent

**Input:**
```json
{
  "memberId": "uuid",
  "amount": "decimal",
  "collectionDate": "date",
  "collectedBy": "uuid",
  "notes": "string?"
}
```

**Preconditions:**
- Member exists with status = "Active"
- Agent is member's agent
- Amount > 0

**Backend Logic:**
```javascript
async function requestWalletDeposit(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member with wallet
    const member = await db.members.findByPk(input.memberId, {
      include: [{ model: db.wallets, as: 'wallet' }]
    }, { transaction: trx });
    
    if (!member || member.memberStatus !== 'Active') {
      throw new Error('Invalid member or not active');
    }
    
    if (!member.wallet) {
      throw new Error('Wallet not found');
    }
    
    // 2. Verify agent
    if (member.agentId !== input.collectedBy) {
      throw new Error('Only assigned agent can request deposit');
    }
    
    // 3. Validate amount
    if (input.amount <= 0) {
      throw new Error('Amount must be positive');
    }
    
    // 4. Create deposit request
    const depositRequest = await db.walletDepositRequests.create({
      depositRequestId: generateUUID(),
      memberId: input.memberId,
      walletId: member.wallet.walletId,
      amount: input.amount,
      collectionDate: input.collectionDate,
      collectedBy: input.collectedBy,
      notes: input.notes,
      requestStatus: 'Draft',
      createdAt: new Date()
    }, { transaction: trx });
    
    await emitEvent('WalletDepositRequested', {
      depositRequestId: depositRequest.depositRequestId,
      memberId: input.memberId,
      amount: input.amount
    });
    
    return depositRequest;
  });
}
```

**Outcome:**
- Deposit request created with status "Draft"

---

### **3. SubmitWalletDepositForApproval**

**Triggered by:** Agent

**Input:**
```json
{
  "depositRequestId": "uuid"
}
```

**Backend Logic:**
```javascript
async function submitWalletDepositForApproval(input) {
  return await db.transaction(async (trx) => {
    
    const depositRequest = await db.walletDepositRequests.findByPk(
      input.depositRequestId,
      { include: [{ model: db.members, as: 'member' }] },
      { transaction: trx }
    );
    
    if (!depositRequest || depositRequest.requestStatus !== 'Draft') {
      throw new Error('Invalid deposit request');
    }
    
    // Update status
    await db.walletDepositRequests.update({
      requestStatus: 'PendingApproval'
    }, {
      where: { depositRequestId: input.depositRequestId }
    }, { transaction: trx });
    
    // Create approval request
    const approvalRequest = await createApprovalRequest({
      workflowCode: 'wallet_deposit',
      entityType: 'WalletDepositRequest',
      entityId: input.depositRequestId,
      forumId: depositRequest.member.forumId,
      areaId: depositRequest.member.areaId,
      unitId: depositRequest.member.unitId,
      submittedBy: depositRequest.collectedBy
    }, trx);
    
    // Link approval
    await db.walletDepositRequests.update({
      approvalRequestId: approvalRequest.requestId
    }, {
      where: { depositRequestId: input.depositRequestId }
    }, { transaction: trx });
    
    await emitEvent('WalletDepositSubmitted', {
      depositRequestId: input.depositRequestId,
      approvalRequestId: approvalRequest.requestId
    });
    
    return depositRequest;
  });
}
```

**Outcome:**
- Status → "PendingApproval"
- Approval request created

---

### **4. Approval Event Listener**

```javascript
on('ApprovalRequestApproved', async (event) => {
  if (event.workflowCode === 'wallet_deposit') {
    await processWalletDepositApproval(
      event.entityId,
      event.finalApprovedBy
    );
  }
});

async function processWalletDepositApproval(depositRequestId, approvedBy) {
  return await db.transaction(async (trx) => {
    
    // 1. Get deposit request
    const depositRequest = await db.walletDepositRequests.findByPk(
      depositRequestId,
      { include: [{ model: db.wallets, as: 'wallet' }] },
      { transaction: trx }
    );
    
    // 2. Credit wallet
    await db.wallets.increment('currentBalance', {
      by: depositRequest.amount,
      where: { walletId: depositRequest.walletId }
    }, { transaction: trx });
    
    // 3. Get new balance
    const wallet = await db.wallets.findByPk(
      depositRequest.walletId,
      { transaction: trx }
    );
    
    // 4. Create GL entry
    const journalEntry = await glService.createJournalEntry({
      entries: [
        {
          accountCode: "1000", // Cash
          debit: depositRequest.amount,
          description: "Cash collected for wallet deposit"
        },
        {
          accountCode: "2100", // Member Wallet Liability
          credit: depositRequest.amount,
          description: "Member wallet balance increase"
        }
      ],
      reference: `Wallet Deposit - ${depositRequestId}`,
      transactionDate: depositRequest.collectionDate,
      sourceModule: "Wallet",
      sourceEntityId: depositRequestId,
      sourceTransactionType: "WalletDepositApproval",
      createdBy: approvedBy
    }, trx);
    
    // 5. Create wallet transaction
    await db.walletTransactions.create({
      transactionId: generateUUID(),
      walletId: depositRequest.walletId,
      transactionType: 'Deposit',
      amount: depositRequest.amount,
      balanceAfter: wallet.currentBalance,
      sourceModule: 'Wallet',
      sourceEntityId: depositRequestId,
      description: `Deposit approved by admin`,
      journalEntryId: journalEntry.entryId,
      status: 'Completed',
      createdBy: approvedBy,
      createdAt: new Date()
    }, { transaction: trx });
    
    // 6. Update deposit request
    await db.walletDepositRequests.update({
      requestStatus: 'Approved',
      approvedAt: new Date(),
      journalEntryId: journalEntry.entryId
    }, {
      where: { depositRequestId }
    }, { transaction: trx });
    
    await emitEvent('WalletDepositApproved', {
      depositRequestId,
      memberId: depositRequest.memberId,
      amount: depositRequest.amount,
      newBalance: wallet.currentBalance,
      approvedBy
    });
  });
}
```

**Outcome:**
- Wallet balance increased
- GL entry created (Dr Cash, Cr Liability)
- Transaction recorded
- Status → "Approved"

---

### **5. Rejection Event Listener**

```javascript
on('ApprovalRequestRejected', async (event) => {
  if (event.workflowCode === 'wallet_deposit') {
    await handleWalletDepositRejection(
      event.entityId,
      event.rejectionReason
    );
  }
});

async function handleWalletDepositRejection(depositRequestId, rejectionReason) {
  await db.walletDepositRequests.update({
    requestStatus: 'Rejected',
    rejectedAt: new Date()
  }, {
    where: { depositRequestId }
  });
  
  await emitEvent('WalletDepositRejected', {
    depositRequestId,
    rejectionReason
  });
}
```

---

### **6. CreateWalletDebitRequest** (System - for Contributions)

**Triggered by:** Contribution cycle start

**Input:**
```json
{
  "memberId": "uuid",
  "amount": "decimal",
  "purpose": "string",
  "contributionCycleId": "uuid",
  "contributionId": "uuid"
}
```

**Backend Logic:**
```javascript
async function createWalletDebitRequest(input) {
  return await db.transaction(async (trx) => {
    
    const wallet = await db.wallets.findOne({
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    // Only create if sufficient balance
    if (wallet.currentBalance < input.amount) {
      return null; // Agent will collect directly
    }
    
    const debitRequest = await db.walletDebitRequests.create({
      debitRequestId: generateUUID(),
      memberId: input.memberId,
      walletId: wallet.walletId,
      amount: input.amount,
      purpose: input.purpose,
      contributionCycleId: input.contributionCycleId,
      contributionId: input.contributionId,
      status: 'PendingAcknowledgment',
      createdAt: new Date()
    }, { transaction: trx });
    
    await emitEvent('WalletDebitRequestCreated', {
      debitRequestId: debitRequest.debitRequestId,
      memberId: input.memberId,
      amount: input.amount
    });
    
    return debitRequest;
  });
}
```

---

### **7. AcknowledgeWalletDebit**

**Triggered by:** Agent (on behalf of member)

**Input:**
```json
{
  "debitRequestId": "uuid",
  "acknowledgedBy": "uuid"
}
```

**Backend Logic:**
```javascript
async function acknowledgeWalletDebit(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get debit request
    const debitRequest = await db.walletDebitRequests.findByPk(
      input.debitRequestId,
      { include: [{ model: db.members, as: 'member' }] },
      { transaction: trx }
    );
    
    if (!debitRequest || debitRequest.status !== 'PendingAcknowledgment') {
      throw new Error('Invalid debit request');
    }
    
    // 2. Verify agent
    if (debitRequest.member.agentId !== input.acknowledgedBy) {
      throw new Error('Only assigned agent can acknowledge');
    }
    
    // 3. Get wallet
    const wallet = await db.wallets.findByPk(
      debitRequest.walletId,
      { transaction: trx }
    );
    
    // 4. Verify balance
    if (wallet.currentBalance < debitRequest.amount) {
      throw new Error('Insufficient wallet balance');
    }
    
    // 5. Debit wallet
    await db.wallets.decrement('currentBalance', {
      by: debitRequest.amount,
      where: { walletId: debitRequest.walletId }
    }, { transaction: trx });
    
    // 6. Get updated balance
    const updatedWallet = await db.wallets.findByPk(
      debitRequest.walletId,
      { transaction: trx }
    );
    
    // 7. Create GL entry
    const journalEntry = await glService.createJournalEntry({
      entries: [
        {
          accountCode: "2100", // Member Wallet Liability
          debit: debitRequest.amount,
          description: "Contribution deducted from wallet"
        },
        {
          accountCode: "4200", // Contribution Income
          credit: debitRequest.amount,
          description: `Contribution for ${debitRequest.purpose}`
        }
      ],
      reference: `Wallet Debit - Contribution ${debitRequest.contributionId}`,
      transactionDate: new Date(),
      sourceModule: "Contributions",
      sourceEntityId: debitRequest.contributionId,
      sourceTransactionType: "ContributionFromWallet",
      createdBy: input.acknowledgedBy
    }, trx);
    
    // 8. Create wallet transaction
    await db.walletTransactions.create({
      transactionId: generateUUID(),
      walletId: debitRequest.walletId,
      transactionType: 'Debit',
      amount: debitRequest.amount,
      balanceAfter: updatedWallet.currentBalance,
      sourceModule: 'Contributions',
      sourceEntityId: debitRequest.contributionId,
      description: debitRequest.purpose,
      journalEntryId: journalEntry.entryId,
      status: 'Completed',
      createdBy: input.acknowledgedBy,
      createdAt: new Date()
    }, { transaction: trx });
    
    // 9. Update debit request
    await db.walletDebitRequests.update({
      status: 'Completed',
      acknowledgedAt: new Date(),
      completedAt: new Date()
    }, {
      where: { debitRequestId: input.debitRequestId }
    }, { transaction: trx });
    
    await emitEvent('WalletDebitCompleted', {
      debitRequestId: input.debitRequestId,
      memberId: debitRequest.memberId,
      amount: debitRequest.amount,
      newBalance: updatedWallet.currentBalance
    });
    
    return debitRequest;
  });
}
```

**Outcome:**
- Wallet balance decreased
- GL entry created (Dr Liability, Cr Income)
- Transaction recorded
- Debit request → "Completed"

---

### **8. InvalidateWalletDebitRequest**

**Triggered by:** Agent (when member pays cash instead)

**Input:**
```json
{
  "debitRequestId": "uuid",
  "invalidatedBy": "uuid"
}
```

**Backend Logic:**
```javascript
async function invalidateWalletDebitRequest(input) {
  return await db.transaction(async (trx) => {
    
    const debitRequest = await db.walletDebitRequests.findByPk(
      input.debitRequestId,
      { transaction: trx }
    );
    
    if (!debitRequest) {
      throw new Error('Debit request not found');
    }
    
    if (!['PendingAcknowledgment', 'Acknowledged'].includes(debitRequest.status)) {
      throw new Error('Cannot invalidate request in this status');
    }
    
    await db.walletDebitRequests.update({
      status: 'Invalidated'
    }, {
      where: { debitRequestId: input.debitRequestId }
    }, { transaction: trx });
    
    await emitEvent('WalletDebitRequestInvalidated', {
      debitRequestId: input.debitRequestId
    });
    
    return debitRequest;
  });
}
```

---

### **9. GetWalletBalance**

```javascript
async function getWalletBalance(memberId, requestedBy) {
  const wallet = await db.wallets.findOne({
    where: { memberId },
    include: [{ model: db.members, as: 'member' }]
  });
  
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  
  const canView = await hasPermission(
    requestedBy,
    'wallet.balance.view',
    { unitId: wallet.member.unitId }
  ) || requestedBy === wallet.member.userId;
  
  if (!canView) {
    throw new Error('Not authorized');
  }
  
  return {
    walletId: wallet.walletId,
    memberId,
    currentBalance: wallet.currentBalance
  };
}
```

---

### **10. GetWalletTransactionHistory**

```javascript
async function getWalletTransactionHistory(memberId, filters) {
  // filters: { fromDate, toDate, page, limit, requestedBy }
  
  const wallet = await db.wallets.findOne({
    where: { memberId },
    include: [{ model: db.members, as: 'member' }]
  });
  
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  
  const canView = await hasPermission(
    filters.requestedBy,
    'wallet.balance.view',
    { unitId: wallet.member.unitId }
  ) || filters.requestedBy === wallet.member.userId;
  
  if (!canView) {
    throw new Error('Not authorized');
  }
  
  const where = { walletId: wallet.walletId };
  if (filters.fromDate) where.createdAt = { gte: filters.fromDate };
  if (filters.toDate) where.createdAt = { ...where.createdAt, lte: filters.toDate };
  
  const offset = (filters.page - 1) * filters.limit;
  
  const { count, rows } = await db.walletTransactions.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: filters.limit,
    offset
  });
  
  return {
    total: count,
    page: filters.page,
    limit: filters.limit,
    transactions: rows
  };
}
```

---

## Database Schema

```sql
CREATE TABLE wallets (
  wallet_id UUID PRIMARY KEY,
  member_id UUID UNIQUE NOT NULL REFERENCES members(member_id),
  current_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_balance_positive CHECK (current_balance >= 0)
);

CREATE TABLE wallet_transactions (
  transaction_id UUID PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES wallets(wallet_id),
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  source_module VARCHAR(50),
  source_entity_id UUID,
  description TEXT,
  journal_entry_id UUID REFERENCES journal_entries(entry_id),
  status VARCHAR(50) DEFAULT 'Completed',
  created_by UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet_deposit_requests (
  deposit_request_id UUID PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(member_id),
  wallet_id UUID NOT NULL REFERENCES wallets(wallet_id),
  amount DECIMAL(15,2) NOT NULL,
  collection_date DATE NOT NULL,
  collected_by UUID NOT NULL REFERENCES agents(agent_id),
  notes TEXT,
  request_status VARCHAR(50) DEFAULT 'Draft',
  approval_request_id UUID REFERENCES approval_requests(request_id),
  journal_entry_id UUID REFERENCES journal_entries(entry_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP
);

CREATE TABLE wallet_debit_requests (
  debit_request_id UUID PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(member_id),
  wallet_id UUID NOT NULL REFERENCES wallets(wallet_id),
  amount DECIMAL(15,2) NOT NULL,
  purpose TEXT NOT NULL,
  contribution_cycle_id UUID REFERENCES contribution_cycles(cycle_id),
  contribution_id UUID REFERENCES member_contributions(contribution_id),
  status VARCHAR(50) DEFAULT 'PendingAcknowledgment',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_wallets_member ON wallets(member_id);
CREATE INDEX idx_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_transactions_source ON wallet_transactions(source_module, source_entity_id);
CREATE INDEX idx_deposit_requests_member ON wallet_deposit_requests(member_id);
CREATE INDEX idx_deposit_requests_status ON wallet_deposit_requests(request_status);
CREATE INDEX idx_debit_requests_member ON wallet_debit_requests(member_id);
CREATE INDEX idx_debit_requests_contribution ON wallet_debit_requests(contribution_id);
```

---

## Events

- `WalletCreated`
- `WalletDepositRequested`
- `WalletDepositSubmitted`
- `WalletDepositApproved`
- `WalletDepositRejected`
- `WalletDebitRequestCreated`
- `WalletDebitCompleted`
- `WalletDebitRequestInvalidated`

---

## Commands Summary

1. `CreateWallet` (system)
2. `RequestWalletDeposit`
3. `SubmitWalletDepositForApproval`
4. `CreateWalletDebitRequest` (system)
5. `AcknowledgeWalletDebit`
6. `InvalidateWalletDebitRequest`
7. `GetWalletBalance`
8. `GetWalletTransactionHistory`

**Approval via generic workflow + event listeners**
