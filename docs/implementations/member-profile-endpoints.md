# Member Profile Page - Required APIs

Based on your updated UI design, here are all the required APIs:

---

## **Core Profile APIs**

### **1. Get Member Profile (Full Details)**
```
GET /api/members/:memberId/profile
GET /api/my-profile (for logged-in member)
```
Returns: Complete member profile with all related data

**Response includes:**
- Personal information
- Membership details
- Tier information
- Agent, unit, area, forum details
- Wallet summary (balance only)
- Registration payment details
- Nominees list
- Documents list
- Recent activity (if implemented)
- Contribution stats (future)


**Member Profile Response:**
```typescript
{
  memberId: "uuid",
  memberCode: "MEM-2025-00456",
  fullName: "John Doe",
  dateOfBirth: "1990-01-15",
  gender: "Male",
  idNumber: "12345678",
  
  phone: "+968 9123 4567",
  email: "john.doe@email.com",
  addressline1: "Building 5, Apartment 12",
  addressline2: "Ruwi",
  postalCode: "112",
  state: "Muscat",
  country: "Oman"
  
  memberStatus: "Active",
  registrationStatus: "Approved",
  registrationDate: "2025-01-15",
  
  tier: {
    tierId: "uuid",
    tierName: "Tier A",
    deathBenefit: 50000,
    contributionAmount: 100
  },
  
  agent: {
    agentId: "uuid",
    agentCode: "AGT-2025-00123",
    fullName: "Mary Johnson"
  },
  
  unit: {
    unitId: "uuid",
    unitName: "Ruwi Central Unit",
  },
  area: {
    areaId: "uuid",
    areaName: "Muscat Area",
  }
  forum: {
    forumId: "uuid",
    forumName: "Oman Community Forum"
  },
  
  wallet: {
    walletId: "uuid",
    currentBalance: 2500,
  },
  
  registrationPayment: {
    registrationFee: 500,
    advanceDeposit: 1000,
    totalAmount: 1500,
    collectionDate: "2025-01-10",
    paymentMethod: "Cash",
    collectedBy:{
        userId: "uuid",
        fullName: "Mary Johnson"
    }
  },
  
  
  contributionStats: {
    totalCycles: 12,
    paidCycles: 11,
    pendingCycles: 1,
    missedCycles: 0,
    totalContributed: 1100,
    contributionRate: 100
  }, // contributionStats: future implementation
  
  nominees: [
    {
      nomineeId: "uuid",
      fullName: "Jane Doe",
      relationship: "Spouse",
      phone: "+968 9876 5432",
      idNumber: "87654321",
      dateOfBirth: "1992-02-20",
      addressline1: "Building 5, Apartment 12",
      addressline2: "Ruwi",
      postalCode: "112",
      state: "Muscat",
      country: "Oman",
      documents: [
        {
          documentId: "uuid",
          documentType: "ID Card",
          fileName: "jane-id.jpg",
          fileUrl: "path",
          verified: true
        }
      ]
    }
  ],
  
  documents: [
    {
      documentId: "uuid",
      documentType: "ID Card (Front)",
      fileName: "id-front.jpg",
      fileSize: 2400000,
      fileUrl: "path",
      uploadedAt: "2025-01-10",
      category: "Member"
    }
  ]
}
```



---

### **2. Update Member Profile**
```
PUT /api/members/:memberId/profile
Body: {
  fullName,
  dateOfBirth,
  gender,
  phone,
  email,
  addressLine1,
  addressLine2,
  postalCode,
  state,
  country
}
```
Returns: Updated member profile

---

## **Tab 1: Overview APIs**

### **4. Get Member Activity Log** (Future Implementation)
```
GET /api/members/:memberId/activity
Query params: ?page=1&limit=10
```
Returns: Recent activity timeline (paginated)

---

## **Tab 2: Contributions APIs** (Future Implementation)

### **5. Get Member Contribution Stats**
```
GET /api/members/:memberId/contributions/stats
```
Returns: Total cycles, paid, pending, missed, contribution rate

---

### **6. Get Member Active Cycles**
```
GET /api/members/:memberId/contributions/active
```
Returns: List of active contribution cycles requiring payment

---

### **7. Get Member Contribution History**
```
GET /api/members/:memberId/contributions/history
Query params: ?page=1&limit=20&status=&startDate=&endDate=
```
Returns: Paginated contribution history

---

### **8. Download Contribution Statement**
```
GET /api/members/:memberId/contributions/statement
Query params: ?format=pdf|excel&startDate=&endDate=
```
Returns: File download

---


## **Tab 4: Documents APIs**

---

### **15. Download Document**
```
GET /api/members/:memberId/documents/:documentId/download
```
Returns: File download

---

## **Profile Actions APIs**

### **20. Download Member Profile PDF**
```
GET /api/members/:memberId/profile/pdf
```
Returns: PDF file with complete profile


---
