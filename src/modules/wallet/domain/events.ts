// Domain: Membership Wallet
// Domain Events

import { DomainEvent } from "@/shared/domain/events/domain-event.base";

// ===== WALLET CREATED =====
export interface WalletCreatedPayload {
  walletId: string;
  memberId: string;
  initialBalance: number;
}

export class WalletCreatedEvent extends DomainEvent {
  static readonly EVENT_TYPE = "wallet.created";

  constructor(payload: WalletCreatedPayload, userId?: string) {
    super(
      WalletCreatedEvent.EVENT_TYPE,
      payload.walletId,
      "Wallet",
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): WalletCreatedPayload {
    return this.payload as unknown as WalletCreatedPayload;
  }
}

// ===== WALLET DEPOSIT REQUESTED =====
export interface WalletDepositRequestedPayload {
  depositRequestId: string;
  memberId: string;
  walletId: string;
  amount: number;
  collectedBy: string;
}

export class WalletDepositRequestedEvent extends DomainEvent {
  static readonly EVENT_TYPE = "wallet.deposit.requested";

  constructor(payload: WalletDepositRequestedPayload, userId?: string) {
    super(
      WalletDepositRequestedEvent.EVENT_TYPE,
      payload.depositRequestId,
      "WalletDepositRequest",
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): WalletDepositRequestedPayload {
    return this.payload as unknown as WalletDepositRequestedPayload;
  }
}

// ===== WALLET DEPOSIT SUBMITTED =====
export interface WalletDepositSubmittedPayload {
  depositRequestId: string;
  approvalRequestId: string;
}

export class WalletDepositSubmittedEvent extends DomainEvent {
  static readonly EVENT_TYPE = "wallet.deposit.submitted";

  constructor(payload: WalletDepositSubmittedPayload, userId?: string) {
    super(
      WalletDepositSubmittedEvent.EVENT_TYPE,
      payload.depositRequestId,
      "WalletDepositRequest",
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): WalletDepositSubmittedPayload {
    return this.payload as unknown as WalletDepositSubmittedPayload;
  }
}

// ===== WALLET DEPOSIT APPROVED =====
export interface WalletDepositApprovedPayload {
  depositRequestId: string;
  memberId: string;
  walletId: string;
  amount: number;
  newBalance: number;
  approvedBy: string;
}

export class WalletDepositApprovedEvent extends DomainEvent {
  static readonly EVENT_TYPE = "wallet.deposit.approved";

  constructor(payload: WalletDepositApprovedPayload, userId?: string) {
    super(
      WalletDepositApprovedEvent.EVENT_TYPE,
      payload.depositRequestId,
      "WalletDepositRequest",
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): WalletDepositApprovedPayload {
    return this.payload as unknown as WalletDepositApprovedPayload;
  }
}

// ===== WALLET DEPOSIT REJECTED =====
export interface WalletDepositRejectedPayload {
  depositRequestId: string;
  memberId: string;
  rejectionReason: string | null;
}

export class WalletDepositRejectedEvent extends DomainEvent {
  static readonly EVENT_TYPE = "wallet.deposit.rejected";

  constructor(payload: WalletDepositRejectedPayload, userId?: string) {
    super(
      WalletDepositRejectedEvent.EVENT_TYPE,
      payload.depositRequestId,
      "WalletDepositRequest",
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): WalletDepositRejectedPayload {
    return this.payload as unknown as WalletDepositRejectedPayload;
  }
}

// ===== WALLET DEBIT REQUEST CREATED =====
export interface WalletDebitRequestCreatedPayload {
  debitRequestId: string;
  memberId: string;
  walletId: string;
  amount: number;
  purpose: string;
}

export class WalletDebitRequestCreatedEvent extends DomainEvent {
  static readonly EVENT_TYPE = "wallet.debit.request.created";

  constructor(payload: WalletDebitRequestCreatedPayload, userId?: string) {
    super(
      WalletDebitRequestCreatedEvent.EVENT_TYPE,
      payload.debitRequestId,
      "WalletDebitRequest",
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): WalletDebitRequestCreatedPayload {
    return this.payload as unknown as WalletDebitRequestCreatedPayload;
  }
}

// ===== WALLET DEBIT COMPLETED =====
export interface WalletDebitCompletedPayload {
  debitRequestId: string;
  memberId: string;
  walletId: string;
  amount: number;
  newBalance: number;
  acknowledgedBy: string;
}

export class WalletDebitCompletedEvent extends DomainEvent {
  static readonly EVENT_TYPE = "wallet.debit.completed";

  constructor(payload: WalletDebitCompletedPayload, userId?: string) {
    super(
      WalletDebitCompletedEvent.EVENT_TYPE,
      payload.debitRequestId,
      "WalletDebitRequest",
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): WalletDebitCompletedPayload {
    return this.payload as unknown as WalletDebitCompletedPayload;
  }
}

// ===== WALLET DEBIT REQUEST INVALIDATED =====
export interface WalletDebitRequestInvalidatedPayload {
  debitRequestId: string;
  memberId: string;
  invalidatedBy: string;
}

export class WalletDebitRequestInvalidatedEvent extends DomainEvent {
  static readonly EVENT_TYPE = "wallet.debit.request.invalidated";

  constructor(payload: WalletDebitRequestInvalidatedPayload, userId?: string) {
    super(
      WalletDebitRequestInvalidatedEvent.EVENT_TYPE,
      payload.debitRequestId,
      "WalletDebitRequest",
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): WalletDebitRequestInvalidatedPayload {
    return this.payload as unknown as WalletDebitRequestInvalidatedPayload;
  }
}

// ===== WALLET ADJUSTED =====
export interface WalletAdjustedPayload {
  walletId: string;
  memberId: string;
  amount: number;
  adjustmentType: "credit" | "debit";
  reason: string;
  newBalance: number;
  adjustedBy: string;
}

export class WalletAdjustedEvent extends DomainEvent {
  static readonly EVENT_TYPE = "wallet.adjusted";

  constructor(payload: WalletAdjustedPayload, userId?: string) {
    super(
      WalletAdjustedEvent.EVENT_TYPE,
      payload.walletId,
      "Wallet",
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): WalletAdjustedPayload {
    return this.payload as unknown as WalletAdjustedPayload;
  }
}
