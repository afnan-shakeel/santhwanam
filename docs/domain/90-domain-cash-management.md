# Cash Management Module - Complete Specification

---

## Overview

The Cash Management module tracks the physical custody and transfer of cash collected by agents as it moves up the organizational hierarchy to the bank. This module provides:

1. **Cash Custody Tracking** - Who holds how much cash at any time
2. **Cash Handover System** - Recording transfers between personnel
3. **GL Integration** - Sub-accounts for cash at each custody level
4. **Approval Workflow** - Only for transfers to Super Admin (Central/Bank)
5. **Automatic Bank Deposit** - When Super Admin acknowledges

---

## Core Principles

1. **Chain of Custody** - Cash moves through hierarchy: Agent → Unit Admin → Area Admin → Forum Admin → Super Admin → Bank
2. **GL Sub-Accounts** - Separate accounts track cash at each custody level (1001-1004 under parent 1000)
3. **Sub-Ledger Reconciliation** - Individual custody balances must reconcile with GL sub-accounts
4. **Flexible Routing** - Agents can skip intermediate levels
5. **Audit Trail** - Complete history of all cash movements
6. **Auto Bank Deposit** - Cash automatically deposits to bank when Super Admin acknowledges
7. **Simple Acknowledgment** - All inter-level transfers require only acknowledgment (no approval workflow)
8. **Approval at Bank** - Only transfers to Super Admin (Central/Bank) require approval workflow

---

## Organizational Hierarchy Reference

```
Forum (Top Level)
  └── Area
        └── Unit
              └── Agent (collects cash from members)
```

**Cash Flow Direction:**
```
Agent → Unit Admin → Area Admin → Forum Admin → Super Admin → Bank
```

---

## Domain Model

### Entity: CashCustody

Tracks the current cash balance held by each user in the custody chain.

```typescript
CashCustody {
  custodyId: UUID
  
  // Owner
  userId: UUID
  userRole: enum [Agent, UnitAdmin, AreaAdmin, ForumAdmin]
  
  // GL Account Link
  glAccountCode: string  // "1001", "1002", "1003", "1004"
  
  // Hierarchy Scope
  unitId: UUID?      // For Agents and Unit Admins
  areaId: UUID?      // For Area Admins
  forumId: UUID?     // For Forum Admins
  
  // Status (for admin reassignment handling)
  status: enum [Active, Inactive, Suspended]
  
  // Balance
  currentBalance: decimal  // Must match GL sub-account for this user
  
  // Statistics
  totalReceived: decimal   // Lifetime cash received
  totalTransferred: decimal // Lifetime cash transferred out
  
  // Audit
  lastTransactionAt: timestamp?
  createdAt: timestamp
  updatedAt: timestamp
  
  // Deactivation tracking
  deactivatedAt: timestamp?
  deactivatedBy: UUID?
  deactivatedReason: string?
}
```

**Business Rules:**
- One CashCustody record per user who handles cash
- `currentBalance` must always be ≥ 0
- `currentBalance` = `totalReceived` - `totalTransferred`
- Sum of all custody balances for a `glAccountCode` must equal the GL account balance
- Created automatically when user first receives cash
- **Cannot reassign admin role if `currentBalance` > 0** (must transfer upward first)

**Status Meanings:**

| Status | Meaning | Can Receive? | Can Transfer? |
|--------|---------|--------------|---------------|
| Active | Currently holding cash | Yes | Yes |
| Inactive | No longer in role, balance = 0 | No | No |
| Suspended | Temporarily blocked (investigation) | No | No (forced only) |

---

### Entity: CashHandover

Records each transfer of cash between two people.

```typescript
CashHandover {
  handoverId: UUID
  handoverNumber: string  // Auto-generated: "CHO-2025-00001"
  
  // From (Initiator)
  fromUserId: UUID
  fromUserRole: enum [Agent, UnitAdmin, AreaAdmin, ForumAdmin]
  fromCustodyId: UUID
  fromGlAccountCode: string  // "1001" for Agent, etc.
  
  // To (Receiver)
  toUserId: UUID
  toUserRole: enum [UnitAdmin, AreaAdmin, ForumAdmin, SuperAdmin]
  toCustodyId: UUID?  // Null for SuperAdmin (goes to bank)
  toGlAccountCode: string  // "1002" for Unit Admin, "1100" for Bank
  
  // Amount
  amount: decimal
  
  // Hierarchy Context (for routing and reporting)
  unitId: UUID?
  areaId: UUID?
  forumId: UUID
  
  // Status
  status: enum [Initiated, Acknowledged, Rejected, Cancelled]
  
  // Handover Type
  handoverType: enum [Normal, AdminTransition]
  
  // Chain Tracking (optional - for manual traceability)
  sourceHandoverId: UUID?  // The handover this cash originated from
  
  // Approval (only for transfers to Super Admin)
  requiresApproval: boolean
  approvalRequestId: UUID?  // Links to approval_requests if required
  
  // GL Entry (created on acknowledgment)
  journalEntryId: UUID?
  
  // Timestamps
  initiatedAt: timestamp
  acknowledgedAt: timestamp?
  rejectedAt: timestamp?
  cancelledAt: timestamp?
  
  // Notes
  initiatorNotes: string?
  receiverNotes: string?
  
  // Rejection Details
  rejectionReason: string?
  
  // Audit
  createdBy: UUID
  updatedAt: timestamp
}
```

**Business Rules:**
- `handoverNumber` must be unique, auto-generated: CHO-YYYY-NNNNN
- `amount` must be > 0
- `amount` cannot exceed initiator's `currentBalance`
- Status transitions: Initiated → Acknowledged | Rejected | Cancelled
- Once Acknowledged, cannot be changed
- GL entry created only on Acknowledgment
- `requiresApproval` = true **only** when transferring to Super Admin (from any level)
- `sourceHandoverId` is optional - used for manual chain tracking if needed

---

### Entity: CashHandoverLineItem (Optional - for detailed tracking)

Links a handover to specific source transactions.

```typescript
CashHandoverLineItem {
  lineItemId: UUID
  handoverId: UUID
  
  // Source
  sourceType: enum [Contribution, WalletDeposit]
  sourceEntityId: UUID  // contributionId or depositRequestId
  
  // Amount
  amount: decimal
  
  // Reference
  referenceNumber: string  // Contribution cycle number, deposit request number
  memberCode: string
  memberName: string
  
  createdAt: timestamp
}
```

**Business Rules:**
- Optional - only created if detailed tracking is enabled
- Sum of line item amounts must equal handover amount
- Source entity must exist and be in valid state

---

## Chart of Accounts - Cash Custody Sub-Accounts

```typescript
const CASH_CUSTODY_ACCOUNTS = [
  {
    accountCode: "1000",
    accountName: "Cash",
    accountType: "Asset",
    accountCategory: "Current Assets",
    normalBalance: "Debit",
    isSystemAccount: true,
    parentAccountId: null,  // Parent/Summary account
    accountLevel: 1
  },
  {
    accountCode: "1001",
    accountName: "Cash - Agent Custody",
    accountType: "Asset",
    accountCategory: "Current Assets",
    normalBalance: "Debit",
    isSystemAccount: true,
    parentAccountId: "1000",  // Child of Cash
    accountLevel: 2
  },
  {
    accountCode: "1002",
    accountName: "Cash - Unit Admin Custody",
    accountType: "Asset",
    accountCategory: "Current Assets",
    normalBalance: "Debit",
    isSystemAccount: true,
    parentAccountId: "1000",
    accountLevel: 2
  },
  {
    accountCode: "1003",
    accountName: "Cash - Area Admin Custody",
    accountType: "Asset",
    accountCategory: "Current Assets",
    normalBalance: "Debit",
    isSystemAccount: true,
    parentAccountId: "1000",
    accountLevel: 2
  },
  {
    accountCode: "1004",
    accountName: "Cash - Forum Admin Custody",
    accountType: "Asset",
    accountCategory: "Current Assets",
    normalBalance: "Debit",
    isSystemAccount: true,
    parentAccountId: "1000",
    accountLevel: 2
  }
];
```

**Account Hierarchy:**
```
1000 - Cash (Parent/Summary)
  ├── 1001 - Cash - Agent Custody
  ├── 1002 - Cash - Unit Admin Custody
  ├── 1003 - Cash - Area Admin Custody
  └── 1004 - Cash - Forum Admin Custody

1100 - Bank Account (standalone - for final deposits)
```

**GL Account Mapping by Role:**

| User Role | GL Account Code | Account Name |
|-----------|-----------------|--------------|
| Agent | 1001 | Cash - Agent Custody |
| Unit Admin | 1002 | Cash - Unit Admin Custody |
| Area Admin | 1003 | Cash - Area Admin Custody |
| Forum Admin | 1004 | Cash - Forum Admin Custody |
| Bank (final) | 1100 | Bank Account |

---

## Approval Rules for Cash Handover

### Simplified Rule

| Transfer | Requires |
|----------|----------|
| Agent → Unit Admin | **Acknowledgment only** |
| Agent → Area Admin | **Acknowledgment only** |
| Agent → Forum Admin | **Acknowledgment only** |
| Unit Admin → Area Admin | **Acknowledgment only** |
| Unit Admin → Forum Admin | **Acknowledgment only** |
| Area Admin → Forum Admin | **Acknowledgment only** |
| **Anyone → Super Admin (Bank)** | **Approval workflow** |

**Logic:**
```typescript
function requiresApproval(toRole: string): boolean {
  // Only transfers to Super Admin (Central/Bank) require approval
  return toRole === 'SuperAdmin';
}
```

**Why this is secure:**
1. Every handover still requires receiver acknowledgment (two-party confirmation)
2. Receiver can reject if amount mismatch
3. Full audit trail exists at every level
4. The critical control (approval) is at the bank deposit step where it matters most
5. Cash custody sub-ledger provides reconciliation at every level

---

## Approval Workflow Configuration

```typescript
const CASH_HANDOVER_WORKFLOWS = [
  {
    workflowCode: "cash_handover_to_bank",
    workflowName: "Cash Handover to Central (Bank Deposit)",
    module: "CashManagement",
    entityType: "CashHandover",
    description: "Approval required for cash transfer to Super Admin for bank deposit",
    requiresAllStages: true,
    stages: [
      {
        stageName: "Super Admin Approval",
        stageOrder: 1,
        approverType: "Role",
        roleCode: "SuperAdmin",
        isOptional: false,
        autoApprove: false
      }
    ]
  }
];
```

---

## Commands

### 1. GetOrCreateCashCustody (System)

**Triggered by:** System when user first handles cash

**Input:**
```json
{
  "userId": "uuid",
  "userRole": "Agent|UnitAdmin|AreaAdmin|ForumAdmin",
  "unitId": "uuid?",
  "areaId": "uuid?",
  "forumId": "uuid"
}
```

**Backend Logic:**
```typescript
async function getOrCreateCashCustody(input) {
  return await db.transaction(async (trx) => {
    
    // Check if custody record exists
    let custody = await db.cashCustodies.findOne({
      where: { userId: input.userId, status: 'Active' }
    }, { transaction: trx });
    
    if (custody) {
      return custody;
    }
    
    // Determine GL account code based on role
    const glAccountCode = getGlAccountCodeForRole(input.userRole);
    
    // Create new custody record
    custody = await db.cashCustodies.create({
      custodyId: generateUUID(),
      userId: input.userId,
      userRole: input.userRole,
      glAccountCode,
      unitId: input.unitId,
      areaId: input.areaId,
      forumId: input.forumId,
      status: 'Active',
      currentBalance: 0,
      totalReceived: 0,
      totalTransferred: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { transaction: trx });
    
    await emitEvent('CashCustodyCreated', {
      custodyId: custody.custodyId,
      userId: input.userId,
      userRole: input.userRole
    });
    
    return custody;
  });
}

function getGlAccountCodeForRole(role: string): string {
  const mapping = {
    'Agent': '1001',
    'UnitAdmin': '1002',
    'AreaAdmin': '1003',
    'ForumAdmin': '1004'
  };
  return mapping[role];
}
```

---

### 2. IncreaseCashCustody (System)

**Triggered by:** When cash is collected (contribution or wallet deposit)

**Input:**
```json
{
  "userId": "uuid",
  "amount": "decimal",
  "sourceModule": "Contributions|Wallets",
  "sourceEntityId": "uuid",
  "sourceTransactionType": "string"
}
```

**Backend Logic:**
```typescript
async function increaseCashCustody(input, trx) {
  // Get or create custody record
  const custody = await getOrCreateCashCustody({
    userId: input.userId,
    // ... other fields resolved from user context
  });
  
  // Verify custody is active
  if (custody.status !== 'Active') {
    throw new Error('Cash custody is not active');
  }
  
  // Update custody balance
  await db.cashCustodies.update({
    currentBalance: db.literal(`current_balance + ${input.amount}`),
    totalReceived: db.literal(`total_received + ${input.amount}`),
    lastTransactionAt: new Date(),
    updatedAt: new Date()
  }, {
    where: { custodyId: custody.custodyId }
  }, { transaction: trx });
  
  await emitEvent('CashCustodyIncreased', {
    custodyId: custody.custodyId,
    userId: input.userId,
    amount: input.amount,
    sourceModule: input.sourceModule,
    sourceEntityId: input.sourceEntityId
  });
}
```

---

### 3. InitiateCashHandover

**Triggered by:** Agent or Admin initiating cash transfer

**Input:**
```json
{
  "fromUserId": "uuid",
  "toUserId": "uuid",
  "amount": "decimal",
  "initiatorNotes": "string?",
  "sourceHandoverId": "uuid?",
  "handoverType": "Normal|AdminTransition",
  "lineItems": [
    {
      "sourceType": "Contribution|WalletDeposit",
      "sourceEntityId": "uuid",
      "amount": "decimal"
    }
  ]
}
```

**Preconditions:**
- From user has active cash custody record
- From user's custody balance >= amount
- To user is valid receiver based on hierarchy
- Amount > 0

**Backend Logic:**
```typescript
async function initiateCashHandover(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get from user's custody
    const fromCustody = await db.cashCustodies.findOne({
      where: { userId: input.fromUserId, status: 'Active' }
    }, { transaction: trx });
    
    if (!fromCustody) {
      throw new Error('No active cash custody record found');
    }
    
    // 2. Validate amount
    if (input.amount <= 0) {
      throw new Error('Amount must be positive');
    }
    
    if (input.amount > fromCustody.currentBalance) {
      throw new Error('Insufficient cash custody balance');
    }
    
    // 3. Get to user details
    const toUser = await db.users.findByPk(input.toUserId, {
      include: ['roles']
    }, { transaction: trx });
    
    if (!toUser) {
      throw new Error('Receiver not found');
    }
    
    const toUserRole = determineUserCashRole(toUser);
    
    // 4. Validate transfer path
    validateTransferPath(fromCustody.userRole, toUserRole);
    
    // 5. Determine if approval required (only for Super Admin)
    const needsApproval = toUserRole === 'SuperAdmin';
    
    // 6. Get or create receiver's custody (if not Super Admin)
    let toCustody = null;
    let toGlAccountCode = '1100'; // Bank for Super Admin
    
    if (toUserRole !== 'SuperAdmin') {
      toCustody = await getOrCreateCashCustody({
        userId: input.toUserId,
        userRole: toUserRole,
        unitId: toUser.unitId,
        areaId: toUser.areaId,
        forumId: toUser.forumId
      });
      toGlAccountCode = toCustody.glAccountCode;
    }
    
    // 7. Generate handover number
    const handoverNumber = await generateHandoverNumber(trx);
    
    // 8. Create handover record
    const handover = await db.cashHandovers.create({
      handoverId: generateUUID(),
      handoverNumber,
      fromUserId: input.fromUserId,
      fromUserRole: fromCustody.userRole,
      fromCustodyId: fromCustody.custodyId,
      fromGlAccountCode: fromCustody.glAccountCode,
      toUserId: input.toUserId,
      toUserRole,
      toCustodyId: toCustody?.custodyId,
      toGlAccountCode,
      amount: input.amount,
      unitId: fromCustody.unitId,
      areaId: fromCustody.areaId,
      forumId: fromCustody.forumId,
      status: 'Initiated',
      handoverType: input.handoverType || 'Normal',
      sourceHandoverId: input.sourceHandoverId,
      requiresApproval: needsApproval,
      initiatedAt: new Date(),
      initiatorNotes: input.initiatorNotes,
      createdBy: input.fromUserId,
      updatedAt: new Date()
    }, { transaction: trx });
    
    // 9. Create line items if provided
    if (input.lineItems && input.lineItems.length > 0) {
      for (const item of input.lineItems) {
        await db.cashHandoverLineItems.create({
          lineItemId: generateUUID(),
          handoverId: handover.handoverId,
          sourceType: item.sourceType,
          sourceEntityId: item.sourceEntityId,
          amount: item.amount,
          createdAt: new Date()
        }, { transaction: trx });
      }
    }
    
    // 10. If approval required (Super Admin only), create approval request
    if (needsApproval) {
      const approvalRequest = await createApprovalRequest({
        workflowCode: 'cash_handover_to_bank',
        entityType: 'CashHandover',
        entityId: handover.handoverId,
        forumId: fromCustody.forumId,
        areaId: fromCustody.areaId,
        unitId: fromCustody.unitId,
        requestedBy: input.fromUserId
      }, trx);
      
      await db.cashHandovers.update({
        approvalRequestId: approvalRequest.requestId
      }, {
        where: { handoverId: handover.handoverId }
      }, { transaction: trx });
    }
    
    // 11. Emit event
    await emitEvent('CashHandoverInitiated', {
      handoverId: handover.handoverId,
      handoverNumber: handover.handoverNumber,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      amount: input.amount,
      requiresApproval: needsApproval
    });
    
    // 12. Notify receiver (if no approval needed)
    if (!needsApproval) {
      await notifyUser(input.toUserId, 'CashHandoverPending', {
        handoverId: handover.handoverId,
        amount: input.amount,
        fromUserName: await getUserName(input.fromUserId)
      });
    }
    
    return handover;
  });
}

function validateTransferPath(fromRole: string, toRole: string): void {
  const validPaths = {
    'Agent': ['UnitAdmin', 'AreaAdmin', 'ForumAdmin', 'SuperAdmin'],
    'UnitAdmin': ['AreaAdmin', 'ForumAdmin', 'SuperAdmin'],
    'AreaAdmin': ['ForumAdmin', 'SuperAdmin'],
    'ForumAdmin': ['SuperAdmin']
  };
  
  if (!validPaths[fromRole]?.includes(toRole)) {
    throw new Error(`Invalid transfer path: ${fromRole} cannot transfer to ${toRole}`);
  }
}
```

**Outcome:**
- Handover record created with status "Initiated"
- Line items created (if provided)
- Approval request created (only if transferring to Super Admin)
- Receiver notified (if no approval needed)

---

### 4. AcknowledgeCashHandover

**Triggered by:** Receiver acknowledging cash receipt

**Input:**
```json
{
  "handoverId": "uuid",
  "acknowledgedBy": "uuid",
  "receiverNotes": "string?"
}
```

**Preconditions:**
- Handover exists with status "Initiated"
- Acknowledger is the designated receiver
- If approval required, approval must be granted first

**Backend Logic:**
```typescript
async function acknowledgeCashHandover(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get handover with related data
    const handover = await db.cashHandovers.findByPk(input.handoverId, {
      include: [
        { model: db.cashCustodies, as: 'fromCustody' },
        { model: db.cashCustodies, as: 'toCustody' }
      ]
    }, { transaction: trx });
    
    if (!handover) {
      throw new Error('Handover not found');
    }
    
    if (handover.status !== 'Initiated') {
      throw new Error('Handover is not in Initiated status');
    }
    
    // 2. Verify acknowledger is the receiver
    if (handover.toUserRole === 'SuperAdmin') {
      // For Super Admin, verify role instead of specific user
      const isSuperAdmin = await hasRole(input.acknowledgedBy, 'SuperAdmin');
      if (!isSuperAdmin) {
        throw new Error('Only Super Admin can acknowledge this handover');
      }
    } else {
      if (handover.toUserId !== input.acknowledgedBy) {
        throw new Error('Only the designated receiver can acknowledge');
      }
    }
    
    // 3. If approval required, verify approval granted
    if (handover.requiresApproval) {
      const approvalRequest = await db.approvalRequests.findByPk(
        handover.approvalRequestId,
        { transaction: trx }
      );
      
      if (!approvalRequest || approvalRequest.status !== 'Approved') {
        throw new Error('Approval required before acknowledgment');
      }
    }
    
    // 4. Verify from custody still has sufficient balance
    const fromCustody = await db.cashCustodies.findByPk(
      handover.fromCustodyId,
      { transaction: trx }
    );
    
    if (fromCustody.currentBalance < handover.amount) {
      throw new Error('Insufficient balance in source custody');
    }
    
    // 5. Create GL entry
    const journalEntry = await glService.createJournalEntry({
      entries: [
        {
          accountCode: handover.toGlAccountCode,
          debit: handover.amount,
          description: `Cash received from ${handover.fromUserRole} - ${handover.handoverNumber}`
        },
        {
          accountCode: handover.fromGlAccountCode,
          credit: handover.amount,
          description: `Cash transferred to ${handover.toUserRole} - ${handover.handoverNumber}`
        }
      ],
      reference: `Cash Handover - ${handover.handoverNumber}`,
      transactionDate: new Date(),
      sourceModule: 'CashManagement',
      sourceEntityId: handover.handoverId,
      sourceTransactionType: handover.toUserRole === 'SuperAdmin' ? 'CashHandoverToBank' : 'CashHandover',
      createdBy: input.acknowledgedBy
    }, trx);
    
    // 6. Update from custody (decrease)
    await db.cashCustodies.update({
      currentBalance: db.literal(`current_balance - ${handover.amount}`),
      totalTransferred: db.literal(`total_transferred + ${handover.amount}`),
      lastTransactionAt: new Date(),
      updatedAt: new Date()
    }, {
      where: { custodyId: handover.fromCustodyId }
    }, { transaction: trx });
    
    // 7. Update to custody (increase) - if not Super Admin
    if (handover.toCustodyId) {
      await db.cashCustodies.update({
        currentBalance: db.literal(`current_balance + ${handover.amount}`),
        totalReceived: db.literal(`total_received + ${handover.amount}`),
        lastTransactionAt: new Date(),
        updatedAt: new Date()
      }, {
        where: { custodyId: handover.toCustodyId }
      }, { transaction: trx });
    }
    
    // 8. Update handover status
    await db.cashHandovers.update({
      status: 'Acknowledged',
      acknowledgedAt: new Date(),
      receiverNotes: input.receiverNotes,
      journalEntryId: journalEntry.entryId,
      updatedAt: new Date()
    }, {
      where: { handoverId: input.handoverId }
    }, { transaction: trx });
    
    // 9. Emit event
    const eventName = handover.toUserRole === 'SuperAdmin' 
      ? 'CashDepositedToBank' 
      : 'CashHandoverAcknowledged';
      
    await emitEvent(eventName, {
      handoverId: handover.handoverId,
      handoverNumber: handover.handoverNumber,
      fromUserId: handover.fromUserId,
      toUserId: handover.toUserId,
      amount: handover.amount,
      journalEntryId: journalEntry.entryId
    });
    
    // 10. Notify initiator
    await notifyUser(handover.fromUserId, 'CashHandoverCompleted', {
      handoverId: handover.handoverId,
      amount: handover.amount
    });
    
    return handover;
  });
}
```

**Outcome:**
- GL entry created (Dr To-Account, Cr From-Account)
- From custody balance decreased
- To custody balance increased (if not Super Admin)
- Handover status → "Acknowledged"
- Initiator notified

---

### 5. RejectCashHandover

**Triggered by:** Receiver rejecting the handover (amount mismatch, etc.)

**Input:**
```json
{
  "handoverId": "uuid",
  "rejectedBy": "uuid",
  "rejectionReason": "string"
}
```

**Backend Logic:**
```typescript
async function rejectCashHandover(input) {
  return await db.transaction(async (trx) => {
    
    const handover = await db.cashHandovers.findByPk(input.handoverId, {
      transaction: trx
    });
    
    if (!handover) {
      throw new Error('Handover not found');
    }
    
    if (handover.status !== 'Initiated') {
      throw new Error('Can only reject handovers in Initiated status');
    }
    
    // Verify rejecter is the receiver (or Super Admin for SuperAdmin transfers)
    if (handover.toUserRole === 'SuperAdmin') {
      const isSuperAdmin = await hasRole(input.rejectedBy, 'SuperAdmin');
      if (!isSuperAdmin) {
        throw new Error('Only Super Admin can reject this handover');
      }
    } else {
      if (handover.toUserId !== input.rejectedBy) {
        throw new Error('Only the designated receiver can reject');
      }
    }
    
    // Update handover
    await db.cashHandovers.update({
      status: 'Rejected',
      rejectedAt: new Date(),
      rejectionReason: input.rejectionReason,
      updatedAt: new Date()
    }, {
      where: { handoverId: input.handoverId }
    }, { transaction: trx });
    
    // Emit event
    await emitEvent('CashHandoverRejected', {
      handoverId: handover.handoverId,
      handoverNumber: handover.handoverNumber,
      rejectedBy: input.rejectedBy,
      rejectionReason: input.rejectionReason
    });
    
    // Notify initiator - must re-submit with correct amount
    await notifyUser(handover.fromUserId, 'CashHandoverRejected', {
      handoverId: handover.handoverId,
      rejectionReason: input.rejectionReason
    });
    
    return handover;
  });
}
```

**Outcome:**
- Handover status → "Rejected"
- No GL entry (cash stays with initiator)
- Initiator notified to re-submit with correct amount

---

### 6. CancelCashHandover

**Triggered by:** Initiator cancelling before acknowledgment

**Input:**
```json
{
  "handoverId": "uuid",
  "cancelledBy": "uuid"
}
```

**Backend Logic:**
```typescript
async function cancelCashHandover(input) {
  return await db.transaction(async (trx) => {
    
    const handover = await db.cashHandovers.findByPk(input.handoverId, {
      transaction: trx
    });
    
    if (!handover) {
      throw new Error('Handover not found');
    }
    
    if (handover.status !== 'Initiated') {
      throw new Error('Can only cancel handovers in Initiated status');
    }
    
    // Verify canceller is the initiator
    if (handover.fromUserId !== input.cancelledBy) {
      throw new Error('Only the initiator can cancel');
    }
    
    // Update handover
    await db.cashHandovers.update({
      status: 'Cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date()
    }, {
      where: { handoverId: input.handoverId }
    }, { transaction: trx });
    
    // Cancel approval request if exists
    if (handover.approvalRequestId) {
      await db.approvalRequests.update({
        status: 'Cancelled'
      }, {
        where: { requestId: handover.approvalRequestId }
      }, { transaction: trx });
    }
    
    // Emit event
    await emitEvent('CashHandoverCancelled', {
      handoverId: handover.handoverId,
      handoverNumber: handover.handoverNumber
    });
    
    return handover;
  });
}
```

**Outcome:**
- Handover status → "Cancelled"
- Approval request cancelled (if exists)
- No GL entry

---

### 7. DeactivateCashCustody (For Admin Reassignment)

**Triggered by:** System when admin is being reassigned

**Input:**
```json
{
  "userId": "uuid",
  "reason": "string",
  "deactivatedBy": "uuid"
}
```

**Backend Logic:**
```typescript
async function deactivateCashCustody(input) {
  return await db.transaction(async (trx) => {
    
    const custody = await db.cashCustodies.findOne({
      where: { userId: input.userId, status: 'Active' }
    }, { transaction: trx });
    
    if (!custody) {
      throw new Error('No active custody record found');
    }
    
    // CRITICAL: Cannot deactivate if balance > 0
    if (custody.currentBalance > 0) {
      throw new Error(
        `Cannot deactivate custody. User has ${custody.currentBalance} in custody. ` +
        `Cash must be transferred upward before reassignment.`
      );
    }
    
    // Check for pending incoming handovers
    const pendingIncoming = await db.cashHandovers.count({
      where: { 
        toUserId: input.userId, 
        status: 'Initiated' 
      }
    }, { transaction: trx });
    
    if (pendingIncoming > 0) {
      throw new Error(
        `Cannot deactivate custody. User has ${pendingIncoming} pending incoming handovers. ` +
        `Must acknowledge or reject before reassignment.`
      );
    }
    
    // Deactivate custody
    await db.cashCustodies.update({
      status: 'Inactive',
      deactivatedAt: new Date(),
      deactivatedBy: input.deactivatedBy,
      deactivatedReason: input.reason,
      updatedAt: new Date()
    }, {
      where: { custodyId: custody.custodyId }
    }, { transaction: trx });
    
    await emitEvent('CashCustodyDeactivated', {
      custodyId: custody.custodyId,
      userId: input.userId,
      reason: input.reason
    });
    
    return custody;
  });
}
```

---

## Admin Reassignment Workflow

When a Unit/Area/Forum Admin needs to be reassigned:

```
1. System detects admin reassignment request
   
2. Check current admin's custody status:
   ├─ Balance = 0 AND no pending handovers → Proceed to step 5
   └─ Balance > 0 OR pending handovers → Block reassignment
   
3. If blocked, admin must:
   ├─ Acknowledge/reject any pending incoming handovers
   └─ Transfer all cash UPWARD (to their superior in hierarchy)
   
4. Once balance = 0 and no pending handovers:
   └─ Reassignment can proceed
   
5. System:
   ├─ Deactivates old admin's custody (status = Inactive)
   └─ Completes admin reassignment
   
6. New admin will get custody created automatically when they first receive cash
```

**Key Rule:** Cash must be transferred **upward** (not to the replacement), keeping it simple and avoiding chicken-and-egg problems.

---

## Database Schema

```sql
-- Cash Custody Table
CREATE TABLE cash_custodies (
  custody_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  user_role VARCHAR(50) NOT NULL,
  gl_account_code VARCHAR(10) NOT NULL,
  unit_id UUID REFERENCES units(unit_id),
  area_id UUID REFERENCES areas(area_id),
  forum_id UUID REFERENCES forums(forum_id),
  status VARCHAR(20) DEFAULT 'Active',
  current_balance DECIMAL(15,2) DEFAULT 0,
  total_received DECIMAL(15,2) DEFAULT 0,
  total_transferred DECIMAL(15,2) DEFAULT 0,
  last_transaction_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP,
  deactivated_by UUID REFERENCES users(user_id),
  deactivated_reason TEXT,
  
  CONSTRAINT chk_balance_positive CHECK (current_balance >= 0),
  CONSTRAINT chk_status CHECK (status IN ('Active', 'Inactive', 'Suspended'))
);

-- Cash Handover Table
CREATE TABLE cash_handovers (
  handover_id UUID PRIMARY KEY,
  handover_number VARCHAR(20) UNIQUE NOT NULL,
  from_user_id UUID NOT NULL REFERENCES users(user_id),
  from_user_role VARCHAR(50) NOT NULL,
  from_custody_id UUID NOT NULL REFERENCES cash_custodies(custody_id),
  from_gl_account_code VARCHAR(10) NOT NULL,
  to_user_id UUID NOT NULL REFERENCES users(user_id),
  to_user_role VARCHAR(50) NOT NULL,
  to_custody_id UUID REFERENCES cash_custodies(custody_id),
  to_gl_account_code VARCHAR(10) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  unit_id UUID REFERENCES units(unit_id),
  area_id UUID REFERENCES areas(area_id),
  forum_id UUID NOT NULL REFERENCES forums(forum_id),
  status VARCHAR(50) DEFAULT 'Initiated',
  handover_type VARCHAR(20) DEFAULT 'Normal',
  source_handover_id UUID REFERENCES cash_handovers(handover_id),
  requires_approval BOOLEAN DEFAULT FALSE,
  approval_request_id UUID REFERENCES approval_requests(request_id),
  journal_entry_id UUID REFERENCES journal_entries(entry_id),
  initiated_at TIMESTAMP NOT NULL,
  acknowledged_at TIMESTAMP,
  rejected_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  initiator_notes TEXT,
  receiver_notes TEXT,
  rejection_reason TEXT,
  created_by UUID NOT NULL REFERENCES users(user_id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_status_valid CHECK (status IN ('Initiated', 'Acknowledged', 'Rejected', 'Cancelled')),
  CONSTRAINT chk_handover_type CHECK (handover_type IN ('Normal', 'AdminTransition'))
);

-- Cash Handover Line Items (Optional)
CREATE TABLE cash_handover_line_items (
  line_item_id UUID PRIMARY KEY,
  handover_id UUID NOT NULL REFERENCES cash_handovers(handover_id),
  source_type VARCHAR(50) NOT NULL,
  source_entity_id UUID NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  reference_number VARCHAR(50),
  member_code VARCHAR(50),
  member_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_source_type CHECK (source_type IN ('Contribution', 'WalletDeposit'))
);

-- Indexes
CREATE INDEX idx_custody_user ON cash_custodies(user_id);
CREATE INDEX idx_custody_status ON cash_custodies(status);
CREATE INDEX idx_custody_forum ON cash_custodies(forum_id);
CREATE INDEX idx_custody_gl_account ON cash_custodies(gl_account_code);

CREATE INDEX idx_handover_from_user ON cash_handovers(from_user_id);
CREATE INDEX idx_handover_to_user ON cash_handovers(to_user_id);
CREATE INDEX idx_handover_status ON cash_handovers(status);
CREATE INDEX idx_handover_forum ON cash_handovers(forum_id);
CREATE INDEX idx_handover_initiated ON cash_handovers(initiated_at);
CREATE INDEX idx_handover_source ON cash_handovers(source_handover_id);

CREATE INDEX idx_line_items_handover ON cash_handover_line_items(handover_id);
CREATE INDEX idx_line_items_source ON cash_handover_line_items(source_type, source_entity_id);
```

---

## Prisma Schema

```prisma
model CashCustody {
  custodyId          String    @id @default(uuid())
  userId             String
  userRole           String
  glAccountCode      String
  unitId             String?
  areaId             String?
  forumId            String?
  status             String    @default("Active")
  currentBalance     Decimal   @default(0) @db.Decimal(15, 2)
  totalReceived      Decimal   @default(0) @db.Decimal(15, 2)
  totalTransferred   Decimal   @default(0) @db.Decimal(15, 2)
  lastTransactionAt  DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deactivatedAt      DateTime?
  deactivatedBy      String?
  deactivatedReason  String?

  user               User      @relation(fields: [userId], references: [userId])
  unit               Unit?     @relation(fields: [unitId], references: [unitId])
  area               Area?     @relation(fields: [areaId], references: [areaId])
  forum              Forum?    @relation(fields: [forumId], references: [forumId])
  deactivatedByUser  User?     @relation("DeactivatedBy", fields: [deactivatedBy], references: [userId])
  
  handoversFrom      CashHandover[] @relation("FromCustody")
  handoversTo        CashHandover[] @relation("ToCustody")

  @@index([userId])
  @@index([status])
  @@index([forumId])
  @@index([glAccountCode])
  @@map("cash_custodies")
}

model CashHandover {
  handoverId         String    @id @default(uuid())
  handoverNumber     String    @unique
  fromUserId         String
  fromUserRole       String
  fromCustodyId      String
  fromGlAccountCode  String
  toUserId           String
  toUserRole         String
  toCustodyId        String?
  toGlAccountCode    String
  amount             Decimal   @db.Decimal(15, 2)
  unitId             String?
  areaId             String?
  forumId            String
  status             String    @default("Initiated")
  handoverType       String    @default("Normal")
  sourceHandoverId   String?
  requiresApproval   Boolean   @default(false)
  approvalRequestId  String?
  journalEntryId     String?
  initiatedAt        DateTime
  acknowledgedAt     DateTime?
  rejectedAt         DateTime?
  cancelledAt        DateTime?
  initiatorNotes     String?
  receiverNotes      String?
  rejectionReason    String?
  createdBy          String
  updatedAt          DateTime  @updatedAt

  fromUser           User           @relation("HandoverFromUser", fields: [fromUserId], references: [userId])
  toUser             User           @relation("HandoverToUser", fields: [toUserId], references: [userId])
  fromCustody        CashCustody    @relation("FromCustody", fields: [fromCustodyId], references: [custodyId])
  toCustody          CashCustody?   @relation("ToCustody", fields: [toCustodyId], references: [custodyId])
  sourceHandover     CashHandover?  @relation("HandoverChain", fields: [sourceHandoverId], references: [handoverId])
  childHandovers     CashHandover[] @relation("HandoverChain")
  forum              Forum          @relation(fields: [forumId], references: [forumId])
  approvalRequest    ApprovalRequest? @relation(fields: [approvalRequestId], references: [requestId])
  journalEntry       JournalEntry?  @relation(fields: [journalEntryId], references: [entryId])
  lineItems          CashHandoverLineItem[]

  @@index([fromUserId])
  @@index([toUserId])
  @@index([status])
  @@index([forumId])
  @@index([initiatedAt])
  @@index([sourceHandoverId])
  @@map("cash_handovers")
}

model CashHandoverLineItem {
  lineItemId       String    @id @default(uuid())
  handoverId       String
  sourceType       String
  sourceEntityId   String
  amount           Decimal   @db.Decimal(15, 2)
  referenceNumber  String?
  memberCode       String?
  memberName       String?
  createdAt        DateTime  @default(now())

  handover         CashHandover @relation(fields: [handoverId], references: [handoverId])

  @@index([handoverId])
  @@index([sourceType, sourceEntityId])
  @@map("cash_handover_line_items")
}
```

---

## Events

- `CashCustodyCreated` - New custody record created
- `CashCustodyIncreased` - Cash added to custody (collection)
- `CashCustodyDeactivated` - Custody deactivated (admin reassignment)
- `CashHandoverInitiated` - Handover request created
- `CashHandoverAcknowledged` - Handover completed
- `CashHandoverRejected` - Handover rejected by receiver
- `CashHandoverCancelled` - Handover cancelled by initiator
- `CashDepositedToBank` - Cash reached bank via Super Admin

---

## Permissions

```typescript
const CASH_MANAGEMENT_PERMISSIONS = [
  'cash.custody.view',           // View own custody balance
  'cash.custody.view.all',       // View all custody balances (Admin)
  'cash.handover.initiate',      // Initiate cash handover
  'cash.handover.acknowledge',   // Acknowledge received cash
  'cash.handover.reject',        // Reject handover
  'cash.handover.cancel',        // Cancel own handover
  'cash.reports.view',           // View cash reports
  'cash.reports.export',         // Export cash reports
];
```

---

## GL Entry Reference

### Collection Entries

**Contribution (DirectCash):**
```
Dr 1001 Cash - Agent Custody      ₹100
Cr 4200 Contribution Income       ₹100
```

**Wallet Deposit Collection:**
```
Dr 1001 Cash - Agent Custody      ₹500
Cr 2100 Member Wallet Liability   ₹500
```

### Handover Entries

**Agent → Unit Admin:**
```
Dr 1002 Cash - Unit Admin Custody ₹1,000
Cr 1001 Cash - Agent Custody      ₹1,000
```

**Unit Admin → Area Admin:**
```
Dr 1003 Cash - Area Admin Custody ₹5,000
Cr 1002 Cash - Unit Admin Custody ₹5,000
```

**Area Admin → Forum Admin:**
```
Dr 1004 Cash - Forum Admin Custody ₹20,000
Cr 1003 Cash - Area Admin Custody  ₹20,000
```

**Forum Admin → Super Admin (Bank):**
```
Dr 1100 Bank Account               ₹50,000
Cr 1004 Cash - Forum Admin Custody ₹50,000
```

**Skip Transfer (Agent → Forum Admin):**
```
Dr 1004 Cash - Forum Admin Custody ₹2,000
Cr 1001 Cash - Agent Custody       ₹2,000
```

**Skip Transfer (Agent → Super Admin/Bank):**
```
Dr 1100 Bank Account              ₹3,000
Cr 1001 Cash - Agent Custody      ₹3,000
```

---

## Integration with Existing Modules

### Update: Contribution Collection (DirectCash)

When agent collects cash contribution, use Agent Custody account:

```typescript
// GL Entry
const journalEntry = await glService.createJournalEntry({
  entries: [
    {
      accountCode: "1001",  // Cash - Agent Custody
      debit: contribution.expectedAmount,
      description: `Cash contribution from ${contribution.memberName}`
    },
    {
      accountCode: "4200",
      credit: contribution.expectedAmount,
      description: `Contribution for ${contribution.cycle.cycleNumber}`
    }
  ],
  sourceModule: "Contributions",
  sourceEntityId: contribution.contributionId,
  sourceTransactionType: "ContributionDirectCash",
  createdBy: input.collectedBy
}, trx);

// Update agent's cash custody
await increaseCashCustody({
  userId: input.collectedBy,
  amount: contribution.expectedAmount,
  sourceModule: 'Contributions',
  sourceEntityId: contribution.contributionId,
  sourceTransactionType: 'ContributionDirectCash'
}, trx);
```

### Update: Wallet Deposit Collection

GL entry at collection time (not approval):

```typescript
// When Agent collects (not when Admin approves):
const journalEntry = await glService.createJournalEntry({
  entries: [
    {
      accountCode: "1001",  // Cash - Agent Custody
      debit: input.amount,
      description: `Wallet deposit collected from ${member.memberCode}`
    },
    {
      accountCode: "2100",  // Member Wallet Liability
      credit: input.amount,
      description: `Wallet deposit for ${member.memberCode}`
    }
  ],
  sourceModule: "Wallets",
  sourceEntityId: depositRequest.depositRequestId,
  sourceTransactionType: "WalletDepositCollection",
  createdBy: input.collectedBy
}, trx);

// Update agent's cash custody
await increaseCashCustody({
  userId: input.collectedBy,
  amount: input.amount,
  sourceModule: 'Wallets',
  sourceEntityId: depositRequest.depositRequestId,
  sourceTransactionType: 'WalletDepositCollection'
}, trx);

// Approval only updates wallet balance, no GL entry needed
```

---

## Summary

### Key Decisions Captured

1. **Simplified Approval:** Only transfers to Super Admin (bank) require approval workflow. All other transfers just need acknowledgment.

2. **Admin Reassignment:** Cannot reassign admin with non-zero custody balance. Cash must be transferred upward first.

3. **Optional Chain Tracking:** `sourceHandoverId` field available for manual traceability if needed, but cash is treated as fungible.

4. **GL Account Hierarchy:** 1000 (Cash) is parent with 1001-1004 as children for custody levels.

5. **Bank Account:** Uses existing 1100 (Bank Account) for final deposits.

### Entities
1. `CashCustody` - Tracks individual cash balances with status field
2. `CashHandover` - Records transfers with optional chain tracking
3. `CashHandoverLineItem` - Optional detailed breakdown

### Key Commands
1. `GetOrCreateCashCustody` - System creates custody records
2. `IncreaseCashCustody` - Called on cash collection
3. `InitiateCashHandover` - Start transfer request
4. `AcknowledgeCashHandover` - Complete transfer
5. `RejectCashHandover` - Reject with reason (initiator must re-submit)
6. `CancelCashHandover` - Cancel before acknowledgment
7. `DeactivateCashCustody` - For admin reassignment

### Integration Points
1. **Contribution Collection** - Updates agent custody + uses account 1001
2. **Wallet Deposit Collection** - Updates agent custody + uses account 1001 (GL at collection, not approval)
3. **Approval Workflow** - Only for transfers to Super Admin
4. **Admin Reassignment** - Blocked if custody balance > 0