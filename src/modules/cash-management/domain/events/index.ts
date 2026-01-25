// Domain Events for Cash Management Module

import { DomainEvent } from '@/shared/domain/events/domain-event.base';

// ==================== Cash Custody Events ====================

export interface CashCustodyCreatedPayload {
  custodyId: string;
  userId: string;
  userRole: string;
  glAccountCode: string;
}

export class CashCustodyCreatedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'cash.custody.created';

  constructor(payload: CashCustodyCreatedPayload, userId?: string) {
    super(
      CashCustodyCreatedEvent.EVENT_TYPE,
      payload.custodyId,
      'CashCustody',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): CashCustodyCreatedPayload {
    return this.payload as unknown as CashCustodyCreatedPayload;
  }
}

export interface CashCustodyIncreasedPayload {
  custodyId: string;
  userId: string;
  amount: number;
  sourceModule: string;
  sourceEntityId: string;
  sourceTransactionType: string;
}

export class CashCustodyIncreasedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'cash.custody.increased';

  constructor(payload: CashCustodyIncreasedPayload, userId?: string) {
    super(
      CashCustodyIncreasedEvent.EVENT_TYPE,
      payload.custodyId,
      'CashCustody',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): CashCustodyIncreasedPayload {
    return this.payload as unknown as CashCustodyIncreasedPayload;
  }
}

export interface CashCustodyDeactivatedPayload {
  custodyId: string;
  userId: string;
  reason: string;
}

export class CashCustodyDeactivatedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'cash.custody.deactivated';

  constructor(payload: CashCustodyDeactivatedPayload, userId?: string) {
    super(
      CashCustodyDeactivatedEvent.EVENT_TYPE,
      payload.custodyId,
      'CashCustody',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): CashCustodyDeactivatedPayload {
    return this.payload as unknown as CashCustodyDeactivatedPayload;
  }
}

// ==================== Cash Handover Events ====================

export interface CashHandoverInitiatedPayload {
  handoverId: string;
  handoverNumber: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  requiresApproval: boolean;
}

export class CashHandoverInitiatedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'cash.handover.initiated';

  constructor(payload: CashHandoverInitiatedPayload, userId?: string) {
    super(
      CashHandoverInitiatedEvent.EVENT_TYPE,
      payload.handoverId,
      'CashHandover',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): CashHandoverInitiatedPayload {
    return this.payload as unknown as CashHandoverInitiatedPayload;
  }
}

export interface CashHandoverAcknowledgedPayload {
  handoverId: string;
  handoverNumber: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  journalEntryId: string;
}

export class CashHandoverAcknowledgedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'cash.handover.acknowledged';

  constructor(payload: CashHandoverAcknowledgedPayload, userId?: string) {
    super(
      CashHandoverAcknowledgedEvent.EVENT_TYPE,
      payload.handoverId,
      'CashHandover',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): CashHandoverAcknowledgedPayload {
    return this.payload as unknown as CashHandoverAcknowledgedPayload;
  }
}

export interface CashHandoverRejectedPayload {
  handoverId: string;
  handoverNumber: string;
  rejectedBy: string;
  rejectionReason: string;
}

export class CashHandoverRejectedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'cash.handover.rejected';

  constructor(payload: CashHandoverRejectedPayload, userId?: string) {
    super(
      CashHandoverRejectedEvent.EVENT_TYPE,
      payload.handoverId,
      'CashHandover',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): CashHandoverRejectedPayload {
    return this.payload as unknown as CashHandoverRejectedPayload;
  }
}

export interface CashHandoverCancelledPayload {
  handoverId: string;
  handoverNumber: string;
}

export class CashHandoverCancelledEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'cash.handover.cancelled';

  constructor(payload: CashHandoverCancelledPayload, userId?: string) {
    super(
      CashHandoverCancelledEvent.EVENT_TYPE,
      payload.handoverId,
      'CashHandover',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): CashHandoverCancelledPayload {
    return this.payload as unknown as CashHandoverCancelledPayload;
  }
}

export interface CashDepositedToBankPayload {
  handoverId: string;
  handoverNumber: string;
  fromUserId: string;
  amount: number;
  journalEntryId: string;
}

export class CashDepositedToBankEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'cash.deposited.tobank';

  constructor(payload: CashDepositedToBankPayload, userId?: string) {
    super(
      CashDepositedToBankEvent.EVENT_TYPE,
      payload.handoverId,
      'CashHandover',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): CashDepositedToBankPayload {
    return this.payload as unknown as CashDepositedToBankPayload;
  }
}
