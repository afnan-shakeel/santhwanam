
## Approval Workflow System Design

### **Core Concepts:**

1. **Approval workflows are configurable** - Admin defines who approves what
2. **Multi-stage approvals** - Some workflows need multiple approval levels
3. **Role-based or specific user** - Can assign by role OR specific user
4. **Context-specific** - Different workflows for different operations
5. **Hierarchy-aware** - Can route based on organizational hierarchy

---

## Domain Model

### **Entity: ApprovalWorkflow**

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

### **Entity: ApprovalStage**

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

### **Entity: ApprovalRequest**

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

### **Entity: ApprovalStageExecution**

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

## How It Works

### **Step 1: Create Approval Request**

When a member registration is submitted:

```javascript
async function submitMemberRegistration(memberId) {
  return await db.transaction(async (trx) => {
    
    // 1. Update member status
    await db.members.update(
      { registrationStatus: 'PendingApproval' },
      { where: { memberId } },
      { transaction: trx }
    );
    
    // 2. Get approval workflow
    const workflow = await db.approvalWorkflows.findOne({
      where: { 
        workflowCode: 'member_registration',
        isActive: true
      },
      include: [{ 
        model: db.approvalStages, 
        as: 'stages',
        order: [['stageOrder', 'ASC']]
      }]
    }, { transaction: trx });
    
    if (!workflow) {
      throw new Error('Approval workflow not configured');
    }
    
    // 3. Get member for context
    const member = await db.members.findByPk(memberId, { transaction: trx });
    
    // 4. Create approval request
    const request = await db.approvalRequests.create({
      requestId: generateUUID(),
      workflowId: workflow.workflowId,
      entityType: 'Member',
      entityId: memberId,
      forumId: member.forumId,
      areaId: member.areaId,
      unitId: member.unitId,
      requestedBy: member.createdBy,
      requestedAt: new Date(),
      status: 'Pending',
      currentStageOrder: 1,
      createdAt: new Date()
    }, { transaction: trx });
    
    // 5. Create stage executions for all stages
    for (const stage of workflow.stages) {
      await db.approvalStageExecutions.create({
        executionId: generateUUID(),
        requestId: request.requestId,
        stageId: stage.stageId,
        stageOrder: stage.stageOrder,
        status: stage.stageOrder === 1 ? 'Pending' : 'Pending', // First stage is active
        assignedApproverId: await resolveApprover(stage, member),
        createdAt: new Date()
      }, { transaction: trx });
    }
    
    // 6. Notify first stage approver
    const firstExecution = await db.approvalStageExecutions.findOne({
      where: { requestId: request.requestId, stageOrder: 1 }
    }, { transaction: trx });
    
    await notifyApprover(firstExecution.assignedApproverId, request.requestId);
    
    return request;
  });
}
```

---

### **Step 2: Resolve Approver**

```javascript
async function resolveApprover(stage, entity) {
  switch (stage.approverType) {
    case 'SpecificUser':
      return stage.userId;
      
    case 'Role':
      // Find user with this role in the entity's hierarchy
      if (stage.hierarchyLevel === 'Unit') {
        const unit = await db.units.findByPk(entity.unitId);
        return unit.adminUserId;
      } else if (stage.hierarchyLevel === 'Area') {
        const area = await db.areas.findByPk(entity.areaId);
        return area.adminUserId;
      } else if (stage.hierarchyLevel === 'Forum') {
        const forum = await db.forums.findByPk(entity.forumId);
        return forum.adminUserId;
      }
      break;
      
    case 'Hierarchy':
      // Resolve based on hierarchy level
      if (stage.hierarchyLevel === 'Unit') {
        const unit = await db.units.findByPk(entity.unitId);
        return unit.adminUserId;
      }
      // ... similar for Area, Forum
      break;
  }
  
  return null;
}
```

---

### **Step 3: Process Approval**

```javascript
async function processApproval(executionId, decision, reviewedBy, comments) {
  return await db.transaction(async (trx) => {
    
    // 1. Get execution with request and workflow
    const execution = await db.approvalStageExecutions.findByPk(executionId, {
      include: [
        { 
          model: db.approvalRequests, 
          as: 'request',
          include: [
            { 
              model: db.approvalWorkflows, 
              as: 'workflow',
              include: [{ model: db.approvalStages, as: 'stages' }]
            }
          ]
        },
        { model: db.approvalStages, as: 'stage' }
      ]
    }, { transaction: trx });
    
    if (!execution) {
      throw new Error('Execution not found');
    }
    
    if (execution.status !== 'Pending') {
      throw new Error('This stage has already been reviewed');
    }
    
    // 2. Verify reviewer is the assigned approver
    if (execution.assignedApproverId !== reviewedBy) {
      throw new Error('Not authorized to approve this stage');
    }
    
    // 3. Update execution
    await db.approvalStageExecutions.update({
      status: decision === 'Approve' ? 'Approved' : 'Rejected',
      reviewedBy,
      reviewedAt: new Date(),
      decision,
      comments
    }, {
      where: { executionId }
    }, { transaction: trx });
    
    // 4. Handle decision
    if (decision === 'Reject') {
      // Reject entire request
      await db.approvalRequests.update({
        status: 'Rejected',
        rejectedBy: reviewedBy,
        rejectedAt: new Date(),
        rejectionReason: comments
      }, {
        where: { requestId: execution.requestId }
      }, { transaction: trx });
      
      // Update entity status
      await rejectEntity(execution.request.entityType, execution.request.entityId, trx);
      
      return { status: 'Rejected' };
    }
    
    // 5. If approved, check if there are more stages
    const workflow = execution.request.workflow;
    const allStages = workflow.stages.sort((a, b) => a.stageOrder - b.stageOrder);
    const currentStageIndex = allStages.findIndex(s => s.stageId === execution.stageId);
    
    if (currentStageIndex < allStages.length - 1) {
      // More stages remain
      const nextStage = allStages[currentStageIndex + 1];
      
      // Activate next stage
      await db.approvalRequests.update({
        currentStageOrder: nextStage.stageOrder
      }, {
        where: { requestId: execution.requestId }
      }, { transaction: trx });
      
      // Notify next approver
      const nextExecution = await db.approvalStageExecutions.findOne({
        where: { 
          requestId: execution.requestId,
          stageOrder: nextStage.stageOrder
        }
      }, { transaction: trx });
      
      await notifyApprover(nextExecution.assignedApproverId, execution.requestId);
      
      return { status: 'ApprovedStage', nextStage: nextStage.stageName };
    } else {
      // This was the final stage - approve entire request
      await db.approvalRequests.update({
        status: 'Approved',
        approvedBy: reviewedBy,
        approvedAt: new Date()
      }, {
        where: { requestId: execution.requestId }
      }, { transaction: trx });
      
      // Update entity status
      await approveEntity(execution.request.entityType, execution.request.entityId, reviewedBy, trx);
      
      return { status: 'FullyApproved' };
    }
  });
}
```

---

### **Step 4: Entity-Specific Approval Logic**

```javascript
async function approveEntity(entityType, entityId, approvedBy, trx) {
  switch (entityType) {
    case 'Member':
      await approveMemberRegistration(entityId, approvedBy, trx);
      break;
      
    case 'DeathClaim':
      await approveDeathClaim(entityId, approvedBy, trx);
      break;
      
    case 'WalletDeposit':
      await approveWalletDeposit(entityId, approvedBy, trx);
      break;
      
    // ... other entity types
  }
}

async function rejectEntity(entityType, entityId, trx) {
  switch (entityType) {
    case 'Member':
      await db.members.update(
        { registrationStatus: 'Rejected' },
        { where: { memberId: entityId } },
        { transaction: trx }
      );
      break;
      
    // ... other entity types
  }
}
```

---

## Configuration Commands

### **1. CreateApprovalWorkflow**

**Triggered by:** Super Admin

**Input:**
```json
{
  "workflowCode": "string",
  "workflowName": "string",
  "module": "Membership|Wallet|Claims|...",
  "entityType": "string",
  "requiresAllStages": true,
  "stages": [
    {
      "stageName": "Unit Admin Review",
      "stageOrder": 1,
      "approverType": "Hierarchy",
      "hierarchyLevel": "Unit"
    },
    {
      "stageName": "Forum Admin Approval",
      "stageOrder": 2,
      "approverType": "Role",
      "roleId": "uuid"
    }
  ],
  "createdBy": "uuid"
}
```

**Backend Logic:**
```javascript
async function createApprovalWorkflow(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Check if workflow code already exists
    const existing = await db.approvalWorkflows.findOne({
      where: { workflowCode: input.workflowCode }
    }, { transaction: trx });
    
    if (existing) {
      throw new Error('Workflow code already exists');
    }
    
    // 2. Create workflow
    const workflow = await db.approvalWorkflows.create({
      workflowId: generateUUID(),
      workflowCode: input.workflowCode,
      workflowName: input.workflowName,
      module: input.module,
      entityType: input.entityType,
      isActive: true,
      requiresAllStages: input.requiresAllStages,
      createdAt: new Date(),
      createdBy: input.createdBy
    }, { transaction: trx });
    
    // 3. Create stages
    for (const stageInput of input.stages) {
      await db.approvalStages.create({
        stageId: generateUUID(),
        workflowId: workflow.workflowId,
        stageName: stageInput.stageName,
        stageOrder: stageInput.stageOrder,
        approverType: stageInput.approverType,
        roleId: stageInput.roleId,
        userId: stageInput.userId,
        hierarchyLevel: stageInput.hierarchyLevel,
        isOptional: stageInput.isOptional || false,
        autoApprove: stageInput.autoApprove || false,
        createdAt: new Date()
      }, { transaction: trx });
    }
    
    return workflow;
  });
}
```

---

### **2. UpdateApprovalWorkflow**

**Triggered by:** Super Admin

**Input:**
```json
{
  "workflowId": "uuid",
  "workflowName": "string?",
  "isActive": "boolean?",
  "stages": [
    // Updated list of stages
  ],
  "updatedBy": "uuid"
}
```

---

### **3. GetPendingApprovals**

**Triggered by:** User

**Returns all approval requests pending for this user:**

```javascript
async function getPendingApprovals(userId) {
  const executions = await db.approvalStageExecutions.findAll({
    where: {
      assignedApproverId: userId,
      status: 'Pending'
    },
    include: [
      {
        model: db.approvalRequests,
        as: 'request',
        include: [
          { model: db.approvalWorkflows, as: 'workflow' }
        ]
      },
      { model: db.approvalStages, as: 'stage' }
    ],
    order: [['createdAt', 'ASC']]
  });
  
  return executions.map(exec => ({
    executionId: exec.executionId,
    workflowName: exec.request.workflow.workflowName,
    stageName: exec.stage.stageName,
    entityType: exec.request.entityType,
    entityId: exec.request.entityId,
    requestedBy: exec.request.requestedBy,
    requestedAt: exec.request.requestedAt
  }));
}
```

---

## Database Schema

```sql
CREATE TABLE approval_workflows (
  workflow_id UUID PRIMARY KEY,
  workflow_code VARCHAR(100) UNIQUE NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  description TEXT,
  module VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  requires_all_stages BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(user_id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(user_id)
);

CREATE TABLE approval_stages (
  stage_id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES approval_workflows(workflow_id),
  stage_name VARCHAR(255) NOT NULL,
  stage_order INT NOT NULL,
  approver_type VARCHAR(50) NOT NULL, -- Role, SpecificUser, Hierarchy
  role_id UUID REFERENCES roles(role_id),
  user_id UUID REFERENCES users(user_id),
  hierarchy_level VARCHAR(50), -- Unit, Area, Forum
  is_optional BOOLEAN DEFAULT FALSE,
  auto_approve BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(workflow_id, stage_order)
);

CREATE TABLE approval_requests (
  request_id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES approval_workflows(workflow_id),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  forum_id UUID REFERENCES forums(forum_id),
  area_id UUID REFERENCES areas(area_id),
  unit_id UUID REFERENCES units(unit_id),
  requested_by UUID NOT NULL REFERENCES users(user_id),
  requested_at TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  current_stage_order INT,
  approved_by UUID REFERENCES users(user_id),
  approved_at TIMESTAMP,
  rejected_by UUID REFERENCES users(user_id),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE approval_stage_executions (
  execution_id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES approval_requests(request_id),
  stage_id UUID NOT NULL REFERENCES approval_stages(stage_id),
  stage_order INT NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  assigned_approver_id UUID REFERENCES users(user_id),
  reviewed_by UUID REFERENCES users(user_id),
  reviewed_at TIMESTAMP,
  decision VARCHAR(50),
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_workflows_code ON approval_workflows(workflow_code);
CREATE INDEX idx_workflows_active ON approval_workflows(is_active);
CREATE INDEX idx_stages_workflow ON approval_stages(workflow_id, stage_order);
CREATE INDEX idx_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX idx_requests_status ON approval_requests(status);
CREATE INDEX idx_executions_request ON approval_stage_executions(request_id);
CREATE INDEX idx_executions_approver ON approval_stage_executions(assigned_approver_id, status);
```

---

## Pre-Configured Workflows (Seed Data)

```javascript
const DEFAULT_WORKFLOWS = [
  {
    workflowCode: 'member_registration',
    workflowName: 'Member Registration Approval',
    module: 'Membership',
    entityType: 'Member',
    stages: [
      {
        stageName: 'Forum Admin Approval',
        stageOrder: 1,
        approverType: 'Hierarchy',
        hierarchyLevel: 'Forum'
      }
    ]
  },
  {
    workflowCode: 'wallet_deposit_approval',
    workflowName: 'Wallet Deposit Approval',
    module: 'Wallet',
    entityType: 'WalletDeposit',
    stages: [
      {
        stageName: 'Unit Admin Approval',
        stageOrder: 1,
        approverType: 'Hierarchy',
        hierarchyLevel: 'Unit'
      }
    ]
  },
  {
    workflowCode: 'death_claim_approval',
    workflowName: 'Death Claim Approval',
    module: 'Claims',
    entityType: 'DeathClaim',
    stages: [
      {
        stageName: 'Forum Admin Verification',
        stageOrder: 1,
        approverType: 'Hierarchy',
        hierarchyLevel: 'Forum'
      }
    ]
  }
];
```

---

## Benefits of This Design

**Flexible**: Can add/remove/reorder stages without code changes
**Hierarchical**: Automatically resolves approvers based on entity's hierarchy
**Multi-stage**: Supports sequential approval chains
**Auditable**: Complete history of all approvals
**Reusable**: Same system works across all contexts
**Configurable**: Super Admin can change workflows via UI

---

**Does this approval workflow system meet your requirements?** Any adjustments needed?