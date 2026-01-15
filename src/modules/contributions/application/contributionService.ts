// Application: Contribution Service
// Handles contribution collection workflows

import { v4 as uuidv4 } from 'uuid';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import {
  ContributionCycleRepository,
  MemberContributionRepository,
} from '../domain/repositories';
import {
  ContributionCycle,
  MemberContribution,
  MemberContributionStatus,
  ContributionPaymentMethod,
  MemberContributionWithRelations,
  ContributionCycleStatus,
} from '../domain/entities';
import { MemberRepository } from '@/modules/members/domain/repositories';
import { MemberStatus } from '@/modules/members/domain/entities';
import { DebitRequestService } from '@/modules/wallet/application/debitRequestService';
import {
  WalletRepository,
  WalletTransactionRepository,
} from '@/modules/wallet/domain/repositories';
import { JournalEntryService } from '@/modules/gl/application/journalEntryService';
import {
  ACCOUNT_CODES,
  TRANSACTION_SOURCE,
  TRANSACTION_TYPE,
} from '@/modules/gl/constants/accountCodes';
import { AppError } from '@/shared/utils/error-handling/AppError';
import { eventBus } from '@/shared/domain/events/event-bus';
import {
  ContributionCycleStartedEvent,
  ContributionCycleClosedEvent,
  ContributionCollectedEvent,
  ContributionMissedEvent,
  MemberSuspendedForNonPaymentEvent,
} from '../domain/events';
import { generateCycleNumber } from './helpers';
import { WalletTransactionType, WalletTransactionStatus } from '@/modules/wallet/domain/entities';
import { ConfigService } from '@/modules/config/application/configService';

// Grace period for contribution collection (in days)
const CONTRIBUTION_GRACE_PERIOD_DAYS = 30;

// System user ID for auto-debit operations
const SYSTEM_USER_ID = 'SYSTEM';

export class ContributionService {
  constructor(
    private readonly contributionCycleRepo: ContributionCycleRepository,
    private readonly memberContributionRepo: MemberContributionRepository,
    private readonly memberRepo: MemberRepository,
    private readonly walletRepo: WalletRepository,
    private readonly walletTransactionRepo: WalletTransactionRepository,
    private readonly debitRequestService: DebitRequestService,
    private readonly journalEntryService: JournalEntryService,
    private readonly configService?: ConfigService
  ) {}

  /**
   * Start contribution cycle (triggered by DeathClaimApproved event)
   * Creates cycle and member contributions, initiates wallet debit requests
   */
  async startContributionCycle(data: {
    deathClaimId: string;
    claimNumber: string;
    deceasedMemberId: string;
    deceasedMemberName: string;
    benefitAmount: number;
    forumId: string;
  }): Promise<ContributionCycle> {
    return await prisma.$transaction(async (tx: any) => {
      // Check if cycle already exists (idempotent)
      const existingCycle = await this.contributionCycleRepo.findByDeathClaimId(
        data.deathClaimId,
        tx
      );

      if (existingCycle) {
        return existingCycle;
      }

      // Get all active members (except deceased)
      const activeMembers = await this.memberRepo.findActiveMembers(
        {
          excludeMemberId: data.deceasedMemberId,
        },
        tx
      );

      if (activeMembers.length === 0) {
        throw new AppError('No active members found for contribution', 400);
      }

      // Calculate totals
      let totalExpectedAmount = 0;
      for (const member of activeMembers) {
        totalExpectedAmount += member.tier?.contributionAmount || 0;
      }

      // Generate cycle number
      const cycleNumber = await generateCycleNumber();

      // Calculate collection deadline
      const startDate = new Date();
      const collectionDeadline = new Date(startDate);
      collectionDeadline.setDate(
        collectionDeadline.getDate() + CONTRIBUTION_GRACE_PERIOD_DAYS
      );

      // Create contribution cycle
      const cycleId = uuidv4();
      const cycle = await this.contributionCycleRepo.create(
        {
          cycleId,
          cycleNumber,
          deathClaimId: data.deathClaimId,
          claimNumber: data.claimNumber,
          deceasedMemberId: data.deceasedMemberId,
          deceasedMemberName: data.deceasedMemberName,
          benefitAmount: data.benefitAmount,
          forumId: data.forumId,
          startDate,
          collectionDeadline,
          cycleStatus: ContributionCycleStatus.Active,
          totalMembers: activeMembers.length,
          totalExpectedAmount,
          totalCollectedAmount: 0,
          totalPendingAmount: totalExpectedAmount,
          membersCollected: 0,
          membersPending: activeMembers.length,
          membersMissed: 0,
        },
        tx
      );

      // Create member contributions
      const contributionsData = activeMembers.map((member) => ({
        contributionId: uuidv4(),
        cycleId,
        memberId: member.memberId,
        memberCode: member.memberCode,
        memberName: `${member.firstName} ${member.lastName}`,
        tierId: member.tierId,
        agentId: member.agentId,
        expectedAmount: member.tier?.contributionAmount || 0,
        contributionStatus: MemberContributionStatus.Pending,
        isConsecutiveMiss: false,
      }));

      await this.memberContributionRepo.createMany(contributionsData, tx);

      // Create wallet debit requests for members with sufficient balance
      await this.createWalletDebitRequests(cycleId, cycleNumber, tx);

      // Emit event
      eventBus.publish(
        new ContributionCycleStartedEvent({
          cycleId,
          cycleNumber,
          deathClaimId: data.deathClaimId,
          totalMembers: activeMembers.length,
          totalExpectedAmount,
          collectionDeadline,
        })
      );

      return cycle;
    });
  }

  /**
   * Create wallet debit requests for contributions
   * 
   * Behavior depends on wallet.autoDebitEnabled configuration:
   * - When enabled (default): Auto-debit from wallet immediately, contribution goes to Collected
   * - When disabled: Create debit request for agent acknowledgment, contribution goes to WalletDebitRequested
   * 
   * If member has insufficient balance, they remain in Pending for agent cash collection.
   * 
   * See docs/implementations/update-99-remove-wallet-debit-request.md
   */
  private async createWalletDebitRequests(
    cycleId: string,
    cycleNumber: string,
    tx: any
  ): Promise<void> {
    // Check if auto-debit is enabled
    const autoDebitEnabled = this.configService 
      ? await this.configService.isWalletAutoDebitEnabled()
      : true; // Default to auto-debit if no config service

      console.log(cycleId, cycleNumber)
      const contributions = await this.memberContributionRepo.findByCycleId(
      cycleId,
      {
        status: MemberContributionStatus.Pending,
        page: 1,
        limit: 10000, // Get all
      },
      tx
    );
    
    for (const contribution of contributions.contributions) {
      if (autoDebitEnabled) {
        // AUTO-DEBIT MODE: Debit wallet immediately
        await this.processAutoDebit(contribution, cycleId, cycleNumber, tx);
      } else {
        // LEGACY MODE: Create debit request for agent acknowledgment
        await this.processLegacyDebitRequest(contribution, cycleNumber, tx);
      }
    }
  }

  /**
   * Process auto-debit for a contribution
   * Debits wallet immediately without agent acknowledgment
   */
  private async processAutoDebit(
    contribution: MemberContribution,
    cycleId: string,
    cycleNumber: string,
    tx: any
  ): Promise<void> {
    //TODO: CODE NOT REACHING THIS POINT
    const result = await this.debitRequestService.executeAutoDebit(
      {
        memberId: contribution.memberId,
        amount: contribution.expectedAmount,
        purpose: `Contribution for ${cycleNumber}`,
        contributionCycleId: cycleId,
        contributionId: contribution.contributionId,
      },
      SYSTEM_USER_ID,
      tx
    );


    if (result) {
      // Auto-debit successful - mark as collected
      await this.memberContributionRepo.update(
        contribution.contributionId,
        {
          contributionStatus: MemberContributionStatus.Collected,
          paymentMethod: ContributionPaymentMethod.Wallet,
          collectionDate: new Date(),
          collectedBy: SYSTEM_USER_ID,
          walletDebitRequestId: result.debitRequest.debitRequestId,
          journalEntryId: result.journalEntryId,
          debitAcknowledgedAt: new Date(),
        },
        tx
      );

      // Emit contribution collected event
      eventBus.publish(
        new ContributionCollectedEvent(
          {
            contributionId: contribution.contributionId,
            cycleId,
            memberId: contribution.memberId,
            amount: contribution.expectedAmount,
            paymentMethod: 'Wallet',
            collectedBy: SYSTEM_USER_ID,
            isAutoDebit: true,
          },
          SYSTEM_USER_ID
        )
      );
    }
    // If result is null, insufficient balance - contribution stays Pending for agent cash collection
  }

  /**
   * Process legacy debit request (for when auto-debit is disabled)
   * Creates debit request requiring agent acknowledgment
   * @deprecated Use auto-debit instead
   */
  private async processLegacyDebitRequest(
    contribution: MemberContribution,
    cycleNumber: string,
    tx: any
  ): Promise<void> {
    // Get member's wallet
    const wallet = await this.walletRepo.findByMemberId(contribution.memberId, tx);

    if (wallet && wallet.currentBalance >= contribution.expectedAmount) {
      // Create debit request for agent acknowledgment
      const debitRequest = await this.debitRequestService.createDebitRequest({
        memberId: contribution.memberId,
        amount: contribution.expectedAmount,
        purpose: `Contribution for ${cycleNumber}`,
        contributionCycleId: contribution.cycleId,
        contributionId: contribution.contributionId,
      });

      if (debitRequest) {
        // Update contribution status to await acknowledgment
        await this.memberContributionRepo.update(
          contribution.contributionId,
          {
            contributionStatus: MemberContributionStatus.WalletDebitRequested,
            walletDebitRequestId: debitRequest.debitRequestId,
          },
          tx
        );
      }
    }
    // If insufficient balance, contribution stays Pending for agent cash collection
  }

  /**
   * Acknowledge contribution debit from wallet
   * Agent acknowledges the debit request on behalf of member
   */
  async acknowledgeContributionDebit(
    contributionId: string,
    acknowledgedBy: string
  ): Promise<MemberContribution> {
    return await prisma.$transaction(async (tx: any) => {
      const contribution = await this.memberContributionRepo.findByIdWithRelations(
        contributionId,
        tx
      );

      if (!contribution) {
        throw new AppError('Contribution not found', 404);
      }

      if (contribution.contributionStatus !== MemberContributionStatus.WalletDebitRequested) {
        throw new AppError('Contribution is not awaiting wallet debit acknowledgment', 400);
      }

      // Verify agent
      if (contribution.agentId !== acknowledgedBy) {
        throw new AppError('Only assigned agent can acknowledge contribution', 403);
      }

      if (!contribution.walletDebitRequestId) {
        throw new AppError('No wallet debit request found', 400);
      }

      // Acknowledge the debit (this handles wallet debit + GL entry)
      const completedDebitRequest = await this.debitRequestService.acknowledgeDebit(
        contribution.walletDebitRequestId,
        acknowledgedBy
      );

      // Get the journal entry ID from the completed debit request
      // The journal entry was created by acknowledgeDebit
      // Note: We can't directly access it here, so we'll set it to null and let it be tracked via the debit request
      const journalEntryId = null;

      // Update contribution status
      const updated = await this.memberContributionRepo.update(
        contributionId,
        {
          contributionStatus: MemberContributionStatus.Collected,
          paymentMethod: ContributionPaymentMethod.Wallet,
          collectionDate: new Date(),
          collectedBy: acknowledgedBy,
          debitAcknowledgedAt: new Date(),
          journalEntryId,
        },
        tx
      );

      // Update cycle statistics
      await this.updateCycleStatistics(contribution.cycleId, tx);

      // Reset member miss counter
      await this.resetMemberMissCounter(contribution.memberId, tx);

      // Emit event
      eventBus.publish(
        new ContributionCollectedEvent(
          {
            contributionId,
            cycleId: contribution.cycleId,
            memberId: contribution.memberId,
            amount: contribution.expectedAmount,
            paymentMethod: 'Wallet',
            collectedBy: acknowledgedBy,
          },
          acknowledgedBy
        )
      );

      return updated;
    });
  }

  /**
   * Record direct cash contribution
   * When member pays cash directly instead of wallet debit
   */
  async recordDirectCashContribution(
    contributionId: string,
    cashReceiptReference: string | undefined,
    collectedBy: string
  ): Promise<MemberContribution> {
    return await prisma.$transaction(async (tx: any) => {
      const contribution = await this.memberContributionRepo.findByIdWithRelations(
        contributionId,
        tx
      );

      if (!contribution) {
        throw new AppError('Contribution not found', 404);
      }

      const validStatuses = [
        MemberContributionStatus.Pending,
        MemberContributionStatus.WalletDebitRequested,
      ];

      if (!validStatuses.includes(contribution.contributionStatus)) {
        throw new AppError('Cannot record cash for contribution in this status', 400);
      }

      // Verify agent
      if (contribution.agentId !== collectedBy) {
        throw new AppError('Only assigned agent can record cash contribution', 403);
      }

      // Invalidate wallet debit request if exists
      if (contribution.walletDebitRequestId) {
        await this.debitRequestService.invalidateDebitRequest(
          contribution.walletDebitRequestId,
          collectedBy
        );
      }

      // Create GL entry (Dr Cash, Cr Contribution Income)
      const { entry } = await this.journalEntryService.createJournalEntry({
        entryDate: new Date(),
        description: `Cash contribution from ${contribution.memberName}`,
        reference: `CONTRIB-${contributionId.substring(0, 8)}`,
        sourceModule: TRANSACTION_SOURCE.CONTRIBUTION,
        sourceEntityId: contributionId,
        sourceTransactionType: TRANSACTION_TYPE.CONTRIBUTION_DIRECT_CASH,
        lines: [
          {
            accountCode: ACCOUNT_CODES.CASH,
            debitAmount: contribution.expectedAmount,
            creditAmount: 0,
            description: `Cash contribution from ${contribution.memberName}`,
          },
          {
            accountCode: ACCOUNT_CODES.CONTRIBUTION_INCOME,
            debitAmount: 0,
            creditAmount: contribution.expectedAmount,
            description: `Contribution for ${contribution.cycle?.cycleNumber || 'cycle'}`,
          },
        ],
        createdBy: collectedBy,
        autoPost: true,
      });

      // Update contribution
      const updated = await this.memberContributionRepo.update(
        contributionId,
        {
          contributionStatus: MemberContributionStatus.Collected,
          paymentMethod: ContributionPaymentMethod.DirectCash,
          collectionDate: new Date(),
          collectedBy,
          cashReceiptReference,
          journalEntryId: entry.entryId,
        },
        tx
      );

      // Update cycle statistics
      await this.updateCycleStatistics(contribution.cycleId, tx);

      // Reset member miss counter
      await this.resetMemberMissCounter(contribution.memberId, tx);

      // Emit event
      eventBus.publish(
        new ContributionCollectedEvent(
          {
            contributionId,
            cycleId: contribution.cycleId,
            memberId: contribution.memberId,
            amount: contribution.expectedAmount,
            paymentMethod: 'DirectCash',
            collectedBy,
          },
          collectedBy
        )
      );

      return updated;
    });
  }

  /**
   * Mark contribution as missed
   * Can be triggered by system or admin
   */
  async markContributionAsMissed(
    contributionId: string,
    markedBy?: string
  ): Promise<MemberContribution> {
    return await prisma.$transaction(async (tx: any) => {
      const contribution = await this.memberContributionRepo.findByIdWithRelations(
        contributionId,
        tx
      );

      if (!contribution) {
        throw new AppError('Contribution not found', 404);
      }

      const validStatuses = [
        MemberContributionStatus.Pending,
        MemberContributionStatus.WalletDebitRequested,
      ];

      if (!validStatuses.includes(contribution.contributionStatus)) {
        throw new AppError('Cannot mark contribution as missed in this status', 400);
      }

      // Check for consecutive miss
      const previousMiss = await this.memberContributionRepo.findPreviousMissedContribution(
        contribution.memberId,
        contribution.cycleId,
        tx
      );

      const isConsecutiveMiss = !!previousMiss;

      // Update contribution
      const updated = await this.memberContributionRepo.update(
        contributionId,
        {
          contributionStatus: MemberContributionStatus.Missed,
          isConsecutiveMiss,
        },
        tx
      );

      // Mark wallet debit as failed if exists
      if (contribution.walletDebitRequestId) {
        await this.debitRequestService.invalidateDebitRequest(
          contribution.walletDebitRequestId,
          markedBy || 'system'
        );
      }

      // Update cycle statistics
      await this.updateCycleStatistics(contribution.cycleId, tx);

      // If consecutive miss, suspend member
      let memberSuspended = false;
      if (isConsecutiveMiss) {
        await this.suspendMemberForNonPayment(
          contribution.memberId,
          contributionId,
          tx
        );
        memberSuspended = true;
      }

      // Emit event
      eventBus.publish(
        new ContributionMissedEvent(
          {
            contributionId,
            memberId: contribution.memberId,
            cycleId: contribution.cycleId,
            isConsecutiveMiss,
            memberSuspended,
          },
          markedBy
        )
      );

      return updated;
    });
  }

  /**
   * Close contribution cycle
   * Marks all pending contributions as missed
   */
  async closeContributionCycle(
    cycleId: string,
    closedBy?: string
  ): Promise<ContributionCycle> {
    return await prisma.$transaction(async (tx: any) => {
      const cycle = await this.contributionCycleRepo.findById(cycleId, tx);

      if (!cycle) {
        throw new AppError('Contribution cycle not found', 404);
      }

      if (cycle.cycleStatus === 'Closed') {
        return cycle; // Already closed
      }

      // Get all pending contributions
      const pendingContributions = await this.memberContributionRepo.findPendingByCycleId(
        cycleId,
        tx
      );

      // Mark each as missed
      for (const contribution of pendingContributions) {
        await this.markContributionAsMissed(contribution.contributionId, closedBy);
      }

      // Update cycle
      const updatedCycle = await this.contributionCycleRepo.update(
        cycleId,
        {
          cycleStatus: ContributionCycleStatus.Closed,
          closedDate: new Date(),
          closedBy,
        },
        tx
      );

      // Emit event
      eventBus.publish(
        new ContributionCycleClosedEvent(
          {
            cycleId,
            cycleNumber: cycle.cycleNumber,
            totalCollected: cycle.totalCollectedAmount,
            totalExpected: cycle.totalExpectedAmount,
            closedBy,
          },
          closedBy
        )
      );

      return updatedCycle;
    });
  }

  /**
   * Update cycle statistics
   * Recalculates totals from contributions
   */
  private async updateCycleStatistics(cycleId: string, tx: any): Promise<void> {
    const stats = await this.memberContributionRepo.calculateCycleStatistics(
      cycleId,
      tx
    );

    const cycle = await this.contributionCycleRepo.findById(cycleId, tx);
    if (!cycle) return;

    await this.contributionCycleRepo.update(
      cycleId,
      {
        membersCollected: stats.totalCollected,
        membersPending: stats.totalPending,
        membersMissed: stats.totalMissed,
        totalCollectedAmount: stats.collectedAmount,
        totalPendingAmount: cycle.totalExpectedAmount - stats.collectedAmount,
      },
      tx
    );
  }

  /**
   * Reset member miss counter
   * Called when member pays a contribution
   */
  private async resetMemberMissCounter(memberId: string, tx: any): Promise<void> {
    await this.memberContributionRepo.updateMany(
      {
        contributionStatus: [MemberContributionStatus.Missed],
      },
      {
        isConsecutiveMiss: false,
      },
      tx
    );
  }

  /**
   * Suspend member for non-payment
   * Called when member misses 2 consecutive contributions
   */
  private async suspendMemberForNonPayment(
    memberId: string,
    contributionId: string,
    tx: any
  ): Promise<void> {
    await this.memberRepo.update(
      memberId,
      {
        memberStatus: MemberStatus.Suspended,
        suspensionReason: 'Missed 2 consecutive contributions',
        suspensionCounter: 2,
        suspendedAt: new Date(),
      },
      tx
    );

    // Update agent statistics
    const member = await this.memberRepo.findById(memberId, tx);
    if (member && member.agentId) {
      await prisma.agent.update({
        where: { agentId: member.agentId },
        data: {
          totalActiveMembers: {
            decrement: 1,
          },
        },
      });
    }

    // Emit event
    eventBus.publish(
      new MemberSuspendedForNonPaymentEvent({
        memberId,
        contributionId,
        reason: 'ConsecutiveContributionMiss',
      })
    );
  }

  // ==================== Query Methods ====================

  /**
   * Get contribution cycle by ID
   */
  async getCycleById(cycleId: string): Promise<ContributionCycle> {
    const cycle = await this.contributionCycleRepo.findById(cycleId);
    if (!cycle) {
      throw new AppError('Contribution cycle not found', 404);
    }
    return cycle;
  }

  /**
   * Get contribution cycle with contributions
   */
  async getCycleWithContributions(cycleId: string): Promise<any> {
    const cycle = await this.contributionCycleRepo.findByIdWithContributions(cycleId);
    if (!cycle) {
      throw new AppError('Contribution cycle not found', 404);
    }
    return cycle;
  }

  /**
   * Get contribution by ID
   */
  async getContributionById(contributionId: string): Promise<MemberContribution> {
    const contribution = await this.memberContributionRepo.findById(contributionId);
    if (!contribution) {
      throw new AppError('Contribution not found', 404);
    }
    return contribution;
  }

  /**
   * Get member's contribution history
   */
  async getMemberContributionHistory(
    memberId: string,
    filters: {
      status?: MemberContributionStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ contributions: any[]; total: number }> {
    return await this.memberContributionRepo.findByMemberId(memberId, filters);
  }

  /**
   * Get contributions by cycle with filters
   */
  async getContributionsByCycle(
    cycleId: string,
    filters: {
      status?: MemberContributionStatus;
      agentId?: string;
      searchTerm?: string;
      page: number;
      limit: number;
    }
  ): Promise<{ contributions: MemberContributionWithRelations[]; total: number }> {
    return await this.memberContributionRepo.findByCycleId(cycleId, filters);
  }

  /**
   * Get contribution by ID with relations
   */
  async getContributionByIdWithRelations(contributionId: string): Promise<MemberContributionWithRelations> {
    const contribution = await this.memberContributionRepo.findByIdWithRelations(contributionId);
    if (!contribution) {
      throw new AppError('Contribution not found', 404);
    }
    return contribution;
  }

  /**
   * Get member's contribution summary
   */
  async getMemberContributionSummary(memberId: string): Promise<{
    memberId: string;
    memberCode: string;
    totalContributed: number;
    thisYear: number;
    pendingCount: number;
    averagePerMonth: number;
    walletBalance: number;
  }> {
    // Get member info
    const member = await this.memberRepo.findById(memberId);
    if (!member) {
      throw new AppError('Member not found', 404);
    }

    // Get all contributions for this member with Collected status
    const allContributions = await prisma.memberContribution.findMany({
      where: {
        memberId,
        contributionStatus: MemberContributionStatus.Collected,
      },
      select: {
        expectedAmount: true,
        collectionDate: true,
      },
    });

    // Get this year's contributions
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const thisYearContributions = allContributions.filter(
      (c) => c.collectionDate && c.collectionDate >= startOfYear
    );

    // Get pending count
    const pendingCount = await prisma.memberContribution.count({
      where: {
        memberId,
        contributionStatus: {
          in: [
            MemberContributionStatus.Pending,
            MemberContributionStatus.WalletDebitRequested,
          ],
        },
      },
    });

    // Get wallet balance
    const wallet = await this.walletRepo.findByMemberId(memberId);
    const walletBalance = wallet?.currentBalance || 0;

    // Calculate totals
    const totalContributed = allContributions.reduce(
      (sum, c) => sum + parseFloat(c.expectedAmount.toString()),
      0
    );
    const thisYear = thisYearContributions.reduce(
      (sum, c) => sum + parseFloat(c.expectedAmount.toString()),
      0
    );

    // Calculate average per month (based on months with contributions)
    const monthsWithContributions = new Set(
      allContributions
        .filter((c) => c.collectionDate)
        .map((c) => `${c.collectionDate!.getFullYear()}-${c.collectionDate!.getMonth()}`)
    ).size;
    const averagePerMonth = monthsWithContributions > 0
      ? totalContributed / monthsWithContributions
      : 0;

    return {
      memberId,
      memberCode: member.memberCode,
      totalContributed,
      thisYear,
      pendingCount,
      averagePerMonth: Math.round(averagePerMonth * 100) / 100,
      walletBalance,
    };
  }

  /**
   * Get active contribution cycles summary for admin dashboard
   */
  async getActiveCyclesSummary(): Promise<{
    activeCyclesCount: number;
    totalCollecting: number;
    totalExpected: number;
    avgCompletionPercentage: number;
  }> {
    const activeCycles = await prisma.contributionCycle.findMany({
      where: {
        cycleStatus: 'Active',
      },
      select: {
        totalExpectedAmount: true,
        totalCollectedAmount: true,
        membersCollected: true,
        totalMembers: true,
      },
    });

    const activeCyclesCount = activeCycles.length;

    if (activeCyclesCount === 0) {
      return {
        activeCyclesCount: 0,
        totalCollecting: 0,
        totalExpected: 0,
        avgCompletionPercentage: 0,
      };
    }

    const totalExpected = activeCycles.reduce(
      (sum, c) => sum + parseFloat(c.totalExpectedAmount.toString()),
      0
    );

    const totalCollecting = activeCycles.reduce(
      (sum, c) => sum + parseFloat(c.totalCollectedAmount.toString()),
      0
    );

    // Calculate average completion percentage
    const completionPercentages = activeCycles.map((c) =>
      c.totalMembers > 0 ? (c.membersCollected / c.totalMembers) * 100 : 0
    );
    const avgCompletionPercentage =
      completionPercentages.reduce((sum, p) => sum + p, 0) / activeCyclesCount;

    return {
      activeCyclesCount,
      totalCollecting,
      totalExpected,
      avgCompletionPercentage: Math.round(avgCompletionPercentage * 100) / 100,
    };
  }

  /**
   * Get member's pending contributions with cycle details and agent info
   */
  async getMemberPendingContributions(memberId: string): Promise<{
    pendingContributions: Array<{
      contributionId: string;
      cycleCode: string;
      claimId: string;
      deceasedMember: {
        memberId: string;
        memberCode: string;
        fullName: string;
      };
      tierName: string;
      contributionAmount: number;
      dueDate: Date;
      daysLeft: number;
      contributionStatus: string;
      agent: {
        agentId: string;
        agentCode: string;
        fullName: string;
        contactNumber: string;
      } | null;
      cycle: any;
    }>;
  }> {
    const contributions = await prisma.memberContribution.findMany({
      where: {
        memberId,
        contributionStatus: {
          in: [
            MemberContributionStatus.Pending,
            MemberContributionStatus.WalletDebitRequested,
          ],
        },
      },
      include: {
        cycle: {
          include: {
            deathClaim: {
              include: {
                member: {
                  select: {
                    memberCode: true,
                  },
                },
                tier: {
                  select: {
                    tierName: true,
                  },
                },
              },
            },
          },
        },
        agent: true,
        tier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const pendingContributions = contributions.map((c) => {
      const dueDate = c.cycle.collectionDeadline;
      const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Get deceased member code from the death claim's member
      const deceasedMemberCode = c.cycle.deathClaim?.member?.memberCode || 'N/A';
      const tierName = c.cycle.deathClaim?.tier?.tierName || c.tier?.tierName || 'N/A';

      return {
        contributionId: c.contributionId,
        cycleCode: c.cycle.cycleNumber,
        claimId: c.cycle.deathClaimId,
        deceasedMember: {
          memberId: c.cycle.deceasedMemberId,
          memberCode: deceasedMemberCode,
          fullName: c.cycle.deceasedMemberName,
        },
        tierName,
        contributionAmount: parseFloat(c.expectedAmount.toString()),
        dueDate,
        daysLeft,
        contributionStatus: c.contributionStatus,
        agent: c.agent ? {
          agentId: c.agent.agentId,
          agentCode: c.agent.agentCode,
          fullName: `${c.agent.firstName} ${c.agent.lastName}`,
          contactNumber: c.agent.contactNumber,
        } : null,
        cycle: {
          cycleId: c.cycle.cycleId,
          cycleNumber: c.cycle.cycleNumber,
          claimNumber: c.cycle.claimNumber,
          deceasedMemberName: c.cycle.deceasedMemberName,
          benefitAmount: parseFloat(c.cycle.benefitAmount.toString()),
          startDate: c.cycle.startDate,
          collectionDeadline: c.cycle.collectionDeadline,
          cycleStatus: c.cycle.cycleStatus,
        },
      };
    });

    return { pendingContributions };
  }
}
