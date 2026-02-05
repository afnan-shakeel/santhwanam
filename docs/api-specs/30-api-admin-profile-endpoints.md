# Admin Entity Profiles - API Requirements

## Overview

API changes and additions required to support the Admin Entity Profile pages (Forum, Area, Unit profiles).

---

## 1. Enhance Existing Entity GET APIs

Add admin details to existing entity endpoints.

### GET /api/organization-bodies/units/:unitId

**Current Response:**
```typescript
{
  unitId: string;
  unitCode: string;
  unitName: string;
  establishedDate: string;
  areaId: string;
  forumId: string;
  adminUserId: string;
  createdAt: string;
  updatedAt: string;
}
```

**Enhanced Response:**
```typescript
{
  unitId: string;
  unitCode: string;
  unitName: string;
  establishedDate: string;
  areaId: string;
  areaName: string;       // ADD: for hierarchy display
  forumId: string;
  forumName: string;      // ADD: for hierarchy display
  adminUserId: string;
  
  // ADD: Admin details
  admin: {
    userId: string;
    name: string;         // firstName + lastName
    email: string;
    phone: string | null;
  };
  
  createdAt: string;
  updatedAt: string;
}
```

---

### GET /api/organization-bodies/areas/:areaId

**Enhanced Response:**
```typescript
{
  areaId: string;
  areaCode: string;
  areaName: string;
  establishedDate: string;
  forumId: string;
  forumName: string;      // ADD: for hierarchy display
  adminUserId: string;
  
  // ADD: Admin details
  admin: {
    userId: string;
    name: string;
    email: string;
    phone: string | null;
  };
  
  createdAt: string;
  updatedAt: string;
}
```

---

### GET /api/organization-bodies/forums/:forumId

**Enhanced Response:**
```typescript
{
  forumId: string;
  forumCode: string;
  forumName: string;
  establishedDate: string;
  adminUserId: string;
  
  // ADD: Admin details
  admin: {
    userId: string;
    name: string;
    email: string;
    phone: string | null;
  };
  
  createdAt: string;
  updatedAt: string;
}
```

---

## 2. New Stats APIs

Create new endpoints for entity statistics.

### GET /api/organization-bodies/units/:unitId/stats

**Response:**
```typescript
{
  unitId: string;
  
  // Counts
  totalAgents: number;
  activeAgents: number;
  
  totalMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  
  pendingApprovals: number;  // Member registrations pending for this unit
}
```

**SQL Logic (pseudocode):**
```sql
-- Agents count
SELECT COUNT(*) as totalAgents,
       SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as activeAgents
FROM agents WHERE unitId = :unitId

-- Members count
SELECT COUNT(*) as totalMembers,
       SUM(CASE WHEN memberStatus = 'Active' THEN 1 ELSE 0 END) as activeMembers,
       SUM(CASE WHEN memberStatus = 'Suspended' THEN 1 ELSE 0 END) as suspendedMembers
FROM members WHERE unitId = :unitId

-- Pending approvals (member registrations)
SELECT COUNT(*) as pendingApprovals
FROM approval_requests ar
JOIN approval_workflows aw ON ar.workflowId = aw.workflowId
WHERE ar.unitId = :unitId 
  AND ar.status = 'Pending'
  AND aw.workflowCode = 'member_registration'
```

---

### GET /api/organization-bodies/areas/:areaId/stats

**Response:**
```typescript
{
  areaId: string;
  
  // Counts
  totalUnits: number;
  
  totalAgents: number;
  activeAgents: number;
  
  totalMembers: number;
  activeMembers: number;
}
```

**SQL Logic (pseudocode):**
```sql
-- Units count
SELECT COUNT(*) as totalUnits FROM units WHERE areaId = :areaId

-- Agents count (via units)
SELECT COUNT(*) as totalAgents,
       SUM(CASE WHEN a.status = 'Active' THEN 1 ELSE 0 END) as activeAgents
FROM agents a
JOIN units u ON a.unitId = u.unitId
WHERE u.areaId = :areaId

-- Members count (via units)
SELECT COUNT(*) as totalMembers,
       SUM(CASE WHEN m.memberStatus = 'Active' THEN 1 ELSE 0 END) as activeMembers
FROM members m
JOIN units u ON m.unitId = u.unitId
WHERE u.areaId = :areaId
```

---

### GET /api/organization-bodies/forums/:forumId/stats

**Response:**
```typescript
{
  forumId: string;
  
  // Counts
  totalAreas: number;
  totalUnits: number;
  
  totalAgents: number;
  activeAgents: number;
  
  totalMembers: number;
  activeMembers: number;
  
  pendingApprovals: number;  // All pending approvals in this forum
}
```

**SQL Logic (pseudocode):**
```sql
-- Areas count
SELECT COUNT(*) as totalAreas FROM areas WHERE forumId = :forumId

-- Units count
SELECT COUNT(*) as totalUnits FROM units WHERE forumId = :forumId

-- Agents count
SELECT COUNT(*) as totalAgents,
       SUM(CASE WHEN a.status = 'Active' THEN 1 ELSE 0 END) as activeAgents
FROM agents a
WHERE a.forumId = :forumId

-- Members count
SELECT COUNT(*) as totalMembers,
       SUM(CASE WHEN m.memberStatus = 'Active' THEN 1 ELSE 0 END) as activeMembers
FROM members m
WHERE m.forumId = :forumId

-- Pending approvals (all types)
SELECT COUNT(*) as pendingApprovals
FROM approval_requests
WHERE forumId = :forumId AND status = 'Pending'
```

---

## 3. Approvals Count API

### GET /api/approval-workflow/approvals/count

Returns pending approval counts for the logged-in user.

**Response:**
```typescript
{
  pendingCount: number;      // Total pending
  
  byWorkflow: {
    member_registration: number;
    death_claim: number;
    agent_registration: number;
    cash_handover_to_bank: number;
    // ... other workflow codes
  };
}
```

**SQL Logic (pseudocode):**
```sql
-- Get all pending approvals where current user is the assigned approver
SELECT 
  aw.workflowCode,
  COUNT(*) as count
FROM approval_requests ar
JOIN approval_workflows aw ON ar.workflowId = aw.workflowId
JOIN approval_stage_executions ase ON ar.requestId = ase.requestId
WHERE ase.assignedApproverId = :currentUserId
  AND ase.status = 'Pending'
  AND ar.status = 'Pending'
GROUP BY aw.workflowCode
```

**Scope Filtering:**
- Super Admin: All pending approvals system-wide
- Forum Admin: Approvals within their forum
- Area Admin: Approvals within their area (if any assigned)
- Unit Admin: Approvals within their unit

---

## 4. Enhanced List APIs with Counts

Add summary and per-item counts to list endpoints.

### GET /api/organization-bodies/forums/:forumId/areas

**Enhanced Response:**
```typescript
{
  // ADD: Summary counts
  summary: {
    totalAreas: number;
    totalUnits: number;
    totalMembers: number;
  };
  
  // Items with counts
  items: Array<{
    areaId: string;
    areaCode: string;
    areaName: string;
    establishedDate: string;
    
    // Admin info
    admin: {
      userId: string;
      name: string;
    };
    
    // ADD: Counts for table display
    unitCount: number;
    memberCount: number;
  }>;
  
  // Pagination
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
```

---

### GET /api/organization-bodies/areas/:areaId/units

**Enhanced Response:**
```typescript
{
  // ADD: Summary counts
  summary: {
    totalUnits: number;
    totalAgents: number;
    totalMembers: number;
  };
  
  // Items with counts
  items: Array<{
    unitId: string;
    unitCode: string;
    unitName: string;
    establishedDate: string;
    
    // Admin info
    admin: {
      userId: string;
      name: string;
    };
    
    // ADD: Counts for table display
    agentCount: number;
    memberCount: number;
  }>;
  
  // Pagination
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
```

---

### GET /api/agents/unit/:unitId

**Enhanced Response:**
```typescript
{
  // ADD: Summary counts
  summary: {
    totalAgents: number;
    activeAgents: number;
    totalMembers: number;
  };
  
  // Items with counts
  items: Array<{
    agentId: string;
    agentCode: string;
    fullName: string;
    email: string;
    phone: string;
    status: 'Active' | 'Suspended' | 'Inactive';
    
    // ADD: Count for table display
    memberCount: number;
  }>;
  
  // Pagination
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
```

---

## 5. My Profile - No New API Needed

The frontend will derive the entity to fetch from `AccessStore`:

```typescript
// Frontend logic
const scope = this.accessStore.scope();

if (scope.type === 'Unit') {
  // Fetch unit profile
  this.http.get(`/api/organization-bodies/units/${scope.entityId}`);
  this.http.get(`/api/organization-bodies/units/${scope.entityId}/stats`);
} else if (scope.type === 'Area') {
  // Fetch area profile
  this.http.get(`/api/organization-bodies/areas/${scope.entityId}`);
  this.http.get(`/api/organization-bodies/areas/${scope.entityId}/stats`);
} else if (scope.type === 'Forum') {
  // Fetch forum profile
  this.http.get(`/api/organization-bodies/forums/${scope.entityId}`);
  this.http.get(`/api/organization-bodies/forums/${scope.entityId}/stats`);
}
```

---

## Summary of Changes

### Modified Endpoints

| Endpoint | Changes |
|----------|---------|
| `GET /api/organization-bodies/units/:unitId` | Add `admin` object, `areaName`, `forumName` |
| `GET /api/organization-bodies/areas/:areaId` | Add `admin` object, `forumName` |
| `GET /api/organization-bodies/forums/:forumId` | Add `admin` object |
| `GET /api/organization-bodies/forums/:forumId/areas` | Add `summary`, per-item `unitCount`, `memberCount`, `admin` |
| `GET /api/organization-bodies/areas/:areaId/units` | Add `summary`, per-item `agentCount`, `memberCount`, `admin` |
| `GET /api/agents/unit/:unitId` | Add `summary`, per-item `memberCount` |

### New Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/organization-bodies/units/:unitId/stats` | Unit statistics |
| `GET /api/organization-bodies/areas/:areaId/stats` | Area statistics |
| `GET /api/organization-bodies/forums/:forumId/stats` | Forum statistics |
| `GET /api/approval-workflow/approvals/count` | Pending approvals count with breakdown |

---

## Permissions

| Endpoint | Unit Admin | Area Admin | Forum Admin | Super Admin |
|----------|------------|------------|-------------|-------------|
| Unit details/stats | Own unit | Units in area | Units in forum | All |
| Area details/stats | ❌ | Own area | Areas in forum | All |
| Forum details/stats | ❌ | ❌ | Own forum | All |
| Approvals count | Own scope | Own scope | Own scope | All |
| List areas in forum | ❌ | ❌ | Own forum | All |
| List units in area | ❌ | Own area | Areas in forum | All |
| List agents in unit | Own unit | Units in area | Units in forum | All |