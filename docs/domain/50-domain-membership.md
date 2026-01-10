# Member Context
---

## Core Principles

1. **3-step registration** with draft saving capability
2. **One-to-many nominees**
3. **One-to-many documents** (multiple types supported)
4. **Generic approval workflow** integration
5. **No edits after approval** (Phase 1)
6. **Agent assignment** during registration
7. **Tier-based** membership (contribution amount, benefit amount)
8. **Status management** (Active, Suspended, Closed, Deceased)

---

## Domain Model

### **Entity: Member**

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

### **Entity: Nominee**

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
  
  // Status
  isActive: boolean
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Business Rules:**
- Phase 1: Ignore the priority field. Default as 1 and no logic to implement.
- Phase 2: Multiple nominees with unique priorities
- At least 1 nominee required to submit registration

---

### **Entity: MemberDocument**

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

### **Entity: RegistrationPayment**

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

### **Entity: MembershipTier**

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

## Commands

### **Step 1: Personal Details**

#### **Command: StartMemberRegistration**

**Triggered by:** Agent, Unit Admin, Area Admin, Forum Admin

**Input:**
```json
{
  "personalDetails": {
    "firstName": "string",
    "middleName": "string?",
    "lastName": "string",
    "dateOfBirth": "date",
    "gender": "Male|Female|Other",
    "contactNumber": "string",
    "alternateContactNumber": "string?",
    "email": "string?",
    "address": {
      "line1": "string",
      "line2": "string?",
      "city": "string",
      "state": "string",
      "postalCode": "string",
      "country": "string"
    }
  },
  "tierId": "uuid",
  "unitId": "uuid",
  "agentId": "uuid", // If admin creating, they select agent
  "createdBy": "uuid"
}
```

**Preconditions:**
- Unit exists and is active
- Agent exists, is active, belongs to specified unit
- Tier exists and is active
- If createdBy is Agent: agentId = createdBy
- If createdBy is Admin: agentId must be provided

**Validations:**
- firstName, lastName: required, 2-100 chars
- dateOfBirth: required, member must be 18+ years old
- contactNumber: required, valid phone format
- email: optional, valid email format if provided
- All address fields required

**Backend Logic:**
```javascript
async function startMemberRegistration(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Check permission
    const canCreate = await hasPermission(
      input.createdBy,
      'member.create',
      { unitId: input.unitId }
    );
    
    if (!canCreate) {
      throw new Error('Not authorized to create members in this unit');
    }
    
    // 2. Get unit and validate hierarchy
    const unit = await db.units.findByPk(input.unitId, { transaction: trx });
    if (!unit) {
      throw new Error('Unit not found');
    }
    
    // 3. Validate tier
    const tier = await db.membershipTiers.findByPk(input.tierId, { transaction: trx });
    if (!tier || !tier.isActive) {
      throw new Error('Invalid or inactive membership tier');
    }
    
    // 4. Validate agent
    const agent = await db.agents.findByPk(input.agentId, { transaction: trx });
    if (!agent || agent.agentStatus !== 'Active') {
      throw new Error('Invalid or inactive agent');
    }
    
    if (agent.unitId !== input.unitId) {
      throw new Error('Agent must belong to the same unit');
    }
    
    // 5. Validate age (18+)
    const age = calculateAge(input.personalDetails.dateOfBirth);
    if (age < 18) {
      throw new Error('Member must be at least 18 years old');
    }
    
    // 6. Generate member code
    const memberCode = await generateMemberCode();
    
    // 7. Create member record
    const member = await db.members.create({
      memberId: generateUUID(),
      memberCode,
      registrationStatus: 'Draft',
      registrationStep: 'PersonalDetails',
      firstName: input.personalDetails.firstName,
      middleName: input.personalDetails.middleName,
      lastName: input.personalDetails.lastName,
      dateOfBirth: input.personalDetails.dateOfBirth,
      gender: input.personalDetails.gender,
      contactNumber: input.personalDetails.contactNumber,
      alternateContactNumber: input.personalDetails.alternateContactNumber,
      email: input.personalDetails.email,
      addressLine1: input.personalDetails.address.line1,
      addressLine2: input.personalDetails.address.line2,
      city: input.personalDetails.address.city,
      state: input.personalDetails.address.state,
      postalCode: input.personalDetails.address.postalCode,
      country: input.personalDetails.address.country,
      tierId: input.tierId,
      agentId: input.agentId,
      unitId: input.unitId,
      areaId: unit.areaId,
      forumId: unit.forumId,
      suspensionCounter: 0,
      createdAt: new Date(),
      createdBy: input.createdBy
    }, { transaction: trx });
    
    // 8. Emit event
    await emitEvent('MemberRegistrationStarted', {
      memberId: member.memberId,
      memberCode: member.memberCode,
      agentId: input.agentId,
      unitId: input.unitId,
      createdBy: input.createdBy
    });
    
    return member;
  });
}
```

**Outcome:**
- Member created with status "Draft"
- Registration step = "PersonalDetails"
- Event: `MemberRegistrationStarted`

**Returns:**
```json
{
  "memberId": "uuid",
  "memberCode": "MEM-2025-00001",
  "registrationStatus": "Draft",
  "registrationStep": "PersonalDetails"
}
```

---

#### **Command: SavePersonalDetailsAsDraft**

**Triggered by:** Agent, Admin (creator)

**Input:**
```json
{
  "memberId": "uuid",
  "personalDetails": { /* same as StartMemberRegistration */ }
}
```

**Preconditions:**
- Member exists with registrationStatus = "Draft"
- registrationStep = "PersonalDetails"
- User is creator or has permission

**Backend Logic:**
```javascript
async function savePersonalDetailsAsDraft(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member
    const member = await db.members.findByPk(input.memberId, { transaction: trx });
    
    if (!member || member.registrationStatus !== 'Draft') {
      throw new Error('Invalid member or status');
    }
    
    if (member.registrationStep !== 'PersonalDetails') {
      throw new Error('Cannot save personal details at this step');
    }
    
    // 2. Validate age if dateOfBirth provided
    if (input.personalDetails.dateOfBirth) {
      const age = calculateAge(input.personalDetails.dateOfBirth);
      if (age < 18) {
        throw new Error('Member must be at least 18 years old');
      }
    }
    
    // 3. Update member
    const updates = {
      updatedAt: new Date()
    };
    
    if (input.personalDetails.firstName) updates.firstName = input.personalDetails.firstName;
    if (input.personalDetails.middleName !== undefined) updates.middleName = input.personalDetails.middleName;
    if (input.personalDetails.lastName) updates.lastName = input.personalDetails.lastName;
    // ... update all provided fields
    
    await db.members.update(updates, {
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    // 4. Emit event
    await emitEvent('MemberDraftSaved', {
      memberId: input.memberId,
      step: 'PersonalDetails'
    });
    
    return await db.members.findByPk(input.memberId, { transaction: trx });
  });
}
```

**Outcome:**
- Personal details updated
- Still in Draft status
- Event: `MemberDraftSaved`

---

#### **Command: CompletePersonalDetailsStep**

**Triggered by:** Agent, Admin (creator)

**Input:**
```json
{
  "memberId": "uuid"
}
```

**Preconditions:**
- Member exists with registrationStatus = "Draft"
- registrationStep = "PersonalDetails"
- All required personal details filled

**Validations:**
- firstName, lastName: not empty
- dateOfBirth: valid, age >= 18
- contactNumber: not empty
- Complete address

**Backend Logic:**
```javascript
async function completePersonalDetailsStep(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member
    const member = await db.members.findByPk(input.memberId, { transaction: trx });
    
    if (!member || member.registrationStatus !== 'Draft') {
      throw new Error('Invalid member or status');
    }
    
    if (member.registrationStep !== 'PersonalDetails') {
      throw new Error('Invalid registration step');
    }
    
    // 2. Validate all required fields
    if (!member.firstName || !member.lastName) {
      throw new Error('First name and last name are required');
    }
    
    if (!member.dateOfBirth) {
      throw new Error('Date of birth is required');
    }
    
    const age = calculateAge(member.dateOfBirth);
    if (age < 18) {
      throw new Error('Member must be at least 18 years old');
    }
    
    if (!member.contactNumber) {
      throw new Error('Contact number is required');
    }
    
    if (!member.addressLine1 || !member.city || !member.state || !member.postalCode || !member.country) {
      throw new Error('Complete address is required');
    }
    
    // 3. Move to next step
    await db.members.update({
      registrationStep: 'Nominees',
      updatedAt: new Date()
    }, {
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    // 4. Emit event
    await emitEvent('PersonalDetailsCompleted', {
      memberId: input.memberId
    });
    
    return await db.members.findByPk(input.memberId, { transaction: trx });
  });
}
```

**Outcome:**
- Registration step → "Nominees"
- Event: `PersonalDetailsCompleted`

---

### **Step 2: Nominees**

#### **Command: AddNominee**

**Triggered by:** Agent, Admin (creator)

**Input:**
```json
{
  "memberId": "uuid",
  "nominee": {
    "name": "string",
    "relationType": "Father|Mother|Spouse|Son|Daughter|Brother|Sister|Other",
    "dateOfBirth": "date",
    "contactNumber": "string",
    "alternateContactNumber": "string?",
    "address": {
      "line1": "string",
      "line2": "string?",
      "city": "string",
      "state": "string",
      "postalCode": "string",
      "country": "string"
    },
    "idProofType": "NationalID|Passport|DrivingLicense|VoterID|Other",
    "idProofNumber": "string",
    "priority": 1
  }
}
```

**Preconditions:**
- Member exists with registrationStatus = "Draft"
- registrationStep = "Nominees" OR "DocumentsPayment"

**Validations:**
- name: required, 2-255 chars
- relationType: valid enum
- dateOfBirth: valid date
- contactNumber: required, valid format
- idProofNumber: required

**Backend Logic:**
```javascript
async function addNominee(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member
    const member = await db.members.findByPk(input.memberId, { transaction: trx });
    
    if (!member || member.registrationStatus !== 'Draft') {
      throw new Error('Invalid member or status');
    }
    
    if (!['Nominees', 'DocumentsPayment'].includes(member.registrationStep)) {
      throw new Error('Cannot add nominees at this step');
    }
        
    
    // 4. Create nominee
    const nominee = await db.nominees.create({
      nomineeId: generateUUID(),
      memberId: input.memberId,
      name: input.nominee.name,
      relationType: input.nominee.relationType,
      dateOfBirth: input.nominee.dateOfBirth,
      contactNumber: input.nominee.contactNumber,
      alternateContactNumber: input.nominee.alternateContactNumber,
      addressLine1: input.nominee.address.line1,
      addressLine2: input.nominee.address.line2,
      city: input.nominee.address.city,
      state: input.nominee.address.state,
      postalCode: input.nominee.address.postalCode,
      country: input.nominee.address.country,
      idProofType: input.nominee.idProofType,
      idProofNumber: input.nominee.idProofNumber,
      priority: input.nominee.priority,
      isActive: true,
      createdAt: new Date()
    }, { transaction: trx });
    
    // 5. Emit event
    await emitEvent('NomineeAdded', {
      memberId: input.memberId,
      nomineeId: nominee.nomineeId
    });
    
    return nominee;
  });
}
```

**Outcome:**
- Nominee created
- Event: `NomineeAdded`

---

#### **Command: UpdateNominee**

**Triggered by:** Agent, Admin (creator)

**Input:**
```json
{
  "nomineeId": "uuid",
  "nominee": { /* same fields as AddNominee */ }
}
```

**Preconditions:**
- Nominee exists with isActive = true
- Member is still in Draft status

**Backend Logic:**
```javascript
async function updateNominee(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get nominee with member
    const nominee = await db.nominees.findByPk(input.nomineeId, {
      include: [{ model: db.members, as: 'member' }]
    }, { transaction: trx });
    
    if (!nominee || !nominee.isActive) {
      throw new Error('Nominee not found or inactive');
    }
    
    if (nominee.member.registrationStatus !== 'Draft') {
      throw new Error('Cannot update nominee after submission');
    }
    
    // 2. Build updates
    const updates = {
      updatedAt: new Date()
    };
    
    if (input.nominee.name) updates.name = input.nominee.name;
    if (input.nominee.relationType) updates.relationType = input.nominee.relationType;
    // ... update all provided fields
    
    // 3. Update nominee
    await db.nominees.update(updates, {
      where: { nomineeId: input.nomineeId }
    }, { transaction: trx });
    
    // 4. Emit event
    await emitEvent('NomineeUpdated', {
      nomineeId: input.nomineeId,
      memberId: nominee.memberId
    });
    
    return await db.nominees.findByPk(input.nomineeId, { transaction: trx });
  });
}
```

**Outcome:**
- Nominee details updated
- Event: `NomineeUpdated`

---

#### **Command: RemoveNominee**

**Triggered by:** Agent, Admin (creator)

**Input:**
```json
{
  "nomineeId": "uuid"
}
```

**Preconditions:**
- Nominee exists with isActive = true
- Member is still in Draft status
- **Phase 1**: Cannot remove if this is the only nominee

**Backend Logic:**
```javascript
async function removeNominee(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get nominee with member
    const nominee = await db.nominees.findByPk(input.nomineeId, {
      include: [{ model: db.members, as: 'member' }]
    }, { transaction: trx });
    
    if (!nominee || !nominee.isActive) {
      throw new Error('Nominee not found or inactive');
    }
    
    if (nominee.member.registrationStatus !== 'Draft') {
      throw new Error('Cannot remove nominee after submission');
    }
    
    // 2. Phase 1: Check if this is the only nominee
    const nomineeCount = await db.nominees.count({
      where: { 
        memberId: nominee.memberId,
        isActive: true
      }
    }, { transaction: trx });
    
    if (nomineeCount <= 1) {
      throw new Error('Cannot remove the only nominee (at least 1 required)');
    }
    
    // 3. Soft delete nominee
    await db.nominees.update({
      isActive: false,
      updatedAt: new Date()
    }, {
      where: { nomineeId: input.nomineeId }
    }, { transaction: trx });
    
    // 4. Soft delete associated documents
    await db.memberDocuments.update({
      isActive: false
    }, {
      where: { nomineeId: input.nomineeId }
    }, { transaction: trx });
    
    // 5. Emit event
    await emitEvent('NomineeRemoved', {
      nomineeId: input.nomineeId,
      memberId: nominee.memberId
    });
    
    return { success: true };
  });
}
```

**Outcome:**
- Nominee soft deleted (isActive → false)
- Associated documents soft deleted
- Event: `NomineeRemoved`

---

#### **Command: CompleteNomineesStep**

**Triggered by:** Agent, Admin (creator)

**Input:**
```json
{
  "memberId": "uuid"
}
```

**Preconditions:**
- Member exists with registrationStatus = "Draft"
- registrationStep = "Nominees"

**Backend Logic:**
```javascript
async function completeNomineesStep(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member
    const member = await db.members.findByPk(input.memberId, { transaction: trx });
    
    if (!member || member.registrationStatus !== 'Draft') {
      throw new Error('Invalid member or status');
    }
    
    if (member.registrationStep !== 'Nominees') {
      throw new Error('Invalid registration step');
    }
    
    // 2. Validate nominees exist
    const nominees = await db.nominees.findAll({
      where: { 
        memberId: input.memberId,
        isActive: true
      }
    }, { transaction: trx });
    
    if (nominees.length === 0) {
      throw new Error('At least 1 nominee is required');
    }
        
    // 4. Move to next step
    await db.members.update({
      registrationStep: 'DocumentsPayment',
      updatedAt: new Date()
    }, {
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    // 5. Emit event
    await emitEvent('NomineesStepCompleted', {
      memberId: input.memberId
    });
    
    return await db.members.findByPk(input.memberId, { transaction: trx });
  });
}
```

**Outcome:**
- Registration step → "DocumentsPayment"
- Event: `NomineesStepCompleted`

---

### **Step 3: Documents & Payment**

#### **Command: UploadMemberDocument**

**Triggered by:** Agent, Admin (creator)

**Input:**
```json
{
  "memberId": "uuid",
  "nomineeId": "uuid?", // Required if documentCategory = "NomineeProof"
  "documentType": "NationalID|Passport|DrivingLicense|...",
  "documentCategory": "MemberIdentity|MemberAddress|MemberPhoto|NomineeProof|Other",
  "documentName": "string",
  "file": "file",
  "expiryDate": "date?",
  "uploadedBy": "uuid"
}
```

**Preconditions:**
- Member exists with registrationStatus = "Draft"
- registrationStep = "DocumentsPayment"
- Valid file type (PDF, JPG, PNG)
- File size <= 5MB
- If documentCategory = "NomineeProof", nomineeId must be provided

**Backend Logic:**
```javascript
async function uploadMemberDocument(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member
    const member = await db.members.findByPk(input.memberId, { transaction: trx });
    
    if (!member || member.registrationStatus !== 'Draft') {
      throw new Error('Invalid member or status');
    }
    
    if (member.registrationStep !== 'DocumentsPayment') {
      throw new Error('Cannot upload documents at this step');
    }
    
    // 2. Validate file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(input.file.mimeType)) {
      throw new Error('Invalid file type. Only PDF, JPG, PNG allowed');
    }
    
    if (input.file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit');
    }
    
    // 3. If uploading member photo, check if one already exists
    if (input.documentCategory === 'MemberPhoto') {
      const existingPhoto = await db.memberDocuments.findOne({
        where: {
          memberId: input.memberId,
          documentCategory: 'MemberPhoto',
          isActive: true
        }
      }, { transaction: trx });
      
      if (existingPhoto) {
        // Soft delete old photo
        await db.memberDocuments.update({
          isActive: false
        }, {
          where: { documentId: existingPhoto.documentId }
        }, { transaction: trx });
      }
    }
    
    // 4. Validate nominee if nominee proof
    if (input.documentCategory === 'NomineeProof') {
      if (!input.nomineeId) {
        throw new Error('Nominee ID required for nominee proof documents');
      }
      
      const nominee = await db.nominees.findOne({
        where: {
          nomineeId: input.nomineeId,
          memberId: input.memberId,
          isActive: true
        }
      }, { transaction: trx });
      
      if (!nominee) {
        throw new Error('Nominee not found');
      }
    }
    
    // 5. Upload file to storage
    const fileUrl = await uploadFile(input.file, `members/${input.memberId}/documents`);
    
    // 6. Create document record
    const document = await db.memberDocuments.create({
      documentId: generateUUID(),
      memberId: input.memberId,
      nomineeId: input.nomineeId,
      documentType: input.documentType,
      documentCategory: input.documentCategory,
      documentName: input.documentName,
      fileUrl,
      fileSize: input.file.size,
      mimeType: input.file.mimeType,
      uploadedBy: input.uploadedBy,
      uploadedAt: new Date(),
      verificationStatus: 'Pending',
      expiryDate: input.expiryDate,
      isActive: true,
      createdAt: new Date()
    }, { transaction: trx });
    
    // 7. If nominee ID proof, link to nominee
    if (input.documentCategory === 'NomineeProof' && input.nomineeId) {
      await db.nominees.update({
        idProofDocumentId: document.documentId
      }, {
        where: { nomineeId: input.nomineeId }
      }, { transaction: trx });
    }
    
    // 8. Emit event
    await emitEvent('MemberDocumentUploaded', {
      memberId: input.memberId,
      documentId: document.documentId,
      documentCategory: input.documentCategory
    });
    
    return document;
  });
}
```

**Outcome:**
- Document uploaded and stored
- Document record created
- If member photo: Old photo deactivated
- Event: `MemberDocumentUploaded`

---

#### **Command: RemoveMemberDocument**

**Triggered by:** Agent, Admin (creator)

**Input:**
```json
{
  "documentId": "uuid"
}
```

**Preconditions:**
- Document exists with isActive = true
- Member is still in Draft status

**Backend Logic:**
```javascript
async function removeMemberDocument(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get document with member
    const document = await db.memberDocuments.findByPk(input.documentId, {
      include: [{ model: db.members, as: 'member' }]
    }, { transaction: trx });
    
    if (!document || !document.isActive) {
      throw new Error('Document not found or inactive');
    }
    
    if (document.member.registrationStatus !== 'Draft') {
      throw new Error('Cannot remove documents after submission');
    }
    
    // 2. Soft delete document
    await db.memberDocuments.update({
      isActive: false,
      updatedAt: new Date()
    }, {
      where: { documentId: input.documentId }
    }, { transaction: trx });
    
    // 3. If this was a nominee ID proof, unlink from nominee
    if (document.nomineeId) {
      await db.nominees.update({
        idProofDocumentId: null
      }, {
        where: { 
          nomineeId: document.nomineeId,
          idProofDocumentId: document.documentId
        }
      }, { transaction: trx });
    }
    
    // 4. Emit event
    await emitEvent('MemberDocumentRemoved', {
      memberId: document.memberId,
      documentId: input.documentId
    });
    
    return { success: true };
  });
}
```

**Outcome:**
- Document soft deleted
- If nominee ID proof: Unlinked from nominee
- Event: `MemberDocumentRemoved`

---

#### **Command: RecordRegistrationPayment**

**Triggered by:** Agent

**Input:**
```json
{
  "memberId": "uuid",
  "registrationFee": "decimal",
  "advanceDeposit": "decimal",
  "collectionDate": "date",
  "collectionMode": "Cash|BankTransfer|Cheque|Online",
  "referenceNumber": "string?",
  "collectedBy": "uuid"
}
```

**Preconditions:**
- Member exists with registrationStatus = "Draft"
- registrationStep = "DocumentsPayment"
- Amounts match tier requirements
- collectedBy is member's agent

**Validations:**
- registrationFee > 0
- advanceDeposit > 0
- totalAmount = registrationFee + advanceDeposit
- Amounts match tier configuration

**Backend Logic:**
```javascript
async function recordRegistrationPayment(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member with tier
    const member = await db.members.findByPk(input.memberId, {
      include: [{ model: db.membershipTiers, as: 'tier' }]
    }, { transaction: trx });
    
    if (!member || member.registrationStatus !== 'Draft') {
      throw new Error('Invalid member or status');
    }
    
    if (member.registrationStep !== 'DocumentsPayment') {
      throw new Error('Cannot record payment at this step');
    }
    
    // 2. Verify agent
    if (member.agentId !== input.collectedBy) {
      throw new Error('Only assigned agent can record payment');
    }
    
    // 3. Validate amounts match tier
    if (input.registrationFee !== member.tier.registrationFee) {
      throw new Error(`Registration fee must be ${member.tier.registrationFee}`);
    }
    
    if (input.advanceDeposit !== member.tier.advanceDepositAmount) {
      throw new Error(`Advance deposit must be ${member.tier.advanceDepositAmount}`);
    }
    
    const totalAmount = input.registrationFee + input.advanceDeposit;
    
    // 4. Check if payment already exists
    const existingPayment = await db.registrationPayments.findOne({
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    if (existingPayment) {
      throw new Error('Payment already recorded');
    }
    
    // 5. Create payment record
    const payment = await db.registrationPayments.create({
      paymentId: generateUUID(),
      memberId: input.memberId,
      registrationFee: input.registrationFee,
      advanceDeposit: input.advanceDeposit,
      totalAmount,
      collectedBy: input.collectedBy,
      collectionDate: input.collectionDate,
      collectionMode: input.collectionMode,
      referenceNumber: input.referenceNumber,
      approvalStatus: 'PendingApproval',
      createdAt: new Date()
    }, { transaction: trx });
    
    // 6. Emit event
    await emitEvent('RegistrationPaymentRecorded', {
      memberId: input.memberId,
      paymentId: payment.paymentId,
      totalAmount
    });
    
    return payment;
  });
}
```

**Outcome:**
- Payment record created
- Event: `RegistrationPaymentRecorded`

---

### **Final Submission**

#### **Command: SubmitMemberRegistration**

**Triggered by:** Agent, Admin (creator)

**Input:**
```json
{
  "memberId": "uuid"
}
```

**Preconditions:**
- Member exists with registrationStatus = "Draft"
- registrationStep = "DocumentsPayment"
- All validations pass (see below)

**Validations:**
1. **Nominees:**
   - Atleast 1 active nominee 
2. **Documents:**
   - At least 1 active identity document (MemberIdentity)
   - At least 1 active address proof (MemberAddress)
   - Exactly 1 active member photo (MemberPhoto)
   - Each active nominee has at least 1 ID proof document
3. **Payment:**
   - Registration payment recorded

**Backend Logic:**
```javascript
async function submitMemberRegistration(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member with related data
    const member = await db.members.findByPk(input.memberId, {
      include: [
        { model: db.nominees, as: 'nominees', where: { isActive: true }, required: false },
        { model: db.memberDocuments, as: 'documents', where: { isActive: true }, required: false },
        { model: db.registrationPayments, as: 'payment' },
        { model: db.membershipTiers, as: 'tier' }
      ]
    }, { transaction: trx });
    
    if (!member || member.registrationStatus !== 'Draft') {
      throw new Error('Invalid member or status');
    }
    
    if (member.registrationStep !== 'DocumentsPayment') {
      throw new Error('Complete all steps before submitting');
    }
    
    // 2. Validate nominees
    if (!member.nominees || member.nominees.length === 0) {
      throw new Error('At least 1 nominee is required');
    }
    
    
    // 3. Validate documents
    const identityDocs = member.documents.filter(d => d.documentCategory === 'MemberIdentity');
    if (identityDocs.length === 0) {
      throw new Error('At least 1 identity document is required');
    }
    
    const addressDocs = member.documents.filter(d => d.documentCategory === 'MemberAddress');
    if (addressDocs.length === 0) {
      throw new Error('At least 1 address proof document is required');
    }
    
    const photoDocs = member.documents.filter(d => d.documentCategory === 'MemberPhoto');
    if (photoDocs.length !== 1) {
      throw new Error('Exactly 1 member photo is required');
    }
    
    // 4. Validate each nominee has ID proof
    for (const nominee of member.nominees) {
      const nomineeProofs = member.documents.filter(
        d => d.nomineeId === nominee.nomineeId && d.documentCategory === 'NomineeProof'
      );
      
      if (nomineeProofs.length === 0) {
        throw new Error(`Nominee ${nominee.name} must have at least 1 ID proof document`);
      }
    }
    
    // 5. Validate payment
    if (!member.payment) {
      throw new Error('Registration payment is required');
    }
    
    // 6. Update member status
    await db.members.update({
      registrationStatus: 'PendingApproval',
      registrationStep: 'Completed',
      updatedAt: new Date()
    }, {
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    // 7. CREATE APPROVAL REQUEST
    const approvalRequest = await createApprovalRequest({
      workflowCode: 'member_registration',
      entityType: 'Member',
      entityId: input.memberId,
      forumId: member.forumId,
      areaId: member.areaId,
      unitId: member.unitId,
      submittedBy: member.createdBy
    }, trx);
    
    // 8. Link approval request to member
    await db.members.update({
      approvalRequestId: approvalRequest.requestId
    }, {
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    // 9. Emit event
    await emitEvent('MemberRegistrationSubmitted', {
      memberId: input.memberId,
      memberCode: member.memberCode,
      approvalRequestId: approvalRequest.requestId,
      submittedBy: member.createdBy
    });
    
    return {
      memberId: input.memberId,
      memberCode: member.memberCode,
      registrationStatus: 'PendingApproval',
      approvalRequestId: approvalRequest.requestId
    };
  });
}
```

**Outcome:**
- Member status → "PendingApproval"
- Registration step → "Completed"
- Approval request created
- Approval routed to configured approvers
- Event: `MemberRegistrationSubmitted`

---

### **Approval Integration (Event Listeners)**

#### **Event: ApprovalRequestApproved (for member_registration)**

```javascript
on('ApprovalRequestApproved', async (event) => {
  if (event.workflowCode === 'member_registration') {
    await activateMember(event.entityId, event.finalApprovedBy);
  }
});

async function activateMember(memberId, approvedBy) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member with payment and tier
    const member = await db.members.findByPk(memberId, {
      include: [
        { model: db.registrationPayments, as: 'payment' },
        { model: db.membershipTiers, as: 'tier' }
      ]
    }, { transaction: trx });
    
    if (!member) {
      throw new Error('Member not found');
    }
    
    // 2. Update member status
    await db.members.update({
      registrationStatus: 'Approved',
      memberStatus: 'Active',
      registeredAt: new Date(),
      approvedBy,
      updatedAt: new Date()
    }, {
      where: { memberId }
    }, { transaction: trx });
    
    // 3. Create member wallet
    await db.wallets.create({
      walletId: generateUUID(),
      memberId,
      currentBalance: member.payment.advanceDeposit,
      createdAt: new Date()
    }, { transaction: trx });
    
    // 4. Update payment status
    await db.registrationPayments.update({
      approvalStatus: 'Approved',
      approvedBy,
      approvedAt: new Date()
    }, {
      where: { memberId }
    }, { transaction: trx });
    
    // 5. Mark all documents as verified
    await db.memberDocuments.update({
      verificationStatus: 'Verified',
      verifiedBy: approvedBy,
      verifiedAt: new Date()
    }, {
      where: { memberId, isActive: true }
    }, { transaction: trx });
    
    // 6. Create GL entry
    const journalEntry = await glService.createJournalEntry({
      entries: [
        {
          accountCode: "1000", // Cash
          debit: member.payment.totalAmount,
          description: "Registration fee and advance deposit collected"
        },
        {
          accountCode: "4100", // Registration Fee Revenue
          credit: member.payment.registrationFee,
          description: "Registration fee revenue"
        },
        {
          accountCode: "2100", // Member Wallet Liability
          credit: member.payment.advanceDeposit,
          description: "Advance deposit for future contributions"
        }
      ],
      reference: `Member Registration - ${member.memberCode}`,
      transactionDate: member.payment.collectionDate,
      sourceModule: "Membership",
      sourceEntityId: memberId,
      sourceTransactionType: "RegistrationApproval",
      createdBy: approvedBy
    }, trx);
    
    // 7. Update agent statistics
    await db.agents.increment('totalActiveMembers', {
      where: { agentId: member.agentId }
    }, { transaction: trx });
    
    await db.agents.increment('totalRegistrations', {
      where: { agentId: member.agentId }
    }, { transaction: trx });
    
    // 8. Emit event
    await emitEvent('MemberActivated', {
      memberId,
      memberCode: member.memberCode,
      agentId: member.agentId,
      unitId: member.unitId,
      approvedBy,
      journalEntryId: journalEntry.entryId
    });
    
    return member;
  });
}
```

**Outcome:**
- Member status → "Approved", "Active"
- Wallet created with advance deposit
- GL entry created
- Documents marked verified
- Agent statistics updated
- Event: `MemberActivated`

---

#### **Event: ApprovalRequestRejected (for member_registration)**

```javascript
on('ApprovalRequestRejected', async (event) => {
  if (event.workflowCode === 'member_registration') {
    await handleMemberRejection(
      event.entityId,
      event.rejectedBy,
      event.rejectionReason
    );
  }
});

async function handleMemberRejection(memberId, rejectedBy, rejectionReason) {
  return await db.transaction(async (trx) => {
    
    // 1. Update member status
    await db.members.update({
      registrationStatus: 'Rejected',
      updatedAt: new Date()
    }, {
      where: { memberId }
    }, { transaction: trx });
    
    // 2. Update payment status
    await db.registrationPayments.update({
      approvalStatus: 'Rejected',
      rejectionReason
    }, {
      where: { memberId }
    }, { transaction: trx });
    
    // 3. Emit event (notify agent to return money)
    await emitEvent('MemberRegistrationRejected', {
      memberId,
      rejectedBy,
      rejectionReason
    });
    
    return { success: true };
  });
}
```

**Outcome:**
- Member status → "Rejected"
- Payment marked rejected
- Agent notified to return collected money
- Event: `MemberRegistrationRejected`

---

### **Post-Approval Member Management**

#### **Command: SuspendMember**

**Triggered by:** System (after 2 consecutive contribution misses) OR Admin (manual)

**Input:**
```json
{
  "memberId": "uuid",
  "reason": "string",
  "suspendedBy": "uuid?" // null if system
}
```

**Preconditions:**
- Member exists with memberStatus = "Active"

**Backend Logic:**
```javascript
async function suspendMember(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member
    const member = await db.members.findByPk(input.memberId, { transaction: trx });
    
    if (!member) {
      throw new Error('Member not found');
    }
    
    if (member.memberStatus !== 'Active') {
      throw new Error('Only active members can be suspended');
    }
    
    // 2. Update member status
    await db.members.update({
      memberStatus: 'Suspended',
      suspensionReason: input.reason,
      suspendedAt: new Date(),
      updatedAt: new Date()
    }, {
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    // 3. Update agent statistics
    await db.agents.decrement('totalActiveMembers', {
      where: { agentId: member.agentId }
    }, { transaction: trx });
    
    // 4. Emit event
    await emitEvent('MemberSuspended', {
      memberId: input.memberId,
      memberCode: member.memberCode,
      reason: input.reason,
      suspendedBy: input.suspendedBy
    });
    
    return await db.members.findByPk(input.memberId, { transaction: trx });
  });
}
```

**Outcome:**
- Member status → "Suspended"
- Agent active member count decremented
- Event: `MemberSuspended`

---

#### **Command: ReactivateMember**

**Triggered by:** Admin

**Input:**
```json
{
  "memberId": "uuid",
  "reactivatedBy": "uuid"
}
```

**Preconditions:**
- Member exists with memberStatus = "Suspended"
- All outstanding contributions cleared

**Backend Logic:**
```javascript
async function reactivateMember(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Check permission
    const canReactivate = await hasPermission(
      input.reactivatedBy,
      'member.reactivate',
      {}
    );
    
    if (!canReactivate) {
      throw new Error('Not authorized to reactivate members');
    }
    
    // 2. Get member
    const member = await db.members.findByPk(input.memberId, { transaction: trx });
    
    if (!member) {
      throw new Error('Member not found');
    }
    
    if (member.memberStatus !== 'Suspended') {
      throw new Error('Only suspended members can be reactivated');
    }
    
    // 3. Check outstanding contributions (business rule)
    const outstandingContributions = await db.memberContributions.count({
      where: {
        memberId: input.memberId,
        contributionStatus: 'Missed'
      }
    }, { transaction: trx });
    
    if (outstandingContributions > 0) {
      throw new Error('Member has outstanding contributions. Cannot reactivate.');
    }
    
    // 4. Update member status
    await db.members.update({
      memberStatus: 'Active',
      suspensionCounter: 0,
      suspensionReason: null,
      suspendedAt: null,
      updatedAt: new Date()
    }, {
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    // 5. Update agent statistics
    await db.agents.increment('totalActiveMembers', {
      where: { agentId: member.agentId }
    }, { transaction: trx });
    
    // 6. Emit event
    await emitEvent('MemberReactivated', {
      memberId: input.memberId,
      memberCode: member.memberCode,
      reactivatedBy: input.reactivatedBy
    });
    
    return await db.members.findByPk(input.memberId, { transaction: trx });
  });
}
```

**Outcome:**
- Member status → "Active"
- Suspension counter reset
- Agent active member count incremented
- Event: `MemberReactivated`

---

#### **Command: CloseMemberAccount**

**Triggered by:** Agent, Admin

**Input:**
```json
{
  "memberId": "uuid",
  "closureReason": "string",
  "walletBalanceRefunded": "decimal",
  "refundedBy": "uuid",
  "closureDate": "date"
}
```

**Preconditions:**
- Member exists with memberStatus = "Active" or "Suspended"
- Wallet balance matches refundedAmount
- No pending contributions

**Backend Logic:**
```javascript
async function closeMemberAccount(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get member with wallet
    const member = await db.members.findByPk(input.memberId, {
      include: [{ model: db.wallets, as: 'wallet' }]
    }, { transaction: trx });
    
    if (!member) {
      throw new Error('Member not found');
    }
    
    if (!['Active', 'Suspended'].includes(member.memberStatus)) {
      throw new Error('Can only close active or suspended member accounts');
    }
    
    // 2. Validate wallet balance
    if (member.wallet.currentBalance !== input.walletBalanceRefunded) {
      throw new Error('Wallet balance mismatch');
    }
    
    // 3. Check for pending contributions
    const pendingContributions = await db.memberContributions.count({
      where: {
        memberId: input.memberId,
        contributionStatus: { in: ['Pending', 'WalletDebitRequested'] }
      }
    }, { transaction: trx });
    
    if (pendingContributions > 0) {
      throw new Error('Cannot close account with pending contributions');
    }
    
    // 4. Update member status
    await db.members.update({
      memberStatus: 'Closed',
      updatedAt: new Date()
    }, {
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    // 5. Zero out wallet balance
    await db.wallets.update({
      currentBalance: 0,
      updatedAt: new Date()
    }, {
      where: { memberId: input.memberId }
    }, { transaction: trx });
    
    // 6. Create GL entry (refund)
    await glService.createJournalEntry({
      entries: [
        {
          accountCode: "2100", // Member Wallet Liability
          debit: input.walletBalanceRefunded,
          description: "Wallet balance refund on account closure"
        },
        {
          accountCode: "1000", // Cash
          credit: input.walletBalanceRefunded,
          description: "Cash refunded to member"
        }
      ],
      reference: `Member Account Closure - ${member.memberCode}`,
      transactionDate: input.closureDate,
      sourceModule: "Membership",
      sourceEntityId: input.memberId,
      sourceTransactionType: "AccountClosure",
      createdBy: input.refundedBy
    }, trx);
    
    // 7. Update agent statistics
    if (member.memberStatus === 'Active') {
      await db.agents.decrement('totalActiveMembers', {
        where: { agentId: member.agentId }
      }, { transaction: trx });
    }
    
    // 8. Emit event
    await emitEvent('MemberAccountClosed', {
      memberId: input.memberId,
      memberCode: member.memberCode,
      closureReason: input.closureReason,
      walletBalanceRefunded: input.walletBalanceRefunded,
      closedBy: input.refundedBy
    });
    
    return await db.members.findByPk(input.memberId, { transaction: trx });
  });
}
```

**Outcome:**
- Member status → "Closed"
- Wallet balance → 0
- GL entry created (refund)
- Agent statistics updated
- Event: `MemberAccountClosed`

---

#### **Command: ReassignMemberAgent** (Phase 2)

**Triggered by:** Admin

**Input:**
```json
{
  "memberId": "uuid",
  "newAgentId": "uuid",
  "reason": "string?",
  "reassignedBy": "uuid"
}
```

**Preconditions:**
- Member exists
- New agent exists, is active, belongs to member's unit
- Phase 2 feature

**Backend Logic:**
```javascript
async function reassignMemberAgent(input) {
  // Phase 2 implementation
  // Similar to agent reassignment logic
  // Update member.agentId
  // Update old/new agent statistics
  // Emit event
}
```

---

## Read Queries

### **GetMemberDetails**

```javascript
async function getMemberDetails(memberId, requestedBy) {
  const member = await db.members.findByPk(memberId, {
    include: [
      { model: db.nominees, as: 'nominees', where: { isActive: true }, required: false },
      { model: db.memberDocuments, as: 'documents', where: { isActive: true }, required: false },
      { model: db.registrationPayments, as: 'payment' },
      { model: db.membershipTiers, as: 'tier' },
      { model: db.agents, as: 'agent' },
      { model: db.units, as: 'unit' },
      { model: db.wallets, as: 'wallet' },
      { 
        model: db.approvalRequests, 
        as: 'approvalRequest',
        include: [
          { model: db.approvalStages, as: 'currentStage' },
          { model: db.approvalActions, as: 'actions' }
        ]
      }
    ]
  });
  
  if (!member) {
    throw new Error('Member not found');
  }
  
  // Check permission
  const canView = await hasPermission(
    requestedBy,
    'member.read',
    { unitId: member.unitId }
  ) || requestedBy === member.userId;
  
  if (!canView) {
    throw new Error('Not authorized to view this member');
  }
  
  return member;
}
```

---

### **ListMembers**

```javascript
async function listMembers(filters) {
  // filters: { status, unitId, agentId, tierId, searchQuery, page, limit }
  
  const where = {};
  if (filters.status) where.memberStatus = filters.status;
  if (filters.unitId) where.unitId = filters.unitId;
  if (filters.agentId) where.agentId = filters.agentId;
  if (filters.tierId) where.tierId = filters.tierId;
  
  if (filters.searchQuery) {
    where[db.Op.or] = [
      { memberCode: { like: `%${filters.searchQuery}%` } },
      { firstName: { like: `%${filters.searchQuery}%` } },
      { lastName: { like: `%${filters.searchQuery}%` } },
      { contactNumber: { like: `%${filters.searchQuery}%` } }
    ];
  }
  
  const offset = (filters.page - 1) * filters.limit;
  
  const { count, rows } = await db.members.findAndCountAll({
    where,
    include: [
      { model: db.agents, as: 'agent', attributes: ['agentId', 'agentCode', 'firstName', 'lastName'] },
      { model: db.membershipTiers, as: 'tier', attributes: ['tierId', 'tierName'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: filters.limit,
    offset
  });
  
  return {
    total: count,
    page: filters.page,
    limit: filters.limit,
    members: rows
  };
}
```

---

## Helper Functions

### **GenerateMemberCode**

```javascript
async function generateMemberCode() {
  const year = new Date().getFullYear();
  
  const lastMember = await db.members.findOne({
    where: {
      memberCode: { like: `MEM-${year}-%` }
    },
    order: [['memberCode', 'DESC']]
  });
  
  let sequence = 1;
  if (lastMember) {
    const parts = lastMember.memberCode.split('-');
    sequence = parseInt(parts[2]) + 1;
  }
  
  return `MEM-${year}-${sequence.toString().padStart(5, '0')}`;
}
```

---

### **CalculateAge**

```javascript
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}
```

---

## State Machines

### **Registration Status:**

```
[Draft]
   ↓ (submit for approval)
[PendingApproval]
   ↓
   ├─→ [Approved] → Member activated, wallet created
   │
   └─→ [Rejected] → Payment refunded
```

### **Registration Steps:**

```
[PersonalDetails]
   ↓ (complete step)
[Nominees]
   ↓ (complete step)
[DocumentsPayment]
   ↓ (submit)
[Completed]
```

### **Member Status (Post-Approval):**

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

## Validation Rules Summary

### **Personal Details:**
- firstName, lastName: required, 2-100 chars
- dateOfBirth: required, age >= 18 years
- contactNumber: required, valid format
- Complete address required

### **Nominees:**
- Atleast 1 active nominee 
- name, relationType, contactNumber, idProofNumber: required
- Complete address required

### **Documents:**
- At least 1 identity document
- At least 1 address proof
- Exactly 1 member photo
- Each nominee must have at least 1 ID proof
- File type: PDF, JPG, PNG only
- File size <= 5MB

### **Payment:**
- registrationFee > 0
- advanceDeposit > 0
- Amounts match tier configuration

---

## Database Schema

```sql
CREATE TABLE members (
  member_id UUID PRIMARY KEY,
  member_code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Registration tracking
  registration_status VARCHAR(50) DEFAULT 'Draft',
  registration_step VARCHAR(50) DEFAULT 'PersonalDetails',
  approval_request_id UUID REFERENCES approval_requests(request_id),
  
  -- Personal details
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  alternate_contact_number VARCHAR(20),
  email VARCHAR(255),
  
  -- Address
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  
  -- Membership details
  tier_id UUID NOT NULL REFERENCES membership_tiers(tier_id),
  
  -- Hierarchy
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  unit_id UUID NOT NULL REFERENCES units(unit_id),
  area_id UUID NOT NULL REFERENCES areas(area_id),
  forum_id UUID NOT NULL REFERENCES forums(forum_id),
  
  -- Member status (after approval)
  member_status VARCHAR(50),
  suspension_counter INT DEFAULT 0,
  suspension_reason TEXT,
  suspended_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  registered_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users(user_id),
  approved_by UUID REFERENCES users(user_id),
  
  -- Constraints
  CONSTRAINT chk_member_age CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
);

CREATE TABLE nominees (
  nominee_id UUID PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(member_id),
  name VARCHAR(255) NOT NULL,
  relation_type VARCHAR(50) NOT NULL,
  date_of_birth DATE NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  alternate_contact_number VARCHAR(20),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  id_proof_type VARCHAR(50) NOT NULL,
  id_proof_number VARCHAR(100) NOT NULL,
  id_proof_document_id UUID REFERENCES member_documents(document_id),
  priority INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, priority)
);

CREATE TABLE member_documents (
  document_id UUID PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(member_id),
  nominee_id UUID REFERENCES nominees(nominee_id),
  document_type VARCHAR(100) NOT NULL,
  document_category VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(user_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_status VARCHAR(50) DEFAULT 'Pending',
  verified_by UUID REFERENCES users(user_id),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE registration_payments (
  payment_id UUID PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(member_id),
  registration_fee DECIMAL(15,2) NOT NULL,
  advance_deposit DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  collected_by UUID NOT NULL REFERENCES agents(agent_id),
  collection_date DATE NOT NULL,
  collection_mode VARCHAR(50) NOT NULL,
  reference_number VARCHAR(255),
  approval_status VARCHAR(50) DEFAULT 'PendingApproval',
  approved_by UUID REFERENCES users(user_id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE membership_tiers (
  tier_id UUID PRIMARY KEY,
  tier_code VARCHAR(50) UNIQUE NOT NULL,
  tier_name VARCHAR(255) NOT NULL,
  description TEXT,
  registration_fee DECIMAL(15,2) NOT NULL,
  advance_deposit_amount DECIMAL(15,2) NOT NULL,
  contribution_amount DECIMAL(15,2) NOT NULL,
  death_benefit_amount DECIMAL(15,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(user_id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_members_code ON members(member_code);
CREATE INDEX idx_members_status ON members(registration_status, member_status);
CREATE INDEX idx_members_agent ON members(agent_id);
CREATE INDEX idx_members_unit ON members(unit_id);
CREATE INDEX idx_members_tier ON members(tier_id);
CREATE INDEX idx_members_approval ON members(approval_request_id);
CREATE INDEX idx_nominees_member ON nominees(member_id);
CREATE INDEX idx_nominees_active ON nominees(member_id, is_active);
CREATE INDEX idx_documents_member ON member_documents(member_id);
CREATE INDEX idx_documents_nominee ON member_documents(nominee_id);
CREATE INDEX idx_documents_category ON member_documents(member_id, document_category, is_active);
CREATE INDEX idx_payments_member ON registration_payments(member_id);

-- Unique constraint: Only 1 active member photo
CREATE UNIQUE INDEX idx_unique_active_member_photo 
ON member_documents(member_id) 
WHERE document_category = 'MemberPhoto' AND is_active = TRUE;
```

---

## Events Emitted

### **Registration Process:**
- `MemberRegistrationStarted` - When registration started
- `MemberDraftSaved` - When draft saved
- `PersonalDetailsCompleted` - Step 1 completed
- `NomineeAdded` - Nominee added
- `NomineeUpdated` - Nominee updated
- `NomineeRemoved` - Nominee removed
- `NomineesStepCompleted` - Step 2 completed
- `MemberDocumentUploaded` - Document uploaded
- `MemberDocumentRemoved` - Document removed
- `RegistrationPaymentRecorded` - Payment recorded
- `MemberRegistrationSubmitted` - Submitted for approval

### **Approval:**
- `MemberActivated` - After approval workflow completes
- `MemberRegistrationRejected` - After approval rejection

### **Member Management:**
- `MemberSuspended` - Member suspended
- `MemberReactivated` - Member reactivated
- `MemberAccountClosed` - Account closed
- `MemberAgentReassigned` - Agent changed (Phase 2)

---

## Summary: Commands List

### **Step 1 - Personal Details:**
1. `StartMemberRegistration`
2. `SavePersonalDetailsAsDraft`
3. `CompletePersonalDetailsStep`

### **Step 2 - Nominees:**
4. `AddNominee`
5. `UpdateNominee`
6. `RemoveNominee`
7. `CompleteNomineesStep`

### **Step 3 - Documents & Payment:**
8. `UploadMemberDocument`
9. `RemoveMemberDocument`
10. `RecordRegistrationPayment`

### **Submission:**
11. `SubmitMemberRegistration`

### **Approval (via generic workflow):**
- Uses generic `ApproveRequest` and `RejectRequest` commands
- Event listeners: `activateMember`, `handleMemberRejection`

### **Member Management:**
12. `SuspendMember`
13. `ReactivateMember`
14. `CloseMemberAccount`
15. `ReassignMemberAgent` (Phase 2)
