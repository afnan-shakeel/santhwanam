// Domain: Membership Wallet
// See `docs/domain/7.membership_wallet.md` for details

// Enums
export enum WalletTransactionType {
  Deposit = "Deposit",
  Debit = "Debit",
  Refund = "Refund",
  Adjustment = "Adjustment",
}

export enum WalletTransactionStatus {
  Pending = "Pending",
  Completed = "Completed",
  Failed = "Failed",
  Reversed = "Reversed",
}

export enum WalletDepositRequestStatus {
  Draft = "Draft",
  PendingApproval = "PendingApproval",
  Approved = "Approved",
  Rejected = "Rejected",
}

export enum WalletDebitRequestStatus {
  PendingAcknowledgment = "PendingAcknowledgment",
  Acknowledged = "Acknowledged",
  Completed = "Completed",
  Invalidated = "Invalidated",
  Failed = "Failed",
}

// Entities
export interface Wallet {
  walletId: string;
  memberId: string;

  currentBalance: number;

  createdAt: Date;
  updatedAt: Date | null;
}

export interface WalletTransaction {
  transactionId: string;
  walletId: string;

  transactionType: WalletTransactionType;
  amount: number;
  balanceAfter: number;

  // Reference
  sourceModule: string;
  sourceEntityId: string | null;

  // Description
  description: string;

  // Financial - GL reference
  journalEntryId: string | null;

  // Status
  status: WalletTransactionStatus;

  // Audit
  createdBy: string;
  createdAt: Date;
}

export interface WalletDepositRequest {
  depositRequestId: string;
  memberId: string;
  walletId: string;

  amount: number;
  collectionDate: Date;
  collectedBy: string; // AgentId
  notes: string | null;

  // Status
  requestStatus: WalletDepositRequestStatus;

  // Approval
  approvalRequestId: string | null;

  // Financial - GL reference
  journalEntryId: string | null;

  // Timestamps
  createdAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
}

export interface WalletDebitRequest {
  debitRequestId: string;
  memberId: string;
  walletId: string;

  amount: number;
  purpose: string;

  // References
  contributionCycleId: string | null;
  contributionId: string | null;

  // Status
  status: WalletDebitRequestStatus;

  // Timestamps
  createdAt: Date;
  acknowledgedAt: Date | null;
  completedAt: Date | null;
}

// Value objects for wallet summary
export interface WalletSummary {
  walletId: string;
  memberId: string;
  currentBalance: number;
  recentTransactions: WalletTransaction[];
}

// Statistics for admin
export interface WalletStatistics {
  totalWallets: number;
  totalBalance: number;
  averageBalance: number;
  lowBalanceCount: number;
}
