# Wallet Module - API Endpoints

All endpoints are under `/api/wallet` base path.

---

## **Member Wallet APIs**

### **1. Get Wallet Summary**
```
GET /api/wallet/members/:memberId/wallet
GET /api/wallet/my-wallet (for logged-in member)
```
Returns: Balance, stats, alerts, recent transactions

---

### **2. Get Wallet Transaction History**
```
GET /api/wallet/members/:memberId/wallet/transactions
Query params: ?page=1&limit=20&type=Deposit|Debit|Refund|Adjustment&status=Pending|Completed|Failed|Reversed&startDate=&endDate=
```
Returns: Paginated transaction list

---

### **3. Request Wallet Deposit**
```
POST /api/wallet/members/:memberId/wallet/deposit-requests
Body: { amount, collectionDate, notes }
```
Returns: Created deposit request (status: Draft)

---

### **4. Submit Deposit for Approval**
```
POST /api/wallet/deposit-requests/:requestId/submit
```
Returns: Updated deposit request (status: PendingApproval)

---

### **5. Get Member's Deposit Requests**
```
GET /api/wallet/members/:memberId/wallet/deposit-requests
Query params: ?status=Draft|PendingApproval|Approved|Rejected&page=1&limit=20
```
Returns: List of deposit requests

---

### **6. Get Member's Debit Requests**
```
GET /api/wallet/members/:memberId/wallet/debit-requests
Query params: ?status=PendingAcknowledgment|Acknowledged|Completed|Invalidated|Failed&page=1&limit=20
```
Returns: List of debit requests

---

### **7. Create Debit Request (System)**
```
POST /api/wallet/members/:memberId/wallet/debit-requests
Body: { amount, purpose, contributionCycleId?, contributionId? }
```
Returns: Created debit request or null if insufficient balance

---

## **Admin/Agent Wallet Management APIs**

### **8. Get All Pending Deposit Requests**
```
GET /api/wallet/admin/deposits/pending
Query params: ?page=1&limit=20&collectedBy=<agentId>
```
Returns: List of pending deposit requests

---

### **9. Get Pending Debit Acknowledgments**
```
GET /api/wallet/debit-requests/pending
Query params: ?page=1&limit=20&agentId=<agentId>
```
Returns: List of pending acknowledgment requests

---

### **10. Acknowledge Debit Request**
```
POST /api/wallet/debit-requests/:debitRequestId/acknowledge
```
Returns: Updated debit request + wallet balance updated

---

### **11. Invalidate Debit Request**
```
POST /api/wallet/debit-requests/:debitRequestId/invalidate
```
Returns: Updated debit request (status: Invalidated)

---

### **12. Get All Wallets (Admin)**
```
GET /api/wallet/admin/wallets
Query params: ?page=1&limit=20&search=&minBalance=&maxBalance=
```
Returns: Paginated list of all member wallets

---

### **13. Get Low Balance Wallets**
```
GET /api/wallet/admin/wallets/low-balance
Query params: ?threshold=200&page=1&limit=20
```
Returns: List of wallets below threshold

---

### **14. Get Wallet Details (Admin)**
```
GET /api/wallet/admin/wallets/:walletId
```
Returns: Full wallet details

---

### **15. Manual Wallet Adjustment (Admin)**
```
POST /api/wallet/admin/wallets/:walletId/adjust
Body: { amount, reason, adjustmentType: 'credit'|'debit' }
```
Returns: Updated wallet balance + transaction record

---

### **16. Get Wallet Statistics**
```
GET /api/wallet/admin/wallets/statistics
```
Returns: Total wallets, total balance, avg balance, low balance count

---

## **Notes**

### Approval/Rejection Flow
- Deposit requests use the **Approval Workflow** module
- After submitting for approval (`POST .../submit`), the request goes through the standard approval stages
- Approval/rejection is handled via `POST /api/approval-workflow/requests/:requestId/approve|reject`
- Event handlers (`process-deposit-approval.handler.ts`, `process-deposit-rejection.handler.ts`) listen for approval events and update wallet accordingly

### Not Yet Implemented
- ❌ Download wallet statement (PDF/Excel) - requires PDF generation library

---

## **Summary**

**Total Implemented APIs: 16**

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | /wallet/members/:memberId/wallet | GET | Get wallet summary |
| 2 | /wallet/my-wallet | GET | Get logged-in member's wallet |
| 3 | /wallet/members/:memberId/wallet/transactions | GET | Transaction history |
| 4 | /wallet/members/:memberId/wallet/deposit-requests | POST | Request deposit |
| 5 | /wallet/deposit-requests/:requestId/submit | POST | Submit for approval |
| 6 | /wallet/members/:memberId/wallet/deposit-requests | GET | List deposit requests |
| 7 | /wallet/members/:memberId/wallet/debit-requests | GET | List debit requests |
| 8 | /wallet/members/:memberId/wallet/debit-requests | POST | Create debit request |
| 9 | /wallet/admin/deposits/pending | GET | Pending deposits |
| 10 | /wallet/debit-requests/pending | GET | Pending acknowledgments |
| 11 | /wallet/debit-requests/:debitRequestId/acknowledge | POST | Acknowledge debit |
| 12 | /wallet/debit-requests/:debitRequestId/invalidate | POST | Invalidate debit |
| 13 | /wallet/admin/wallets | GET | List all wallets |
| 14 | /wallet/admin/wallets/low-balance | GET | Low balance wallets |
| 15 | /wallet/admin/wallets/:walletId | GET | Wallet details |
| 16 | /wallet/admin/wallets/:walletId/adjust | POST | Manual adjustment |
| 17 | /wallet/admin/wallets/statistics | GET | Wallet statistics |