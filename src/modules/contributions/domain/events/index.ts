// Domain: Contribution Collection Events
// Events emitted by contribution collection workflows

import { DomainEvent } from '@/shared/domain/events/domain-event.base';

// ==================== Contribution Cycle Events ====================

export interface ContributionCycleStartedPayload {
  cycleId: string;
  cycleNumber: string;
  deathClaimId: string;
  totalMembers: number;
  totalExpectedAmount: number;
  collectionDeadline: Date;
}

export class ContributionCycleStartedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'contribution.cycle.started';

  constructor(payload: ContributionCycleStartedPayload, userId?: string) {
    super(
      ContributionCycleStartedEvent.EVENT_TYPE,
      payload.cycleId,
      'ContributionCycle',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): ContributionCycleStartedPayload {
    return this.payload as unknown as ContributionCycleStartedPayload;
  }
}

export interface ContributionCycleClosedPayload {
  cycleId: string;
  cycleNumber: string;
  totalCollected: number;
  totalExpected: number;
  closedBy?: string;
}

export class ContributionCycleClosedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'contribution.cycle.closed';

  constructor(payload: ContributionCycleClosedPayload, userId?: string) {
    super(
      ContributionCycleClosedEvent.EVENT_TYPE,
      payload.cycleId,
      'ContributionCycle',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): ContributionCycleClosedPayload {
    return this.payload as unknown as ContributionCycleClosedPayload;
  }
}

// ==================== Member Contribution Events ====================

export interface WalletDebitRequestCreatedPayload {
  debitRequestId: string;
  memberId: string;
  amount: number;
  cycleId: string;
  contributionId: string;
}

export class WalletDebitRequestCreatedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'contribution.wallet.debit.requested';

  constructor(payload: WalletDebitRequestCreatedPayload, userId?: string) {
    super(
      WalletDebitRequestCreatedEvent.EVENT_TYPE,
      payload.debitRequestId,
      'WalletDebitRequest',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): WalletDebitRequestCreatedPayload {
    return this.payload as unknown as WalletDebitRequestCreatedPayload;
  }
}

export interface ContributionCollectedPayload {
  contributionId: string;
  cycleId: string;
  memberId: string;
  amount: number;
  paymentMethod: 'Wallet' | 'DirectCash';
  collectedBy: string;
  /**
   * Indicates if this collection was via auto-debit (no agent acknowledgment required)
   * See docs/implementations/update-99-remove-wallet-debit-request.md
   */
  isAutoDebit?: boolean;
}

export class ContributionCollectedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'contribution.collected';

  constructor(payload: ContributionCollectedPayload, userId?: string) {
    super(
      ContributionCollectedEvent.EVENT_TYPE,
      payload.contributionId,
      'MemberContribution',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): ContributionCollectedPayload {
    return this.payload as unknown as ContributionCollectedPayload;
  }
}

export interface ContributionMissedPayload {
  contributionId: string;
  memberId: string;
  cycleId: string;
  isConsecutiveMiss: boolean;
  memberSuspended: boolean;
}

export class ContributionMissedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'contribution.missed';

  constructor(payload: ContributionMissedPayload, userId?: string) {
    super(
      ContributionMissedEvent.EVENT_TYPE,
      payload.contributionId,
      'MemberContribution',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): ContributionMissedPayload {
    return this.payload as unknown as ContributionMissedPayload;
  }
}

export interface MemberSuspendedForNonPaymentPayload {
  memberId: string;
  contributionId: string;
  reason: string;
}

export class MemberSuspendedForNonPaymentEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'member.suspended.nonpayment';

  constructor(payload: MemberSuspendedForNonPaymentPayload, userId?: string) {
    super(
      MemberSuspendedForNonPaymentEvent.EVENT_TYPE,
      payload.memberId,
      'Member',
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): MemberSuspendedForNonPaymentPayload {
    return this.payload as unknown as MemberSuspendedForNonPaymentPayload;
  }
}
