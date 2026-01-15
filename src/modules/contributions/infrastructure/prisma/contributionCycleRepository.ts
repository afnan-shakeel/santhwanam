// Infrastructure: Contribution Cycle Prisma Repository

import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { ContributionCycleRepository } from '../../domain/repositories';
import {
  ContributionCycle,
  ContributionCycleStatus,
  ContributionCycleWithStats,
} from '../../domain/entities';
import { Prisma } from "../../../../generated/prisma/client";

export class PrismaContributionCycleRepository implements ContributionCycleRepository {
  async create(
    data: Omit<ContributionCycle, 'createdAt' | 'updatedAt'>,
    tx?: any
  ): Promise<ContributionCycle> {
    const db = tx || prisma;

    const cycle = await db.contributionCycle.create({
      data: {
        cycleId: data.cycleId,
        cycleNumber: data.cycleNumber,
        deathClaimId: data.deathClaimId,
        claimNumber: data.claimNumber,
        deceasedMemberId: data.deceasedMemberId,
        deceasedMemberName: data.deceasedMemberName,
        benefitAmount: data.benefitAmount,
        forumId: data.forumId,
        startDate: data.startDate,
        collectionDeadline: data.collectionDeadline,
        cycleStatus: data.cycleStatus,
        totalMembers: data.totalMembers,
        totalExpectedAmount: data.totalExpectedAmount,
        totalCollectedAmount: data.totalCollectedAmount,
        totalPendingAmount: data.totalPendingAmount,
        membersCollected: data.membersCollected,
        membersPending: data.membersPending,
        membersMissed: data.membersMissed,
        closedDate: data.closedDate,
        closedBy: data.closedBy,
      },
    });

    return this.mapToEntity(cycle);
  }

  async findById(cycleId: string, tx?: any): Promise<ContributionCycle | null> {
    const db = tx || prisma;

    const cycle = await db.contributionCycle.findUnique({
      where: { cycleId },
    });

    return cycle ? this.mapToEntity(cycle) : null;
  }

  async findByIdWithContributions(
    cycleId: string,
    tx?: any
  ): Promise<ContributionCycleWithStats | null> {
    const db = tx || prisma;

    const cycle = await db.contributionCycle.findUnique({
      where: { cycleId },
      include: {
        contributions: {
          orderBy: { memberCode: 'asc' },
        },
      },
    });

    if (!cycle) return null;

    return {
      ...this.mapToEntity(cycle),
      contributions: cycle.contributions.map((c: any) => ({
        contributionId: c.contributionId,
        cycleId: c.cycleId,
        memberId: c.memberId,
        memberCode: c.memberCode,
        memberName: c.memberName,
        tierId: c.tierId,
        agentId: c.agentId,
        expectedAmount: parseFloat(c.expectedAmount.toString()),
        contributionStatus: c.contributionStatus,
        paymentMethod: c.paymentMethod,
        collectionDate: c.collectionDate,
        collectedBy: c.collectedBy,
        walletDebitRequestId: c.walletDebitRequestId,
        debitAcknowledgedAt: c.debitAcknowledgedAt,
        cashReceiptReference: c.cashReceiptReference,
        journalEntryId: c.journalEntryId,
        isConsecutiveMiss: c.isConsecutiveMiss,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  }

  async findByDeathClaimId(
    deathClaimId: string,
    tx?: any
  ): Promise<ContributionCycle | null> {
    const db = tx || prisma;

    const cycle = await db.contributionCycle.findFirst({
      where: { deathClaimId },
    });

    return cycle ? this.mapToEntity(cycle) : null;
  }

  async findByCycleNumber(
    cycleNumber: string,
    tx?: any
  ): Promise<ContributionCycle | null> {
    const db = tx || prisma;

    const cycle = await db.contributionCycle.findUnique({
      where: { cycleNumber },
    });

    return cycle ? this.mapToEntity(cycle) : null;
  }

  async update(
    cycleId: string,
    data: Partial<Omit<ContributionCycle, 'cycleId' | 'cycleNumber' | 'createdAt'>>,
    tx?: any
  ): Promise<ContributionCycle> {
    const db = tx || prisma;

    const updateData: any = {};
    if (data.cycleStatus) updateData.cycleStatus = data.cycleStatus;
    if (data.totalCollectedAmount !== undefined)
      updateData.totalCollectedAmount = data.totalCollectedAmount;
    if (data.totalPendingAmount !== undefined)
      updateData.totalPendingAmount = data.totalPendingAmount;
    if (data.membersCollected !== undefined)
      updateData.membersCollected = data.membersCollected;
    if (data.membersPending !== undefined)
      updateData.membersPending = data.membersPending;
    if (data.membersMissed !== undefined)
      updateData.membersMissed = data.membersMissed;
    if (data.closedDate !== undefined) updateData.closedDate = data.closedDate;
    if (data.closedBy !== undefined) updateData.closedBy = data.closedBy;

    updateData.updatedAt = new Date();

    const cycle = await db.contributionCycle.update({
      where: { cycleId },
      data: updateData,
    });

    return this.mapToEntity(cycle);
  }

  async findAll(filters: {
    status?: ContributionCycleStatus;
    forumId?: string;
    page: number;
    limit: number;
  }): Promise<{ cycles: ContributionCycle[]; total: number }> {
    const where: Prisma.ContributionCycleWhereInput = {};

    if (filters.status) {
      where.cycleStatus = filters.status;
    }

    if (filters.forumId) {
      where.forumId = filters.forumId;
    }

    const [cycles, total] = await Promise.all([
      prisma.contributionCycle.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contributionCycle.count({ where }),
    ]);

    return {
      cycles: cycles.map(this.mapToEntity),
      total,
    };
  }

  private mapToEntity(cycle: any): ContributionCycle {
    return {
      cycleId: cycle.cycleId,
      cycleNumber: cycle.cycleNumber,
      deathClaimId: cycle.deathClaimId,
      claimNumber: cycle.claimNumber,
      deceasedMemberId: cycle.deceasedMemberId,
      deceasedMemberName: cycle.deceasedMemberName,
      benefitAmount: parseFloat(cycle.benefitAmount.toString()),
      forumId: cycle.forumId,
      startDate: cycle.startDate,
      collectionDeadline: cycle.collectionDeadline,
      cycleStatus: cycle.cycleStatus,
      totalMembers: cycle.totalMembers,
      totalExpectedAmount: parseFloat(cycle.totalExpectedAmount.toString()),
      totalCollectedAmount: parseFloat(cycle.totalCollectedAmount.toString()),
      totalPendingAmount: parseFloat(cycle.totalPendingAmount.toString()),
      membersCollected: cycle.membersCollected,
      membersPending: cycle.membersPending,
      membersMissed: cycle.membersMissed,
      closedDate: cycle.closedDate,
      closedBy: cycle.closedBy,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
    };
  }
}
