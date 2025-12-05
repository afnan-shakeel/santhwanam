# Death Claims & Contribution Collection Context - Complete Design

---

# Part 1: Death Claims Context

## Domain Model

### **Entity: DeathClaim**

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

### **Entity: DeathClaimDocument**

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

## Commands

### **1. ReportDeath**

**Triggered by:** Agent, Unit Admin, Area Admin, Forum Admin, Super Admin

**Input:**
```json
{
  "memberId": "uuid",
  "deathDate": "date",
  "deathPlace": "string?",
  "causeOfDeath": "string?",
  "initialNotes": "string?",
  "reportedBy": "uuid"
}
```

**Preconditions:**
- Member exists with status = "Active"
- Member has at least one nominee
- Death date <= today
- Death date >= member registration date
- No existing death claim for member

**Backend Logic:**
```javascript
async function reportDeath(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Check permission
    const canReport = await hasPermission(
      input.reportedBy,
      'death_claim.report',
      {}
    );
    
    if (!canReport) {
      throw new Error('Not authorized to report deaths');
    }
    
    // 2. Get member with nominee and tier
    const member = await db.members.findByPk(input.memberId, {
      include: [
        { model: db.membershipTiers, as: 'tier' },
        { model: db.nominees, as: 'nominees', where: { isActive: true } }
      ]
    }, { transaction: trx });
    
    if (!member) {
      throw new Error('Member not found');
    }
    
    if (member.memberStatus !== 'Active') {
      throw new Error('Only active members can have death claims');
    }
    
    if (!member.nominees || member.nominees.length === 0) {
      throw new Error('Member has no active nominees');
    }
    
    // 3. Validate death date
    if (input.deathDate > new Date()) {
      throw new Error('Death date cannot be in future');
    }
    
    if (input.deathDate < member.registeredAt) {
      throw new Error('Death date cannot be before registration');
    }
    
    // 4. Check for existing claim
    const existingClaim = await db.deathClaims.findOne({
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    if (existingClaim) {
      throw new Error('Death claim already exists for this member');
    }
    
    // 5. Get primary nominee
    const primaryNominee = member.nominees.find(n => n.priority === 1);
    if (!primaryNominee) {
      throw new Error('No primary nominee found');
    }
    
    // 6. Generate claim number
    const claimNumber = await generateClaimNumber();
    
    // 7. Get reporter role
    const reporterRoles = await getUserRoles(input.reportedBy);
    const reporterRole = reporterRoles.length > 0 
      ? reporterRoles[0].role.roleCode 
      : 'Unknown';
    
    // 8. Create death claim
    const claim = await db.deathClaims.create({
      claimId: generateUUID(),
      claimNumber,
      claimStatus: 'Reported',
      memberId: input.memberId,
      memberCode: member.memberCode,
      memberName: `${member.firstName} ${member.lastName}`,
      tierId: member.tierId,
      agentId: member.agentId,
      unitId: member.unitId,
      areaId: member.areaId,
      forumId: member.forumId,
      deathDate: input.deathDate,
      deathPlace: input.deathPlace,
      causeOfDeath: input.causeOfDeath,
      reportedBy: input.reportedBy,
      reportedByRole: reporterRole,
      reportedDate: new Date(),
      initialNotes: input.initialNotes,
      nomineeId: primaryNominee.nomineeId,
      nomineeName: primaryNominee.name,
      nomineeRelation: primaryNominee.relationType,
      nomineeContactNumber: primaryNominee.contactNumber,
      nomineeAddress: {
        line1: primaryNominee.addressLine1,
        line2: primaryNominee.addressLine2,
        city: primaryNominee.city,
        state: primaryNominee.state,
        postalCode: primaryNominee.postalCode,
        country: primaryNominee.country
      },
      verificationStatus: 'Pending',
      settlementStatus: 'Pending',
      createdAt: new Date()
    }, { transaction: trx });
    
    // 9. Emit event
    await emitEvent('DeathReported', {
      claimId: claim.claimId,
      claimNumber: claim.claimNumber,
      memberId: input.memberId,
      memberCode: member.memberCode,
      deathDate: input.deathDate,
      reportedBy: input.reportedBy
    });
    
    return claim;
  });
}
```

**Outcome:**
- Death claim created with status "Reported"
- Event: `DeathReported`

---

### **2. UploadClaimDocument**

**Triggered by:** Reporter, Admins

**Input:**
```json
{
  "claimId": "uuid",
  "documentType": "DeathCertificate|NewspaperClipping|...",
  "documentName": "string",
  "file": "file",
  "uploadedBy": "uuid"
}
```

**Preconditions:**
- Claim exists
- Claim status = "Reported" or "UnderVerification"
- Valid file type (PDF, JPG, PNG)
- File size <= 5MB

**Backend Logic:**
```javascript
async function uploadClaimDocument(input) {
  return await db.transaction(async (trx) => {
    
    const claim = await db.deathClaims.findByPk(input.claimId, { transaction: trx });
    
    if (!claim) {
      throw new Error('Claim not found');
    }
    
    if (!['Reported', 'UnderVerification'].includes(claim.claimStatus)) {
      throw new Error('Cannot upload documents in this status');
    }
    
    // Validate file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(input.file.mimeType)) {
      throw new Error('Invalid file type');
    }
    
    if (input.file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB');
    }
    
    // Upload file
    const fileUrl = await uploadFile(
      input.file,
      `death-claims/${input.claimId}`
    );
    
    // Create document
    const document = await db.deathClaimDocuments.create({
      documentId: generateUUID(),
      claimId: input.claimId,
      documentType: input.documentType,
      documentName: input.documentName,
      fileUrl,
      fileSize: input.file.size,
      mimeType: input.file.mimeType,
      uploadedBy: input.uploadedBy,
      uploadedAt: new Date(),
      verificationStatus: 'Pending'
    }, { transaction: trx });
    
    // Update claim status to UnderVerification
    if (claim.claimStatus === 'Reported') {
      await db.deathClaims.update({
        claimStatus: 'UnderVerification',
        verificationStatus: 'InProgress',
        updatedAt: new Date()
      }, {
        where: { claimId: input.claimId }
      }, { transaction: trx });
    }
    
    await emitEvent('ClaimDocumentUploaded', {
      claimId: input.claimId,
      documentId: document.documentId,
      documentType: input.documentType
    });
    
    return document;
  });
}
```

**Outcome:**
- Document uploaded
- Claim status may → "UnderVerification"

---

### **3. VerifyClaimDocuments**

**Triggered by:** Forum Admin, Super Admin

**Input:**
```json
{
  "claimId": "uuid",
  "verificationNotes": "string?",
  "verifiedBy": "uuid"
}
```

**Preconditions:**
- Claim status = "UnderVerification"
- At least Death Certificate uploaded
- User has `death_claim.verify` permission

**Backend Logic:**
```javascript
async function verifyClaimDocuments(input) {
  return await db.transaction(async (trx) => {
    
    // Check permission
    const canVerify = await hasPermission(
      input.verifiedBy,
      'death_claim.verify',
      {}
    );
    
    if (!canVerify) {
      throw new Error('Not authorized');
    }
    
    // Get claim with documents
    const claim = await db.deathClaims.findByPk(input.claimId, {
      include: [{ model: db.deathClaimDocuments, as: 'documents' }]
    }, { transaction: trx });
    
    if (!claim || claim.claimStatus !== 'UnderVerification') {
      throw new Error('Invalid claim or status');
    }
    
    // Check required documents
    const hasDeathCert = claim.documents.some(
      d => d.documentType === 'DeathCertificate'
    );
    
    if (!hasDeathCert) {
      throw new Error('Death certificate required');
    }
    
    // Mark all documents as verified
    await db.deathClaimDocuments.update({
      verificationStatus: 'Verified',
      verifiedBy: input.verifiedBy,
      verifiedAt: new Date()
    }, {
      where: { 
        claimId: input.claimId,
        verificationStatus: 'Pending'
      }
    }, { transaction: trx });
    
    // Update claim
    await db.deathClaims.update({
      verificationStatus: 'Completed',
      verifiedBy: input.verifiedBy,
      verifiedDate: new Date(),
      verificationNotes: input.verificationNotes,
      updatedAt: new Date()
    }, {
      where: { claimId: input.claimId }
    }, { transaction: trx });
    
    await emitEvent('ClaimDocumentsVerified', {
      claimId: input.claimId,
      verifiedBy: input.verifiedBy
    });
    
    return claim;
  });
}
```

**Outcome:**
- Documents verified
- Claim verification status → "Completed"
- Ready for approval

---

### **4. SubmitClaimForApproval**

**Triggered by:** Admin after verification

**Input:**
```json
{
  "claimId": "uuid"
}
```

**Backend Logic:**
```javascript
async function submitClaimForApproval(input) {
  return await db.transaction(async (trx) => {
    
    const claim = await db.deathClaims.findByPk(input.claimId, { transaction: trx });
    
    if (!claim || claim.claimStatus !== 'UnderVerification') {
      throw new Error('Invalid claim or status');
    }
    
    if (claim.verificationStatus !== 'Completed') {
      throw new Error('Documents must be verified first');
    }
    
    // Update status
    await db.deathClaims.update({
      claimStatus: 'PendingApproval',
      updatedAt: new Date()
    }, {
      where: { claimId: input.claimId }
    }, { transaction: trx });
    
    // CREATE APPROVAL REQUEST
    const approvalRequest = await createApprovalRequest({
      workflowCode: 'death_claim_approval',
      entityType: 'DeathClaim',
      entityId: input.claimId,
      forumId: claim.forumId,
      areaId: claim.areaId,
      unitId: claim.unitId,
      submittedBy: claim.verifiedBy
    }, trx);
    
    // Link approval
    await db.deathClaims.update({
      approvalRequestId: approvalRequest.requestId
    }, {
      where: { claimId: input.claimId }
    }, { transaction: trx });
    
    await emitEvent('DeathClaimSubmittedForApproval', {
      claimId: input.claimId,
      claimNumber: claim.claimNumber,
      approvalRequestId: approvalRequest.requestId
    });
    
    return claim;
  });
}
```

**Outcome:**
- Status → "PendingApproval"
- Approval request created

---

### **5. Approval Event Listener**

```javascript
on('ApprovalRequestApproved', async (event) => {
  if (event.workflowCode === 'death_claim_approval') {
    await approveDeathClaim(event.entityId, event.finalApprovedBy);
  }
});

async function approveDeathClaim(claimId, approvedBy) {
  return await db.transaction(async (trx) => {
    
    // 1. Get claim with member and tier
    const claim = await db.deathClaims.findByPk(claimId, {
      include: [
        { 
          model: db.members, 
          as: 'member',
          include: [{ model: db.membershipTiers, as: 'tier' }]
        }
      ]
    }, { transaction: trx });
    
    // 2. Get benefit amount from tier
    const benefitAmount = claim.member.tier.deathBenefitAmount;
    
    // 3. Update claim
    await db.deathClaims.update({
      claimStatus: 'Approved',
      benefitAmount,
      approvedBy,
      approvedAt: new Date(),
      updatedAt: new Date()
    }, {
      where: { claimId }
    }, { transaction: trx });
    
    // 4. Update member status to Deceased
    await db.members.update({
      memberStatus: 'Deceased',
      updatedAt: new Date()
    }, {
      where: { memberId: claim.memberId }
    }, { transaction: trx });
    
    // 5. Decrement agent statistics
    await db.agents.decrement('totalActiveMembers', {
      where: { agentId: claim.agentId }
    }, { transaction: trx });
    
    // 6. Emit event (TRIGGERS CONTRIBUTION COLLECTION)
    await emitEvent('DeathClaimApproved', {
      claimId,
      claimNumber: claim.claimNumber,
      memberId: claim.memberId,
      memberCode: claim.memberCode,
      benefitAmount,
      tierId: claim.tierId,
      forumId: claim.forumId,
      approvedBy
    });
    
    return claim;
  });
}
```

**Outcome:**
- Claim status → "Approved"
- Benefit amount locked
- Member status → "Deceased"
- **Triggers contribution collection cycle**
- Event: `DeathClaimApproved`

---

### **6. Rejection Event Listener**

```javascript
on('ApprovalRequestRejected', async (event) => {
  if (event.workflowCode === 'death_claim_approval') {
    await rejectDeathClaim(
      event.entityId,
      event.rejectedBy,
      event.rejectionReason
    );
  }
});

async function rejectDeathClaim(claimId, rejectedBy, rejectionReason) {
  await db.deathClaims.update({
    claimStatus: 'Rejected',
    verificationStatus: 'Rejected',
    rejectedBy,
    rejectionReason,
    updatedAt: new Date()
  }, {
    where: { claimId }
  });
  
  await emitEvent('DeathClaimRejected', {
    claimId,
    rejectionReason
  });
}
```

---

### **7. SettleDeathClaim** (Payout)

**Triggered by:** Finance team, Forum Admin, Super Admin

**Input:**
```json
{
  "claimId": "uuid",
  "paymentMethod": "Cash|BankTransfer|Cheque",
  "paymentReference": "string?",
  "paymentDate": "date",
  "nomineeAcknowledgment": "file?",
  "paidBy": "uuid"
}
```

**Preconditions:**
- Claim status = "Approved"
- User has `death_claim.settle` permission

**Backend Logic:**
```javascript
async function settleDeathClaim(input) {
  return await db.transaction(async (trx) => {
    
    const canSettle = await hasPermission(
      input.paidBy,
      'death_claim.settle',
      {}
    );
    
    if (!canSettle) {
      throw new Error('Not authorized');
    }
    
    const claim = await db.deathClaims.findByPk(input.claimId, { transaction: trx });
    
    if (!claim || claim.claimStatus !== 'Approved') {
      throw new Error('Invalid claim or not approved');
    }
    
    if (claim.settlementStatus === 'Completed') {
      throw new Error('Claim already settled');
    }
    
    // Upload acknowledgment
    let acknowledgmentUrl = null;
    if (input.nomineeAcknowledgment) {
      acknowledgmentUrl = await uploadFile(
        input.nomineeAcknowledgment,
        `death-claims/${input.claimId}/settlement`
      );
    }
    
    // Create GL entry
    const journalEntry = await glService.createJournalEntry({
      entries: [
        {
          accountCode: "5100", // Death Benefit Expense
          debit: claim.benefitAmount,
          description: `Death benefit payout to ${claim.nomineeName}`
        },
        {
          accountCode: "1000", // Cash
          credit: claim.benefitAmount,
          description: `Payment via ${input.paymentMethod}`
        }
      ],
      reference: `Death Benefit Payout - ${claim.claimNumber}`,
      transactionDate: input.paymentDate,
      sourceModule: "Claims",
      sourceEntityId: claim.claimId,
      sourceTransactionType: "DeathBenefitPayout",
      createdBy: input.paidBy
    }, trx);
    
    // Update claim
    await db.deathClaims.update({
      claimStatus: 'Settled',
      settlementStatus: 'Completed',
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
      paymentDate: input.paymentDate,
      paidBy: input.paidBy,
      nomineeAcknowledgment: acknowledgmentUrl,
      journalEntryId: journalEntry.entryId,
      settledAt: new Date(),
      updatedAt: new Date()
    }, {
      where: { claimId: input.claimId }
    }, { transaction: trx });
    
    await emitEvent('DeathClaimSettled', {
      claimId: input.claimId,
      claimNumber: claim.claimNumber,
      benefitAmount: claim.benefitAmount,
      paymentMethod: input.paymentMethod,
      paidBy: input.paidBy
    });
    
    return claim;
  });
}
```

**Outcome:**
- Claim status → "Settled"
- GL entry created (Dr Expense, Cr Cash)
- Payment recorded
- Event: `DeathClaimSettled`

---

# Part 2: Contribution Collection Context

## Domain Model

### **Entity: ContributionCycle**

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

### **Entity: MemberContribution**

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

## Commands

### **1. StartContributionCycle** (System)

**Triggered by:** Event listener on `DeathClaimApproved`

**Input:**
```json
{
  "deathClaimId": "uuid",
  "gracePeriodDays": 30
}
```

**Backend Logic:**
```javascript
on('DeathClaimApproved', async (event) => {
  await startContributionCycle({
    deathClaimId: event.claimId,
    gracePeriodDays: 30
  });
});

async function startContributionCycle(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get claim
    const claim = await db.deathClaims.findByPk(input.deathClaimId, {
      include: [{ model: db.members, as: 'member', include: ['tier'] }]
    }, { transaction: trx });
    
    if (!claim || claim.claimStatus !== 'Approved') {
      throw new Error('Invalid claim');
    }
    
    // 2. Check if cycle exists (idempotent)
    const existing = await db.contributionCycles.findOne({
      where: { deathClaimId: input.deathClaimId }
    }, { transaction: trx });
    
    if (existing) {
      return existing;
    }
    
    // 3. Get all active members (except deceased)
    const activeMembers = await db.members.findAll({
      where: {
        memberStatus: 'Active',
        memberId: { ne: claim.memberId }
      },
      include: [
        { model: db.membershipTiers, as: 'tier' },
        { model: db.agents, as: 'agent' }
      ]
    }, { transaction: trx });
    
    // 4. Calculate totals
    let totalExpectedAmount = 0;
    for (const member of activeMembers) {
      totalExpectedAmount += member.tier.contributionAmount;
    }
    
    // 5. Generate cycle number
    const cycleNumber = await generateCycleNumber();
    
    // 6. Calculate deadline
    const startDate = new Date();
    const collectionDeadline = new Date(startDate);
    collectionDeadline.setDate(collectionDeadline.getDate() + input.gracePeriodDays);
    
    // 7. Create cycle
    const cycle = await db.contributionCycles.create({
      cycleId: generateUUID(),
      cycleNumber,
      deathClaimId: input.deathClaimId,
      claimNumber: claim.claimNumber,
      deceasedMemberId: claim.memberId,
      deceasedMemberName: claim.memberName,
      benefitAmount: claim.benefitAmount,
      forumId: claim.forumId,
      startDate,
      collectionDeadline,
      cycleStatus: 'Active',
      totalMembers: activeMembers.length,
      totalExpectedAmount,
      totalCollectedAmount: 0,
      totalPendingAmount: totalExpectedAmount,
      membersCollected: 0,
      membersPending: activeMembers.length,
      membersMissed: 0,
      createdAt: new Date()
    }, { transaction: trx });
    
    // 8. Create member contributions
    for (const member of activeMembers) {
      await db.memberContributions.create({
        contributionId: generateUUID(),
        cycleId: cycle.cycleId,
        memberId: member.memberId,
        memberCode: member.memberCode,
        memberName: `${member.firstName} ${member.lastName}`,
        tierId: member.tierId,
        agentId: member.agentId,
        expectedAmount: member.tier.contributionAmount,
        contributionStatus: 'Pending',
        isConsecutiveMiss: false,
        createdAt: new Date()
      }, { transaction: trx });
    }
    
    // 9. Create wallet debit requests
    await createWalletDebitRequests(cycle.cycleId, trx);
    
    await emitEvent('ContributionCycleStarted', {
      cycleId: cycle.cycleId,
      cycleNumber,
      deathClaimId: input.deathClaimId,
      totalMembers: activeMembers.length,
      totalExpectedAmount,
      collectionDeadline
    });
    
    return cycle;
  });
}
```

**Outcome:**
- Contribution cycle created
- Member contributions created for all active members
- Wallet debit requests created where applicable
- Event: `ContributionCycleStarted`

---

### **2. CreateWalletDebitRequests** (Helper)

```javascript
async function createWalletDebitRequests(cycleId, trx) {
  const contributions = await db.memberContributions.findAll({
    where: { cycleId, contributionStatus: 'Pending' },
    include: [
      { model: db.members, as: 'member', include: ['wallet'] }
    ]
  }, { transaction: trx });
  
  for (const contribution of contributions) {
    const wallet = contribution.member.wallet;
    
    // Only create if sufficient balance
    if (wallet && wallet.currentBalance >= contribution.expectedAmount) {
      
      const debitRequest = await db.walletDebitRequests.create({
        debitRequestId: generateUUID(),
        memberId: contribution.memberId,
        walletId: wallet.walletId,
        amount: contribution.expectedAmount,
        purpose: `Contribution for ${contribution.cycleNumber}`,
        contributionCycleId: cycleId,
        contributionId: contribution.contributionId,
        status: 'PendingAcknowledgment',
        createdAt: new Date()
      }, { transaction: trx });
      
      await db.memberContributions.update({
        contributionStatus: 'WalletDebitRequested',
        walletDebitRequestId: debitRequest.debitRequestId
      }, {
        where: { contributionId: contribution.contributionId }
      }, { transaction: trx });
      
      await emitEvent('WalletDebitRequestCreated', {
        debitRequestId: debitRequest.debitRequestId,
        memberId: contribution.memberId,
        amount: contribution.expectedAmount,
        cycleId
      });
    }
  }
}
```

---

### **3. AcknowledgeContributionDebit**

**Triggered by:** Agent

**Input:**
```json
{
  "contributionId": "uuid",
  "acknowledgedBy": "uuid"
}
```

**Backend Logic:**
```javascript
async function acknowledgeContributionDebit(input) {
  return await db.transaction(async (trx) => {
    
    const contribution = await db.memberContributions.findByPk(
      input.contributionId,
      { include: [
        { model: db.members, as: 'member', include: ['wallet'] },
        { model: db.contributionCycles, as: 'cycle' }
      ]},
      { transaction: trx }
    );
    
    if (!contribution || contribution.contributionStatus !== 'WalletDebitRequested') {
      throw new Error('Invalid contribution');
    }
    
    // Verify agent
    if (contribution.agentId !== input.acknowledgedBy) {
      throw new Error('Only assigned agent can acknowledge');
    }
    
    // Get debit request
    const debitRequest = await db.walletDebitRequests.findByPk(
      contribution.walletDebitRequestId,
      { transaction: trx }
    );
    
    if (!debitRequest || debitRequest.status !== 'PendingAcknowledgment') {
      throw new Error('Invalid debit request');
    }
    
    const wallet = contribution.member.wallet;
    
    // Verify balance
    if (wallet.currentBalance < contribution.expectedAmount) {
      throw new Error('Insufficient balance');
    }
    
    // Debit wallet
    await db.wallets.decrement('currentBalance', {
      by: contribution.expectedAmount,
      where: { walletId: wallet.walletId }
    }, { transaction: trx });
    
    // Get updated balance
    const updatedWallet = await db.wallets.findByPk(
      wallet.walletId,
      { transaction: trx }
    );
    
    // Update debit request
    await db.walletDebitRequests.update({
      status: 'Completed',
      acknowledgedAt: new Date(),
      completedAt: new Date()
    }, {
      where: { debitRequestId: debitRequest.debitRequestId }
    }, { transaction: trx });
    
    // Create GL entry
    const journalEntry = await glService.createJournalEntry({
      entries: [
        {
          accountCode: "2100",
          debit: contribution.expectedAmount,
          description: `Contribution from ${contribution.memberName}`
        },
        {
          accountCode: "4200",
          credit: contribution.expectedAmount,
          description: `Contribution for ${contribution.cycle.cycleNumber}`
        }
      ],
      reference: `Contribution - ${contribution.contributionId}`,
      transactionDate: new Date(),
      sourceModule: "Contributions",
      sourceEntityId: contribution.contributionId,
      sourceTransactionType: "ContributionFromWallet",
      createdBy: input.acknowledgedBy
    }, trx);
    
    // Create wallet transaction
    await db.walletTransactions.create({
      transactionId: generateUUID(),
      walletId: wallet.walletId,
      transactionType: 'Debit',
      amount: contribution.expectedAmount,
      balanceAfter: updatedWallet.currentBalance,
      sourceModule: 'Contributions',
      sourceEntityId: contribution.contributionId,
      description: `Contribution for ${contribution.cycle.cycleNumber}`,
      journalEntryId: journalEntry.entryId,
      status: 'Completed',
      createdBy: input.acknowledgedBy,
      createdAt: new Date()
    }, { transaction: trx });
    
    // Update contribution
    await db.memberContributions.update({
      contributionStatus: 'Collected',
      paymentMethod: 'Wallet',
      collectionDate: new Date(),
      collectedBy: input.acknowledgedBy,
      debitAcknowledgedAt: new Date(),
      journalEntryId: journalEntry.entryId
    }, {
      where: { contributionId: input.contributionId }
    }, { transaction: trx });
    
    // Update cycle statistics
    await updateCycleStatistics(contribution.cycleId, trx);
    
    // Reset member miss counter
    await resetMemberMissCounter(contribution.memberId, trx);
    
    await emitEvent('ContributionCollected', {
      contributionId: input.contributionId,
      cycleId: contribution.cycleId,
      memberId: contribution.memberId,
      amount: contribution.expectedAmount,
      paymentMethod: 'Wallet'
    });
    
    return contribution;
  });
}
```

**Outcome:**
- Wallet debited
- GL entry created
- Contribution status → "Collected"
- Cycle statistics updated

---

### **4. RecordDirectCashContribution**

**Triggered by:** Agent

**Input:**
```json
{
  "contributionId": "uuid",
  "cashReceiptReference": "string?",
  "collectedBy": "uuid"
}
```

**Backend Logic:**
```javascript
async function recordDirectCashContribution(input) {
  return await db.transaction(async (trx) => {
    
    const contribution = await db.memberContributions.findByPk(
      input.contributionId,
      { include: [{ model: db.contributionCycles, as: 'cycle' }] },
      { transaction: trx }
    );
    
    if (!contribution) {
      throw new Error('Contribution not found');
    }
    
    if (!['Pending', 'WalletDebitRequested'].includes(contribution.contributionStatus)) {
      throw new Error('Invalid status');
    }
    
    // Verify agent
    if (contribution.agentId !== input.collectedBy) {
      throw new Error('Only assigned agent can record');
    }
    
    // Invalidate wallet debit if exists
    if (contribution.walletDebitRequestId) {
      await db.walletDebitRequests.update({
        status: 'Invalidated'
      }, {
        where: { debitRequestId: contribution.walletDebitRequestId }
      }, { transaction: trx });
    }
    
    // Create GL entry
    const journalEntry = await glService.createJournalEntry({
      entries: [
        {
          accountCode: "1000",
          debit: contribution.expectedAmount,
          description: `Cash contribution from ${contribution.memberName}`
        },
        {
          accountCode: "4200",
          credit: contribution.expectedAmount,
          description: `Contribution for ${contribution.cycle.cycleNumber}`
        }
      ],
      reference: `Contribution - ${contribution.contributionId}`,
      transactionDate: new Date(),
      sourceModule: "Contributions",
      sourceEntityId: contribution.contributionId,
      sourceTransactionType: "ContributionDirectCash",
      createdBy: input.collectedBy
    }, trx);
    
    // Update contribution
    await db.memberContributions.update({
      contributionStatus: 'Collected',
      paymentMethod: 'DirectCash',
      collectionDate: new Date(),
      collectedBy: input.collectedBy,
      cashReceiptReference: input.cashReceiptReference,
      journalEntryId: journalEntry.entryId
    }, {
      where: { contributionId: input.contributionId }
    }, { transaction: trx });
    
    // Update cycle statistics
    await updateCycleStatistics(contribution.cycleId, trx);
    
    // Reset member miss counter
    await resetMemberMissCounter(contribution.memberId, trx);
    
    await emitEvent('ContributionCollected', {
      contributionId: input.contributionId,
      cycleId: contribution.cycleId,
      memberId: contribution.memberId,
      amount: contribution.expectedAmount,
      paymentMethod: 'DirectCash'
    });
    
    return contribution;
  });
}
```

**Outcome:**
- GL entry created (Dr Cash, Cr Income)
- Contribution status → "Collected"
- Wallet debit invalidated if exists

---

### **5. MarkContributionAsMissed**

**Triggered by:** System (scheduled job) OR Admin

**Input:**
```json
{
  "contributionId": "uuid",
  "markedBy": "uuid?"
}
```

**Backend Logic:**
```javascript
async function markContributionAsMissed(input) {
  return await db.transaction(async (trx) => {
    
    const contribution = await db.memberContributions.findByPk(
      input.contributionId,
      { include: [{ model: db.members, as: 'member' }] },
      { transaction: trx }
    );
    
    if (!contribution) {
      throw new Error('Contribution not found');
    }
    
    if (!['Pending', 'WalletDebitRequested'].includes(contribution.contributionStatus)) {
      throw new Error('Cannot mark as missed');
    }
    
    // Check if consecutive miss
    const previousMiss = await db.memberContributions.findOne({
      where: {
        memberId: contribution.memberId,
        contributionStatus: 'Missed',
        cycleId: { ne: contribution.cycleId }
      },
      order: [['createdAt', 'DESC']]
    }, { transaction: trx });
    
    const isConsecutiveMiss = !!previousMiss;
    
    // Update contribution
    await db.memberContributions.update({
      contributionStatus: 'Missed',
      isConsecutiveMiss
    }, {
      where: { contributionId: input.contributionId }
    }, { transaction: trx });
    
    // Mark wallet debit as failed
    if (contribution.walletDebitRequestId) {
      await db.walletDebitRequests.update({
        status: 'Failed'
      }, {
        where: { debitRequestId: contribution.walletDebitRequestId }
      }, { transaction: trx });
    }
    
    // Update cycle stats
    await updateCycleStatistics(contribution.cycleId, trx);
    
    // If consecutive miss, suspend member
    if (isConsecutiveMiss) {
      await suspendMemberForNonPayment(
        contribution.memberId,
        input.contributionId,
        trx
      );
    }
    
    await emitEvent('ContributionMissed', {
      contributionId: input.contributionId,
      memberId: contribution.memberId,
      isConsecutiveMiss,
      memberSuspended: isConsecutiveMiss
    });
    
    return contribution;
  });
}
```

**Outcome:**
- Contribution status → "Missed"
- If 2nd consecutive miss → Member suspended

---

### **6. CloseContributionCycle**

**Triggered by:** System (scheduled) OR Admin

**Input:**
```json
{
  "cycleId": "uuid",
  "closedBy": "uuid?"
}
```

**Backend Logic:**
```javascript
async function closeContributionCycle(input) {
  return await db.transaction(async (trx) => {
    
    const cycle = await db.contributionCycles.findByPk(
      input.cycleId,
      { transaction: trx }
    );
    
    if (!cycle || cycle.cycleStatus === 'Closed') {
      return cycle;
    }
    
    // Mark all pending as missed
    const pendingContributions = await db.memberContributions.findAll({
      where: {
        cycleId: input.cycleId,
        contributionStatus: { in: ['Pending', 'WalletDebitRequested'] }
      }
    }, { transaction: trx });
    
    for (const contribution of pendingContributions) {
      await markContributionAsMissed({
        contributionId: contribution.contributionId,
        markedBy: input.closedBy
      });
    }
    
    // Update cycle
    await db.contributionCycles.update({
      cycleStatus: 'Closed',
      closedDate: new Date(),
      closedBy: input.closedBy
    }, {
      where: { cycleId: input.cycleId }
    }, { transaction: trx });
    
    await emitEvent('ContributionCycleClosed', {
      cycleId: input.cycleId,
      cycleNumber: cycle.cycleNumber,
      totalCollected: cycle.totalCollectedAmount,
      totalExpected: cycle.totalExpectedAmount
    });
    
    return cycle;
  });
}
```

---

## Helper Functions

### **UpdateCycleStatistics**

```javascript
async function updateCycleStatistics(cycleId, trx) {
  const stats = await db.memberContributions.findAll({
    where: { cycleId },
    attributes: [
      [db.fn('COUNT', db.col('contribution_id')), 'total'],
      [db.fn('COUNT', db.literal("CASE WHEN contribution_status = 'Collected' THEN 1 END")), 'collected'],
      [db.fn('COUNT', db.literal("CASE WHEN contribution_status IN ('Pending', 'WalletDebitRequested') THEN 1 END")), 'pending'],
      [db.fn('COUNT', db.literal("CASE WHEN contribution_status = 'Missed' THEN 1 END")), 'missed'],
      [db.fn('SUM', db.literal("CASE WHEN contribution_status = 'Collected' THEN expected_amount ELSE 0 END")), 'collectedAmount']
    ],
    raw: true
  }, { transaction: trx });
  
  const stat = stats[0];
  
  const cycle = await db.contributionCycles.findByPk(cycleId, { transaction: trx });
  
  await db.contributionCycles.update({
    membersCollected: stat.collected || 0,
    membersPending: stat.pending || 0,
    membersMissed: stat.missed || 0,
    totalCollectedAmount: stat.collectedAmount || 0,
    totalPendingAmount: cycle.totalExpectedAmount - (stat.collectedAmount || 0),
    updatedAt: new Date()
  }, {
    where: { cycleId }
  }, { transaction: trx });
}
```

---

### **ResetMemberMissCounter**

```javascript
async function resetMemberMissCounter(memberId, trx) {
  await db.memberContributions.update({
    isConsecutiveMiss: false
  }, {
    where: {
      memberId,
      contributionStatus: 'Missed'
    }
  }, { transaction: trx });
}
```

---

### **SuspendMemberForNonPayment**

```javascript
async function suspendMemberForNonPayment(memberId, contributionId, trx) {
  await db.members.update({
    memberStatus: 'Suspended',
    suspensionReason: 'Missed 2 consecutive contributions',
    suspensionCounter: 2,
    suspendedAt: new Date()
  }, {
    where: { memberId }
  }, { transaction: trx });
  
  // Update agent statistics
  const member = await db.members.findByPk(memberId, { transaction: trx });
  await db.agents.decrement('totalActiveMembers', {
    where: { agentId: member.agentId }
  }, { transaction: trx });
  
  await emitEvent('MemberSuspended', {
    memberId,
    reason: 'ConsecutiveContributionMiss',
    contributionId
  });
}
```

---

## Database Schema

```sql
CREATE TABLE death_claims (
  claim_id UUID PRIMARY KEY,
  claim_number VARCHAR(50) UNIQUE NOT NULL,
  claim_status VARCHAR(50) DEFAULT 'Reported',
  approval_request_id UUID REFERENCES approval_requests(request_id),
  member_id UUID NOT NULL REFERENCES members(member_id),
  member_code VARCHAR(50),
  member_name VARCHAR(255),
  tier_id UUID NOT NULL REFERENCES membership_tiers(tier_id),
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  unit_id UUID NOT NULL REFERENCES units(unit_id),
  area_id UUID NOT NULL REFERENCES areas(area_id),
  forum_id UUID NOT NULL REFERENCES forums(forum_id),
  death_date DATE NOT NULL,
  death_place VARCHAR(255),
  cause_of_death TEXT,
  reported_by UUID NOT NULL REFERENCES users(user_id),
  reported_by_role VARCHAR(50),
  reported_date DATE NOT NULL,
  initial_notes TEXT,
  nominee_id UUID NOT NULL,
  nominee_name VARCHAR(255),
  nominee_relation VARCHAR(50),
  nominee_contact_number VARCHAR(20),
  nominee_address JSON,
  benefit_amount DECIMAL(15,2),
  verification_status VARCHAR(50) DEFAULT 'Pending',
  verified_by UUID REFERENCES users(user_id),
  verified_date DATE,
  verification_notes TEXT,
  settlement_status VARCHAR(50) DEFAULT 'Pending',
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  payment_date DATE,
  paid_by UUID REFERENCES users(user_id),
  nominee_acknowledgment VARCHAR(500),
  journal_entry_id UUID REFERENCES journal_entries(entry_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  settled_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by UUID REFERENCES users(user_id),
  rejected_by UUID REFERENCES users(user_id),
  rejection_reason TEXT
);

CREATE TABLE death_claim_documents (
  document_id UUID PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES death_claims(claim_id),
  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_status VARCHAR(50) DEFAULT 'Pending',
  verified_by UUID REFERENCES users(user_id),
  verified_at TIMESTAMP,
  rejection_reason TEXT
);

CREATE TABLE contribution_cycles (
  cycle_id UUID PRIMARY KEY,
  cycle_number VARCHAR(50) UNIQUE NOT NULL,
  death_claim_id UUID NOT NULL REFERENCES death_claims(claim_id),
  claim_number VARCHAR(50),
  deceased_member_id UUID NOT NULL,
  deceased_member_name VARCHAR(255),
  benefit_amount DECIMAL(15,2),
  forum_id UUID NOT NULL REFERENCES forums(forum_id),
  start_date DATE NOT NULL,
  collection_deadline DATE NOT NULL,
  cycle_status VARCHAR(50) DEFAULT 'Active',
  total_members INT,
  total_expected_amount DECIMAL(15,2),
  total_collected_amount DECIMAL(15,2) DEFAULT 0,
  total_pending_amount DECIMAL(15,2),
  members_collected INT DEFAULT 0,
  members_pending INT,
  members_missed INT DEFAULT 0,
  closed_date DATE,
  closed_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE member_contributions (
  contribution_id UUID PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES contribution_cycles(cycle_id),
  member_id UUID NOT NULL REFERENCES members(member_id),
  member_code VARCHAR(50),
  member_name VARCHAR(255),
  tier_id UUID NOT NULL REFERENCES membership_tiers(tier_id),
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  expected_amount DECIMAL(15,2) NOT NULL,
  contribution_status VARCHAR(50) DEFAULT 'Pending',
  payment_method VARCHAR(50),
  collection_date DATE,
  collected_by UUID REFERENCES agents(agent_id),
  wallet_debit_request_id UUID REFERENCES wallet_debit_requests(debit_request_id),
  debit_acknowledged_at TIMESTAMP,
  cash_receipt_reference VARCHAR(255),
  journal_entry_id UUID REFERENCES journal_entries(entry_id),
  is_consecutive_miss BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_claims_member ON death_claims(member_id);
CREATE INDEX idx_claims_status ON death_claims(claim_status);
CREATE INDEX idx_claims_approval ON death_claims(approval_request_id);
CREATE INDEX idx_claim_docs_claim ON death_claim_documents(claim_id);
CREATE INDEX idx_cycles_claim ON contribution_cycles(death_claim_id);
CREATE INDEX idx_cycles_status ON contribution_cycles(cycle_status);
CREATE INDEX idx_contributions_cycle ON member_contributions(cycle_id);
CREATE INDEX idx_contributions_member ON member_contributions(member_id);
CREATE INDEX idx_contributions_status ON member_contributions(contribution_status);
```

---

## Events

**Death Claims:**
- `DeathReported`
- `ClaimDocumentUploaded`
- `ClaimDocumentsVerified`
- `DeathClaimSubmittedForApproval`
- `DeathClaimApproved` (triggers contribution cycle)
- `DeathClaimRejected`
- `DeathClaimSettled`

**Contributions:**
- `ContributionCycleStarted`
- `WalletDebitRequestCreated`
- `ContributionCollected`
- `ContributionMissed`
- `ContributionCycleClosed`

---

## Commands Summary

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

---