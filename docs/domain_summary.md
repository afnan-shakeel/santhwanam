This document aggregates the Domain Model sections from `docs/domain/*.md`.

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

## Agents Domain (`docs/domain/3.agents.md`)

### Domain Model

#### Entity: Agent
```js
Agent {
  agentId: UUID

  // Hierarchy (belongs to unit)
  unitId: UUID // Parent unit
  areaId: UUID // Denormalized from unit
  forumId: UUID // Denormalized from unit

  // Identification
  agentCode: string // Admin-defined, unique within unit

  // User reference (Agent IS a user)
  userId: UUID // References users.userId

  // Contact Details
  contactNumber: string
  alternateContactNumber: string?

  // Status
  agentStatus: enum [Active, Inactive, Suspended, Terminated]
  // Phase 1: Only Active and Terminated used
  // Phase 2: Inactive (temporary), Suspended (disciplinary)

  // Statistics (computed/cached)
  totalActiveMembers: int // Count of members with status = Active
  totalRegistrations: int // All-time count of members registered by this agent

  // Metadata
  joinedDate: date // When agent started
  terminatedDate: date? // When agent was terminated
  terminationReason: string? // Why agent was terminated

  // Timestamps
  createdAt: timestamp
  createdBy: UUID
  updatedAt: timestamp
  updatedBy: UUID?
}
```

### Business Rules

**Creation**

- Agent must belong to an existing active unit
- `agentCode` must be unique within the unit
- `userId` must reference an existing active user
- User cannot be an agent in multiple units simultaneously (Phase 1)
- `contactNumber` is required
- Only Super Admin, Forum Admin (of parent forum), Area Admin (of parent area), or Unit Admin (of parent unit) can create agents
- `joinedDate` cannot be in the future

**Status**

- Active: Agent can register members, handle transactions
- Terminated: Agent permanently removed (Phase 1)
- Inactive: Temporary deactivation (Phase 2)
- Suspended: Disciplinary action (Phase 2)

**Phase 1 Constraints**

- No agent transfers between units
- No member reassignments when agent status changes
- Agent must have zero active members before termination

**Phase 2 Features (Future)**

- Transfer agent to another unit (with or without members)
- Reassign members to another agent
- Temporary inactivation (without termination)
- Suspension with automatic reactivation date

## Member Domain (`docs/domain/4.membership.md`)

### Domain Design Model (data structures)
#### Entity: Member
```javascript
Member {
  memberId: UUID
  
  // Registration tracking
  registrationStatus: enum [Draft, PendingApproval, Approved, Rejected]
  registrationStep: enum [PersonalDetails, Nominees, DocumentsPayment, Completed]
  
  // Personal details
  firstName: string
  middleName: string?
  lastName: string
  dateOfBirth: date
  gender: enum [Male, Female, Other]
  contactNumber: string
  alternateContactNumber: string?
  email: string?
  address: {
    line1: string
    line2: string?
    city: string
    state: string
    postalCode: string
    country: string
  }
  
  // Hierarchy
  tierId: UUID
  agentId: UUID
  unitId: UUID
  areaId: UUID // Denormalized
  forumId: UUID // Denormalized
  
  // Status (after approval)
  memberStatus: enum [Active, Frozen, Suspended, Closed, Deceased]?
  suspensionCounter: int // Missed contributions count
  
  // Timestamps
  createdAt: timestamp
  registeredAt: timestamp? // When approved
  updatedAt: timestamp
  createdBy: UUID // Agent or Admin
  approvedBy: UUID?
}
```

#### Entity: Nominee
```javascript
Nominee {
  nomineeId: UUID
  memberId: UUID
  
  name: string
  relationType: enum [Father, Mother, Spouse, Son, Daughter, Brother, Sister, Other]
  dateOfBirth: date
  contactNumber: string
  alternateContactNumber: string?
  address: {
    line1: string
    line2: string?
    city: string
    state: string
    postalCode: string
    country: string
  }
  
  // ID Proof
  idProofType: enum [NationalID, Passport, DrivingLicense, VoterID, Other]
  idProofNumber: string
  idProofDocumentId: UUID? // Link to MemberDocument
  
  priority: int // 1 = primary, Phase 1: only priority 1
  isActive: boolean
  
  createdAt: timestamp
  updatedAt: timestamp
}
```
#### Entity: MemberDocument
```javascript
MemberDocument {
  documentId: UUID
  memberId: UUID
  nomineeId: UUID? // If document belongs to nominee
  
  documentType: enum [
    NationalID, Passport, DrivingLicense, BirthCertificate,
    ResidenceCard, AddressProof_UtilityBill, AddressProof_BankStatement,
    AddressProof_RentalAgreement, MemberPhoto, NomineeIDProof, Other
  ]
  documentCategory: enum [MemberIdentity, MemberAddress, MemberPhoto, NomineeProof, Other]
  documentName: string
  
  fileUrl: string
  fileSize: int
  mimeType: string
  
  uploadedBy: UUID
  uploadedAt: timestamp
  verifiedBy: UUID?
  verifiedAt: timestamp?
  verificationStatus: enum [Pending, Verified, Rejected]
  rejectionReason: string?
  
  expiryDate: date?
  isActive: boolean
  
  createdAt: timestamp
  updatedAt: timestamp
}
```
#### Entity: RegistrationPayment
```javascript
RegistrationPayment {
  paymentId: UUID
  memberId: UUID
  
  registrationFee: decimal
  advanceDeposit: decimal
  totalAmount: decimal
  
  collectedBy: UUID // AgentId
  collectionDate: date
  collectionMode: enum [Cash, BankTransfer, Cheque, Online]
  referenceNumber: string?
  
  approvalStatus: enum [PendingApproval, Approved, Rejected]
  approvedBy: UUID?
  approvedAt: timestamp?
  rejectionReason: string?
  
  createdAt: timestamp
  updatedAt: timestamp
}
```
#### Entity: MembershipTier
```javascript
MembershipTier {
  tierId: UUID
  tierCode: string // Unique
  tierName: string
  description: string?
  
  // Financial amounts
  registrationFee: decimal
  advanceDepositAmount: decimal
  contributionAmount: decimal // Per death event
  deathBenefitAmount: decimal // Payout to nominee
  
  isActive: boolean
  isDefault: boolean
  
  createdAt: timestamp
  createdBy: UUID
  updatedAt: timestamp
}
```

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

**Status**:

- Active: Can use services
- Suspended: After 2 consecutive missed contributions
- Closed: Voluntary exit (refund wallet balance)
- Deceased: After death claim approved



### State Machine: Member Registration
```
[Start]
   ↓
[Draft - PersonalDetails] ←→ SaveDraft
   ↓ CompleteStep
[Draft - Nominees] ←→ SaveDraft (Add/Edit/Remove Nominees)
   ↓ CompleteStep
[Draft - DocumentsPayment] ←→ SaveDraft (Upload Docs, Record Payment)
   ↓ Submit
[PendingApproval]
   ↓
   ├─→ [Approved] → [Active Member]
   ├─→ [Rejected] → [End]
   └─→ [Revision Requested] → Back to [Draft - specific step]
```

### State Machine: Member Status (Post-Registration)
```
[Active]
   ↓
   ├─→ [Suspended] (after 2 missed contributions)
   │     ↓
   │     └─→ [Active] (reactivated after clearing dues)
   │
   ├─→ [Closed] (member voluntarily exits)
   │
   └─→ [Deceased] (death claim approved)

```

## Finance/GL Domain (`docs/domain/gl.md`)

### Domain Model

#### Entity: Account
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

#### Entity: JournalEntry
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

#### Entity: JournalEntryLine
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

## Initial Chart of Accounts Setup

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

#### Entity: MemberWallet
```javascript
MemberWallet {
  walletId: UUID
  memberId: UUID // One-to-one with Member

  // Balance
  currentBalance: decimal // Current available balance

  // Statistics
  totalDeposited: decimal // Lifetime deposits
  totalDebited: decimal // Lifetime debits

  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Entity: WalletTransaction
```javascript
WalletTransaction {
  transactionId: UUID
  walletId: UUID
  memberId: UUID // Denormalized for queries

  // Transaction Details
  transactionType: enum [Deposit, Debit, Refund, Adjustment]
  amount: decimal
  balanceBefore: decimal
  balanceAfter: decimal

  // Status
  status: enum [Pending, Approved, Rejected, Completed, Cancelled]

  // Source tracking
  sourceModule: enum [Wallet, Contributions, Membership]
  sourceEntityId: UUID? // depositRequestId, contributionId, etc.
  sourceTransactionType: string

  // GL Integration
  journalEntryId: UUID? // Link to GL entry

  // Metadata
  description: string?
  notes: string?

  // Approval (for deposits)
  approvedBy: UUID?
  approvedAt: timestamp?
  rejectionReason: string?

  // Timestamps
  createdAt: timestamp
  createdBy: UUID
}
```

#### Entity: WalletDepositRequest
```javascript
WalletDepositRequest {
  depositRequestId: UUID
  memberId: UUID
  walletId: UUID

  // Deposit Details
  amount: decimal
  collectionDate: date
  collectionMode: enum [Cash, BankTransfer, Cheque]
  referenceNumber: string? // For bank transfer/cheque

  // Agent who collected
  collectedBy: UUID // AgentId

  // Status
  status: enum [PendingApproval, Approved, Rejected]

  // Approval
  approvedBy: UUID?
  approvedAt: timestamp?
  rejectionReason: string?

  // Links
  walletTransactionId: UUID? // Created when approved
  journalEntryId: UUID? // GL entry

  // Metadata
  notes: string?

  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Entity: WalletDebitRequest
```javascript
WalletDebitRequest {
  debitRequestId: UUID
  memberId: UUID
  walletId: UUID

  // Debit Details
  amount: decimal
  reason: string // e.g., "Contribution for death claim CL-001"

  // Source (contribution cycle)
  contributionCycleId: UUID
  memberContributionId: UUID

  // Status
  status: enum [PendingAcknowledgment, Acknowledged, Completed, Invalidated, Cancelled]

  // Acknowledgment (agent confirms with member)
  acknowledgedBy: UUID? // AgentId
  acknowledgedAt: timestamp?

  // Completion
  walletTransactionId: UUID? // Created when debited
  journalEntryId: UUID? // GL entry

  // Invalidation (if member pays directly)
  invalidatedReason: string?
  invalidatedBy: UUID?
  invalidatedAt: timestamp?

  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Business Rules

#### Wallet Creation

- Created automatically when member registration is approved
- Initial balance = advance deposit from registration payment
- One wallet per member (one-to-one)

#### Deposits

- Agent collects cash/payment → creates deposit request
- Deposit request requires approval (Unit Admin or configured approver)
- Upon approval: wallet credited + GL entry created (atomic)
- Can only deposit positive amounts

#### Debits

- System creates debit request (e.g., when contribution cycle starts)
- Requires member acknowledgment (via agent)
- Upon acknowledgment: wallet debited + GL entry created (atomic)
- Cannot debit if insufficient balance
- Can be invalidated if member pays directly in cash

#### Balance Rules

- Balance cannot go negative
- Balance = sum of all completed transactions
- Wallet balance must reconcile with GL account 2100 (Member Prepaid Liability)

