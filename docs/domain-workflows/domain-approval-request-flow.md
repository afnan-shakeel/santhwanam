# Approval Request Flow - How It Works

## Current State

### What's Implemented ✅

1. **Approval Workflow Module** - Manages approval requests and processing
2. **Event Handlers** - Listen for approval events and update entity records
3. **Event Bus** - Central event publisher/subscriber system
4. **Entity Modules** - Have handlers registered to respond to approval events

### What's Missing ❌

**The approval workflow module is NOT publishing domain events when requests are approved/rejected.**

---

## How It Should Work (Complete Flow)

### Example: Agent Registration Approval

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Agent Submits Registration                         │
├─────────────────────────────────────────────────────────────┤
  1. Agent fills registration form
  2. POST /api/agents/:agentId/submit
  3. SubmitAgentRegistrationHandler executes:
     ├─ Validates agent data complete
     ├─ Calls approvalRequestService.submitRequest({
     │    workflowCode: 'agent_registration',
     │    entityType: 'Agent',
     │    entityId: agentId,
     │    unitId, areaId, forumId,
     │    requestedBy: currentUserId
     │  })
     └─ Returns: { request, executions }
  
  4. Agent registrationStatus → "Submitted"
  5. ApprovalRequest created with status: "Pending"
  6. ApprovalStageExecutions created for all workflow stages

└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Approver Reviews Request                           │
├─────────────────────────────────────────────────────────────┤
  1. Approver sees pending request in their dashboard
  2. POST /api/approval-workflow/requests/process
     Body: {
       executionId: "stage-execution-uuid",
       decision: "Approve",  // or "Reject"
       comments: "Looks good"
     }
  
  3. ProcessApprovalCommand executes:
     ├─ Validates execution is pending
     ├─ Validates approver is authorized
     ├─ Updates ApprovalStageExecution:
     │    status: "Approved" (or "Rejected")
     │    reviewedBy, reviewedAt, decision, comments
     └─ Checks workflow completion logic

└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Workflow Completion Logic                          │
├─────────────────────────────────────────────────────────────┤

  IF decision = "Reject":
    ├─ Update ApprovalRequest:
    │    status: "Rejected"
    │    rejectedBy, rejectedAt, rejectionReason
    └─ ⚠️ SHOULD publish event:
         eventBus.publish({
           eventType: 'approval.request.rejected',
           payload: {
             requestId, workflowCode, entityType, entityId,
             rejectedBy, rejectedAt, rejectionReason
           }
         })

  IF decision = "Approve":
    ├─ Check if all stages approved OR workflow allows partial
    │
    IF all stages complete:
    │  ├─ Update ApprovalRequest:
    │  │    status: "Approved"
    │  │    approvedBy, approvedAt
    │  └─ ⚠️ SHOULD publish event:
    │       eventBus.publish({
    │         eventType: 'approval.request.approved',
    │         payload: {
    │           requestId, workflowCode, entityType, entityId,
    │           approvedBy, approvedAt
    │         }
    │       })
    │
    ELSE:
    │  └─ Move to next stage:
    │       ApprovalRequest.currentStageOrder += 1
    │       Keep status: "Pending"

└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Event Handler Activates Agent                      │
├─────────────────────────────────────────────────────────────┤

  When 'approval.request.approved' event is published:

  1. ActivateAgentOnApprovalHandler receives event
  
  2. Checks if event is for agent:
     ├─ workflowCode === 'agent_registration'
     └─ entityType === 'Agent'
  
  3. If YES, activates agent:
     ├─ Get agent by entityId
     ├─ Create Supabase user account
     ├─ Create local User record
     ├─ Update Agent:
     │    registrationStatus: "Approved"
     │    agentStatus: "Active"
     │    userId: <new-user-id>
     │    approvedBy: <from-event>
     ├─ Assign "agent" role to user
     ├─ Generate invitation link
     └─ Publish AgentActivatedEvent
  
  4. Agent can now login and use the system!

└─────────────────────────────────────────────────────────────┘
```

---

## Current Implementation Status

### ✅ What Exists

#### 1. Approval Request Service (`approvalRequestService.ts`)
```typescript
async processApproval(data: {
  executionId: string;
  decision: ApprovalDecision;
  reviewedBy: string;
  comments?: string;
}): Promise<{ execution: ApprovalStageExecution; request: ApprovalRequest }> {
  // ... validation ...
  
  if (data.decision === 'Reject') {
    // Updates request status to "Rejected"
    // ❌ BUT doesn't publish event
  }
  
  if (allApproved) {
    // Updates request status to "Approved"
    // ❌ BUT doesn't publish event
  }
}
```

#### 2. Event Handlers Registered (`event-handlers.config.ts`)
```typescript
// Agent handlers
eventBus.subscribe('approval.request.approved', activateAgentHandler);
eventBus.subscribe('approval.request.rejected', rejectAgentHandler);

// Member handlers  
eventBus.subscribe('approval.request.approved', activateMemberHandler);
eventBus.subscribe('approval.request.rejected', rejectMemberHandler);
```

#### 3. Agent Activation Handler (`ActivateAgentOnApprovalHandler`)
```typescript
async handle(event: DomainEvent): Promise<void> {
  const payload = event.payload as ApprovalRequestApprovedPayload;
  
  if (payload.workflowCode !== 'agent_registration') return;
  if (payload.entityType !== 'Agent') return;
  
  // Creates user, assigns role, activates agent
  await this.agentRepository.updateRegistrationStatus(
    agentId,
    RegistrationStatus.Approved,
    undefined,
    approvedBy,
    tx
  );
  
  await this.agentRepository.update(agentId, {
    userId: localUser.userId,
    agentStatus: AgentStatus.Active,
    updatedBy: approvedBy,
  }, tx);
}
```

---

## ❌ What's Missing

### The approval workflow doesn't publish events!

**File to Update:** `src/modules/approval-workflow/application/approvalRequestService.ts`

**In `processApproval()` method, add:**

#### After Rejection:
```typescript
if (data.decision === 'Reject') {
  const updatedRequest = await this.requestRepo.updateStatus(/*...*/);
  
  // ⚠️ ADD THIS:
  await eventBus.publish(
    new ApprovalRequestRejectedEvent({
      requestId: request.requestId,
      workflowCode: workflow.workflowCode,
      entityType: request.entityType,
      entityId: request.entityId,
      rejectedBy: data.reviewedBy,
      rejectedAt: new Date(),
      rejectionReason: data.comments || null,
    })
  );
  
  return { execution: updatedExecution, request: updatedRequest };
}
```

#### After Full Approval:
```typescript
if (allApproved || (workflow && !workflow.requiresAllStages && currentStageApproved)) {
  const updatedRequest = await this.requestRepo.updateStatus(/*...*/);
  
  // ⚠️ ADD THIS:
  await eventBus.publish(
    new ApprovalRequestApprovedEvent({
      requestId: request.requestId,
      workflowCode: workflow.workflowCode,
      entityType: request.entityType,
      entityId: request.entityId,
      approvedBy: data.reviewedBy,
      approvedAt: new Date(),
    })
  );
  
  return { execution: updatedExecution, request: updatedRequest };
}
```

---

## Files to Create

### 1. Domain Events (`src/modules/approval-workflow/domain/events.ts`)

```typescript
import { DomainEvent } from '@/shared/domain/events/domain-event.base';

interface ApprovalRequestApprovedPayload {
  requestId: string;
  workflowCode: string;
  entityType: string;
  entityId: string;
  approvedBy: string;
  approvedAt: Date;
}

export class ApprovalRequestApprovedEvent extends DomainEvent {
  constructor(payload: ApprovalRequestApprovedPayload) {
    super(
      'approval.request.approved',
      payload.requestId,
      'ApprovalRequest',
      payload
    );
  }
}

interface ApprovalRequestRejectedPayload {
  requestId: string;
  workflowCode: string;
  entityType: string;
  entityId: string;
  rejectedBy: string;
  rejectedAt: Date;
  rejectionReason: string | null;
}

export class ApprovalRequestRejectedEvent extends DomainEvent {
  constructor(payload: ApprovalRequestRejectedPayload) {
    super(
      'approval.request.rejected',
      payload.requestId,
      'ApprovalRequest',
      payload
    );
  }
}
```

### 2. Import in Service

Add to `approvalRequestService.ts`:
```typescript
import { eventBus } from '@/shared/domain/events/event-bus';
import {
  ApprovalRequestApprovedEvent,
  ApprovalRequestRejectedEvent,
} from '../domain/events';
```

---

## Complete Flow Diagram

```
Agent Submit              Approval Process              Event Handler
Registration              (Approval Workflow)           (Entity Module)
───────────               ─────────────────             ───────────────

    │                            │                            │
    ├─ Submit Form              │                            │
    │  (Agent data)              │                            │
    │                            │                            │
    ├──────────────────────────►│                            │
    │  Create ApprovalRequest    │                            │
    │  Status: Pending           │                            │
    │                            │                            │
    │◄───────────────────────────┤                            │
    │  requestId                 │                            │
    │                            │                            │
    │                            │                            │
    │                    Approver Reviews                     │
    │                            │                            │
    │                            ├─ Update Execution         │
    │                            │  status: Approved          │
    │                            │                            │
    │                            ├─ Check All Stages         │
    │                            │  Complete? YES             │
    │                            │                            │
    │                            ├─ Update Request           │
    │                            │  status: Approved          │
    │                            │                            │
    │                            ├─ Publish Event ──────────►│
    │                            │  approval.request.approved │
    │                            │                            │
    │                            │                            ├─ Receive Event
    │                            │                            │  workflowCode?
    │                            │                            │  agent_registration
    │                            │                            │
    │                            │                            ├─ Create User
    │                            │                            │  in Supabase
    │                            │                            │
    │◄───────────────────────────────────────────────────────┤
    │  Agent Activated!          │                            │  Update Agent
    │  - userId assigned         │                            │  - registrationStatus
    │  - status: Active          │                            │  - agentStatus
    │  - can login               │                            │  - userId
    │                            │                            │
```

---

## Summary

### How Approval Works:

1. **Entity Module** (Agent/Member) submits approval request
   - Creates `ApprovalRequest` with status "Pending"
   - Creates `ApprovalStageExecution` records for all stages

2. **Approver** processes the request
   - Updates execution status (Approved/Rejected)
   - If all stages done → updates request status

3. **Event Publish:** Approval service should publish event
   - `approval.request.approved` OR
   - `approval.request.rejected`

4. **Event Handler** (in entity module) receives event
   - Checks if event is for their entity type
   - Updates entity record (registrationStatus, status, userId, etc.)
   - Creates user account (if needed)
   - Assigns roles (if needed)

