
## **APIs for My Contributions**

### **1. Get Member's Contribution Summary**
```
GET /api/members/:memberId/contributions/summary
GET /api/my-contributions/summary
```
Returns:
```json
{
  totalContributed: 1200,
  thisYear: 1200,
  pendingCount: 1,
  averagePerMonth: 100,
  walletBalance: 2500
}
```

---

### **2. Get Member's Pending Contributions**
```
GET /api/members/:memberId/contributions/pending
GET /api/my-contributions/pending
```
Returns:
```json
{
  pendingContributions: [
    {
      contributionId: "uuid",
      cycleCode: "CC-2025-00015",
      claimId: "uuid",
      deceasedMember: {
        memberCode: "MEM-2025-00455",
        fullName: "Jane Doe"
      },
      contributionAmount: 100,
      dueDate: "2025-01-25",
      daysLeft: 5,
      contributionStatus: "Pending"
    }
  ]
}
```

---

### **3. Get Member's Contribution History**
```
GET /api/members/:memberId/contributions/history
GET /api/my-contributions/history
Query params: ?page=1&limit=20&status=&year=&startDate=&endDate=
```
Returns: Paginated contribution history

---

### **4. Download Contribution Statement** (Future Implementation)
```
GET /api/members/:memberId/contributions/statement
GET /api/my-contributions/statement
Query params: ?format=pdf&year=2025
```
Returns: PDF download
