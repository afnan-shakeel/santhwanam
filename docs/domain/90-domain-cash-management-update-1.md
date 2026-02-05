# Cash Management - Spec Update 1

## Recipients Based on Role Assignment (Not Custody Existence)

---

## Problem Statement

**Original Design Flaw:**
- Cash custody records are created when a user first receives cash
- Recipients list for handover was implicitly dependent on custody existence
- On first-ever handover, no custodians exist yet → Agent cannot find anyone to transfer to

**Example Scenario:**
1. Agent John collects first contribution → John's custody created (balance: ₹100)
2. John wants to transfer to Unit Admin Sarah
3. Sarah has no custody record yet (never received cash)
4. System cannot find Sarah as valid recipient ❌

---

## Solution

**Recipients are determined by organizational hierarchy and role assignment, NOT custody existence.**

Custody records are created on-demand when:
1. User collects cash (contribution/wallet deposit) - existing behavior
2. User acknowledges a handover (receives cash) - **already implemented in `getOrCreateCashCustody`**

---

## Backend Changes

### 1. Update: `GET /cash/recipients`

**Before (Flawed):**
```typescript
// Querying custody table - fails for new admins
const recipients = await db.cashCustodies.findAll({
  where: { 
    forumId: currentUser.forumId,
    userRole: { in: validRecipientRoles }
  }
});
```

**After (Correct):**
```typescript
async function getRecipients(currentUserId: string) {
  const currentUser = await getUserWithHierarchy(currentUserId);
  const currentRole = determineUserCashRole(currentUser);
  
  // Determine valid recipient roles based on current user's role
  const validRecipientRoles = getValidRecipientRoles(currentRole);
  
  const recipients: RecipientOption[] = [];
  
  // Query ORGANIZATION STRUCTURE, not custody table
  
  // 1. Unit Admin (if current user is Agent)
  if (validRecipientRoles.includes('UnitAdmin') && currentUser.unitId) {
    const unit = await db.units.findByPk(currentUser.unitId, {
      include: [{ model: db.users, as: 'admin' }]
    });
    
    if (unit?.admin) {
      recipients.push({
        userId: unit.admin.userId,
        fullName: unit.admin.fullName,
        role: 'UnitAdmin',
        roleDisplayName: 'Unit Admin',
        hierarchyLevel: 'Unit',
        hierarchyName: unit.unitName,
        requiresApproval: false
      });
    }
  }
  
  // 2. Area Admin
  if (validRecipientRoles.includes('AreaAdmin') && currentUser.areaId) {
    const area = await db.areas.findByPk(currentUser.areaId, {
      include: [{ model: db.users, as: 'admin' }]
    });
    
    if (area?.admin) {
      recipients.push({
        userId: area.admin.userId,
        fullName: area.admin.fullName,
        role: 'AreaAdmin',
        roleDisplayName: 'Area Admin',
        hierarchyLevel: 'Area',
        hierarchyName: area.areaName,
        requiresApproval: false
      });
    }
  }
  
  // 3. Forum Admin
  if (validRecipientRoles.includes('ForumAdmin') && currentUser.forumId) {
    const forum = await db.forums.findByPk(currentUser.forumId, {
      include: [{ model: db.users, as: 'admin' }]
    });
    
    if (forum?.admin) {
      recipients.push({
        userId: forum.admin.userId,
        fullName: forum.admin.fullName,
        role: 'ForumAdmin',
        roleDisplayName: 'Forum Admin',
        hierarchyLevel: 'Forum',
        hierarchyName: forum.forumName,
        requiresApproval: false
      });
    }
  }
  
  // 4. Super Admin (Central/Bank) - always available
  if (validRecipientRoles.includes('SuperAdmin')) {
    recipients.push({
      userId: null,  // Will be routed to any Super Admin
      fullName: 'Central Account',
      role: 'SuperAdmin',
      roleDisplayName: 'Bank Deposit',
      hierarchyLevel: 'Central',
      hierarchyName: 'Bank Account',
      requiresApproval: true
    });
  }
  
  return recipients;
}

function getValidRecipientRoles(fromRole: string): string[] {
  const validPaths = {
    'Agent': ['UnitAdmin', 'AreaAdmin', 'ForumAdmin', 'SuperAdmin'],
    'UnitAdmin': ['AreaAdmin', 'ForumAdmin', 'SuperAdmin'],
    'AreaAdmin': ['ForumAdmin', 'SuperAdmin'],
    'ForumAdmin': ['SuperAdmin']
  };
  return validPaths[fromRole] || [];
}
```

---

### 2. Update: `POST /cash/handovers` (InitiateCashHandover)

**Add validation that recipient exists in hierarchy (not in custody table):**

```typescript
async function initiateCashHandover(input) {
  return await db.transaction(async (trx) => {
    
    // ... existing from-user validation ...
    
    // 3. Validate TO user exists and has valid role in hierarchy
    const toUser = await db.users.findByPk(input.toUserId, {
      include: ['roles']
    }, { transaction: trx });
    
    if (!toUser) {
      throw new Error('Receiver not found');
    }
    
    const toUserRole = determineUserCashRole(toUser);
    
    // Validate this user is actually assigned as admin in the hierarchy
    // (Not just has the role, but is THE admin for the relevant unit/area/forum)
    await validateRecipientInHierarchy(fromCustody, toUser, toUserRole, trx);
    
    // 4. Validate transfer path
    validateTransferPath(fromCustody.userRole, toUserRole);
    
    // ... rest remains same ...
    // Note: We do NOT call getOrCreateCashCustody for receiver here
    // Receiver's custody is created when they ACKNOWLEDGE
  });
}

async function validateRecipientInHierarchy(
  fromCustody: CashCustody, 
  toUser: User, 
  toUserRole: string,
  trx: Transaction
): Promise<void> {
  
  if (toUserRole === 'SuperAdmin') {
    // Super Admin doesn't need hierarchy validation
    const hasSuperAdminRole = await hasRole(toUser.userId, 'SuperAdmin');
    if (!hasSuperAdminRole) {
      throw new Error('Recipient is not a Super Admin');
    }
    return;
  }
  
  if (toUserRole === 'UnitAdmin') {
    const unit = await db.units.findByPk(fromCustody.unitId, { transaction: trx });
    if (unit?.adminUserId !== toUser.userId) {
      throw new Error('Recipient is not the Unit Admin for your unit');
    }
    return;
  }
  
  if (toUserRole === 'AreaAdmin') {
    const area = await db.areas.findByPk(fromCustody.areaId, { transaction: trx });
    if (area?.adminUserId !== toUser.userId) {
      throw new Error('Recipient is not the Area Admin for your area');
    }
    return;
  }
  
  if (toUserRole === 'ForumAdmin') {
    const forum = await db.forums.findByPk(fromCustody.forumId, { transaction: trx });
    if (forum?.adminUserId !== toUser.userId) {
      throw new Error('Recipient is not the Forum Admin for your forum');
    }
    return;
  }
  
  throw new Error('Invalid recipient role');
}
```

---

### 3. Confirm: `AcknowledgeCashHandover` (No Change Needed)

The existing implementation already handles custody creation for receiver:

```typescript
async function acknowledgeCashHandover(input) {
  return await db.transaction(async (trx) => {
    
    // ... validation ...
    
    // This already creates custody if not exists ✓
    if (handover.toUserRole !== 'SuperAdmin') {
      const toCustody = await getOrCreateCashCustody({
        userId: handover.toUserId,
        userRole: handover.toUserRole,
        unitId: handover.unitId,
        areaId: handover.areaId,
        forumId: handover.forumId
      }, trx);
      
      // Update receiver's custody balance
      await db.cashCustodies.update({
        currentBalance: db.literal(`current_balance + ${handover.amount}`),
        totalReceived: db.literal(`total_received + ${handover.amount}`),
        lastTransactionAt: new Date(),
        updatedAt: new Date()
      }, {
        where: { custodyId: toCustody.custodyId }
      }, { transaction: trx });
    }
    
    // ... rest of acknowledgment ...
  });
}
```

---

### 4. Update: Custody Report Query

**Handle admins who haven't received cash yet (no custody record):**

```typescript
async function getCustodyReport(filters) {
  // Option 1: Only show users WITH custody (current behavior - acceptable)
  // Users appear in report once they've handled cash
  
  // Option 2: Show all admins, with custody data if exists
  // This is more comprehensive but may show many "zero" rows
  
  // Recommended: Option 1 (keep current behavior)
  // Custody report shows users who have handled cash
  // Organization/Admin report shows all assigned admins
  
  const custodies = await db.cashCustodies.findAll({
    where: buildFilters(filters),
    include: [
      { model: db.users, as: 'user', attributes: ['fullName', 'email', 'phone'] },
      { model: db.units, as: 'unit', attributes: ['unitName'] },
      { model: db.areas, as: 'area', attributes: ['areaName'] },
      { model: db.forums, as: 'forum', attributes: ['forumName'] }
    ],
    order: [['userRole', 'ASC'], ['currentBalance', 'DESC']]
  });
  
  return custodies;
}
```

---

## Frontend Changes

### 1. `GET /cash/recipients` Response Handling (No Change Needed)

The response structure remains the same. Frontend already handles:
- Displaying recipient list
- Showing "Requires approval" indicator
- Handling `userId: null` for Super Admin

```typescript
interface RecipientOption {
  userId: string | null;  // null for SuperAdmin
  fullName: string;
  role: string;
  roleDisplayName: string;
  hierarchyLevel: string;
  hierarchyName: string;
  requiresApproval: boolean;
}
```

### 2. Initiate Handover Screen (No Change Needed)

The screen already:
- Fetches recipients from API
- Displays them in selection list
- Shows approval indicator where applicable

### 3. Custody Report Screen (Minor Enhancement - Optional)

**Optional:** Add empty state message when no custodians exist yet:

```typescript
// custody-report.component.ts

@Component({
  template: `
    <div *ngIf="custodies.length === 0" class="empty-state">
      <p>No cash custody records yet.</p>
      <p class="text-gray-500">
        Custody records are created when users first handle cash 
        (via collection or handover).
      </p>
    </div>
    
    <div *ngIf="custodies.length > 0">
      <!-- Existing custody list -->
    </div>
  `
})
```

---

## Summary of Changes

| Layer | Component | Change Type | Description |
|-------|-----------|-------------|-------------|
| Backend | `GET /cash/recipients` | **Modified** | Query organization hierarchy (units, areas, forums) instead of custody table |
| Backend | `POST /cash/handovers` | **Modified** | Add `validateRecipientInHierarchy()` to verify recipient is assigned admin |
| Backend | `AcknowledgeCashHandover` | None | Already creates custody on-demand via `getOrCreateCashCustody` |
| Backend | Custody Report | None | Keep current behavior (only shows users with custody) |
| Frontend | Recipients fetch | None | Response structure unchanged |
| Frontend | Initiate Handover | None | Works as-is with new backend |
| Frontend | Custody Report | Optional | Add empty state message |

---

## Test Scenarios

### Scenario 1: First-Ever Handover in System
1. Agent John collects contribution → John's custody created ✓
2. John opens "Initiate Handover" screen
3. **Expected:** Unit Admin Sarah appears in recipients list (even though Sarah has no custody)
4. John initiates handover to Sarah
5. Sarah acknowledges → Sarah's custody created automatically ✓

### Scenario 2: New Admin Assigned Mid-Operation
1. Unit Admin Sarah is reassigned, Admin role given to Ahmed
2. Agent John opens "Initiate Handover"
3. **Expected:** Ahmed appears as recipient (not Sarah)
4. John transfers to Ahmed → Ahmed's custody created on acknowledgment ✓

### Scenario 3: Admin Without Cash History
1. Forum Admin has been assigned but never handled cash
2. Super Admin opens Custody Report
3. **Expected:** Forum Admin not shown (no custody record yet)
4. Area Admin transfers to Forum Admin, Forum Admin acknowledges
5. **Expected:** Forum Admin now appears in Custody Report ✓

---

## Migration Notes

**No database migration required.**

Changes are purely in application logic:
- Query source changes from custody table to organization tables
- Custody creation timing unchanged (on-demand)

**Deployment:**
1. Deploy backend changes
2. Frontend works without changes
3. Existing custody records unaffected