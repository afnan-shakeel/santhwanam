# Approval Workflow Module - Implementation Summary

## Overview
Implemented a complete Approval Workflow system that enables configurable multi-stage approval processes for various entity types across different modules.

## Architecture

### Database Schema (Prisma)
Added 4 new models with enums:

**Models:**
- `ApprovalWorkflow` - Defines approval workflows with configuration
- `ApprovalStage` - Individual stages within a workflow
- `ApprovalRequest` - Tracks approval requests for entities
- `ApprovalStageExecution` - Execution status of each stage in a request

**Enums:**
- `WorkflowModule` - Membership, Wallet, Claims, Contributions, Organization
- `ApproverType` - Role, SpecificUser, Hierarchy
- `HierarchyLevel` - Unit, Area, Forum
- `ApprovalRequestStatus` - Pending, Approved, Rejected, Cancelled
- `ApprovalStageStatus` - Pending, Approved, Rejected, Skipped
- `ApprovalDecision` - Approve, Reject

### Domain Layer
**Entities** (`domain/entities.ts`):
- TypeScript interfaces for all 4 models
- All enums exported as TypeScript enums

**Repositories** (`domain/repositories.ts`):
- `ApprovalWorkflowRepository` - CRUD for workflows
- `ApprovalStageRepository` - Stage management
- `ApprovalRequestRepository` - Request lifecycle
- `ApprovalStageExecutionRepository` - Execution tracking

### Infrastructure Layer
**Prisma Repositories** (`infrastructure/prisma/`):
- `PrismaApprovalWorkflowRepository` - create, findById, findByCode, update, listActive, listAll
- `PrismaApprovalStageRepository` - create, createMany, findByWorkflow, findById, deleteByWorkflow
- `PrismaApprovalRequestRepository` - create, findById, updateStatus, findPendingByEntity, findByRequestedBy, findByStatus
- `PrismaApprovalStageExecutionRepository` - create, createMany, findByRequest, findById, updateDecision, findPendingByApprover, findByRequestAndStage

All repositories support transaction-aware operations via optional `tx` parameter.

### Application Layer
**Services:**

1. **ApprovalWorkflowService** (`application/approvalWorkflowService.ts`):
   - `createWorkflow()` - Creates workflow with stages in transaction
   - `updateWorkflow()` - Updates workflow metadata
   - `getWorkflowById()` - Retrieves workflow with stages
   - `getWorkflowByCode()` - Retrieves workflow by code
   - `listActiveWorkflows()` - Lists active workflows (optionally filtered by module)
   - `listAllWorkflows()` - Lists all workflows

2. **ApprovalRequestService** (`application/approvalRequestService.ts`):
   - `submitRequest()` - Creates approval request with stage executions
   - `processApproval()` - Approve or reject a stage, advances workflow
   - `getPendingApprovals()` - Get pending approvals for a user
   - `getRequestByEntity()` - Get request history for an entity
   - `getRequestById()` - Get request with executions
   - `resolveApprover()` - Resolves approver based on approver type and hierarchy
   - `resolveHierarchyApprover()` - Placeholder for org hierarchy integration (TODO)

**Commands:**
- `CreateWorkflowCommand` - Creates workflow, uses AsyncLocalStorage for createdBy
- `SubmitRequestCommand` - Submits approval request, uses AsyncLocalStorage for requestedBy
- `ProcessApprovalCommand` - Processes approval/rejection, uses AsyncLocalStorage for reviewedBy

### API Layer
**Validators** (`api/validators.ts`):
- `createWorkflowSchema` - Validates workflow creation with stages
- `updateWorkflowSchema` - Validates workflow updates
- `submitRequestSchema` - Validates approval request submission
- `processApprovalSchema` - Validates approval processing

**Controller** (`api/controller.ts`):
- Workflow endpoints: create, update, getById, getByCode, listActive, listAll
- Request endpoints: submit, process, getById, getByEntity
- Approver endpoints: getPendingApprovals

**Router** (`api/router.ts`):
Registered at `/api/approval-workflow`:
- `POST /workflows` - Create workflow
- `PATCH /workflows/:workflowId` - Update workflow
- `GET /workflows/:workflowId` - Get workflow by ID
- `GET /workflows/code/:workflowCode` - Get workflow by code
- `GET /workflows` - List active workflows (query: ?module=)
- `GET /workflows/all` - List all workflows
- `POST /requests` - Submit approval request
- `POST /requests/process` - Process approval
- `GET /requests/:requestId` - Get request by ID
- `GET /requests/entity/:entityType/:entityId` - Get request by entity
- `GET /approvals/pending/:approverId` - Get pending approvals for approver

## Integration
- Module wired in `src/modules/approval-workflow/index.ts`
- Router integrated in `src/app.ts` at `/api/approval-workflow`
- Uses existing middleware: `validateZod`, global response handler, error handler
- Uses AsyncLocalStorage for actor tracking (createdBy, requestedBy, reviewedBy)

## Key Features

1. **Configurable Workflows**: Admins can create workflows with multiple stages
2. **Flexible Approver Assignment**: Supports Role-based, specific user, or hierarchy-based approval
3. **Multi-stage Processing**: Sequential or parallel approval flows
4. **Context Awareness**: Workflows track forumId, areaId, unitId for hierarchy resolution
5. **Transaction Safety**: All critical operations use Prisma transactions
6. **Actor Tracking**: All operations record who performed them via AsyncLocalStorage

## TODO / Future Enhancements

1. **Hierarchy Resolution**: Currently returns `null` in `resolveHierarchyApprover()`. Needs integration with Organization Bodies module (Forum, Area, Unit) to resolve approvers based on hierarchy.

2. **Event Publishing**: Add events for:
   - `ApprovalRequestSubmitted`
   - `StageApproved`
   - `StageRejected`
   - `RequestApproved`
   - `RequestRejected`

3. **Notifications**: Integrate notification system to alert approvers when assigned

4. **Auto-Approval Logic**: Implement `autoApprove` flag processing

5. **Optional Stages**: Implement `isOptional` stage skipping logic

6. **Workflow History**: Add audit trail for workflow changes

## Testing Endpoints

Example workflow creation:
```json
POST /api/approval-workflow/workflows
{
  "workflowCode": "member_registration",
  "workflowName": "Member Registration Approval",
  "module": "Membership",
  "entityType": "Member",
  "requiresAllStages": true,
  "stages": [
    {
      "stageName": "Unit Admin Review",
      "stageOrder": 1,
      "approverType": "Role",
      "hierarchyLevel": "Unit"
    },
    {
      "stageName": "Forum Admin Approval",
      "stageOrder": 2,
      "approverType": "Role",
      "hierarchyLevel": "Forum"
    }
  ]
}
```

Example approval request submission:
```json
POST /api/approval-workflow/requests
{
  "workflowCode": "member_registration",
  "entityType": "Member",
  "entityId": "uuid-here",
  "unitId": "unit-uuid",
  "areaId": "area-uuid",
  "forumId": "forum-uuid"
}
```

Example approval processing:
```json
POST /api/approval-workflow/requests/process
{
  "executionId": "execution-uuid",
  "decision": "Approve",
  "comments": "Looks good, approved"
}
```
