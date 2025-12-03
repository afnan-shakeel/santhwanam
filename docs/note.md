# Santhwanam System - Design Draft
This is a mutual aid/burial fund system where members pool resources to support families of deceased members. When a member dies, their nominee receives a predetermined payout - this happens regardless of whether all other members have paid their contribution yet.
---

# Phase 1 Scope (Current Design Focus)

## Tier-Based Amounts (Simple & Clean)

* **Contribution:** Tier A pays ₹X, Tier B pays ₹Y (per death event)
* **Death Benefit:** Tier A nominee gets ₹XX, Tier B nominee gets ₹YY
* Values stored in tier configuration
* No complex calculations based on member count or other factors

---

# Organizational Constraints (Phase 1)

* Agent handles **single Unit only**
* Member belongs to **one Unit/Area/Forum**
* Transfers (member, agent, unit merges) → **Phase 2**

---

## Configurable Approval Workflows

> Do **not** hardcode approver roles — make workflows configurable.

| Workflow Type       | Default Approver          | Configurable? |
| ------------------- | ------------------------- | ------------- |
| Member Registration | Forum Admin / Super Admin | Yes           |
| Death Report        | Unit Admin                | Yes           |
| Wallet Deposit      | Unit Admin                | Yes           |
| Claim Settlement    | Forum Admin / Super Admin | Yes           |

**Super Admin can configure which role approves which workflow.**

---

# Financial Treatment

* **Registration Fee**: Revenue (immediate recognition)
* **Advance Deposit**: Liability (Member Wallet balance)

---

# Domain Model — Phase 1

---

## 1. Membership Bounded Context

### Aggregates

### **Member (root)**

* MemberId
* Personal details (name, DOB, contact, address, etc.)
* Tier/Level
* Status (Active, Frozen, Suspended, Closed)
* Registration date
* UnitId, AgentId
* Nominee details (name, relationship, contact, ID proof)
* Documents (ID proof, address proof, photo, nominee ID)
* Suspension counter (missed contributions)

---

### **MembershipTier**

* TierId
* Tier name
* Contribution amount (per death event)
* Death benefit amount
* Active/Inactive status

---

### Domain Events

* MemberRegistrationInitiated
* MemberRegistrationApproved
* MemberRegistrationRejected
* MemberSuspended
* MemberReactivated
* MemberClosed

---

## 2. Organizational Hierarchy Context

### Aggregates

### **Forum (root)**

* ForumId
* Name
* AdminUserId

### **Area (child of Forum)**

* AreaId
* ForumId
* Name
* AdminUserId

### **Unit (child of Area)**

* UnitId
* AreaId
* Name
* AdminUserId

### **Agent (belongs to Unit)**

* AgentId
* UnitId
* Personal details
* Status (Active/Inactive)
* Assigned date

---

### Business Rules

* Agent can only be assigned to **ONE Unit**
* Each organizational level must have an admin assigned

---

## 3. Member Wallet Context (Sub-Ledger)

### Aggregate

### **MemberWallet (root)**

* MemberId
* Current balance
* Transaction history

---

### Value Objects / Entities

#### **WalletTransaction**

* TransactionId
* Type (Deposit, Debit, Refund)
* Amount
* Timestamp
* Status (Pending, Approved, Rejected, Completed)
* ApprovedBy (UserId)
* RelatedEntity (DeathClaimId if debit, DepositRequestId if deposit)
* Notes

---

### Workflows

#### **Deposit Request**

1. Agent collects cash → creates **DepositRequest**
2. Unit Admin approves → Wallet credited, GL entry created
3. Rejected → No wallet impact

#### **Contribution Debit Request**

* Death claim approved → System creates **DebitRequest** per member
* Agent visits member → Member acknowledges

    Options:

    * Member confirms wallet debit → **Wallet debited**
    * Member pays cash directly → **DebitRequest invalidated, DirectPayment recorded**

* GL entries created

---

### Domain Events

* WalletDepositRequested
* WalletDepositApproved
* WalletDepositRejected
* WalletDebited
* DebitRequestInvalidated

---

## 4. Death Claims Context

### Aggregate

### **DeathClaim (root)**

* ClaimId
* DeceasedMemberId
* Reported by (AgentId or UserId)
* Report date
* Death date
* Status (Reported, UnderVerification, Verified, Approved, Settled, Rejected)
* Verification documents (death cert, newspaper clipping, etc.)
* Benefit amount (from member tier)
* Nominee details (snapshot at time of death)
* Payment details (date paid, reference, etc.)
* ApprovedBy (UserId)

---

### Business Rules

* **Death benefit = Member’s tier death benefit amount**
* Payout happens **regardless of contribution collection status**
* Multiple active claims can coexist

---

### Domain Events

* DeathReported
* DeathVerificationStarted
* DeathClaimApproved
* DeathClaimRejected
* DeathBenefitPaidOut

---

## 5. Contribution Collection Context

### Aggregate

### **ContributionCycle (root)**

* CycleId
* DeathClaimId
* Start date
* Collection deadline
* Status (Active, Closed)
* Total expected contributions
* Total collected

---

### Entity

### **MemberContribution (child of ContributionCycle)**

* MemberId
* Expected amount (from member tier)
* Status (Pending, Requested, Acknowledged, Collected, Missed, Exempted)
* Payment method (Wallet / DirectCash)
* Collection date
* CollectedBy (AgentId)
* DebitRequestId (if wallet)
* Notes

---

### Business Rules

* When death approved → **ContributionCycle created for all Active members**
* Expected amount = member’s tier contribution amount
* If member misses **2 consecutive cycles → Member suspended**

Agent can collect via:

* Wallet debit (with acknowledgement)
* Direct cash payment

---

### Domain Events

* ContributionCycleStarted
* ContributionRequested (per member)
* ContributionAcknowledgedByMember
* ContributionCollected
* ContributionMissed
* ContributionCycleClosed

---

## 6. Finance / Accounting Context

### Aggregates

* **GeneralLedger**
* **ChartOfAccounts**
* **JournalEntry**

---

### Key Accounts

**ASSETS**

* Cash/Bank Account

**LIABILITIES**

* Member Wallet Prepaid Liability

**REVENUE**

* Registration Fee Income
* Contribution Income

**EXPENSES**

* Death Benefit Payout
* Operational Expenses

---

### Domain Events

* JournalEntryCreated
* AccountBalanceUpdated

---

## 7. Workflow Configuration Context

### Aggregate

### **ApprovalConfiguration**

* Workflow type (MemberRegistration, DeathReport, WalletDeposit, ClaimSettlement)
* Required approver role(s)
* Multi-level approval chain (if needed)
* ConfiguredBy (Super Admin)

---

### Business Rules

* Only **Super Admin** can modify configurations
* At least **one approver role** must be assigned per workflow

---

# Key Cross-Cutting Concerns

## User / Role Management

* Super Admin
* Forum Admin
* Area Admin
* Unit Admin
* Agent

---

## Audit Trail

Every significant action must capture:

* Who performed it
* When
* What changed (before/after)
* IP/device info

---

## Document Management

* Member documents (ID, address proof, photo, nominee ID)
* Death claim documents (death certificate, newspaper)
* Storage strategy (file system, cloud storage, etc.)

---

# Technical Considerations for Phase 1

### 1. Concurrency Handling

* Multiple deaths can be active → multiple contribution cycles per member
* Handle case: Member acknowledges contribution for Cycle A while Cycle B exists

### 2. Idempotency

* Agent may submit deposit twice
* Member may acknowledge contribution twice
* GL entries **must not duplicate**

### 3. Event Sourcing vs State-Based

Due to financial nature and audit requirements:

* Consider **event sourcing** for Wallet and GL contexts
