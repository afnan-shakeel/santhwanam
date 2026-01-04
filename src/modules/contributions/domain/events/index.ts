// Domain: Contribution Collection Events
// Events emitted by contribution collection workflows

import { DomainEvent } from '@/shared/domain/events/domain-event.base';

// ==================== Contribution Cycle Events ====================

export class ContributionCycleStartedEvent extends DomainEvent {
  constructor(
    public readonly payload: {
      cycleId: string;
      cycleNumber: string;
      deathClaimId: string;
      totalMembers: number;
      totalExpectedAmount: number;
      collectionDeadline: Date;
    },
    triggeredBy?: string
  ) {
    super('ContributionCycleStarted', payload, triggeredBy);
  }
}

export class ContributionCycleClosedEvent extends DomainEvent {
  constructor(
    public readonly payload: {
      cycleId: string;
      cycleNumber: string;
      totalCollected: number;
      totalExpected: number;
      closedBy?: string;
    },
    triggeredBy?: string
  ) {
    super('ContributionCycleClosed', payload, triggeredBy);
  }
}

// ==================== Member Contribution Events ====================

export class WalletDebitRequestCreatedEvent extends DomainEvent {
  constructor(
    public readonly payload: {
      debitRequestId: string;
      memberId: string;
      amount: number;
      cycleId: string;
      contributionId: string;
    },
    triggeredBy?: string
  ) {
    super('WalletDebitRequestCreated', payload, triggeredBy);
  }
}

export class ContributionCollectedEvent extends DomainEvent {
  constructor(
    public readonly payload: {
      contributionId: string;
      cycleId: string;
      memberId: string;
      amount: number;
      paymentMethod: 'Wallet' | 'DirectCash';
      collectedBy: string;
    },
    triggeredBy?: string
  ) {
    super('ContributionCollected', payload, triggeredBy);
  }
}

export class ContributionMissedEvent extends DomainEvent {
  constructor(
    public readonly payload: {
      contributionId: string;
      memberId: string;
      cycleId: string;
      isConsecutiveMiss: boolean;
      memberSuspended: boolean;
    },
    triggeredBy?: string
  ) {
    super('ContributionMissed', payload, triggeredBy);
  }
}

export class MemberSuspendedForNonPaymentEvent extends DomainEvent {
  constructor(
    public readonly payload: {
      memberId: string;
      contributionId: string;
      reason: string;
    },
    triggeredBy?: string
  ) {
    super('MemberSuspendedForNonPayment', payload, triggeredBy);
  }
}
