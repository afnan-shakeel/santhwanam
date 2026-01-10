# UpdateApprovalWorkflow Command (With Stages)

---

## **Purpose**
Update an existing approval workflow including its metadata AND stages. Handles adding, updating, and removing stages intelligently.

---

## **Input**
```json
{
  "workflowId": "uuid",
  "workflowName": "Updated Member Registration Approval",
  "description": "Updated description",
  "isActive": true,
  "stages": [
    {
      "stageId": "existing-stage-uuid-1", // Existing stage - UPDATE
      "stageOrder": 1,
      "stageName": "Agent Review (Updated)",
      "approverRole": "Agent",
      "isOptional": false
    },
    {
      "stageId": null, // No ID - NEW stage
      "stageOrder": 2,
      "stageName": "Unit Head Approval",
      "approverRole": "UnitHead",
      "isOptional": false
    },
    {
      "stageOrder": 3,
      "stageName": "Admin Final Approval",
      "approverRole": "Admin",
      "isOptional": false
    }
    // Note: existing-stage-uuid-3 not in list - WILL BE DELETED
  ],
  "updatedBy": "uuid"
}
```

---

## **Preconditions**
- Workflow exists
- Cannot deactivate workflow if it has pending approval requests
- Cannot delete stages that have existing executions (data integrity)
- Stage orders must be sequential (1, 2, 3...)
- At least 1 stage required

---

## **Business Logic**

```typescript
async function updateApprovalWorkflow(input) {
  return await db.transaction(async (trx) => {
    
    // 1. Validate workflow exists
    const workflow = await trx.approvalWorkflows.findByPk(input.workflowId);
    
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    // 2. Validate at least one stage
    if (!input.stages || input.stages.length === 0) {
      throw new Error('Workflow must have at least one stage');
    }
    
    // 3. Validate stage orders are sequential
    const orders = input.stages.map(s => s.stageOrder).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        throw new Error('Stage orders must be sequential (1, 2, 3...)');
      }
    }
    
    // 4. Validate no duplicate stage orders
    const uniqueOrders = new Set(input.stages.map(s => s.stageOrder));
    if (uniqueOrders.size !== input.stages.length) {
      throw new Error('Duplicate stage orders not allowed');
    }
    
    // 5. If deactivating workflow, check for pending requests
    if (input.isActive === false && workflow.isActive === true) {
      const pendingRequests = await trx.approvalRequests.count({
        where: {
          workflowId: input.workflowId,
          status: 'Pending'
        }
      });
      
      if (pendingRequests > 0) {
        throw new Error('Cannot deactivate workflow with pending requests');
      }
    }
    
    // 6. Get existing stages
    const existingStages = await trx.approvalStages.findAll({
      where: { workflowId: input.workflowId }
    });
    
    const existingStageIds = new Set(existingStages.map(s => s.stageId));
    const inputStageIds = new Set(
      input.stages.filter(s => s.stageId).map(s => s.stageId)
    );
    
    // 7. Identify stages to DELETE (in existing but not in input)
    const stageIdsToDelete = [...existingStageIds].filter(
      id => !inputStageIds.has(id)
    );
    
    // 8. Validate stages being deleted don't have executions
    if (stageIdsToDelete.length > 0) {
      const executionsCount = await trx.approvalStageExecutions.count({
        where: {
          stageId: { in: stageIdsToDelete }
        }
      });
      
      if (executionsCount > 0) {
        throw new Error(
          'Cannot delete stages that have existing approval executions. ' +
          'Create a new workflow version instead.'
        );
      }
      
      // Safe to delete - no executions exist
      await trx.approvalStages.destroy({
        where: {
          stageId: { in: stageIdsToDelete }
        }
      });
    }
    
    // 9. Update workflow metadata
    await trx.approvalWorkflows.update({
      workflowName: input.workflowName,
      description: input.description,
      isActive: input.isActive,
      updatedAt: new Date(),
      updatedBy: input.updatedBy
    }, {
      where: { workflowId: input.workflowId }
    });
    
    // 10. Process each stage (UPDATE existing or CREATE new)
    for (const stageInput of input.stages) {
      
      if (stageInput.stageId) {
        // UPDATE existing stage
        const existingStage = existingStages.find(
          s => s.stageId === stageInput.stageId
        );
        
        if (!existingStage) {
          throw new Error(`Stage ${stageInput.stageId} not found in workflow`);
        }
        
        // Check if stage has executions - if yes, only allow certain updates
        const hasExecutions = await trx.approvalStageExecutions.count({
          where: { stageId: stageInput.stageId }
        });
        
        if (hasExecutions > 0) {
          // Stage has executions - limited updates allowed
          // Can update: stageName, isOptional
          // Cannot update: stageOrder, approverRole (would break existing data)
          
          if (existingStage.stageOrder !== stageInput.stageOrder) {
            throw new Error(
              `Cannot change order of stage "${existingStage.stageName}" ` +
              `as it has existing executions`
            );
          }
          
          if (existingStage.approverRole !== stageInput.approverRole) {
            throw new Error(
              `Cannot change approver role of stage "${existingStage.stageName}" ` +
              `as it has existing executions`
            );
          }
          
          // Safe to update name and optional flag
          await trx.approvalStages.update({
            stageName: stageInput.stageName,
            isOptional: stageInput.isOptional,
            updatedAt: new Date(),
            updatedBy: input.updatedBy
          }, {
            where: { stageId: stageInput.stageId }
          });
          
        } else {
          // No executions - can update everything
          await trx.approvalStages.update({
            stageOrder: stageInput.stageOrder,
            stageName: stageInput.stageName,
            approverRole: stageInput.approverRole,
            isOptional: stageInput.isOptional,
            updatedAt: new Date(),
            updatedBy: input.updatedBy
          }, {
            where: { stageId: stageInput.stageId }
          });
        }
        
      } else {
        // CREATE new stage
        await trx.approvalStages.create({
          stageId: generateUUID(),
          workflowId: input.workflowId,
          stageOrder: stageInput.stageOrder,
          stageName: stageInput.stageName,
          approverRole: stageInput.approverRole,
          isOptional: stageInput.isOptional || false,
          createdAt: new Date(),
          createdBy: input.updatedBy
        });
      }
    }
    
    // 11. Emit event
    await emitEvent('ApprovalWorkflowUpdated', {
      workflowId: input.workflowId,
      stagesAdded: input.stages.filter(s => !s.stageId).length,
      stagesUpdated: input.stages.filter(s => s.stageId).length,
      stagesDeleted: stageIdsToDelete.length
    });
    
    return workflow;
  });
}
```

---

## **Stage Update Logic Summary**

### **Stages with Executions (Used in active requests)**

**Can Update:**
- ✅ `stageName` - Display name
- ✅ `isOptional` - Optional flag

**Cannot Update:**
- ❌ `stageOrder` - Would break workflow sequence
- ❌ `approverRole` - Would invalidate existing executions
- ❌ Cannot delete - Data integrity

**Reason:** Changing order or role would make historical data inconsistent.

---

### **Stages without Executions (Never used)**

**Can Update:**
- ✅ Everything (`stageOrder`, `stageName`, `approverRole`, `isOptional`)

**Can Delete:**
- ✅ Yes, safe to remove

---

## **Example Scenarios**

### **Scenario 1: Add New Stage**

**Before:**
```
Stage 1: Agent Review
Stage 2: Admin Approval
```

**Input:**
```json
{
  "stages": [
    { "stageId": "stage-1-id", "stageOrder": 1, "stageName": "Agent Review", ... },
    { "stageOrder": 2, "stageName": "Unit Head Approval", ... }, // NEW
    { "stageId": "stage-2-id", "stageOrder": 3, "stageName": "Admin Approval", ... }
  ]
}
```

**After:**
```
Stage 1: Agent Review (existing)
Stage 2: Unit Head Approval (new)
Stage 3: Admin Approval (existing, order updated)
```

**Note:** Updating order of existing stage is OK if it has no executions.

---

### **Scenario 2: Delete Unused Stage**

**Before:**
```
Stage 1: Agent Review (has executions)
Stage 2: Unit Head Approval (no executions)
Stage 3: Admin Approval (has executions)
```

**Input:**
```json
{
  "stages": [
    { "stageId": "stage-1-id", ... },
    { "stageId": "stage-3-id", "stageOrder": 2, ... } // Stage 2 removed
  ]
}
```

**After:**
```
Stage 1: Agent Review
Stage 2: Admin Approval
(Unit Head stage deleted - it had no executions)
```

✅ **Allowed** - Stage 2 had no executions

---

### **Scenario 3: Try to Delete Stage with Executions**

**Before:**
```
Stage 1: Agent Review (has executions)
Stage 2: Unit Head Approval (has executions)
```

**Input:**
```json
{
  "stages": [
    { "stageId": "stage-1-id", ... }
    // Stage 2 omitted
  ]
}
```

**Result:**
```
❌ Error: "Cannot delete stages that have existing approval executions"
```

---

### **Scenario 4: Update Stage Name (Has Executions)**

**Before:**
```
Stage 1: Agent Review (has executions)
```

**Input:**
```json
{
  "stages": [
    { 
      "stageId": "stage-1-id",
      "stageOrder": 1,
      "stageName": "Agent Initial Review", // Changed
      "approverRole": "Agent"
    }
  ]
}
```

**After:**
```
Stage 1: Agent Initial Review (name updated)
```

✅ **Allowed** - Only name changed, order and role same

---

### **Scenario 5: Try to Change Role (Has Executions)**

**Input:**
```json
{
  "stages": [
    { 
      "stageId": "stage-1-id",
      "stageOrder": 1,
      "stageName": "Agent Review",
      "approverRole": "UnitHead" // Changed from Agent
    }
  ]
}
```

**Result:**
```
❌ Error: "Cannot change approver role of stage 'Agent Review' as it has existing executions"
```

---

## **Best Practices for UI**

### **When Editing Workflow:**

1. **Fetch workflow with stages:**
```typescript
GET /api/approvals/workflows/:id
// Returns workflow + all stages
```

2. **Show stage status in UI:**
```
Stage 1: Agent Review
  • Used in 23 approval requests
  • ⚠️ Limited editing (has executions)
  
Stage 2: Unit Head Approval  
  • Never used
  • ✅ Full editing allowed
```

3. **Disable certain fields if stage has executions:**
```jsx
<Select 
  label="Approver Role"
  disabled={stage.hasExecutions}
  tooltip="Cannot change role - stage has been used"
/>
```

4. **Warn before deleting:**
```
Delete Stage 2?
✅ Safe to delete (never used)

Delete Stage 1?
❌ Cannot delete (used in 23 requests)
```

---

## **Validation Summary**

```typescript
Validation Checklist:
✅ Workflow exists
✅ At least 1 stage
✅ Stage orders sequential (1, 2, 3...)
✅ No duplicate orders
✅ Stages being deleted have no executions
✅ Stages with executions: order/role unchanged
✅ No pending requests if deactivating workflow
```

---

## **Outcome**

- Workflow metadata updated
- Stages created/updated/deleted appropriately
- Data integrity maintained
- Event: `ApprovalWorkflowUpdated` with change details

---
