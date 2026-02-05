# Summary of Changes

1. accountCodes.ts

    Added WALLET_DEPOSIT_COLLECTION transaction type to differentiate collection-time entries

2. cashManagementEventHandlers.ts

    Added handleWalletDepositRequested() handler to update agent's cash custody when a deposit is collected

3. index.ts

    Subscribed to WalletDepositRequestedEvent to trigger the new handler

4. depositRequestService.ts

    Major changes to the deposit flow:

    | Method |	Changes |

    |requestDeposit() |	Now creates GL entry, credits wallet, creates wallet transaction, and marks as Approved immediately at collection time
    | submitForApproval() |	Marked as @deprecated - returns deposit as-is if already approved
    | processApproval() |	Marked as @deprecated - skips if already approved, kept for legacy compatibility
    | processRejection()    |	Marked as @deprecated - kept for legacy compatibility |

## New Flow:

```
Agent collects cash from member
    ↓
requestDeposit() called
    ↓
├── GL Entry: Dr Cash Agent Custody, Cr Member Wallet Liability
├── Cash Custody: Agent's custody balance increased (via event)
├── Wallet: Member's wallet balance credited
├── Status: Approved immediately
└── Events: WalletDepositRequestedEvent + WalletDepositApprovedEvent emitted
```