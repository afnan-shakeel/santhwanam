# Agent Profile Page - Required APIs

---

## **Agent Profile APIs**

### **1. Get Agent Profile**
```
GET /api/agents/:agentId/profile
GET /api/my-profile (for logged-in agent)
```
Returns: Full agent details, hierarchy, stats

---

### **2. Update Agent Profile**
```
PUT /api/agents/:agentId/profile
Body: { fullName, phone, email, address, photoUrl, emergencyContact }
```
Returns: Updated agent profile

---

## **Tab 1: Overview APIs**

### **4. Get Agent Dashboard Stats**
```
GET /api/agents/:agentId/stats
Query params: ?period=thisMonth|lastMonth|thisYear
```
Returns: 
```json
{
  totalMembers: 45,
  activeMembers: 42,
  suspendedMembers: 2,
  inactiveMembers: 1,
  pendingApprovals: 3,
  newMembersThisMonth: 5,
  collectionsThisMonth: 15000,
  walletDepositsThisMonth: 8000
}
```

---

## **Tab 2: Members APIs**

### **5. Get Agent's Members**
```
GET /api/agents/:agentId/members
Query params: ?page=1&limit=20&status=active|suspended|pending&tier=&search=
```
Returns: Paginated list of members under agent

---

### **6. Export Agent's Members**
```
GET /api/agents/:agentId/members/export
Query params: ?format=csv|excel
```
Returns: File download

---

## **Tab 3: Performance APIs**

### **7. Get Agent Performance Metrics**
```
GET /api/agents/:agentId/performance
Query params: ?period=thisMonth|lastMonth|thisYear&startDate=&endDate=
```
Returns:
```json
{
  period: "Jan 2025",
  
  memberAcquisition: {
    newMembersThisMonth: 5,
    monthlyTrend: [
      { month: "Jan", count: 5 },
      { month: "Feb", count: 3 },
      { month: "Mar", count: 7 }
      // ... last 12 months
    ]
  },
  
  retention: {
    retentionRate: 93,
    totalMembers: 45,
    activeMembers: 42,
    suspendedMembers: 2,
    inactiveMembers: 1,
    retentionTrend: [
      { month: "Jan", rate: 93 },
      { month: "Feb", rate: 95 }
      // ... last 12 months
    ]
  }
}
```

---

## **Tab 4: Collections APIs**

### **8. Get Agent's Outstanding Collections**
```
GET /api/agents/:agentId/collections/outstanding
```
Returns: List of pending contribution cycles and wallet deposits

---

### **9. Get Agent's Collection History**
```
GET /api/agents/:agentId/collections/history
Query params: ?page=1&limit=20&type=contribution|wallet&status=&startDate=&endDate=
```
Returns: Paginated collection history

---

### **10. Get Agent's Cash on Hand**
```
GET /api/agents/:agentId/cash-on-hand
```
Returns:
```json
{
  cashOnHand: 2000,
  lastBankDeposit: {
    amount: 5000,
    date: "2025-01-10",
    reference: "DEP-2025-001"
  }
}
```

---

### **11. Record Bank Deposit (Agent deposits cash to bank)**
```
POST /api/agents/:agentId/bank-deposits
Body: { amount, depositDate, referenceNumber }
```
Returns: Bank deposit record + updated cash on hand

---

## **Tab 5: Activity Log APIs**

### **12. Get Agent Activity Log**
```
GET /api/agents/:agentId/activity-log
Query params: ?page=1&limit=20&actionType=&startDate=&endDate=
```
Returns: Paginated activity history

---

## **Additional APIs**

### **13. Get Agent Hierarchy**
```
GET /api/agents/:agentId/hierarchy
```
Returns:
```json
{
  unit: { unitId, unitName },
  area: { areaId, areaName },
  forum: { forumId, forumName },
  reportsTo: { userId, name, role }
}
```

---

## **Summary**

**Total APIs: 13**

### **By Tab:**
- **Profile Header:** 3 APIs (get, update, photo)
- **Tab 1 (Overview):** 1 API (stats)
- **Tab 2 (Members):** 2 APIs (list, export)
- **Tab 3 (Performance):** 1 API (metrics with trends)
- **Tab 4 (Collections):** 4 APIs (outstanding, history, cash, deposit)
- **Tab 5 (Activity Log):** 1 API (activity history)
- **Additional:** 1 API (hierarchy)
