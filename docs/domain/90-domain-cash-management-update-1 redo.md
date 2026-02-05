# Cash Management - Spec Update 1

## Recipients Based on Role Assignment & Custody Creation Patterns

---

## Problem Statement

**Original Design Flaw:**
- Cash custody records are created when a user first receives cash
- Recipients list for handover was implicitly dependent on custody existence
- On first-ever handover, no custodians exist yet → Agent cannot find anyone to transfer to

**Example Scenario:**
1. Agent John collects contribution → John's custody created (balance: ₹100)
2. John wants to transfer to Unit Admin Sarah
3. Sarah has no custody record yet (never received cash)
4. System cannot find Sarah as valid recipient ❌

---

## Solution

**Two key changes:**

1. **Recipients are determined by organizational hierarchy and role assignment**, NOT custody existence

2. **Custody records are created at specific points** depending on role:
   - **Agent:** When they first collect cash (contribution or wallet deposit)
   - **Unit/Area/Forum Admin:** When a handover is initiated TO them (at initiation, not acknowledgment)
   - **Super Admin:** Never (cash goes directly to Bank account)

---

## Custody Creation Pattern

### When is Custody Created?

| Role | Custody Created When | Trigger |
|------|---------------------|---------|
| Agent | First cash **collection** | `collectContribution()` or `collectWalletDeposit()` |
| Unit Admin | First **handover initiated to them** | `initiateCashHandover()` |
| Area Admin | First **handover initiated to them** | `initiateCashHandover()` |
| Forum Admin | First **handover initiated to them** | `initiateCashHandover()` |
| Super Admin | **Never** | Cash goes directly to Bank (GL 1100) |

### Why This Pattern?

- **Agent must have custody before initiating** - You cannot transfer cash you don't have
- **Admin custody created at initiation** - So `toCustodyId` is always populated in the handover record
- **CustodyId as primary reference** - Both `fromCustodyId` and `toCustodyId` are known at initiation time

---

## Complete Flow Examples

### Flow 1: Agent's First Collection and Handover

```
Step 1: Agent John assigned to Ruwi Central Unit
        → No custody record yet

Step 2: John collects first contribution (₹100) from a member
        → John's custody CREATED (balance: ₹100)
        → GL Entry: Dr 1001 (Agent Custody) / Cr 4200 (Revenue)

Step 3: John opens "Initiate Handover" screen
        → System queries organization hierarchy (not custody table)
        → Shows: Unit Admin Sarah, Area Admin Mohammed, Forum Admin Ahmed, Central Bank
        → Sarah has no custody record yet - doesn't matter!

Step 4: John initiates handover of ₹100 to Sarah
        → System validates John has sufficient balance ✓
        → System validates Sarah is the Unit Admin for John's unit ✓
        → Sarah's custody CREATED (balance: ₹0)
        → Handover record created with both custodyIds populated

Step 5: Sarah sees pending handover and clicks "Acknowledge"
        → Sarah's custody balance updated (₹0 → ₹100)
        → John's custody balance updated (₹100 → ₹0)
        → GL Entry: Dr 1002 (Unit Admin Custody) / Cr 1001 (Agent Custody)
        → Handover status → Acknowledged
```

### Flow 2: Chain of Handovers

```
Step 1: Agent collects ₹500
        → Agent custody: ₹500

Step 2: Agent initiates handover to Unit Admin
        → Unit Admin custody CREATED if not exists (balance: ₹0)
        
Step 3: Unit Admin acknowledges
        → Agent custody: ₹0
        → Unit Admin custody: ₹500

Step 4: Unit Admin initiates handover to Area Admin
        → Area Admin custody CREATED if not exists (balance: ₹0)

Step 5: Area Admin acknowledges
        → Unit Admin custody: ₹0
        → Area Admin custody: ₹500

Step 6: Area Admin initiates handover to Forum Admin
        → Forum Admin custody CREATED if not exists (balance: ₹0)

Step 7: Forum Admin acknowledges
        → Area Admin custody: ₹0
        → Forum Admin custody: ₹500

Step 8: Forum Admin initiates handover to Central (Super Admin)
        → No custody created for Super Admin
        → Approval workflow triggered

Step 9: Super Admin approves and acknowledges
        → Forum Admin custody: ₹0
        → Bank account (GL 1100): +₹500
```

### Flow 3: Rejected/Cancelled Handover

```
Step 1: Agent initiates handover to Unit Admin
        → Unit Admin custody CREATED (balance: ₹0)
        → Handover status: Initiated

Step 2: Unit Admin rejects (amount mismatch)
        → Handover status: Rejected
        → Agent's balance unchanged
        → Unit Admin's custody exists but balance still ₹0

Step 3: Agent re-initiates with correct amount
        → Unit Admin custody already exists, no new creation needed
```

**Note:** Rejected/cancelled handovers may leave zero-balance custody records. This is harmless and expected.

---

## CashHandover Entity Update

**Key clarification on `toCustodyId`:**

| Field | At Initiation | At Acknowledgment |
|-------|---------------|-------------------|
| `fromCustodyId` | ✓ Always populated | No change |
| `toCustodyId` | ✓ Populated (except SuperAdmin) | No change |

```
CashHandover {
  // Both custody IDs known at initiation
  fromCustodyId: UUID      // Always exists (initiator has cash)
  toCustodyId: UUID?       // Created at initiation, NULL only for SuperAdmin
  
  // User IDs for reference
  fromUserId: UUID
  toUserId: UUID
}
```

---

## Backend Changes

### 1. `GET /cash/recipients`

**Change:** Query organization hierarchy tables, not custody table.

**Logic:**
1. Get current user's role and hierarchy position
2. Determine valid recipient roles based on transfer rules
3. Query `units`, `areas`, `forums` tables for assigned admins
4. Return list with `userId`, `role`, `hierarchyName`, `requiresApproval`

**Recipients shown are based on:**
- Who is assigned as Unit Admin for user's unit
- Who is assigned as Area Admin for user's area
- Who is assigned as Forum Admin for user's forum
- Central Bank (Super Admin) - always available

**NOT based on:** Whether they have a custody record

---

### 2. `POST /cash/handovers` (InitiateCashHandover)

**Changes:**

1. **Validate recipient exists in hierarchy** (not in custody table)
   - Verify `toUserId` is actually the assigned admin for the relevant level

2. **Create receiver's custody at initiation** (not at acknowledgment)
   - Call `getOrCreateCashCustody()` for receiver during initiation
   - `toCustodyId` is populated in the handover record

**Flow:**
```
1. Validate initiator has active custody with sufficient balance
2. Validate recipient is assigned admin in hierarchy
3. Validate transfer path is valid (upward only)
4. Create receiver's custody if not exists (balance: ₹0)
5. Create handover record with both custodyIds
6. If SuperAdmin: Create approval request
7. Notify receiver
```

---

### 3. `AcknowledgeCashHandover`

**Simplified:** No need to create custody anymore (already exists from initiation)

**Flow:**
```
1. Validate handover status is "Initiated"
2. Validate acknowledger is the designated receiver
3. If approval required: Validate approval granted
4. Create GL entry
5. Update fromCustody balance (decrease)
6. Update toCustody balance (increase) - custody already exists!
7. Update handover status → Acknowledged
8. Notify initiator
```

---

### 4. Cash Collection (Contribution/Wallet Deposit)

**No change needed.** Existing flow:

```
1. Agent collects cash from member
2. Call increaseCashCustody()
   → Internally calls getOrCreateCashCustody()
   → Creates agent's custody if not exists
   → Updates balance
3. Create GL entry
```

---

## Frontend Changes

**No changes required.**

- `GET /cash/recipients` response structure unchanged
- Initiate Handover screen works as-is
- Acknowledge screen works as-is

**Optional enhancement:** Add empty state message in Custody Report when no records exist.

---

## Summary

### Key Principles

1. **Recipients come from organization hierarchy**, not custody table
2. **Custody created on-demand** at appropriate trigger points
3. **CustodyId is the primary reference** - always populated at initiation (except SuperAdmin)
4. **Zero-balance custody records are harmless** - created when handover initiated, even if later rejected

### Custody Creation Summary

| Trigger | Who Gets Custody Created |
|---------|--------------------------|
| Agent collects cash | Agent |
| Handover initiated | Receiver (Unit/Area/Forum Admin) |
| Handover acknowledged | Nobody (already exists) |
| Bank deposit | Nobody (Super Admin has no custody) |

### Changes Required

| Component | Change |
|-----------|--------|
| `GET /cash/recipients` | Query org hierarchy, not custody table |
| `POST /cash/handovers` | Create receiver's custody at initiation |
| `AcknowledgeCashHandover` | Simplified - custody already exists |
| Frontend | No changes |
| Database | No migration needed |

---

## Test Scenarios

### Scenario 1: First-Ever Handover in System
1. Agent John collects contribution → John's custody created ✓
2. John opens "Initiate Handover" screen
3. **Expected:** Unit Admin Sarah appears (even though no custody yet)
4. John initiates handover to Sarah → Sarah's custody created (balance: ₹0) ✓
5. Sarah acknowledges → Sarah's balance updated ✓

### Scenario 2: New Admin Assigned Mid-Operation
1. Unit Admin Sarah is reassigned, role given to Ahmed
2. Agent John opens "Initiate Handover"
3. **Expected:** Ahmed appears as recipient (not Sarah)
4. John initiates to Ahmed → Ahmed's custody created ✓

### Scenario 3: Rejected Handover
1. Agent initiates to Unit Admin → Unit Admin's custody created (balance: ₹0)
2. Unit Admin rejects handover
3. **Result:** Unit Admin's custody exists with ₹0 balance (harmless)
4. Agent re-initiates → Uses existing custody, no duplicate created

### Scenario 4: Admin Without Cash History in Reports
1. Forum Admin assigned but never received cash
2. Super Admin opens Custody Report
3. **Expected:** Forum Admin not shown (no custody record)
4. Area Admin initiates handover to Forum Admin → Forum Admin custody created
5. **Expected:** Forum Admin now appears in Custody Report (even before acknowledgment, with ₹0 balance)