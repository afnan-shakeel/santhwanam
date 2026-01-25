# Cash Management Module - API Specification

---

## Base URL

All endpoints are prefixed with `/api/v1/cash-management`

---

## Authentication

All endpoints require JWT Bearer token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Agent/Admin APIs

### 1. GET `/custody/me`

Get the logged-in user's cash custody details with pending handovers.

**Authorization:** Agent, Unit Admin, Area Admin, Forum Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "custody": {
      "custodyId": "uuid",
      "userId": "uuid",
      "userRole": "Agent",
      "glAccountCode": "1001",
      "glAccountName": "Cash - Agent Custody",
      "status": "Active",
      "currentBalance": 15000.00,
      "totalReceived": 125000.00,
      "totalTransferred": 110000.00,
      "lastTransactionAt": "2025-01-18T15:45:00Z",
      "createdAt": "2024-06-15T10:00:00Z"
    },
    "pendingOutgoing": [
      {
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00056",
        "toUserId": "uuid",
        "toUserName": "Sarah Ahmed",
        "toUserRole": "UnitAdmin",
        "amount": 5000.00,
        "status": "Initiated",
        "requiresApproval": false,
        "initiatedAt": "2025-01-18T12:30:00Z"
      }
    ],
    "pendingIncoming": [
      {
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00057",
        "fromUserId": "uuid",
        "fromUserName": "John Doe",
        "fromUserRole": "Agent",
        "amount": 3200.00,
        "status": "Initiated",
        "initiatedAt": "2025-01-18T14:00:00Z"
      }
    ]
  }
}
```

**Response (No Custody):**
```json
{
  "success": true,
  "data": {
    "custody": null,
    "pendingOutgoing": [],
    "pendingIncoming": []
  }
}
```

---

### 2. GET `/custody/me/activity`

Get recent custody activity (collections and handovers).

> **Note:** Currently returns empty activities (stub implementation).

**Authorization:** Agent, Unit Admin, Area Admin, Forum Admin

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 20, max: 100) |
| type | string | No | Activity type: `collection`, `handover_in`, `handover_out` |
| fromDate | ISO date | No | Filter from date |
| toDate | ISO date | No | Filter to date |

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "activityId": "uuid",
        "type": "collection",
        "direction": "in",
        "amount": 500.00,
        "description": "Contribution collection",
        "sourceModule": "Contributions",
        "sourceEntityId": "uuid",
        "referenceNumber": "CC-2025-00012",
        "memberCode": "MEM-001",
        "memberName": "Ahmed Ali",
        "createdAt": "2025-01-18T10:30:00Z"
      },
      {
        "activityId": "uuid",
        "type": "handover_out",
        "direction": "out",
        "amount": 8000.00,
        "description": "Cash handover to Unit Admin",
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00045",
        "counterpartyName": "Sarah Ahmed",
        "counterpartyRole": "UnitAdmin",
        "createdAt": "2025-01-17T16:00:00Z"
      },
      {
        "activityId": "uuid",
        "type": "handover_in",
        "direction": "in",
        "amount": 3200.00,
        "description": "Cash received from Agent",
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00044",
        "counterpartyName": "Mary Johnson",
        "counterpartyRole": "Agent",
        "createdAt": "2025-01-17T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 3. POST `/handovers`

Initiate a new cash handover request.

**Authorization:** Agent, Unit Admin, Area Admin, Forum Admin

**Request Body:**
```json
{
  "toUserId": "uuid",
  "toUserRole": "UnitAdmin",
  "amount": 5000.00,
  "initiatorNotes": "Collection from members in Sector 5",
  "handoverType": "Normal",
  "sourceHandoverId": "uuid"
}
```

**Validation Rules:**
- `toUserId` must be a valid user in the hierarchy
- `toUserRole` must be one of: `UnitAdmin`, `AreaAdmin`, `ForumAdmin`, `SuperAdmin`
- `amount` must be > 0
- `amount` must not exceed user's current custody balance
- Transfer path must be valid (upward in hierarchy only)
- `handoverType` defaults to `Normal`, can be `AdminTransition`

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "handover": {
      "handoverId": "uuid",
      "handoverNumber": "CHO-2025-00058",
      "fromUserId": "uuid",
      "fromUserRole": "Agent",
      "toUserId": "uuid",
      "toUserRole": "UnitAdmin",
      "amount": 5000.00,
      "status": "Initiated",
      "handoverType": "Normal",
      "requiresApproval": false,
      "initiatedAt": "2025-01-18T16:00:00Z"
    },
    "message": "Cash handover initiated successfully"
  }
}
```

**Response (Bank Deposit - Requires Approval):**
```json
{
  "success": true,
  "data": {
    "handover": {
      "handoverId": "uuid",
      "handoverNumber": "CHO-2025-00059",
      "fromUserId": "uuid",
      "fromUserRole": "ForumAdmin",
      "toUserId": "uuid",
      "toUserRole": "SuperAdmin",
      "amount": 50000.00,
      "status": "Initiated",
      "requiresApproval": true,
      "approvalRequestId": "uuid",
      "initiatedAt": "2025-01-18T16:00:00Z"
    },
    "message": "Cash handover submitted for approval"
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient cash custody balance. Available: ₹3,000"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TRANSFER_PATH",
    "message": "Agent cannot transfer to Agent. Must transfer to higher level."
  }
}
```

---

### 4. GET `/handovers/pending/me`

Get pending handovers for current user (both incoming and outgoing).

**Authorization:** Agent, Unit Admin, Area Admin, Forum Admin, Super Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "incoming": [
      {
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00056",
        "fromUserId": "uuid",
        "fromUserName": "John Doe",
        "fromUserRole": "Agent",
        "amount": 5000.00,
        "status": "Initiated",
        "requiresApproval": false,
        "initiatedAt": "2025-01-18T10:30:00Z",
        "initiatorNotes": "Collection from members in Sector 5",
        "ageHours": 5.5
      }
    ],
    "outgoing": [
      {
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00055",
        "toUserId": "uuid",
        "toUserName": "Mohammed Ali",
        "toUserRole": "AreaAdmin",
        "amount": 8000.00,
        "status": "Initiated",
        "requiresApproval": false,
        "initiatedAt": "2025-01-18T09:00:00Z",
        "ageHours": 7.0
      }
    ],
    "summary": {
      "totalIncoming": 1,
      "totalIncomingAmount": 5000.00,
      "totalOutgoing": 1,
      "totalOutgoingAmount": 8000.00
    }
  }
}
```

---

### 5. POST `/handovers/:handoverId/acknowledge`

Acknowledge receipt of cash from a handover.

**Authorization:** Unit Admin, Area Admin, Forum Admin, Super Admin (must be designated receiver)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| handoverId | UUID | Yes | Handover ID |

**Request Body:**
```json
{
  "receiverNotes": "Verified and received"
}
```

**Validation Rules:**
- Handover must be in `Initiated` status
- User must be the designated receiver (or Super Admin for bank deposits)
- If approval required, approval must be granted first
- Source custody must still have sufficient balance

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "handover": {
      "handoverId": "uuid",
      "handoverNumber": "CHO-2025-00056",
      "status": "Acknowledged",
      "acknowledgedAt": "2025-01-18T16:30:00Z",
      "journalEntryId": "uuid"
    },
    "message": "Cash handover acknowledged successfully"
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "error": {
    "code": "APPROVAL_REQUIRED",
    "message": "This handover requires approval before acknowledgment"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Only the designated receiver can acknowledge this handover"
  }
}
```

---

### 6. POST `/handovers/:handoverId/reject`

Reject a cash handover (receiver disputes amount or hasn't received cash).

**Authorization:** Unit Admin, Area Admin, Forum Admin, Super Admin (must be designated receiver)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| handoverId | UUID | Yes | Handover ID |

**Request Body:**
```json
{
  "rejectionReason": "Amount mismatch - only received ₹4,800. Short by ₹200."
}
```

**Validation Rules:**
- Handover must be in `Initiated` status
- User must be the designated receiver
- `rejectionReason` is required (min 5 characters)

**Response:**
```json
{
  "success": true,
  "data": {
    "handover": {
      "handoverId": "uuid",
      "handoverNumber": "CHO-2025-00056",
      "status": "Rejected",
      "rejectedAt": "2025-01-18T16:30:00Z",
      "rejectionReason": "Amount mismatch - only received ₹4,800. Short by ₹200."
    },
    "message": "Cash handover rejected"
  }
}
```

---

### 7. POST `/handovers/:handoverId/cancel`

Cancel a handover before it's acknowledged (initiator only).

**Authorization:** Agent, Unit Admin, Area Admin, Forum Admin (must be initiator)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| handoverId | UUID | Yes | Handover ID |

**Validation Rules:**
- Handover must be in `Initiated` status
- User must be the initiator

**Response:**
```json
{
  "success": true,
  "data": {
    "handover": {
      "handoverId": "uuid",
      "handoverNumber": "CHO-2025-00056",
      "status": "Cancelled",
      "cancelledAt": "2025-01-18T16:30:00Z"
    },
    "message": "Cash handover cancelled"
  }
}
```

---

### 8. GET `/handovers/:handoverId`

Get detailed information about a specific handover.

**Authorization:** Agent, Unit Admin, Area Admin, Forum Admin, Super Admin (must be involved party or admin with scope)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| handoverId | UUID | Yes | Handover ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "handoverId": "uuid",
    "handoverNumber": "CHO-2025-00056",
    
    "fromUser": {
      "userId": "uuid",
      "fullName": "John Doe",
      "role": "Agent",
      "unit": "uuid"
    },
    
    "toUser": {
      "userId": "uuid",
      "fullName": "Sarah Ahmed",
      "role": "UnitAdmin",
      "unit": "uuid"
    },
    
    "amount": 5000.00,
    "status": "Acknowledged",
    "handoverType": "Normal",
    "requiresApproval": false,
    "approvalRequestId": null,
    "journalEntryId": "uuid",
    
    "timeline": [
      {
        "action": "Initiated",
        "timestamp": "2025-01-18T10:30:00Z",
        "userId": "uuid",
        "userName": "John Doe",
        "notes": "Collection from members in Sector 5"
      },
      {
        "action": "Acknowledged",
        "timestamp": "2025-01-18T11:45:00Z",
        "userId": "uuid",
        "userName": "Sarah Ahmed",
        "notes": "Verified and received"
      }
    ],
    
    "initiatedAt": "2025-01-18T10:30:00Z",
    "acknowledgedAt": "2025-01-18T11:45:00Z",
    "rejectedAt": null,
    "cancelledAt": null,
    "initiatorNotes": "Collection from members in Sector 5",
    "receiverNotes": "Verified and received",
    "rejectionReason": null
  }
}
```

---

### 9. GET `/handovers/history`

Get handover history for the current user.

**Authorization:** Agent, Unit Admin, Area Admin, Forum Admin, Super Admin

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| direction | string | No | `sent`, `received`, or `all` (default: all) |
| status | string | No | `Initiated`, `Acknowledged`, `Rejected`, `Cancelled` |
| fromDate | ISO date | No | Filter from date |
| toDate | ISO date | No | Filter to date |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 20) |

**Response:**
```json
{
  "success": true,
  "data": {
    "handovers": [
      {
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00056",
        "direction": "sent",
        "counterpartyName": "Sarah Ahmed",
        "counterpartyRole": "UnitAdmin",
        "amount": 5000.00,
        "status": "Acknowledged",
        "initiatedAt": "2025-01-18T10:30:00Z",
        "completedAt": "2025-01-18T11:45:00Z"
      },
      {
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00055",
        "direction": "received",
        "counterpartyName": "Mary Johnson",
        "counterpartyRole": "Agent",
        "amount": 3200.00,
        "status": "Acknowledged",
        "initiatedAt": "2025-01-17T14:00:00Z",
        "completedAt": "2025-01-17T15:30:00Z"
      }
    ],
    "summary": {
      "totalSent": 15000.00,
      "totalReceived": 3200.00,
      "countSent": 3,
      "countReceived": 1
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 10. GET `/handovers/receivers`

Get list of valid recipients the current user can transfer cash to.

**Authorization:** Agent, Unit Admin, Area Admin, Forum Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "recipients": [
      {
        "userId": "uuid",
        "fullName": "Sarah Ahmed",
        "role": "UnitAdmin",
        "roleDisplayName": "Unit Admin",
        "hierarchyLevel": "Unit",
        "hierarchyName": "Ruwi Central Unit",
        "requiresApproval": false
      },
      {
        "userId": "uuid",
        "fullName": "Mohammed Ali",
        "role": "AreaAdmin",
        "roleDisplayName": "Area Admin",
        "hierarchyLevel": "Area",
        "hierarchyName": "Muscat Area",
        "requiresApproval": false
      },
      {
        "userId": "uuid",
        "fullName": "Ahmed Hassan",
        "role": "ForumAdmin",
        "roleDisplayName": "Forum Admin",
        "hierarchyLevel": "Forum",
        "hierarchyName": "Oman Forum",
        "requiresApproval": false
      },
      {
        "userId": "uuid",
        "fullName": "Central Account",
        "role": "SuperAdmin",
        "roleDisplayName": "Bank Deposit",
        "hierarchyLevel": "Central",
        "hierarchyName": "Bank Account",
        "requiresApproval": true
      }
    ]
  }
}
```

---

### 11. GET `/handovers/pending/super-admin`

Get pending handovers awaiting SuperAdmin action (bank deposits).

**Authorization:** Super Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00059",
        "fromUserId": "uuid",
        "fromUserRole": "ForumAdmin",
        "toUserId": "uuid",
        "toUserRole": "SuperAdmin",
        "amount": 50000.00,
        "status": "Initiated",
        "requiresApproval": true,
        "initiatedAt": "2025-01-18T10:30:00Z",
        "ageHours": 5.5
      }
    ],
    "total": 1
  }
}
```

---

## Admin APIs

### 12. GET `/admin/dashboard`

Get dashboard statistics for cash management.

**Authorization:** Super Admin, Forum Admin, Area Admin

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| forumId | UUID | No | Filter by forum (Super Admin only) |
| areaId | UUID | No | Filter by area |

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCash": 500000.00,
      "bankBalance": 400000.00,
      "totalInCustody": 100000.00,
      "pendingHandovers": 12,
      "pendingHandoverAmount": 23200.00
    },
    
    "byLevel": {
      "Agent": {
        "count": 15,
        "totalBalance": 35000.00,
        "glAccountCode": "1001"
      },
      "UnitAdmin": {
        "count": 5,
        "totalBalance": 25000.00,
        "glAccountCode": "1002"
      },
      "AreaAdmin": {
        "count": 2,
        "totalBalance": 18000.00,
        "glAccountCode": "1003"
      },
      "ForumAdmin": {
        "count": 1,
        "totalBalance": 22000.00,
        "glAccountCode": "1004"
      }
    },
    
    "alerts": {
      "overdueCount": 3,
      "overdueAmount": 27700.00,
      "overdueThresholdDays": 7,
      "pendingOverdue": 5,
      "pendingOverdueHours": 48,
      "reconciled": true,
      "lastReconciliationAt": "2025-01-18T00:00:00Z"
    },
    
    "recentActivity": [
      {
        "type": "bank_deposit",
        "amount": 50000.00,
        "fromUserName": "Ahmed Hassan",
        "timestamp": "2025-01-17T16:00:00Z"
      },
      {
        "type": "handover",
        "amount": 8000.00,
        "fromUserName": "John Doe",
        "toUserName": "Sarah Ahmed",
        "timestamp": "2025-01-17T14:30:00Z"
      }
    ]
  }
}
```

---

### 13. GET `/admin/custody-by-level`

Get aggregated cash custody totals by hierarchy level.

**Authorization:** Super Admin, Forum Admin, Area Admin

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| forumId | UUID | No | Filter by forum |
| areaId | UUID | No | Filter by area |

**Response:**
```json
{
  "success": true,
  "data": {
    "levels": [
      {
        "level": "Agent",
        "glAccountCode": "1001",
        "glAccountName": "Cash - Agent Custody",
        "userCount": 15,
        "totalBalance": 35000.00,
        "glBalance": 35000.00,
        "reconciled": true
      },
      {
        "level": "UnitAdmin",
        "glAccountCode": "1002",
        "glAccountName": "Cash - Unit Admin Custody",
        "userCount": 5,
        "totalBalance": 25000.00,
        "glBalance": 25000.00,
        "reconciled": true
      },
      {
        "level": "AreaAdmin",
        "glAccountCode": "1003",
        "glAccountName": "Cash - Area Admin Custody",
        "userCount": 2,
        "totalBalance": 18000.00,
        "glBalance": 18000.00,
        "reconciled": true
      },
      {
        "level": "ForumAdmin",
        "glAccountCode": "1004",
        "glAccountName": "Cash - Forum Admin Custody",
        "userCount": 1,
        "totalBalance": 22000.00,
        "glBalance": 22000.00,
        "reconciled": true
      }
    ],
    "totalInCustody": 100000.00,
    "bankBalance": 400000.00,
    "totalCash": 500000.00
  }
}
```

---

### 14. GET `/admin/custody-report`

Get detailed custody report by user.

**Authorization:** Super Admin, Forum Admin, Area Admin, Unit Admin (within scope)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| forumId | UUID | No | Filter by forum |
| areaId | UUID | No | Filter by area |
| unitId | UUID | No | Filter by unit |
| level | string | No | Filter by level: `Agent`, `UnitAdmin`, `AreaAdmin`, `ForumAdmin` |
| minBalance | decimal | No | Filter by minimum balance |
| status | string | No | Filter by status: `Active`, `Inactive` |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 50) |

**Response:**
```json
{
  "success": true,
  "data": {
    "custodies": [
      {
        "custodyId": "uuid",
        "userId": "uuid",
        "userName": "John Doe",
        "userRole": "Agent",
        "unitName": "Ruwi Central",
        "areaName": "Muscat Area",
        "glAccountCode": "1001",
        "status": "Active",
        "currentBalance": 5000.00,
        "totalReceived": 50000.00,
        "totalTransferred": 45000.00,
        "lastTransactionAt": "2025-01-18T10:30:00Z",
        "daysSinceLastTransaction": 0,
        "isOverdue": false
      },
      {
        "custodyId": "uuid",
        "userId": "uuid",
        "userName": "Ahmed Ali",
        "userRole": "Agent",
        "unitName": "Seeb Unit",
        "areaName": "Muscat Area",
        "glAccountCode": "1001",
        "status": "Active",
        "currentBalance": 8500.00,
        "totalReceived": 30000.00,
        "totalTransferred": 21500.00,
        "lastTransactionAt": "2025-01-10T14:00:00Z",
        "daysSinceLastTransaction": 8,
        "isOverdue": true
      }
    ],
    "summary": {
      "totalUsers": 23,
      "totalBalance": 100000.00,
      "activeUsers": 22,
      "inactiveUsers": 1
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 23,
      "totalPages": 1
    }
  }
}
```

---

### 15. GET `/admin/overdue`

Get users holding cash beyond threshold.

**Authorization:** Super Admin, Forum Admin, Area Admin, Unit Admin (within scope)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| thresholdDays | integer | No | Days threshold (default: 7) |
| forumId | UUID | No | Filter by forum |
| areaId | UUID | No | Filter by area |
| level | string | No | Filter by level |

**Response:**
```json
{
  "success": true,
  "data": {
    "thresholdDays": 7,
    "overdueUsers": [
      {
        "custodyId": "uuid",
        "userId": "uuid",
        "userName": "Ahmed Ali",
        "userRole": "Agent",
        "unitName": "Seeb Unit",
        "areaName": "Muscat Area",
        "currentBalance": 8500.00,
        "lastTransactionAt": "2025-01-10T14:00:00Z",
        "daysSinceLastTransaction": 8,
        "contact": {
          "email": "ahmed.ali@example.com",
          "phone": "+968 9123 4567"
        }
      },
      {
        "custodyId": "uuid",
        "userId": "uuid",
        "userName": "Fatima Hassan",
        "userRole": "Agent",
        "unitName": "Ruwi South",
        "areaName": "Muscat Area",
        "currentBalance": 4200.00,
        "lastTransactionAt": "2025-01-08T10:00:00Z",
        "daysSinceLastTransaction": 10,
        "contact": {
          "email": "fatima.hassan@example.com",
          "phone": "+968 9234 5678"
        }
      }
    ],
    "summary": {
      "totalOverdueUsers": 3,
      "totalOverdueAmount": 27700.00
    }
  }
}
```

---

### 16. GET `/admin/reconciliation`

Get reconciliation report comparing custody sub-ledger with GL accounts.

**Authorization:** Super Admin, Forum Admin

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| forumId | UUID | No | Filter by forum |

**Response:**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "accountCode": "1001",
        "accountName": "Cash - Agent Custody",
        "glBalance": 35000.00,
        "custodyTotal": 35000.00,
        "difference": 0.00,
        "isReconciled": true,
        "userCount": 15
      },
      {
        "accountCode": "1002",
        "accountName": "Cash - Unit Admin Custody",
        "glBalance": 25000.00,
        "custodyTotal": 25000.00,
        "difference": 0.00,
        "isReconciled": true,
        "userCount": 5
      },
      {
        "accountCode": "1003",
        "accountName": "Cash - Area Admin Custody",
        "glBalance": 18000.00,
        "custodyTotal": 18000.00,
        "difference": 0.00,
        "isReconciled": true,
        "userCount": 2
      },
      {
        "accountCode": "1004",
        "accountName": "Cash - Forum Admin Custody",
        "glBalance": 22000.00,
        "custodyTotal": 22000.00,
        "difference": 0.00,
        "isReconciled": true,
        "userCount": 1
      }
    ],
    "summary": {
      "totalGlBalance": 100000.00,
      "totalCustodyBalance": 100000.00,
      "totalDifference": 0.00,
      "allReconciled": true
    },
    "bankAccount": {
      "accountCode": "1100",
      "accountName": "Bank Account",
      "balance": 400000.00
    },
    "lastCheckedAt": "2025-01-18T16:00:00Z"
  }
}
```

---

### 17. GET `/admin/pending-transfers`

Get all pending transfers across the organization.

**Authorization:** Super Admin, Forum Admin, Area Admin (within scope)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| forumId | UUID | No | Filter by forum |
| areaId | UUID | No | Filter by area |
| fromRole | string | No | Filter by sender role |
| toRole | string | No | Filter by receiver role |
| minAge | integer | No | Minimum age in hours |
| page | integer | No | Page number |
| limit | integer | No | Items per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "transfers": [
      {
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00056",
        "fromUserName": "John Doe",
        "fromUserRole": "Agent",
        "fromUnit": "Ruwi Central",
        "toUserName": "Sarah Ahmed",
        "toUserRole": "UnitAdmin",
        "amount": 5000.00,
        "status": "Initiated",
        "requiresApproval": false,
        "initiatedAt": "2025-01-18T10:30:00Z",
        "ageHours": 5.5
      },
      {
        "handoverId": "uuid",
        "handoverNumber": "CHO-2025-00060",
        "fromUserName": "Ahmed Hassan",
        "fromUserRole": "ForumAdmin",
        "fromUnit": null,
        "toUserName": "Central Account",
        "toUserRole": "SuperAdmin",
        "amount": 50000.00,
        "status": "Initiated",
        "requiresApproval": true,
        "approvalStatus": "Pending",
        "initiatedAt": "2025-01-17T14:00:00Z",
        "ageHours": 26.0
      }
    ],
    "summary": {
      "total": 12,
      "totalAmount": 73200.00,
      "requiresApproval": 2,
      "overdue": 5
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

---

### 18. POST `/admin/handovers/:handoverId/approve`

Approve a bank deposit request (Super Admin only).

**Authorization:** Super Admin

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| handoverId | UUID | Yes | Handover ID |

**Request Body:**
```json
{
  "approverNotes": "Approved for deposit"  // Optional
}
```

**Validation Rules:**
- Handover must be in `Initiated` status
- Handover must require approval (`requiresApproval: true`)
- User must have Super Admin role

**Response:**
```json
{
  "success": true,
  "data": {
    "handoverId": "uuid",
    "handoverNumber": "CHO-2025-00060",
    "status": "Initiated",
    "approvalStatus": "Approved",
    "approvedAt": "2025-01-18T16:00:00Z",
    "approvedBy": "uuid"
  },
  "message": "Bank deposit approved. Awaiting acknowledgment to complete deposit."
}
```

**Note:** After approval, the handover still needs acknowledgment (which Super Admin can do immediately or later).

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INSUFFICIENT_BALANCE` | 400 | User doesn't have enough cash balance |
| `INVALID_TRANSFER_PATH` | 400 | Invalid transfer direction (must be upward) |
| `HANDOVER_NOT_FOUND` | 404 | Handover ID doesn't exist |
| `INVALID_STATUS` | 400 | Handover not in correct status for operation |
| `UNAUTHORIZED` | 403 | User not authorized for this operation |
| `APPROVAL_REQUIRED` | 400 | Approval needed before acknowledgment |
| `CUSTODY_NOT_ACTIVE` | 400 | Cash custody is not active |
| `VALIDATION_ERROR` | 400 | Request body validation failed |

---

## Common Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { }  // Optional additional details
  }
}
```

**Paginated:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```