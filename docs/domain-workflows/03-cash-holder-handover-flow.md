## FLOWS:

### Flow 1: Contribution Collection → Bank Deposit
```
┌─────────────────────────────────────────────────────────────────┐
│         CONTRIBUTION CASH: COLLECTION TO BANK                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: Agent Collects Contribution (DirectCash)              │
│  ────────────────────────────────────────────────              │
│  Trigger: Agent records cash collection from member             │
│                                                                 │
│  GL Entry:                                                      │
│    Dr 1001 Cash - Agent Custody       ₹100                     │
│    Cr 4200 Contribution Revenue       ₹100                     │
│                                                                 │
│  Sub-Ledger:                                                    │
│    Agent John custody: +₹100                                   │
│                                                                 │
│  MemberContribution:                                            │
│    status: Collected                                            │
│    paymentMethod: DirectCash                                    │
│    collectedBy: agentId                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 2: Agent Initiates Handover to Unit Admin                │
│  ──────────────────────────────────────────────                │
│  Trigger: Agent submits cash handover request                   │
│                                                                 │
│  CashHandover created:                                          │
│    status: Initiated                                            │
│    fromUserId: agentId                                          │
│    toUserId: unitAdminId                                        │
│    amount: ₹500 (batched from multiple collections)            │
│    requiresApproval: false                                      │
│                                                                 │
│  GL Entry: None yet                                             │
│  Sub-Ledger: No change yet                                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 3: Unit Admin Acknowledges Receipt                       │
│  ───────────────────────────────────────                       │
│  Trigger: Unit Admin confirms cash received                     │
│                                                                 │
│  CashHandover updated:                                          │
│    status: Acknowledged                                         │
│    acknowledgedAt: now                                          │
│                                                                 │
│  GL Entry:                                                      │
│    Dr 1002 Cash - Unit Admin Custody  ₹500                     │
│    Cr 1001 Cash - Agent Custody       ₹500                     │
│                                                                 │
│  Sub-Ledger:                                                    │
│    Agent John custody: -₹500                                   │
│    Unit Admin Sarah custody: +₹500                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 4: Unit Admin → Area Admin (Same Pattern)                │
│  ──────────────────────────────────────────────                │
│  GL Entry (on acknowledge):                                     │
│    Dr 1003 Cash - Area Admin Custody  ₹2,000                   │
│    Cr 1002 Cash - Unit Admin Custody  ₹2,000                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 5: Area Admin → Forum Admin (Same Pattern)               │
│  ──────────────────────────────────────────────                │
│  GL Entry (on acknowledge):                                     │
│    Dr 1004 Cash - Forum Admin Custody ₹10,000                  │
│    Cr 1003 Cash - Area Admin Custody  ₹10,000                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 6: Forum Admin → Super Admin (Requires Approval)         │
│  ─────────────────────────────────────────────────             │
│  Trigger: Forum Admin initiates handover                        │
│                                                                 │
│  CashHandover created:                                          │
│    status: Initiated                                            │
│    requiresApproval: true                                       │
│    approvalRequestId: UUID (approval workflow triggered)        │
│                                                                 │
│  Approval Request created:                                      │
│    workflowCode: "cash_handover_to_super_admin"                │
│    entityType: "CashHandover"                                   │
│    entityId: handoverId                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 7: Super Admin Approves + Auto Bank Deposit              │
│  ────────────────────────────────────────────────              │
│  Trigger: Super Admin approves the approval request             │
│                                                                 │
│  CashHandover updated:                                          │
│    status: Acknowledged                                         │
│                                                                 │
│  GL Entry (Custody Transfer - may be skipped, see below):      │
│    Dr 1005 Cash - Central Treasury    ₹50,000                  │
│    Cr 1004 Cash - Forum Admin Custody ₹50,000                  │
│                                                                 │
│  GL Entry (Auto Bank Deposit):                                  │
│    Dr 1010 Bank Account               ₹50,000                  │
│    Cr 1005 Cash - Central Treasury    ₹50,000                  │
│                                                                 │
│  OR Combined (Skip Central Treasury):                          │
│    Dr 1010 Bank Account               ₹50,000                  │
│    Cr 1004 Cash - Forum Admin Custody ₹50,000                  │
│                                                                 │
│  Sub-Ledger:                                                    │
│    Forum Admin custody: -₹50,000                               │
│    Bank: +₹50,000 (or tracked separately)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```


### Flow 2: Wallet Deposit Collection → Bank Deposit

| Step | Action | GL Entry | Custody |
|------|--------|----------|---------|
| 1 | Member requests deposit | None | None |
| 2 | Agent collects cash | Dr 1001 Agent Custody / Cr 2100 Wallet Liability | Agent +₹1,000 |
| 3 | Admin approves | None (just updates wallet balance) | No change |
| 4+ | Cash handover chain | Transfer between custody accounts | Moves up chain |



### Flow 3: Agent Skips to Forum Admin (With Approval)
```
┌─────────────────────────────────────────────────────────────────┐
│         AGENT DIRECT TO FORUM ADMIN (SKIP PATH)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: Agent Initiates Handover to Forum Admin               │
│  ───────────────────────────────────────────────               │
│  Trigger: Agent chooses Forum Admin as recipient                │
│                                                                 │
│  CashHandover created:                                          │
│    status: Initiated                                            │
│    fromUserRole: Agent                                          │
│    toUserRole: ForumAdmin                                       │
│    amount: ₹5,000                                              │
│    requiresApproval: true  ← Skip requires approval            │
│                                                                 │
│  Approval Request created:                                      │
│    workflowCode: "cash_handover_skip_approval"                 │
│    Stage 1: Forum Admin Approval (required)                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 2: Forum Admin Reviews & Approves                        │
│  ──────────────────────────────────────                        │
│  Trigger: Forum Admin approves in approval workflow             │
│                                                                 │
│  Approval Request: Approved                                     │
│                                                                 │
│  CashHandover updated:                                          │
│    status: Acknowledged                                         │
│                                                                 │
│  GL Entry:                                                      │
│    Dr 1004 Cash - Forum Admin Custody ₹5,000                   │
│    Cr 1001 Cash - Agent Custody       ₹5,000                   │
│                                                                 │
│  Sub-Ledger:                                                    │
│    Agent custody: -₹5,000                                      │
│    Forum Admin custody: +₹5,000                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 3: Forum Admin → Super Admin → Bank                      │
│  ────────────────────────────────────────                      │
│  (Same as regular flow from here)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flow 4: Agent Direct to Super Admin (With Approval)
```
┌─────────────────────────────────────────────────────────────────┐
│         AGENT DIRECT TO SUPER ADMIN (MAX SKIP)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: Agent Initiates Handover to Super Admin               │
│  ───────────────────────────────────────────────               │
│  CashHandover created:                                          │
│    status: Initiated                                            │
│    fromUserRole: Agent                                          │
│    toUserRole: SuperAdmin                                       │
│    requiresApproval: true                                       │
│                                                                 │
│  Approval Request created:                                      │
│    workflowCode: "cash_handover_to_super_admin"                │
│    Stage 1: Super Admin Approval (required)                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 2: Super Admin Approves → Auto Bank Deposit              │
│  ────────────────────────────────────────────────              │
│  Trigger: Super Admin approves                                  │
│                                                                 │
│  CashHandover updated:                                          │
│    status: Acknowledged                                         │
│                                                                 │
│  GL Entry (Combined - direct to bank):                         │
│    Dr 1010 Bank Account               ₹5,000                   │
│    Cr 1001 Cash - Agent Custody       ₹5,000                   │
│                                                                 │
│  Sub-Ledger:                                                    │
│    Agent custody: -₹5,000                                      │
│    Bank: +₹5,000                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```


## Revised Chart of Accounts

```
const CASH_CUSTODY_ACCOUNTS = [
  // Cash Custody Accounts (Sub-accounts of conceptual "Cash")
  { 
    accountCode: "1001", 
    accountName: "Cash - Agent Custody", 
    accountType: "Asset",
    normalBalance: "Debit",
    isSystemAccount: true
  },
  { 
    accountCode: "1002", 
    accountName: "Cash - Unit Admin Custody", 
    accountType: "Asset",
    normalBalance: "Debit",
    isSystemAccount: true
  },
  { 
    accountCode: "1003", 
    accountName: "Cash - Area Admin Custody", 
    accountType: "Asset",
    normalBalance: "Debit",
    isSystemAccount: true
  },
  { 
    accountCode: "1004", 
    accountName: "Cash - Forum Admin Custody", 
    accountType: "Asset",
    normalBalance: "Debit",
    isSystemAccount: true
  },
  { 
    accountCode: "1005", 
    accountName: "Cash - Central Treasury", 
    accountType: "Asset",
    normalBalance: "Debit",
    isSystemAccount: true
  },
  
  // Bank Account
  { 
    accountCode: "1010", 
    accountName: "Bank - Primary Account", 
    accountType: "Asset",
    normalBalance: "Debit",
    isSystemAccount: true
  }
];
```


## Approval Workflow Configuration
```
const CASH_HANDOVER_WORKFLOWS = [
  {
    workflowCode: "cash_handover_to_forum_admin",
    workflowName: "Cash Handover to Forum Admin Approval",
    module: "CashManagement",
    entityType: "CashHandover",
    stages: [
      {
        stageName: "Forum Admin Approval",
        stageOrder: 1,
        approverType: "Hierarchy",
        hierarchyLevel: "Forum",
        isOptional: false
      }
    ]
  },
  {
    workflowCode: "cash_handover_to_super_admin",
    workflowName: "Cash Handover to Super Admin Approval",
    module: "CashManagement",
    entityType: "CashHandover",
    stages: [
      {
        stageName: "Super Admin Approval",
        stageOrder: 1,
        approverType: "Role",
        roleCode: "SuperAdmin",
        isOptional: false
      }
    ]
  }
];
```