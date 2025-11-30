# Member Context Documentation

## Member Commands

#### 1. StartMemberRegistration 
* Triggered by: Agent, Unit Admin, Area Admin, Forum Admin
* Input:
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
  "agentId": "uuid",
  "unitId": "uuid",
  "createdBy": "uuid"
}
```
* Preconditions:
    1. Agent must be Active
    2. Agent must belong to the specified Unit
    3. Tier must be Active
    4. Valid date of birth (age requirements if any)

* Outcome:
    Member record created with:
        registrationStatus = "Draft"
        registrationStep = "PersonalDetails"
        memberStatus = null (not yet active)


    Event: MemberRegistrationStarted

* Returns: memberId for subsequent steps


#### 2. SavePersonalDetailsAsDraft
* Triggered by: Agent, Admin (whoever started registration)
```json
{
  "memberId": "uuid",
  "personalDetails": { /* same as above */ }
}
```
* Preconditions:

    1. Member exists with registrationStatus = "Draft"
    2. registrationStep = "PersonalDetails"

* Outcome:

    1. Personal details updated
    2. Event: MemberRegistrationDraftSaved

    Note: This allows saving incomplete data and returning later

#### 3. CompletePersonalDetailsStep
* Triggered by: Agent, Admin
```json
{
  "memberId": "uuid"
}
```
* Preconditions:

    1. Member exists with registrationStatus = "Draft"
    2. registrationStep = "PersonalDetails"
    3. All mandatory personal details fields are filled

* Validations:

    1. First name, last name required
    2. Valid date of birth
    3. Valid contact number
    4. Complete address

* Outcome:

    1. registrationStep → "Nominees"
    2. Event: PersonalDetailsStepCompleted

#### 4. AddNominee 
* Triggered by: Agent, Admin
```json
{
  "memberId": "uuid",
  "nominees": [
        {
        "name": "string",
        "relationType": "Father|Mother|Spouse|Son|Daughter|Brother|Sister|Other",
        "dateOfBirth": "date",
        "contactNumber": "string",
        "alternateContactNumber": "string?",
        "address": { /* same structure as member address */ },
        "idProofType": "NationalID|Passport|DrivingLicense|VoterID|Other",
        "idProofNumber": "string",
        "priority": "int"
    }
  ]
}
```
* Preconditions:

    1. Member exists with registrationStatus = "Draft"
    2. registrationStep = "Nominees" OR registrationStep = "DocumentsPayment" (can add nominees during doc step too)
* Validations:

    1. Nominee name required
    2. Valid relation type
    3. Valid contact number

* Outcome:

    1. Nominee added to member
    2. Event: NomineeAdded

    - Returns: nomineeId

#### 5. UpdateNominee
* Triggered by: Agent, Admin
* Input:
```json
{
  "nomineeId": "uuid",
  "nominee": { /* same as AddNominee */ }
}
```
* Preconditions:

    1. Nominee exists
    2. Member is still in Draft status
* Outcome:

    1. Nominee details updated
    2. Event: NomineeUpdated

#### 6. RemoveNominee
* Triggered by: Agent, Admin
* Input:
```json
{
  "nomineeId": "uuid"
}
```
* Preconditions:

    1. Nominee exists
    2. Member is still in Draft status
    3. After removal, at least 1 nominee remains (cannot remove all)

* Outcome:

    1. Nominee removed
    2. Event: NomineeRemoved

#### 7. CompleteNomineesStep
* Triggered by: Agent, Admin
* Input:
```json
{
  "memberId": "uuid"
}
```
* Preconditions:

  1. Member exists with registrationStatus = "Draft"
  2. registrationStep = "Nominees"
  3. At least 1 nominee added
  4. At least 1 nominee with priority = 1 exists

* Outcome:

    1. registrationStep → "DocumentsPayment"
    2. Event: NomineesStepCompleted

#### 8. UploadMemberDocument (Step 3)
* Triggered by: Agent, Admin
* Input:
```json
{
  "memberId": "uuid",
  "documentType": "NationalID|Passport|DrivingLicense|...",
  "documentCategory": "MemberIdentity|MemberAddress|MemberPhoto|NomineeProof|Other",
  "documentName": "string",
  "file": "file", // Binary file data
  "nomineeId": "uuid?", // If document is for a nominee
  "expiryDate": "date?", // For passports, licenses, etc.
  "uploadedBy": "uuid"
}
```
* Preconditions:

  1. Member exists with registrationStatus = "Draft"
  2. registrationStep = "DocumentsPayment"
  3. Valid file type (PDF, JPG, PNG)
  4. File size within limits (e.g., max 5MB)

* Outcome:

  1. File uploaded to storage
  2. MemberDocument record created with verificationStatus = "Pending"
  3. Event: MemberDocumentUploaded

* Returns: documentId

#### 9. RemoveMemberDocument
* Triggered by: Agent, Admin
* Input:
```json
{
  "documentId": "uuid"
}
```
* Preconditions:

  1. Document exists
  2. Member is still in Draft status
* Outcome:

  1. Document removed from storage
  2. MemberDocument record deleted
  3. Event: MemberDocumentRemoved

#### 10. RecordRegistrationPayment (Step 3)
* Triggered by: Agent
* Input:
```json
{
  "memberId": "uuid",
  "registrationFee": "decimal",
  "advanceDeposit": "decimal",
  "collectionDate": "date",
  "collectionMode": "Cash|BankTransfer|Cheque|Online",
  "referenceNumber": "string?",
  "collectedBy": "uuid" // AgentId
}
```
* Preconditions:
  1. Member exists with registrationStatus = "Draft"
  2. registrationStep = "DocumentsPayment"
  3. Amounts match tier requirements

* Validations:
  1. Registration fee > 0
  2. Advance deposit > 0
  3. Total amount = registrationFee + advanceDeposit

* Outcome:
  1. RegistrationPayment record created with approvalStatus = "PendingApproval"
  2. Event: RegistrationPaymentRecorded

#### 11. SubmitMemberRegistration (Final Step)
* Triggered by: Agent, Admin
* Input:
```json
{
  "memberId": "uuid"
}
```
* Preconditions:
  1. Member exists with registrationStatus = "Draft"
  2. registrationStep = "DocumentsPayment"
  3. All mandatory documents uploaded:

    - At least 1 identity document
    - At least 1 address proof
    - 1 member photo
    - All nominees have ID proof documents
4. Registration payment recorded
5. At least 1 nominee exists

* Validations:
  1. Check all required documents present
  2. Check payment details complete
  3. Check at least one nominee with priority = 1

* Outcome:

  1. registrationStatus → "PendingApproval"
  2. registrationStep → "Completed"
  - Event: MemberRegistrationSubmitted
  - Routed to configured approver (default: Forum Admin)

#### 12. ApproveMemberRegistration
* Triggered by: Forum Admin / Super Admin (or configured approver)
* Input:
```json
{
  "memberId": "uuid",
  "approvedBy": "uuid",
  "approverComments": "string?"
}
```

* Preconditions:
  - Member registrationStatus = "PendingApproval"
  - User has approval permission for MemberRegistration workflow

* Validations:
  1. All documents verified
  2. Payment approved

* Outcome:
  1. registrationStatus → "Approved"
  2. memberStatus → "Active"
  3. registeredAt → current timestamp
  4. Member wallet created with advance deposit balance
  5. GL entries created:
    - Dr. Cash/Bank (totalAmount)
    - Cr. Registration Fee Revenue (registrationFee)
    - Cr. Member Wallet Liability (advanceDeposit)
  6. All documents verificationStatus → "Verified"
  7. Payment approvalStatus → "Approved"
  - Events:
    - MemberRegistrationApproved
    - MemberActivated
    - MemberWalletCreated
    - JournalEntryCreated

#### 13. RejectMemberRegistration
* Triggered by: Forum Admin / Super Admin
Input:
```json
{
  "memberId": "uuid",
  "rejectionReason": "string",
  "rejectedBy": "uuid"
}
```
* Preconditions:
  1. Member registrationStatus = "PendingApproval"

* Outcome:
  - registrationStatus → "Rejected"
  - Payment approvalStatus → "Rejected"
  - Agent must return collected money to applicant (physical process, noted in system)
  - Event: MemberRegistrationRejected

#### 14. RequestRegistrationRevision
* Triggered by: Approver (during approval review)
* Input:
```json
{
  "memberId": "uuid",
  "revisionNotes": "string", // What needs to be fixed
  "requestedBy": "uuid"
}
```

**Preconditions**:
- Member `registrationStatus = "PendingApproval"`

**Outcome**:
- `registrationStatus → "Draft"`
- `registrationStep → "DocumentsPayment"` (or specific step that needs revision)
- Agent can edit and resubmit
- Event: `RegistrationRevisionRequested`

#### 15. SuspendMember

#### 16. ReactivateMember

#### 17. CloseMemberAccount

#### 18. ReassignMemberAgent


## State Machines
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

---

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

## Some Flow Logic Examples

### Agent Assignment Logic
#### Scenario 1: Agent Filling the Form
- Command: StartMemberRegistration
- Input (Agent context):
```json
{
  "personalDetails": { /* ... */ },
  "tierId": "uuid",
  "unitId": "uuid",
  "createdBy": "uuid" // This is the Agent's userId
}
```
- Backend Logic:
```javascript
// If createdBy user is an Agent:
member.agentId = createdBy // Auto-assign agent
```
- UI Implications:
```
Agent: [Auto-filled, read-only] John Doe (Agent)
Unit: [Auto-filled, read-only] Unit A
```

#### Scenario 2: Admin Filling the Form
- Command: StartMemberRegistration
- Input (Admin context):
```json
{
  "personalDetails": { /* ... */ },
  "tierId": "uuid",
  "unitId": "uuid",
  "agentId": "uuid", // Admin explicitly selects agent
  "createdBy": "uuid" // This is the Admin's userId
}
```
- Preconditions:
  - If createdBy is Admin: 
    - agentId field is required
    - Selected agent must belong to the specified unitId
    - Selected agent must be Active

- Backend Logic:
```javascript
// If createdBy user is Admin:
if (!agentId) {
  throw ValidationError("Agent selection required when admin creates registration")
}

// Validate agent belongs to unit
if (agent.unitId !== member.unitId) {
  throw ValidationError("Agent must belong to the same unit as member")
}

member.agentId = agentId
```

- UI Implications:
```
Unit: [Dropdown] Select Unit
Agent: [Dropdown] Select Agent (filtered by selected Unit)
```

## Domain Design Model (data structures)
### 1. Membership Bounded Context 
#### Aggregates
### **Member (root)**
* MemberId
* Personal details (name, DOB, contact, address, etc.)
* Tier/Level
* Status (Active, Frozen, Suspended, Closed)
* Registration date
* UnitId, AgentId
* ForumId, AreaId
* Nominee
