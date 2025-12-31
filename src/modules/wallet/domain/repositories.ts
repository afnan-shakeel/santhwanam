// Domain: Membership Wallet
// Repository interfaces

import {
  Wallet,
  WalletTransaction,
  WalletDepositRequest,
  WalletDebitRequest,
  WalletDepositRequestStatus,
  WalletDebitRequestStatus,
  WalletStatistics,
} from "./entities";

// Wallet Repository
export interface WalletRepository {
  create(
    wallet: Omit<Wallet, "createdAt" | "updatedAt">,
    tx?: any
  ): Promise<Wallet>;

  findById(walletId: string, tx?: any): Promise<Wallet | null>;

  findByMemberId(memberId: string, tx?: any): Promise<Wallet | null>;

  update(
    walletId: string,
    data: Partial<Omit<Wallet, "walletId" | "memberId" | "createdAt">>,
    tx?: any
  ): Promise<Wallet>;

  incrementBalance(walletId: string, amount: number, tx?: any): Promise<Wallet>;

  decrementBalance(walletId: string, amount: number, tx?: any): Promise<Wallet>;

  findAll(filters: {
    minBalance?: number;
    maxBalance?: number;
    searchQuery?: string;
    page: number;
    limit: number;
  }): Promise<{ wallets: Wallet[]; total: number }>;

  findLowBalanceWallets(
    threshold: number,
    page: number,
    limit: number
  ): Promise<{ wallets: Wallet[]; total: number }>;

  getStatistics(): Promise<WalletStatistics>;
}

// Wallet Transaction Repository
export interface WalletTransactionRepository {
  create(
    transaction: Omit<WalletTransaction, "createdAt">,
    tx?: any
  ): Promise<WalletTransaction>;

  findById(transactionId: string, tx?: any): Promise<WalletTransaction | null>;

  findByWalletId(
    walletId: string,
    filters: {
      transactionType?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page: number;
      limit: number;
    }
  ): Promise<{ transactions: WalletTransaction[]; total: number }>;

  findRecentByWalletId(
    walletId: string,
    limit: number
  ): Promise<WalletTransaction[]>;
}

// Wallet Deposit Request Repository
export interface WalletDepositRequestRepository {
  create(
    request: Omit<WalletDepositRequest, "createdAt" | "approvedAt" | "rejectedAt">,
    tx?: any
  ): Promise<WalletDepositRequest>;

  findById(
    depositRequestId: string,
    tx?: any
  ): Promise<WalletDepositRequest | null>;

  findByIdWithRelations(
    depositRequestId: string,
    tx?: any
  ): Promise<(WalletDepositRequest & { member?: any; wallet?: any }) | null>;

  findByMemberId(
    memberId: string,
    filters: {
      status?: WalletDepositRequestStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ requests: WalletDepositRequest[]; total: number }>;

  findPending(filters: {
    collectedBy?: string;
    page: number;
    limit: number;
  }): Promise<{ requests: WalletDepositRequest[]; total: number }>;

  update(
    depositRequestId: string,
    data: Partial<
      Omit<
        WalletDepositRequest,
        "depositRequestId" | "memberId" | "walletId" | "createdAt"
      >
    >,
    tx?: any
  ): Promise<WalletDepositRequest>;
}

// Wallet Debit Request Repository
export interface WalletDebitRequestRepository {
  create(
    request: Omit<
      WalletDebitRequest,
      "createdAt" | "acknowledgedAt" | "completedAt"
    >,
    tx?: any
  ): Promise<WalletDebitRequest>;

  findById(
    debitRequestId: string,
    tx?: any
  ): Promise<WalletDebitRequest | null>;

  findByIdWithRelations(
    debitRequestId: string,
    tx?: any
  ): Promise<(WalletDebitRequest & { member?: any; wallet?: any }) | null>;

  findByMemberId(
    memberId: string,
    filters: {
      status?: WalletDebitRequestStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ requests: WalletDebitRequest[]; total: number }>;

  findPendingAcknowledgment(filters: {
    agentId?: string;
    page: number;
    limit: number;
  }): Promise<{ requests: WalletDebitRequest[]; total: number }>;

  update(
    debitRequestId: string,
    data: Partial<
      Omit<
        WalletDebitRequest,
        "debitRequestId" | "memberId" | "walletId" | "createdAt"
      >
    >,
    tx?: any
  ): Promise<WalletDebitRequest>;
}
