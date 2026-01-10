# Agent Context
---

## Domain Model

### **Entity: Agent**

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

## Commands

### **Command: StartAgentRegistration**

**Triggered by:** Unit Admin, Area Admin, Forum Admin, Super Admin

**Input:**
```json
{
  "unitId": "uuid",
  "agentCode": "string",
  "email": "string",
  "personalDetails": {
    "firstName": "string",
    "middleName": "string?",
    "lastName": "string",
    "dateOfBirth": "date",
    "gender": "Male|Female|Other"
  },
  "contactDetails": {
    "contactNumber": "string",
    "alternateContactNumber": "string?"
  },
  "address": {
    "line1": "string?",
    "line2": "string?",
    "city": "string?",
    "state": "string?",
    "postalCode": "string?",
    "country": "string?"
  },
  "joinedDate": "date",
  "createdBy": "uuid"
}
```

**Preconditions:**
- Unit exists and is active
- agentCode unique within unit
- email unique globally
- User has `agent.create` permission
- joinedDate <= today
- Age >= 18 years

**Backend Logic:**
```javascript
async function startAgentRegistration(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Check permission
    const canCreate = await hasPermission(
      input.createdBy,
      'agent.create',
      { unitId: input.unitId }
    );
    
    if (!canCreate) {
      throw new Error('Not authorized to create agents');
    }
    
    // 2. Get unit
    const unit = await db.units.findByPk(input.unitId, { transaction: trx });
    if (!unit) {
      throw new Error('Unit not found');
    }
    
    // 3. Validate agentCode unique within unit
    const existingAgent = await db.agents.findOne({
      where: { unitId: input.unitId, agentCode: input.agentCode }
    }, { transaction: trx });
    
    if (existingAgent) {
      throw new Error('Agent code already exists in this unit');
    }
    
    // 4. Validate email unique
    const existingEmail = await db.agents.findOne({
      where: { email: input.email }
    }, { transaction: trx });
    
    if (existingEmail) {
      throw new Error('Email already registered');
    }
    
    // 5. Validate age
    const age = calculateAge(input.personalDetails.dateOfBirth);
    if (age < 18) {
      throw new Error('Agent must be at least 18 years old');
    }
    
    // 6. Create agent
    const agent = await db.agents.create({
      agentId: generateUUID(),
      agentCode: input.agentCode,
      registrationStatus: 'Draft',
      unitId: input.unitId,
      areaId: unit.areaId,
      forumId: unit.forumId,
      firstName: input.personalDetails.firstName,
      middleName: input.personalDetails.middleName,
      lastName: input.personalDetails.lastName,
      dateOfBirth: input.personalDetails.dateOfBirth,
      gender: input.personalDetails.gender,
      contactNumber: input.contactDetails.contactNumber,
      alternateContactNumber: input.contactDetails.alternateContactNumber,
      email: input.email,
      addressLine1: input.address?.line1,
      addressLine2: input.address?.line2,
      city: input.address?.city,
      state: input.address?.state,
      postalCode: input.address?.postalCode,
      country: input.address?.country,
      joinedDate: input.joinedDate,
      totalActiveMembers: 0,
      totalRegistrations: 0,
      createdAt: new Date(),
      createdBy: input.createdBy
    }, { transaction: trx });
    
    // 7. Emit event
    await emitEvent('AgentRegistrationStarted', {
      agentId: agent.agentId,
      agentCode: agent.agentCode,
      unitId: input.unitId,
      email: input.email,
      createdBy: input.createdBy
    });
    
    return agent;
  });
}
```

**Outcome:**
- Agent created with status "Draft"
- Event: `AgentRegistrationStarted`

---

### **Command: UpdateAgentDraft**

**Triggered by:** Creator or Admin

**Input:**
```json
{
  "agentId": "uuid",
  "personalDetails": { /* ... */ },
  "contactDetails": { /* ... */ },
  "address": { /* ... */ }
}
```

**Preconditions:**
- Agent exists with registrationStatus = "Draft"
- User is creator or has permission

**Backend Logic:**
```javascript
async function updateAgentDraft(input) {
  return await db.transaction(async (trx) => {
    
    const agent = await db.agents.findByPk(input.agentId, { transaction: trx });
    
    if (!agent || agent.registrationStatus !== 'Draft') {
      throw new Error('Invalid agent or status');
    }
    
    // Validate age if dateOfBirth updated
    if (input.personalDetails?.dateOfBirth) {
      const age = calculateAge(input.personalDetails.dateOfBirth);
      if (age < 18) {
        throw new Error('Agent must be at least 18 years old');
      }
    }
    
    // Build updates
    const updates = { updatedAt: new Date() };
    if (input.personalDetails?.firstName) updates.firstName = input.personalDetails.firstName;
    if (input.personalDetails?.middleName !== undefined) updates.middleName = input.personalDetails.middleName;
    // ... update all provided fields
    
    await db.agents.update(updates, {
      where: { agentId: input.agentId }
    }, { transaction: trx });
    
    await emitEvent('AgentDraftUpdated', { agentId: input.agentId });
    
    return await db.agents.findByPk(input.agentId, { transaction: trx });
  });
}
```

**Outcome:**
- Agent details updated
- Still in Draft status

---

### **Command: SubmitAgentRegistration**

**Triggered by:** Creator or Admin

**Input:**
```json
{
  "agentId": "uuid"
}
```

**Preconditions:**
- Agent exists with registrationStatus = "Draft"
- All required fields filled
- Email unique
- agentCode unique within unit

**Backend Logic:**
```javascript
async function submitAgentRegistration(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Get agent
    const agent = await db.agents.findByPk(input.agentId, { transaction: trx });
    
    if (!agent || agent.registrationStatus !== 'Draft') {
      throw new Error('Invalid agent or status');
    }
    
    // 2. Validate all required fields
    if (!agent.firstName || !agent.lastName) {
      throw new Error('First name and last name required');
    }
    
    if (!agent.dateOfBirth) {
      throw new Error('Date of birth required');
    }
    
    const age = calculateAge(agent.dateOfBirth);
    if (age < 18) {
      throw new Error('Agent must be at least 18 years old');
    }
    
    if (!agent.contactNumber) {
      throw new Error('Contact number required');
    }
    
    if (!agent.email) {
      throw new Error('Email required');
    }
    
    // 3. Validate email still unique
    const duplicateEmail = await db.agents.findOne({
      where: { 
        email: agent.email,
        agentId: { ne: agent.agentId }
      }
    }, { transaction: trx });
    
    if (duplicateEmail) {
      throw new Error('Email already in use');
    }
    
    // 4. Check if email exists in Supabase
    const existingUser = await supabase.auth.admin.listUsers({
      filter: `email.eq.${agent.email}`
    });
    
    if (existingUser.data.users.length > 0) {
      throw new Error('Email already registered in system');
    }
    
    // 5. Update status
    await db.agents.update({
      registrationStatus: 'PendingApproval',
      updatedAt: new Date()
    }, {
      where: { agentId: input.agentId }
    }, { transaction: trx });
    
    // 6. CREATE APPROVAL REQUEST
    const approvalRequest = await createApprovalRequest({
      workflowCode: 'agent_registration',
      entityType: 'Agent',
      entityId: input.agentId,
      forumId: agent.forumId,
      areaId: agent.areaId,
      unitId: agent.unitId,
      submittedBy: agent.createdBy
    }, trx);
    
    // 7. Link approval request
    await db.agents.update({
      approvalRequestId: approvalRequest.requestId
    }, {
      where: { agentId: input.agentId }
    }, { transaction: trx });
    
    // 8. Emit event
    await emitEvent('AgentRegistrationSubmitted', {
      agentId: input.agentId,
      agentCode: agent.agentCode,
      approvalRequestId: approvalRequest.requestId,
      unitId: agent.unitId
    });
    
    return {
      agentId: input.agentId,
      agentCode: agent.agentCode,
      registrationStatus: 'PendingApproval',
      approvalRequestId: approvalRequest.requestId
    };
  });
}
```

**Outcome:**
- Agent status → "PendingApproval"
- Approval request created
- Event: `AgentRegistrationSubmitted`

---

## Approval Integration (Event Listeners)

### **Event: ApprovalRequestApproved (agent_registration)**

```javascript
on('ApprovalRequestApproved', async (event) => {
  if (event.workflowCode === 'agent_registration') {
    await activateAgent(event.entityId, event.finalApprovedBy);
  }
});

async function activateAgent(agentId, approvedBy) {
  return await db.transaction(async (trx) => {
    
    // 1. Get agent
    const agent = await db.agents.findByPk(agentId, { transaction: trx });
    
    if (!agent) {
      throw new Error('Agent not found');
    }
    
    // 2. Create user in Supabase
    const { data: supabaseUser, error: supabaseError } = 
      await supabase.auth.admin.createUser({
        email: agent.email,
        email_confirm: true
      });
    
    if (supabaseError) {
      throw new Error(`Supabase user creation failed: ${supabaseError.message}`);
    }
    
    // 3. Create local user
    const localUser = await db.users.create({
      userId: generateUUID(),
      externalAuthId: supabaseUser.id,
      email: agent.email,
      firstName: agent.firstName,
      lastName: agent.lastName,
      isActive: true,
      createdAt: new Date(),
      lastSyncedAt: new Date()
    }, { transaction: trx });
    
    // 4. Update agent
    await db.agents.update({
      registrationStatus: 'Approved',
      agentStatus: 'Active',
      userId: localUser.userId,
      approvedAt: new Date(),
      approvedBy,
      updatedAt: new Date()
    }, {
      where: { agentId }
    }, { transaction: trx });
    
    // 5. Get Agent role
    const agentRole = await db.roles.findOne({
      where: { roleCode: 'agent', isActive: true }
    });
    
    if (!agentRole) {
      throw new Error('Agent role not found');
    }
    
    // 6. Assign Agent role
    await db.userRoles.create({
      userRoleId: generateUUID(),
      userId: localUser.userId,
      roleId: agentRole.roleId,
      scopeEntityType: 'Agent',
      scopeEntityId: agentId,
      isActive: true,
      assignedAt: new Date(),
      assignedBy: approvedBy
    }, { transaction: trx });
    
    // 7. Generate invitation link
    const { data: inviteLink, error: linkError } = 
      await supabase.auth.admin.generateLink({
        type: 'invite',
        email: agent.email,
        options: {
          redirectTo: `${process.env.APP_URL}/auth/set-password`
        }
      });
    
    if (linkError) {
      console.error('Failed to generate invite link:', linkError);
    }
    
    // 8. Emit event
    await emitEvent('AgentActivated', {
      agentId,
      agentCode: agent.agentCode,
      userId: localUser.userId,
      unitId: agent.unitId,
      approvedBy,
      invitationSent: !linkError
    });
    
    return agent;
  });
}
```

**Outcome:**
- User created in Supabase and local DB
- Agent status → "Approved", "Active"
- Agent role assigned
- Invitation email sent
- Event: `AgentActivated`

---

### **Event: ApprovalRequestRejected (agent_registration)**

```javascript
on('ApprovalRequestRejected', async (event) => {
  if (event.workflowCode === 'agent_registration') {
    await handleAgentRejection(
      event.entityId,
      event.rejectedBy,
      event.rejectionReason
    );
  }
});

async function handleAgentRejection(agentId, rejectedBy, rejectionReason) {
  return await db.transaction(async (trx) => {
    
    await db.agents.update({
      registrationStatus: 'Rejected',
      updatedAt: new Date()
    }, {
      where: { agentId }
    }, { transaction: trx });
    
    await emitEvent('AgentRegistrationRejected', {
      agentId,
      rejectedBy,
      rejectionReason
    });
  });
}
```

**Outcome:**
- Agent status → "Rejected"
- Event: `AgentRegistrationRejected`

---

## Post-Approval Commands

### **Command: UpdateAgent**

**Triggered by:** Super Admin, Admins, Agent (self)

**Input:**
```json
{
  "agentId": "uuid",
  "personalDetails": { /* ... */ },
  "contactDetails": { /* ... */ },
  "address": { /* ... */ },
  "updatedBy": "uuid"
}
```

**Preconditions:**
- Agent exists with agentStatus not null
- If self-update: updatedBy = agent.userId
- If admin: has permission

**Note:** Cannot update: agentCode, unitId, userId, email, joinedDate

**Backend Logic:**
```javascript
async function updateAgent(input) {
  return await db.transaction(async (trx) => {
    
    const agent = await db.agents.findByPk(input.agentId, { transaction: trx });
    
    if (!agent || !agent.agentStatus) {
      throw new Error('Invalid agent or not approved yet');
    }
    
    // Check permission
    const isSelfUpdate = (input.updatedBy === agent.userId);
    
    if (!isSelfUpdate) {
      const canUpdate = await hasPermission(
        input.updatedBy,
        'agent.update',
        { unitId: agent.unitId }
      );
      
      if (!canUpdate) {
        throw new Error('Not authorized');
      }
    }
    
    // Build updates
    const updates = { updatedAt: new Date(), updatedBy: input.updatedBy };
    
    if (input.personalDetails?.firstName) updates.firstName = input.personalDetails.firstName;
    if (input.personalDetails?.dateOfBirth) {
      const age = calculateAge(input.personalDetails.dateOfBirth);
      if (age < 18) {
        throw new Error('Agent must be at least 18 years old');
      }
      updates.dateOfBirth = input.personalDetails.dateOfBirth;
    }
    // ... update all provided fields
    
    await db.agents.update(updates, {
      where: { agentId: input.agentId }
    }, { transaction: trx });
    
    // If name changed, update user table
    if (updates.firstName || updates.lastName) {
      const userUpdates = {};
      if (updates.firstName) userUpdates.firstName = updates.firstName;
      if (updates.lastName) userUpdates.lastName = updates.lastName;
      
      await db.users.update(userUpdates, {
        where: { userId: agent.userId }
      }, { transaction: trx });
    }
    
    await emitEvent('AgentUpdated', {
      agentId: input.agentId,
      updatedBy: input.updatedBy
    });
    
    return await db.agents.findByPk(input.agentId, { transaction: trx });
  });
}
```

**Outcome:**
- Agent details updated
- User table updated if name changed

---

### **Command: SuspendAgent** (Phase 2)

**Triggered by:** Super Admin, Admins

**Input:**
```json
{
  "agentId": "uuid",
  "suspensionReason": "string",
  "suspendedBy": "uuid"
}
```

**Preconditions:**
- Agent exists with agentStatus = "Active"
- Phase 2 feature

---

### **Command: TerminateAgent** (Phase 1)

**Triggered by:** Super Admin, Forum Admin, Area Admin, Unit Admin

**Input:**
```json
{
  "agentId": "uuid",
  "terminationReason": "string",
  "terminatedDate": "date",
  "terminatedBy": "uuid"
}
```

**Preconditions:**
- Agent exists with agentStatus = "Active"
- Agent has zero active members (Phase 1)
- User has permission

**Backend Logic:**
```javascript
async function terminateAgent(input) {
  return await db.transaction(async (trx) => {
    
    const agent = await db.agents.findByPk(input.agentId, { transaction: trx });
    
    if (!agent || agent.agentStatus !== 'Active') {
      throw new Error('Invalid agent or not active');
    }
    
    // Check permission
    const canTerminate = await hasPermission(
      input.terminatedBy,
      'agent.terminate',
      { unitId: agent.unitId }
    );
    
    if (!canTerminate) {
      throw new Error('Not authorized');
    }
    
    // Phase 1: Check no active members
    const activeMembers = await db.members.count({
      where: { 
        agentId: input.agentId,
        memberStatus: 'Active'
      }
    }, { transaction: trx });
    
    if (activeMembers > 0) {
      throw new Error(`Cannot terminate agent with ${activeMembers} active members`);
    }
    
    // Update agent
    await db.agents.update({
      agentStatus: 'Terminated',
      terminatedDate: input.terminatedDate,
      terminationReason: input.terminationReason,
      updatedAt: new Date()
    }, {
      where: { agentId: input.agentId }
    }, { transaction: trx });
    
    // Deactivate user
    await db.users.update({
      isActive: false
    }, {
      where: { userId: agent.userId }
    }, { transaction: trx });
    
    // Revoke agent role
    await db.userRoles.update({
      isActive: false,
      revokedAt: new Date(),
      revokedBy: input.terminatedBy
    }, {
      where: {
        userId: agent.userId,
        scopeEntityType: 'Agent',
        scopeEntityId: input.agentId,
        isActive: true
      }
    }, { transaction: trx });
    
    await emitEvent('AgentTerminated', {
      agentId: input.agentId,
      agentCode: agent.agentCode,
      terminationReason: input.terminationReason,
      terminatedBy: input.terminatedBy
    });
    
    return await db.agents.findByPk(input.agentId, { transaction: trx });
  });
}
```

**Outcome:**
- Agent status → "Terminated"
- User deactivated
- Agent role revoked
- Event: `AgentTerminated`

---

## Read Queries

### **GetAgentDetails**

```javascript
async function getAgentDetails(agentId, requestedBy) {
  const agent = await db.agents.findByPk(agentId, {
    include: [
      { model: db.users, as: 'user', attributes: ['userId', 'email', 'isActive'] },
      { 
        model: db.units, 
        as: 'unit',
        include: [{ model: db.areas, as: 'area' }]
      },
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
  
  if (!agent) {
    throw new Error('Agent not found');
  }
  
  const canView = await hasPermission(
    requestedBy,
    'agent.read',
    { unitId: agent.unitId }
  ) || requestedBy === agent.userId;
  
  if (!canView) {
    throw new Error('Not authorized');
  }
  
  return agent;
}
```

---

### **ListAgentsByUnit**

```javascript
async function listAgentsByUnit(filters) {
  // filters: { unitId, status, page, limit, requestedBy }
  
  const canView = await hasPermission(
    filters.requestedBy,
    'agent.read',
    { unitId: filters.unitId }
  );
  
  if (!canView) {
    throw new Error('Not authorized');
  }
  
  const where = { unitId: filters.unitId };
  if (filters.status) where.agentStatus = filters.status;
  
  const offset = (filters.page - 1) * filters.limit;
  
  const { count, rows } = await db.agents.findAndCountAll({
    where,
    include: [
      { model: db.users, as: 'user', attributes: ['userId', 'email', 'isActive'] }
    ],
    order: [['agentCode', 'ASC']],
    limit: filters.limit,
    offset
  });
  
  return {
    total: count,
    page: filters.page,
    limit: filters.limit,
    agents: rows
  };
}
```

---

## Database Schema

```sql
CREATE TABLE agents (
  agent_id UUID PRIMARY KEY,
  agent_code VARCHAR(50) NOT NULL,
  
  -- Registration tracking
  registration_status VARCHAR(50) DEFAULT 'Draft',
  approval_request_id UUID REFERENCES approval_requests(request_id),
  
  -- Hierarchy
  unit_id UUID NOT NULL REFERENCES units(unit_id),
  area_id UUID NOT NULL REFERENCES areas(area_id),
  forum_id UUID NOT NULL REFERENCES forums(forum_id),
  
  -- User reference
  user_id UUID REFERENCES users(user_id),
  
  -- Personal details
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  
  -- Contact
  contact_number VARCHAR(20) NOT NULL,
  alternate_contact_number VARCHAR(20),
  email VARCHAR(255) NOT NULL,
  
  -- Address (Optional)
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  
  -- Agent status
  agent_status VARCHAR(50),
  
  -- Statistics
  total_active_members INT DEFAULT 0,
  total_registrations INT DEFAULT 0,
  
  -- Metadata
  joined_date DATE NOT NULL,
  terminated_date DATE,
  termination_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users(user_id),
  approved_by UUID REFERENCES users(user_id),
  
  -- Constraints
  UNIQUE(unit_id, agent_code),
  CONSTRAINT chk_agent_age CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
);

-- Indexes
CREATE INDEX idx_agents_unit ON agents(unit_id);
CREATE INDEX idx_agents_area ON agents(area_id);
CREATE INDEX idx_agents_forum ON agents(forum_id);
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_agents_status ON agents(registration_status, agent_status);
CREATE INDEX idx_agents_code ON agents(unit_id, agent_code);
CREATE INDEX idx_agents_email ON agents(email);
CREATE INDEX idx_agents_approval ON agents(approval_request_id);
```

---

## State Machines

### **Registration Status:**
```
[Draft]
   ↓
[PendingApproval]
   ↓
   ├─→ [Approved] → User created, agent activated
   └─→ [Rejected]
```

### **Agent Status (Post-Approval):**
```
[Active]
   ↓
   ├─→ [Inactive] (Phase 2)
   ├─→ [Suspended] (Phase 2)
   └─→ [Terminated] (Phase 1: requires 0 active members)
```

---

## Events

- `AgentRegistrationStarted`
- `AgentDraftUpdated`
- `AgentRegistrationSubmitted`
- `AgentActivated`
- `AgentRegistrationRejected`
- `AgentUpdated`
- `AgentTerminated`

---

## Commands Summary

### **Registration:**
1. `StartAgentRegistration`
2. `UpdateAgentDraft`
3. `SubmitAgentRegistration`

### **Approval (via generic workflow):**
- Event listeners: `activateAgent`, `handleAgentRejection`

### **Management:**
4. `UpdateAgent`
5. `TerminateAgent`

---

**Agent context complete with approval workflow!**