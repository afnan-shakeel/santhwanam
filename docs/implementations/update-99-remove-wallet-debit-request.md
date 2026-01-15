# Deprecate wallet debit reqeust (Auto ack/debit)

Auto-acknowledging wallet debits removes a lot of friction from the collection process while keeping the approval control where it matters most (deposits = cash coming in).


---

## Current Flow (With Manual Acknowledgment)

```
Death Claim Approved
       ↓
Contribution Cycle Created
       ↓
For each member with sufficient wallet balance:
   → Create WalletDebitRequest (PendingAcknowledgment)
       ↓
Agent visits member
       ↓
Agent clicks "Acknowledge" in app
       ↓
Wallet debited, GL entry created
```

**Problems:**
- Extra step for agent
- Delay between cycle start and actual debit
- UI screens needed for acknowledgment management
- Member's wallet balance could change between request creation and acknowledgment

---

## Proposed Flow (Auto-Debit)

```
Death Claim Approved
       ↓
Contribution Cycle Created
       ↓
For each member with sufficient wallet balance:
   → Immediately debit wallet
   → Create WalletTransaction
   → Create GL entry
   → Contribution status = "Collected"
       ↓
For members with insufficient balance:
   → Contribution status = "Pending"
   → Agent collects cash later
```

**Benefits:**
- Instant collection for members with balance
- No agent intervention needed for wallet payments
- Simpler UI
- No stale balance issues

---

## Changes Required

### 1. Domain Model Changes

**WalletDebitRequest — Keep but Simplify**

```javascript
WalletDebitRequest {
  debitRequestId: UUID
  memberId: UUID
  walletId: UUID
  
  amount: decimal
  purpose: string
  
  contributionCycleId: UUID?
  contributionId: UUID?
  
  // Simplified status
  status: enum [
    Completed,      // Auto-processed successfully
    Failed,         // Insufficient balance at processing time
    Invalidated     // Member paid cash instead
  ]
  
  // Remove these statuses: (Keep them but dont use it)
  // - PendingAcknowledgment (no longer needed)
  // - Acknowledged (no longer needed)
  
  processedAt: timestamp?
  failureReason: string?
  
  createdAt: timestamp
}
```

---

### 2. New Configuration Setting

**Entity: SystemConfiguration**

```javascript
// Add to your settings/config table
{
  key: "wallet.autoDebitEnabled",
  value: "true",
  description: "When enabled, wallet debits for contributions are processed automatically without agent acknowledgment",
  dataType: "boolean",
  updatedBy: UUID,
  updatedAt: timestamp
}
```

---

### 3. Backend Logic Changes


Current `StartContributionCycle`:
```javascript
// Current: Creates WalletDebitRequest with PendingAcknowledgment
if (wallet.currentBalance >= contributionAmount) {
  await createWalletDebitRequest({
    status: 'PendingAcknowledgment',
    ...
  });
  contribution.status = 'WalletDebitRequested';
}
```

**New Logic:**

```javascript
async function startContributionCycle(input) {
  const config = await getConfig('wallet.autoDebitEnabled');
  
  for (const member of eligibleMembers) {
    const wallet = member.wallet;
    const contribution = await createContribution(member, cycle);
    
    if (wallet.currentBalance >= contribution.expectedAmount) {
      if (config.autoDebitEnabled) {
        // AUTO-DEBIT: Process immediately
        await processWalletDebit(contribution, wallet);
      } else {
        // MANUAL: Create request for agent acknowledgment (legacy)
        await createWalletDebitRequest({
          status: 'PendingAcknowledgment',
          ...
        });
        contribution.status = 'WalletDebitRequested';
      }
    } else {
      // Insufficient balance - agent will collect cash
      contribution.status = 'Pending';
    }
  }
}

async function processWalletDebit(contribution, wallet, trx) {
  // 1. Debit wallet
  await db.wallets.decrement('currentBalance', {
    by: contribution.expectedAmount,
    where: { walletId: wallet.walletId }
  }, { transaction: trx });
  
  // 2. Get updated balance
  const updatedWallet = await db.wallets.findByPk(wallet.walletId, { transaction: trx });
  
  // 3. Create GL entry
  const journalEntry = await glService.createJournalEntry({
    entries: [
      { accountCode: "2100", debit: contribution.expectedAmount },  // Dr Member Wallet Liability
      { accountCode: "4200", credit: contribution.expectedAmount }  // Cr Contribution Income
    ],
    sourceModule: "Contributions",
    sourceEntityId: contribution.contributionId,
    sourceTransactionType: "ContributionFromWallet",
    ...
  }, trx);
  
  // 4. Create wallet transaction
  await db.walletTransactions.create({
    walletId: wallet.walletId,
    transactionType: 'Debit',
    amount: contribution.expectedAmount,
    balanceAfter: updatedWallet.currentBalance,
    sourceModule: 'Contributions',
    sourceEntityId: contribution.contributionId,
    description: `Contribution for ${contribution.cycle.cycleNumber}`,
    journalEntryId: journalEntry.entryId,
    status: 'Completed',
    createdAt: new Date()
  }, trx);
  
  // 5. Create debit request record (for audit)
  await db.walletDebitRequests.create({
    walletId: wallet.walletId,
    memberId: contribution.memberId,
    amount: contribution.expectedAmount,
    contributionId: contribution.contributionId,
    contributionCycleId: contribution.cycleId,
    status: 'Completed',        // Already done
    processedAt: new Date(),
    createdAt: new Date()
  }, trx);
  
  // 6. Update contribution status
  await db.memberContributions.update({
    contributionStatus: 'Collected',
    paymentMethod: 'Wallet',
    collectionDate: new Date(),
    journalEntryId: journalEntry.entryId
  }, {
    where: { contributionId: contribution.contributionId }
  }, trx);
  
  // 7. Emit event (for notifications)
  await emitEvent('ContributionAutoCollected', {
    contributionId: contribution.contributionId,
    memberId: contribution.memberId,
    amount: contribution.expectedAmount,
    paymentMethod: 'Wallet'
  });
}
```

---

### 4. MemberContribution Status Changes

**Remove status:**
- `WalletDebitRequested` — No longer needed with auto-debit, keep it but dont use it.

**Keep statuses:**
```javascript
contributionStatus: enum [
  Pending,      // Created, awaiting collection (cash or insufficient wallet)
  Collected,    // Payment received (wallet auto-debit or cash)
  Missed,       // Deadline passed without payment
  Exempted      // Member exempted from this cycle
]
```

---

### 5. API Endpoint Changes

- Few API already exists. Check in openapi specs file.
### Member APIs
| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | GET | /wallet/my-wallet | Get logged-in member's wallet |
| 2 | GET | /wallet/members/:memberId/wallet | Get wallet summary |
| 3 | GET | /wallet/members/:memberId/wallet/transactions | Transaction history |
| 4 | POST | /wallet/members/:memberId/wallet/deposit-requests | Create deposit request |
| 5 | GET | /wallet/members/:memberId/wallet/deposit-requests | List deposit requests |

### Agent APIs
| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 6 | POST | /wallet/deposit-requests/:requestId/submit | Submit for approval |
| 7 | GET | /wallet/agent/members/:memberId/wallet | View member wallet (agent) |
| 8 | GET | /wallet/agent/pending-deposits | Agent's pending deposits |

### Contribution Collection APIs
| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 9 | GET | /contributions/:contributionId/collection-details | Get collection details |
| 10 | POST | /contributions/:contributionId/collect-cash | Collect cash payment |

### Admin APIs
| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 11 | GET | /wallet/admin/wallets/statistics | Dashboard stats |
| 12 | GET | /wallet/admin/deposits/pending | Pending deposits |
| 13 | GET | /wallet/admin/wallets | List all wallets |
| 14 | GET | /wallet/admin/wallets/low-balance | Low balance report |
| 15 | GET | /wallet/admin/wallets/:walletId | Wallet details |
| 16 | POST | /wallet/admin/wallets/:walletId/adjust | Manual adjustment |

### Configuration APIs
| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 17 | GET | /admin/config/wallet | Get wallet config |
| 18 | PUT | /admin/config/wallet | Update wallet config |

---

### 7. Edge Case: What if Member's Balance Changes After Auto-Debit?

**Scenario:** Wallet had ₹500, auto-debit took ₹100 for contribution. Later, member wants refund.

**Options:**
1. **No refunds for auto-debits** — Once debited, it's done
2. **Admin adjustment** — Admin can do a manual wallet adjustment + GL reversal
3. **Invalidate + Refund** — Keep the invalidate endpoint for exceptional cases

**Recommendation:** Option 2 — Handle through existing admin adjustment flow.

---

## Sample Notifications
**Auto-Debit Notification (SMS/Push):**
```
Your wallet has been debited ₹100 for contribution cycle CC-2025-00015 
(Jane Doe Memorial). New balance: ₹2,400.
```

**Deposit Approved Notification:**
```
Your wallet deposit of ₹1,000 has been approved. 
New balance: ₹3,500.
```

**Low Balance Alert (to Agent):**
```
5 of your members have low wallet balance and may miss the next 
contribution cycle. Please follow up.
```

---

## Summary of All Changes

| Area | Change Type | Details |
|------|-------------|---------|
| **Config** | Add | `wallet.autoDebitEnabled` setting |
| **WalletDebitRequest** | Modify | Simplify statuses (remove PendingAcknowledgment, Acknowledged) |
| **MemberContribution** | Modify | Remove `WalletDebitRequested` status |
| **StartContributionCycle** | Modify | Add auto-debit logic based on config |
| **API - Remove** | Remove | Acknowledgment endpoints |
| **API - Add** | Add | Config management endpoints |
| **Events** | Add | `ContributionAutoCollected` event |

---
## Wallet Events

| Event | Trigger | Notification To |
|-------|---------|-----------------|
| `WalletCreated` | Member activated | - |
| `WalletDepositRequested` | Agent creates deposit | Admin |
| `WalletDepositApproved` | Admin approves | Member, Agent |
| `WalletDepositRejected` | Admin rejects | Member, Agent |
| `WalletAutoDebited` | Contribution cycle starts | Member (if enabled) |
| `WalletAdjusted` | Admin adjustment | Member |

---

## Future considerations

1. **Notification on Auto-Debit** — Should members receive a notification when their wallet is auto-debited?

2. **Pre-Debit Balance Check** — At cycle start, if member has ₹100 and owes ₹100, should we:
   - Debit to ₹0? 
   - Or require a buffer (e.g., balance > 1.5x contribution)?
   - this is managed by our advance amount collection on registration, but solidifying flow here.

3. **Multiple Cycles** — If two death claims happen close together and member has ₹200, should both ₹100 contributions auto-debit?

4. **Failed Debit Retry** — If a member deposits more money later, should we auto-retry debiting for pending contributions?