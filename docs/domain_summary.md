# Project Santhwanam
This is a mutual aid/burial fund system where members pool resources to support families of deceased members. When a member dies, their nominee receives a predetermined payout - this happens regardless of whether all other members have paid their contribution yet.

## IAM Domain (`docs/domain/1.iam.md`)

### Domain Model

#### Entity: Role
```javascript
Role {
  roleId: UUID
  roleCode: string // Unique identifier (e.g., "super_admin", "forum_admin")
  roleName: string // Display name (e.g., "Super Administrator")
  description: string?
  
  // Scope type (determines what entities this role can be scoped to)
  scopeType: enum [None, Forum, Area, Unit, Agent]
  // None = Global role (like SuperAdmin)
  // Forum = Role is scoped to a forum
  // Area = Role is scoped to an area
  // Unit = Role is scoped to a unit
  // Agent = Role is scoped to an agent
  
  // Status
  isActive: boolean
  isSystemRole: boolean // True for built-in roles (cannot be deleted)
  
  // Metadata
  createdAt: timestamp
  createdBy: UUID
  updatedAt: timestamp
}
```

#### Entity: User
```javascript
User {
  userId: UUID
  externalAuthId: string // Supabase user id
  email: string
  firstName: string?
  lastName: string?
  isActive: boolean

  // Optional metadata from auth provider
  userMetadata: JSON?

  // Metadata
  createdAt: timestamp
  lastSyncedAt: timestamp
}
```

Examples:
```javascript
{
  userId: 'user-123',
  externalAuthId: 'auth|uuid-abc',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'K',
  isActive: true,
  createdAt: '2025-12-01T00:00:00Z',
  lastSyncedAt: '2025-12-01T00:00:00Z'
}
```
Examples:
```javascript
// System roles (created during initial setup)
{
  roleCode: "super_admin",
  roleName: "Super Administrator",
  scopeType: "None",
  isSystemRole: true
}

{
  roleCode: "forum_admin",
  roleName: "Forum Administrator",
  scopeType: "Forum",
  isSystemRole: true
}

{
  roleCode: "area_admin",
  roleName: "Area Administrator",
  scopeType: "Area",
  isSystemRole: true
}

{
  roleCode: "unit_admin",
  roleName: "Unit Administrator",
  scopeType: "Unit",
  isSystemRole: true
}

{
  roleCode: "agent",
  roleName: "Agent",
  scopeType: "Agent",
  isSystemRole: true
}

// Custom role (created by admin later)
{
  roleCode: "finance_manager",
  roleName: "Finance Manager",
  scopeType: "Forum",
  isSystemRole: false
}
```

#### Entity: Permission
```javascript
{
  permissionId: UUID
  permissionCode: string // Unique identifier (e.g., "member.create", "death_claim.approve")
  permissionName: string // Display name
  description: string?
  
  // Categorization
  module: string // e.g., "Membership", "Wallet", "Claims", "Organization"
  action: string // e.g., "create", "read", "update", "delete", "approve"
  
  // Status
  isActive: boolean
  
  // Metadata
  createdAt: timestamp
  createdBy: UUID
}
```

Examples:
```javascript
// Membership permissions
{ permissionCode: "member.create", module: "Membership", action: "create" }
{ permissionCode: "member.read", module: "Membership", action: "read" }
{ permissionCode: "member.update", module: "Membership", action: "update" }
{ permissionCode: "member.approve", module: "Membership", action: "approve" }
```

#### Entity: RolePermission 
```javascript
RolePermission {
  rolePermissionId: UUID
  roleId: UUID // References Role
  permissionId: UUID // References Permission
  
  // Optional: Permission constraints/conditions
  conditions: JSON? // For advanced use cases (e.g., "can approve only if amount < 1000")
  
  // Metadata
  assignedAt: timestamp
  assignedBy: UUID
}
```

#### Entity: UserRole
```javascript
UserRole {
  userRoleId: UUID
  userId: UUID // References local User table
  roleId: UUID // References Role (no more enum!)
  
  // Scope (which entity this role applies to)
  // Only set if role.scopeType is not "None"
  scopeEntityType: enum [Forum, Area, Unit, Agent]?
  scopeEntityId: UUID? // ID of the forum/area/unit/agent
  
  // Status
  isActive: boolean
  
  // Metadata
  assignedAt: timestamp
  assignedBy: UUID
  revokedAt: timestamp?
  revokedBy: UUID?
}
```

## Organizational Bodies Domain (`docs/domain/2.organization_bodies.md`)

### Domain Model

#### Entity: Forum
```js
Forum {
  forumId: UUID
  forumCode: string // Admin-defined, unique globally
  forumName: string

  // Admin assignment
  adminUserId: UUID // References users.userId (Forum Admin)

  // Metadata
  establishedDate: date

  // Timestamps
  createdAt: timestamp
  createdBy: UUID // Super Admin who created it
  updatedAt: timestamp
  updatedBy: UUID?
}
```

Business Rules:

- `forumCode` must be unique globally
- `forumCode`: alphanumeric, max 50 chars, no spaces
- `forumName`: required, max 255 chars
- `adminUserId` must reference an existing active user
- Only Super Admin can create forums
- `establishedDate` cannot be in the future

#### Entity: Area
```js
Area {
  areaId: UUID
  forumId: UUID // Parent forum
  areaCode: string // Admin-defined, unique within forum
  areaName: string

  // Admin assignment
  adminUserId: UUID // References users.userId (Area Admin)

  // Metadata
  establishedDate: date

  // Timestamps
  createdAt: timestamp
  createdBy: UUID // Super Admin or Forum Admin
  updatedAt: timestamp
  updatedBy: UUID?
}
```

Business Rules:

- `areaCode` must be unique within the forum (not globally)
- `forumId` must reference an existing forum
- `adminUserId` must reference an existing active user
- Only Super Admin or Forum Admin (of parent forum) can create areas
- `establishedDate` cannot be in the future

#### Entity: Unit
```js
Unit {
  unitId: UUID
  areaId: UUID // Parent area
  forumId: UUID // Denormalized from area (for quick access)
  unitCode: string // Admin-defined, unique within area
  unitName: string

  // Admin assignment
  adminUserId: UUID // References users.userId (Unit Admin)

  // Metadata
  establishedDate: date

  // Timestamps
  createdAt: timestamp
  createdBy: UUID // Super Admin, Forum Admin, or Area Admin
  updatedAt: timestamp
  updatedBy: UUID?
}
```

Business Rules:

- `unitCode` must be unique within the area (not globally)
- `areaId` must reference an existing area
- `forumId` is denormalized from area (auto-populated, not user input)
- `adminUserId` must reference an existing active user
- Only Super Admin, Forum Admin (of parent forum), or Area Admin (of parent area) can create units
- `establishedDate` cannot be in the future

## Approval Workflow System Design

### Domain Model

#### **Entity: ApprovalWorkflow**

```javascript
ApprovalWorkflow {
  workflowId: UUID
  workflowCode: string // Unique: "member_registration", "death_claim_approval", "wallet_deposit"
  workflowName: string
  description: string?
  
  // Context
  module: enum [Membership, Wallet, Claims, Contributions, Organization]
  entityType: string // "Member", "DeathClaim", "WalletDeposit"
  
  // Configuration
  isActive: boolean
  requiresAllStages: boolean // true = sequential, false = any stage can approve
  
  // Metadata
  createdAt: timestamp
  createdBy: UUID
  updatedAt: timestamp
  updatedBy: UUID?
}
```

---

#### **Entity: ApprovalStage**

```javascript
ApprovalStage {
  stageId: UUID
  workflowId: UUID
  
  // Stage details
  stageName: string // "Unit Admin Review", "Forum Admin Approval"
  stageOrder: int // 1, 2, 3... (for sequential workflows)
  
  // Approver assignment
  approverType: enum [Role, SpecificUser, Hierarchy]
  
  // If approverType = Role
  roleId: UUID?
  
  // If approverType = SpecificUser
  userId: UUID?
  
  // If approverType = Hierarchy
  hierarchyLevel: enum [Unit, Area, Forum]? // Dynamically resolve based on entity
  
  // Stage behavior
  isOptional: boolean // Can be skipped
  autoApprove: boolean // Automatically approve without manual action
  
  // Metadata
  createdAt: timestamp
}
```

**Example - Member Registration:**
```javascript
Workflow: "member_registration"
  Stage 1: Unit Admin Review (order: 1, roleId: "unit_admin", hierarchyLevel: "Unit")
  Stage 2: Forum Admin Approval (order: 2, roleId: "forum_admin", hierarchyLevel: "Forum")
```

**Example - Wallet Deposit:**
```javascript
Workflow: "wallet_deposit_approval"
  Stage 1: Unit Admin Approval (order: 1, roleId: "unit_admin", hierarchyLevel: "Unit")
```

**Example - Death Claim:**
```javascript
Workflow: "death_claim_approval"
  Stage 1: Forum Admin Approval (order: 1, roleId: "forum_admin", hierarchyLevel: "Forum")
```

---

#### **Entity: ApprovalRequest**

```javascript
ApprovalRequest {
  requestId: UUID
  workflowId: UUID
  
  // Entity being approved
  entityType: string // "Member", "DeathClaim", "WalletDeposit"
  entityId: UUID
  
  // Context (for hierarchy resolution)
  forumId: UUID?
  areaId: UUID?
  unitId: UUID?
  
  // Request details
  requestedBy: UUID
  requestedAt: timestamp
  
  // Current status
  status: enum [Pending, Approved, Rejected, Cancelled]
  currentStageOrder: int // Which stage is it at now
  
  // Final outcome
  approvedBy: UUID?
  approvedAt: timestamp?
  rejectedBy: UUID?
  rejectedAt: timestamp?
  rejectionReason: string?
  
  // Metadata
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

#### **Entity: ApprovalStageExecution**

```javascript
ApprovalStageExecution {
  executionId: UUID
  requestId: UUID
  stageId: UUID
  stageOrder: int
  
  // Execution details
  status: enum [Pending, Approved, Rejected, Skipped]
  
  // Assigned approver (resolved from stage config)
  assignedApproverId: UUID?
  
  // Approval/Rejection
  reviewedBy: UUID?
  reviewedAt: timestamp?
  decision: enum [Approve, Reject]?
  comments: string?
  
  // Metadata
  createdAt: timestamp
  updatedAt: timestamp
}
```

---


## Agents Domain (`docs/domain/3.agents.md`)

### Domain Model

#### **Entity: Agent**

```javascript
Agent {
  agentId: UUID
  agentCode: string // Admin-defined, unique within unit
  
  // Registration tracking
  registrationStatus: enum [Draft, PendingApproval, Approved, Rejected]
  approvalRequestId: UUID? // Links to approval_requests table
  
  // Hierarchy
  unitId: UUID
  areaId: UUID // Denormalized
  forumId: UUID // Denormalized
  
  // User reference (set after approval)
  userId: UUID? // References users.userId
  
  // Personal details
  firstName: string
  middleName: string?
  lastName: string
  dateOfBirth: date
  gender: enum [Male, Female, Other]
  
  // Contact
  contactNumber: string
  alternateContactNumber: string?
  email: string // Used to create Supabase account
  
  // Address (Optional)
  addressLine1: string?
  addressLine2: string?
  city: string?
  state: string?
  postalCode: string?
  country: string?
  
  // Agent status (after approval)
  agentStatus: enum [Active, Inactive, Suspended, Terminated]?
  // null until approved
  
  // Statistics
  totalActiveMembers: int // Count of Active members
  totalRegistrations: int // All-time registrations
  
  // Metadata
  joinedDate: date
  terminatedDate: date?
  terminationReason: string?
  
  // Timestamps
  createdAt: timestamp
  approvedAt: timestamp?
  updatedAt: timestamp
  
  // Audit
  createdBy: UUID
  approvedBy: UUID?
}
```

---

### State Machines

#### **Registration Status:**
```
[Draft]
   ↓
[PendingApproval]
   ↓
   ├─→ [Approved] → User created, agent activated
   └─→ [Rejected]
```

#### **Agent Status (Post-Approval):**
```
[Active]
   ↓
   ├─→ [Inactive] (Phase 2)
   ├─→ [Suspended] (Phase 2)
   └─→ [Terminated] (Phase 1: requires 0 active members)
```


### Business Rules

#### **Creation**

- Agent must belong to an existing active unit
- `agentCode` must be unique within the unit
- `userId` must reference an existing active user
- User cannot be an agent in multiple units simultaneously (Phase 1)
- `contactNumber` is required
- Only Super Admin, Forum Admin (of parent forum), Area Admin (of parent area), or Unit Admin (of parent unit) can create agents
- `joinedDate` cannot be in the future

#### **Phase 1 Constraints**

- No agent transfers between units
- No member reassignments when agent status changes
- Agent must have zero active members before termination

#### **Phase 2 Features (Future)**

- Transfer agent to another unit (with or without members)
- Reassign members to another agent
- Temporary inactivation (without termination)
- Suspension with automatic reactivation date

## Member Domain (`docs/domain/4.membership.md`)


### Domain Model

#### **Entity: Member**

```javascript
Member {
  memberId: UUID
  memberCode: string // Auto-generated: "MEM-2025-00001"
  
  // Registration tracking
  registrationStatus: enum [
    Draft,              // Still filling out 3-step form
    PendingApproval,    // Submitted to approval workflow
    Approved,           // Approval workflow completed
    Rejected            // Approval workflow rejected
  ]
  registrationStep: enum [
    PersonalDetails,    // Step 1
    Nominees,           // Step 2
    DocumentsPayment,   // Step 3
    Completed           // All steps done, ready to submit
  ]
  
  // Approval tracking
  approvalRequestId: UUID? // Links to approval_requests table
  
  // Personal Details (Step 1)
  firstName: string
  middleName: string?
  lastName: string
  dateOfBirth: date
  gender: enum [Male, Female, Other]
  contactNumber: string
  alternateContactNumber: string?
  email: string?
  
  // Address
  addressLine1: string
  addressLine2: string?
  city: string
  state: string
  postalCode: string
  country: string
  
  // Membership details
  tierId: UUID // References membership_tiers
  
  // Hierarchy (assigned during registration)
  agentId: UUID
  unitId: UUID
  areaId: UUID // Denormalized from unit
  forumId: UUID // Denormalized from unit
  
  // Member Status (after approval)
  memberStatus: enum [Active, Frozen, Suspended, Closed, Deceased]?
  // null until approved
  
  // Suspension tracking
  suspensionCounter: int // Consecutive missed contributions
  suspensionReason: string?
  suspendedAt: timestamp?
  
  // Timestamps
  createdAt: timestamp
  registeredAt: timestamp? // When approved and activated
  updatedAt: timestamp
  
  // Audit
  createdBy: UUID // Agent or Admin who started registration
  approvedBy: UUID? // Final approver (from approval workflow)
}
```

---

#### **Entity: Nominee**

```javascript
Nominee {
  nomineeId: UUID
  memberId: UUID
  
  // Nominee details
  name: string
  relationType: enum [Father, Mother, Spouse, Son, Daughter, Brother, Sister, Other]
  dateOfBirth: date
  contactNumber: string
  alternateContactNumber: string?
  
  // Address
  addressLine1: string
  addressLine2: string?
  city: string
  state: string
  postalCode: string
  country: string
  
  // ID Proof
  idProofType: enum [NationalID, Passport, DrivingLicense, VoterID, Other]
  idProofNumber: string
  idProofDocumentId: UUID? // References member_documents
  
  // Priority (for benefit distribution)
  priority: int // 1 = primary, 2 = secondary, etc.
  // Phase 1: Only priority = 1 used (single nominee)
  // Phase 2: Multiple priorities
  
  // Status
  isActive: boolean
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Business Rules:**
- Phase 1: Exactly 1 nominee with priority = 1
- Phase 2: Multiple nominees with unique priorities
- At least 1 nominee required to submit registration

---

#### **Entity: MemberDocument**

```javascript
MemberDocument {
  documentId: UUID
  memberId: UUID
  nomineeId: UUID? // If document belongs to nominee
  
  // Document details
  documentType: enum [
    NationalID,
    Passport,
    DrivingLicense,
    BirthCertificate,
    ResidenceCard,
    AddressProof_UtilityBill,
    AddressProof_BankStatement,
    AddressProof_RentalAgreement,
    MemberPhoto,
    NomineeIDProof,
    Other
  ]
  documentCategory: enum [
    MemberIdentity,
    MemberAddress,
    MemberPhoto,
    NomineeProof,
    Other
  ]
  documentName: string
  
  // File storage
  fileUrl: string
  fileSize: int
  mimeType: string
  
  // Metadata
  uploadedBy: UUID
  uploadedAt: timestamp
  
  // Verification (done during approval)
  verificationStatus: enum [Pending, Verified, Rejected]
  verifiedBy: UUID?
  verifiedAt: timestamp?
  rejectionReason: string?
  
  // Optional
  expiryDate: date?
  
  // Status
  isActive: boolean
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Business Rules:**
- Member must have:
  - At least 1 identity document (MemberIdentity)
  - At least 1 address proof (MemberAddress)
  - Exactly 1 member photo (MemberPhoto)
  - For each nominee: At least 1 ID proof (NomineeProof)

---

#### **Entity: RegistrationPayment**

```javascript
RegistrationPayment {
  paymentId: UUID
  memberId: UUID
  
  // Payment details
  registrationFee: decimal
  advanceDeposit: decimal
  totalAmount: decimal // registrationFee + advanceDeposit
  
  // Collection details
  collectedBy: UUID // AgentId
  collectionDate: date
  collectionMode: enum [Cash, BankTransfer, Cheque, Online]
  referenceNumber: string?
  
  // Approval status (set when member approved)
  approvalStatus: enum [PendingApproval, Approved, Rejected]
  approvedBy: UUID?
  approvedAt: timestamp?
  rejectionReason: string?
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

#### **Entity: MembershipTier**

```javascript
MembershipTier {
  tierId: UUID
  tierCode: string // "TIER-A", "TIER-B"
  tierName: string // "Standard Membership", "Premium Membership"
  description: string?
  
  // Financial amounts
  registrationFee: decimal
  advanceDepositAmount: decimal
  contributionAmount: decimal // Amount to pay per death event
  deathBenefitAmount: decimal // Amount nominee receives
  
  // Status
  isActive: boolean
  isDefault: boolean // Default tier for new registrations
  
  // Timestamps
  createdAt: timestamp
  createdBy: UUID
  updatedAt: timestamp
}
```

---

### Business Rules
**Registration**:

- Member code auto-generated: "MEM-{YEAR}-{SEQUENCE}"
- Multi-step: PersonalDetails → Nominees → DocumentsPayment
- Can save as draft at any step
- Required docs: 1 identity, 1 address proof, 1 photo, nominee ID proof

**Nominees**:

- Must be 18+ years old at time of registration
- ID proof required

**Documents**:

- Member identity: At least 1 required
- Address proof: At least 1 required
- Member photo: Exactly 1 (replacing uploads new, marks old inactive)
- Nominee ID proof: 1 per nominee

**Payment**:

- Registration fee: Non-refundable revenue
- Advance deposit: Goes to wallet as liability
- Collected by agent, approved by admin

### State Machines

#### **Registration Status:**

```
[Draft]
   ↓ (submit for approval)
[PendingApproval]
   ↓
   ├─→ [Approved] → Member activated, wallet created
   │
   └─→ [Rejected] → Payment refunded
```

#### **Registration Steps:**

```
[PersonalDetails]
   ↓ (complete step)
[Nominees]
   ↓ (complete step)
[DocumentsPayment]
   ↓ (submit)
[Completed]
```

#### **Member Status (Post-Approval):**

```
[Active]
   ↓
   ├─→ [Suspended] (after 2 missed contributions)
   │     ↓ (clear dues)
   │   [Active]
   │
   ├─→ [Closed] (voluntary exit)
   │
   └─→ [Deceased] (death claim approved)
```

---


## Finance/GL Domain (`docs/domain/gl.md`)

### Domain Model

#### **Entity: Account**

```ts
Account {
  accountId: UUID
  accountCode: string // e.g., "1000", "4100"
  accountName: string // e.g., "Cash/Bank Account"
  accountType: enum [Asset, Liability, Revenue, Expense]
  normalBalance: enum [Debit, Credit]
  currentBalance: decimal // Real-time balance
  isActive: boolean
  isSystemAccount: boolean // Cannot be deleted

  createdAt: timestamp
  createdBy: UUID
}
```

#### **Entity: JournalEntry**

```ts
JournalEntry {
  entryId: UUID
  entryNumber: string // Auto-generated: "JE-2025-00001"
  entryDate: date // When entry was created
  transactionDate: date // When transaction occurred
  reference: string // e.g., "Member Registration - MEM-001"
  description: string?
  status: enum [Posted] // Always posted (auto-post)

  // Source tracking
  sourceModule: enum [Membership, Wallet, Claims, Contributions, Manual]
  sourceEntityId: UUID? // memberId, claimId, etc.
  sourceTransactionType: string // e.g., "RegistrationApproval", "WalletDeposit"

  // Total amounts (for quick validation)
  totalDebit: decimal
  totalCredit: decimal

  // Audit
  createdAt: timestamp
  createdBy: UUID
  postedAt: timestamp
  postedBy: UUID
}
```

#### **Entity: JournalEntryLine**

```ts
JournalEntryLine {
  lineId: UUID
  entryId: UUID // Parent journal entry
  lineNumber: int // Order within entry (1, 2, 3...)

  accountId: UUID
  accountCode: string // Denormalized for quick reference
  accountName: string // Denormalized

  debit: decimal? // null if credit
  credit: decimal? // null if debit
  description: string?
}
```


### Initial Chart of Accounts Setup

Seed Data:
```js
const CHART_OF_ACCOUNTS = [
  // Assets (1xxx)
  {
    accountCode: "1000",
    accountName: "Cash/Bank Account",
    accountType: "Asset",
    normalBalance: "Debit",
    isSystemAccount: true
  },

  // Liabilities (2xxx)
  {
    accountCode: "2100",
    accountName: "Member Prepaid Wallet Liability",
    accountType: "Liability",
    normalBalance: "Credit",
    isSystemAccount: true
  },

  // Revenue (4xxx)
  {
    accountCode: "4100",
    accountName: "Registration Fee Revenue",
    accountType: "Revenue",
    normalBalance: "Credit",
    isSystemAccount: true
  },
  {
    accountCode: "4200",
    accountName: "Member Contribution Income",
    accountType: "Revenue",
    normalBalance: "Credit",
    isSystemAccount: true
  },

  // Expenses (5xxx)
  {
    accountCode: "5100",
    accountName: "Death Benefit Payout Expense",
    accountType: "Expense",
    normalBalance: "Debit",
    isSystemAccount: true
  },
  {
    accountCode: "5200",
    accountName: "Operational Expense",
    accountType: "Expense",
    normalBalance: "Debit",
    isSystemAccount: true
  }
];
```

## Member Wallet Domain (`docs/domain/membership_wallet.md`)

### Domain Model

#### **Entity: Wallet**

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

#### **Entity: WalletTransaction**

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

#### **Entity: WalletDepositRequest**

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

#### **Entity: WalletDebitRequest** (for Contributions)

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

## Death Claims & Contribution Domain (`docs/domain/8.death_claims_and_contribution.md`) I
## Part: Death Claims Context

### Domain Model

#### **Entity: DeathClaim**

```javascript
DeathClaim {
  claimId: UUID
  claimNumber: string // Auto-generated: "DC-2025-00001"
  
  // Registration tracking
  claimStatus: enum [
    Reported,           // Initial report
    UnderVerification,  // Documents being verified
    PendingApproval,    // Submitted to approval workflow
    Approved,           // Approved, ready for settlement
    Settled,            // Benefit paid out
    Rejected            // Claim rejected
  ]
  
  // Approval tracking
  approvalRequestId: UUID? // Links to approval_requests
  
  // Member info
  memberId: UUID
  memberCode: string // Denormalized
  memberName: string // Denormalized
  tierId: UUID
  
  // Hierarchy
  agentId: UUID
  unitId: UUID
  areaId: UUID
  forumId: UUID
  
  // Death details
  deathDate: date
  deathPlace: string?
  causeOfDeath: string?
  
  // Reporting
  reportedBy: UUID
  reportedByRole: string
  reportedDate: date
  initialNotes: string?
  
  // Nominee info (snapshot at time of death)
  nomineeId: UUID
  nomineeName: string
  nomineeRelation: string
  nomineeContactNumber: string
  nomineeAddress: JSON
  
  // Benefit
  benefitAmount: decimal // Locked from tier at approval
  
  // Verification
  verificationStatus: enum [Pending, InProgress, Completed, Rejected]
  verifiedBy: UUID?
  verifiedDate: date?
  verificationNotes: string?
  
  // Settlement
  settlementStatus: enum [Pending, Completed]
  paymentMethod: enum [Cash, BankTransfer, Cheque]?
  paymentReference: string?
  paymentDate: date?
  paidBy: UUID?
  nomineeAcknowledgment: string? // File URL
  
  // Financial
  journalEntryId: UUID? // GL entry for payout
  
  // Timestamps
  createdAt: timestamp
  approvedAt: timestamp?
  settledAt: timestamp?
  updatedAt: timestamp
  
  // Audit
  approvedBy: UUID?
  rejectedBy: UUID?
  rejectionReason: string?
}
```

---

#### **Entity: DeathClaimDocument**

```javascript
DeathClaimDocument {
  documentId: UUID
  claimId: UUID
  
  documentType: enum [
    DeathCertificate,
    NewspaperClipping,
    MedicalReport,
    PoliceReport,
    NomineeIdProof,
    Other
  ]
  documentName: string
  fileUrl: string
  fileSize: int
  mimeType: string
  
  uploadedBy: UUID
  uploadedAt: timestamp
  
  verificationStatus: enum [Pending, Verified, Rejected]
  verifiedBy: UUID?
  verifiedAt: timestamp?
  rejectionReason: string?
}
```

---

## Part: Contribution Collection Context

### Domain Model

#### **Entity: ContributionCycle**

```javascript
ContributionCycle {
  cycleId: UUID
  cycleNumber: string // "CC-2025-00001"
  
  // Linked to death claim
  deathClaimId: UUID
  claimNumber: string
  deceasedMemberId: UUID
  deceasedMemberName: string
  benefitAmount: decimal
  
  // Hierarchy
  forumId: UUID
  
  // Cycle details
  startDate: date
  collectionDeadline: date
  
  // Status
  cycleStatus: enum [Active, Closed]
  
  // Statistics
  totalMembers: int
  totalExpectedAmount: decimal
  totalCollectedAmount: decimal
  totalPendingAmount: decimal
  membersCollected: int
  membersPending: int
  membersMissed: int
  
  // Closure
  closedDate: date?
  closedBy: UUID?
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

#### **Entity: MemberContribution**

```javascript
MemberContribution {
  contributionId: UUID
  cycleId: UUID
  
  // Member info
  memberId: UUID
  memberCode: string
  memberName: string
  tierId: UUID
  agentId: UUID
  
  // Amount
  expectedAmount: decimal
  
  // Status
  contributionStatus: enum [
    Pending,
    WalletDebitRequested,
    Acknowledged,
    Collected,
    Missed,
    Exempted
  ]
  
  // Payment details
  paymentMethod: enum [Wallet, DirectCash]?
  collectionDate: date?
  collectedBy: UUID?
  
  // Wallet tracking
  walletDebitRequestId: UUID?
  debitAcknowledgedAt: timestamp?
  
  // Direct cash tracking
  cashReceiptReference: string?
  
  // Financial
  journalEntryId: UUID?
  
  // Consecutive miss tracking
  isConsecutiveMiss: boolean
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

### Commands Summary

**Death Claims:**
1. `ReportDeath`
2. `UploadClaimDocument`
3. `VerifyClaimDocuments`
4. `SubmitClaimForApproval`
5. `SettleDeathClaim`

**Approval via workflow + listeners**

**Contributions:**
6. `StartContributionCycle` (system)
7. `AcknowledgeContributionDebit`
8. `RecordDirectCashContribution`
9. `MarkContributionAsMissed`
10. `CloseContributionCycle`






