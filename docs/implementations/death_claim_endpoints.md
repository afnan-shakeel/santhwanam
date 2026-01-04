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

### **2. Get All Claims (List)** (:: Make it the search api)
```
GET /api/claims
Query params: ?page=1&limit=20&status=&startDate=&endDate=&search=
```
Returns: Paginated list of claims

**Response:**
```json
{
  claims: [
    {
      claimId: "uuid",
      claimCode: "CLM-2025-00012",
      member: {
        memberId: "uuid",
        memberCode: "MEM-2025-00456",
        fullName: "John Smith"
      },
      deathDate: "2025-01-10",
      claimStatus: "PendingVerification",
      benefitAmount: 50000,
      submittedAt: "2025-01-15",
      submittedBy: {
        userId: "uuid",
        fullName: "Agent Mary Johnson"
      }
    }
  ],
  pagination: { page: 1, limit: 20, total: 45 }
}
```

---

### **3. Get Active Claims Requiring Action** (:: Make it the search api)
```
GET /api/claims/requiring-action
```
Returns: Claims that need immediate attention (pending verification, etc.)

---

### **4. Export Claims**
```
GET /api/claims/export
Query params: ?format=csv|excel&status=&startDate=&endDate=
```
Returns: File download

---

## **Page 2: Claim Details APIs**

### **5. Get Claim Details (Full)**
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
  claimStatus: "PendingVerification",
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

### **13. Get Contribution Cycle Details**
```
GET /api/claims/:claimId/contribution-cycle
GET /api/contribution-cycles/:cycleId
```
Returns: Full cycle details with member list

**Response:**
```json
{
  cycleId: "uuid",
  cycleCode: "CC-2025-00015",
  claimId: "uuid",
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
  daysRemaining: 5,
  
  memberContributions: [
    {
      memberId: "uuid",
      memberCode: "MEM-2025-00789",
      fullName: "Bob Wilson",
      contributionAmount: 100,
      contributionStatus: "Paid",
      paidAt: "2025-01-18",
      agent: {
        agentId: "uuid",
        fullName: "Mary Johnson"
      }
    }
  ]
}
```

---

### **14. Get Cycle Member Contributions (Paginated)**
```
GET /api/contribution-cycles/:cycleId/members
Query params: ?page=1&limit=20&status=paid|pending|failed&agentId=&search=
```
Returns: Paginated list of member contributions

---

### **15. Send Contribution Reminders**
```
POST /api/contribution-cycles/:cycleId/send-reminders
Body: {
  memberIds: ["uuid", "uuid"], // optional - if empty, send to all pending
  reminderType: "sms" | "email" | "both"
}
```
Returns: Reminder sending status

---

### **16. Export Cycle Members**
```
GET /api/contribution-cycles/:cycleId/members/export
Query params: ?format=csv|excel&status=
```
Returns: File download

---

## **Page 3: Submit New Claim APIs**

### **17. Search Member for Claim**
```
GET /api/members/search
Query params: ?q=MEM-2025-00456&activeOnly=true
```
Returns: Member details if found

---

### **18. Create New Claim**
```
POST /api/claims
Body: {
  memberId: "uuid",
  deathDate: "2025-01-10",
  causeOfDeath: "Natural causes - Heart attack",
  hospital: "Royal Hospital, Muscat",
  doctorName: "Dr. Ahmed Al-Balushi",
  submittedBy: "uuid",
  nominees: [
    {
      nomineeId: "uuid",
      bankDetails: {
        bankName: "Bank Muscat",
        accountNumber: "1234567890",
        iban: "OM12345678901234567890",
        accountHolderName: "Jane Smith"
      }
    }
  ],
  notes: "..."
}
```
Returns: Created claim with claimId

---

### **19. Upload Claim Documents (Bulk)**
```
POST /api/claims/:claimId/documents/bulk
Body: FormData with multiple files
```
Returns: List of uploaded documents

---

## **Page 4: My Claims (Nominee) APIs**

### **20. Get Nominee's Claims**
```
GET /api/my-claims
GET /api/nominees/:nomineeId/claims
```
Returns: List of claims where user is nominee

**Response:**
```json
{
  claims: [
    {
      claimId: "uuid",
      claimCode: "CLM-2025-00012",
      deceasedMember: {
        memberCode: "MEM-2025-00456",
        fullName: "John Smith",
        relationship: "Spouse"
      },
      claimStatus: "UnderContribution",
      benefitAmount: 50000,
      nomineeShare: 50000,
      sharePercentage: 100,
      contributionProgress: {
        percentage: 70,
        collected: 35000,
        target: 50000
      },
      expectedPayoutDate: "2025-01-28",
      recentUpdates: [
        {
          date: "2025-01-18",
          message: "Contribution cycle 70% complete"
        }
      ]
    }
  ]
}
```

---

### **21. Get Nominee Claim Details**
```
GET /api/my-claims/:claimId
```
Returns: Detailed claim information (nominee view - limited sensitive data)

---

## **Additional Utility APIs**

### **22. Get Eligible Members for Cycle (Preview)**
```
GET /api/claims/:claimId/eligible-members
GET /api/tiers/:tierId/active-members
```
Returns: List of members who will contribute to cycle

---

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

### **25. Download Claim Report (PDF)**
```
GET /api/claims/:claimId/report
Query params: ?format=pdf
```
Returns: Comprehensive claim report PDF

---

## **Summary**

### **Total APIs: 25**

### **By Page:**
- **Dashboard (Page 1):** 4 APIs
- **Claim Details (Page 2):** 10 APIs
- **Contribution Cycle:** 4 APIs
- **Submit Claim (Page 3):** 4 APIs
- **My Claims (Page 4):** 2 APIs
- **Utility APIs:** 5 APIs

### **By Function:**
- **Claims CRUD:** 5 APIs (list, get, create, approve, reject)
- **Documents:** 4 APIs (list, upload, verify, download)
- **Contribution Cycles:** 4 APIs (get, members, reminders, export)
- **Timeline/Audit:** 1 API
- **Dashboard/Stats:** 2 APIs
- **Nominee View:** 2 APIs
- **Search/Validation:** 3 APIs
- **Export/Reports:** 4 APIs

### **Already Exist (from previous specs):**
- ✅ Get member details
- ✅ Search members
- ✅ Upload documents (generic)
- ✅ Get nominees

### **Need to Create:**
- ❌ Claims dashboard stats
- ❌ Claims list with filters
- ❌ Get claim details (comprehensive)
- ❌ Approve/reject claim
- ❌ Claim timeline/audit
- ❌ Verify documents
- ❌ Contribution cycle details
- ❌ Send reminders
- ❌ Nominee claims view
- ❌ Validate eligibility
- ❌ Export/reporting APIs

---

**Approximately 15-18 new APIs needed for complete death claims functionality** 🎯