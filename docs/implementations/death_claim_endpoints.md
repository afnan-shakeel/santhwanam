# Death Claims UI - Required APIs

---

## **Page 1: Claims Dashboard APIs**

### **1. Get Claims Dashboard Stats**
```
GET /api/claims/dashboard/stats
```
Returns:
```json
{
  pendingVerification: 3,
  underContribution: 5,
  approvedForPayout: 2,
  totalThisYear: 45,
  totalBenefitsPaidYTD: 2500000,
  pendingCollections: 150000,
  successRate: 98
}
```

---

### **2. Get All Claims (List)** (update existing api to make it a search api using search api)
```
POST /api/claims/search
```
Returns: Paginated list of claims

---

### **3. Get Active Claims Requiring Action** (:: Make it the search api using the search service)
```
GET /api/claims/search/requiring-action?page=1&limit=50
```
Returns: Claims that need immediate attention (pending verification)

---

### **4. Export Claims** (Future implementation)
```
GET /api/claims/export
Query params: ?format=csv|excel&status=&startDate=&endDate=
```
Returns: File download

---

## **Page 2: Claim Details APIs**

### **5. Get Claim Details (Full)** (Update existing get by id api)
```
GET /api/claims/:claimId
```
Returns: Complete claim information

**Response:**
```json
{
  claimId: "uuid",
  claimCode: "CLM-2025-00012",
  submissionDate: "2025-01-15",
  claimStatus: "UnderVerification",
  benefitAmount: 50000,
  
  submittedBy: {
    userId: "uuid",
    fullName: "Agent Mary Johnson",
    agentCode: "AGT-2025-00123"
  },
  
  member: {
    memberId: "uuid",
    memberCode: "MEM-2025-00456",
    fullName: "John Smith",
    dateOfBirth: "1980-01-15",
    dateOfDeath: "2025-01-10",
    photoUrl: "https://...",
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
      unitName: "Ruwi Central Unit"
    },
    membershipStartDate: "2024-06-20",
    membershipDuration: "6 months, 20 days",
    contributionsPaid: 6,
    totalContributed: 600,
    walletBalance: 500
  },
  
  causeOfDeath: {
    cause: "Natural causes - Heart attack",
    hospital: "Royal Hospital, Muscat",
    doctorName: "Dr. Ahmed Al-Balushi"
  },
  
  nominees: [
    {
      nomineeId: "uuid",
      fullName: "Jane Smith",
      relationship: "Spouse",
      phone: "+968 9876 5432",
      idNumber: "87654321",
      dateOfBirth: "1982-02-20",
      addressLine1: "Building 5, Apt 12",
      addressLine2: "Ruwi",
      postalCode: "112",
      state: "Muscat",
      country: "Oman",
      sharePercentage: 100,
      benefitShare: 50000,
      bankDetails: {
        bankName: "Bank Muscat",
        accountNumber: "1234567890",
        iban: "OM12345678901234567890",
        accountHolderName: "Jane Smith"
      }
    }
  ],
  
  documents: [
    {
      documentId: "uuid",
      documentType: "Death Certificate",
      fileName: "death-cert.pdf",
      fileSize: 1200000,
      fileUrl: "https://...",
      uploadedAt: "2025-01-15",
      uploadedBy: {
        userId: "uuid",
        fullName: "Agent Mary Johnson"
      },
      verificationStatus: "Verified",
      verifiedBy: {
        userId: "uuid",
        fullName: "Admin User"
      },
      verifiedAt: "2025-01-16"
    }
  ],
  
  contributionCycle: {
    cycleId: "uuid",
    cycleCode: "CC-2025-00015",
    cycleStatus: "Active",
    targetAmount: 50000,
    collectedAmount: 35000,
    collectionPercentage: 70,
    totalMembers: 500,
    paidMembers: 350,
    pendingMembers: 140,
    failedMembers: 10,
    startDate: "2025-01-17",
    deadline: "2025-01-25",
    daysRemaining: 5
  }
}
```

---

### **6. Get Claim Timeline/Audit Log** (Future implementation)
```
GET /api/claims/:claimId/timeline
```
Returns: Chronological history of all actions on claim

**Response:**
```json
{
  timeline: [
    {
      eventId: "uuid",
      eventType: "DocumentVerified",
      eventDate: "2025-01-16T10:30:00Z",
      performedBy: {
        userId: "uuid",
        fullName: "Admin User"
      },
      details: {
        documentType: "Medical Report",
        status: "Approved"
      }
    },
    {
      eventType: "DocumentsUploaded",
      eventDate: "2025-01-15T15:45:00Z",
      performedBy: {
        userId: "uuid",
        fullName: "Agent Mary Johnson"
      },
      details: {
        documentsCount: 4,
        documentTypes: ["Death Certificate", "Medical Report", "Nominee ID", "Bank Proof"]
      }
    }
  ]
}
```

---

### **11. Verify Document** (Modify existing api)
```
POST /api/claims/:claimId/documents/:documentId/verify
Body: {
  verifiedBy: "uuid",
  verificationStatus: "Approved" | "Rejected",
  notes: "...",
  rejectedBy: "uuid",
  rejectionReason: "..."
}
```
Returns: Updated document verification status

---

### **12. Download Claim Document**
```
GET /api/claims/:claimId/documents/:documentId/download
```
Returns: File download

---

## **Contribution Cycle APIs (within Claim Details)** 


### **16. Export Cycle Members** (Future Impplementation)
```
GET /api/contribution-cycles/:cycleId/members/export
Query params: ?format=csv|excel&status=
```
Returns: File download

---

### **19. Upload Claim Documents (Bulk)** (Future Implementation)
```
POST /api/claims/:claimId/documents/bulk
Body: FormData with multiple files
```
Returns: List of uploaded documents

---


## **Additional Utility APIs**


### **23. Calculate Claim Benefit Amount**
```
GET /api/members/:memberId/benefit-calculation
```
Returns: Death benefit amount based on tier

---

### **24. Validate Claim Eligibility**
```
POST /api/claims/validate-eligibility
Body: { memberId: "uuid", deathDate: "2025-01-10" }
```
Returns: Eligibility status with reasons if ineligible

---

### **25. Download Claim Report (PDF)** (Future implementations)
```
GET /api/claims/:claimId/report
Query params: ?format=pdf
```
Returns: Comprehensive claim report PDF
