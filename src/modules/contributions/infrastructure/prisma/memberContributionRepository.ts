// Infrastructure: Member Contribution Prisma Repository

import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { MemberContributionRepository } from '../../domain/repositories';
import {
  MemberContribution,
  MemberContributionStatus,
  MemberContributionWithRelations,
} from '../../domain/entities';
import { Prisma } from "../../../../generated/prisma/client";

export class PrismaMemberContributionRepository implements MemberContributionRepository {
  async create(
    data: Omit<MemberContribution, 'createdAt' | 'updatedAt'>,
    tx?: any
  ): Promise<MemberContribution> {
    const db = tx || prisma;

    const contribution = await db.memberContribution.create({
      data: {
        contributionId: data.contributionId,
        cycleId: data.cycleId,
        memberId: data.memberId,
        memberCode: data.memberCode,
        memberName: data.memberName,
        tierId: data.tierId,
        agentId: data.agentId,
        expectedAmount: data.expectedAmount,
        contributionStatus: data.contributionStatus,
        paymentMethod: data.paymentMethod,
        collectionDate: data.collectionDate,
        collectedBy: data.collectedBy,
        walletDebitRequestId: data.walletDebitRequestId,
        debitAcknowledgedAt: data.debitAcknowledgedAt,
        cashReceiptReference: data.cashReceiptReference,
        journalEntryId: data.journalEntryId,
        isConsecutiveMiss: data.isConsecutiveMiss,
      },
    });

    return this.mapToEntity(contribution);
  }

  async createMany(
    data: Omit<MemberContribution, 'createdAt' | 'updatedAt'>[],
    tx?: any
  ): Promise<void> {
    const db = tx || prisma;

    return await db.memberContribution.createMany({
      data: data.map((item) => ({
        contributionId: item.contributionId,
        cycleId: item.cycleId,
        memberId: item.memberId,
        memberCode: item.memberCode,
        memberName: item.memberName,
        tierId: item.tierId,
        agentId: item.agentId,
        expectedAmount: item.expectedAmount,
        contributionStatus: item.contributionStatus,
        isConsecutiveMiss: item.isConsecutiveMiss,
      })),
    });
  }

  async findById(
    contributionId: string,
    tx?: any
  ): Promise<MemberContribution | null> {
    const db = tx || prisma;

    const contribution = await db.memberContribution.findUnique({
      where: { contributionId },
    });

    return contribution ? this.mapToEntity(contribution) : null;
  }

  async findByIdWithRelations(
    contributionId: string,
    tx?: any
  ): Promise<MemberContributionWithRelations | null> {
    const db = tx || prisma;

    const contribution = await db.memberContribution.findUnique({
      where: { contributionId },
      include: {
        cycle: true,
        member: {
          select: {
            memberId: true,
            memberCode: true,
            firstName: true,
            lastName: true,
            agentId: true,
          },
        },
        agent: {
          select: {
            agentId: true,
            agentCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!contribution) return null;

    return {
      ...this.mapToEntity(contribution),
      cycle: contribution.cycle ? {
        cycleId: contribution.cycle.cycleId,
        cycleNumber: contribution.cycle.cycleNumber,
        deathClaimId: contribution.cycle.deathClaimId,
        claimNumber: contribution.cycle.claimNumber,
        deceasedMemberId: contribution.cycle.deceasedMemberId,
        deceasedMemberName: contribution.cycle.deceasedMemberName,
        benefitAmount: parseFloat(contribution.cycle.benefitAmount.toString()),
        forumId: contribution.cycle.forumId,
        startDate: contribution.cycle.startDate,
        collectionDeadline: contribution.cycle.collectionDeadline,
        cycleStatus: contribution.cycle.cycleStatus,
        totalMembers: contribution.cycle.totalMembers,
        totalExpectedAmount: parseFloat(contribution.cycle.totalExpectedAmount.toString()),
        totalCollectedAmount: parseFloat(contribution.cycle.totalCollectedAmount.toString()),
        totalPendingAmount: parseFloat(contribution.cycle.totalPendingAmount.toString()),
        membersCollected: contribution.cycle.membersCollected,
        membersPending: contribution.cycle.membersPending,
        membersMissed: contribution.cycle.membersMissed,
        closedDate: contribution.cycle.closedDate,
        closedBy: contribution.cycle.closedBy,
        createdAt: contribution.cycle.createdAt,
        updatedAt: contribution.cycle.updatedAt,
      } : undefined,
      member: contribution.member,
      agent: contribution.agent,
    };
  }

  async update(
    contributionId: string,
    data: Partial<Omit<MemberContribution, 'contributionId' | 'createdAt'>>,
    tx?: any
  ): Promise<MemberContribution> {
    const db = tx || prisma;

    const updateData: any = {};
    if (data.contributionStatus) updateData.contributionStatus = data.contributionStatus;
    if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod;
    if (data.collectionDate !== undefined) updateData.collectionDate = data.collectionDate;
    if (data.collectedBy !== undefined) updateData.collectedBy = data.collectedBy;
    if (data.walletDebitRequestId !== undefined)
      updateData.walletDebitRequestId = data.walletDebitRequestId;
    if (data.debitAcknowledgedAt !== undefined)
      updateData.debitAcknowledgedAt = data.debitAcknowledgedAt;
    if (data.cashReceiptReference !== undefined)
      updateData.cashReceiptReference = data.cashReceiptReference;
    if (data.journalEntryId !== undefined)
      updateData.journalEntryId = data.journalEntryId;
    if (data.isConsecutiveMiss !== undefined)
      updateData.isConsecutiveMiss = data.isConsecutiveMiss;

    updateData.updatedAt = new Date();

    const contribution = await db.memberContribution.update({
      where: { contributionId },
      data: updateData,
    });

    return this.mapToEntity(contribution);
  }

  async updateMany(
    where: {
      cycleId?: string;
      contributionStatus?: MemberContributionStatus[];
    },
    data: Partial<Omit<MemberContribution, 'contributionId' | 'createdAt'>>,
    tx?: any
  ): Promise<number> {
    const db = tx || prisma;

    const whereClause: Prisma.MemberContributionWhereInput = {};
    if (where.cycleId) whereClause.cycleId = where.cycleId;
    if (where.contributionStatus) {
      whereClause.contributionStatus = { in: where.contributionStatus };
    }

    const updateData: any = {};
    if (data.isConsecutiveMiss !== undefined)
      updateData.isConsecutiveMiss = data.isConsecutiveMiss;
    updateData.updatedAt = new Date();

    const result = await db.memberContribution.updateMany({
      where: whereClause,
      data: updateData,
    });

    return result.count;
  }

  async findByCycleId(
    cycleId: string,
    filters?: {
      status?: MemberContributionStatus;
      agentId?: string;
      searchTerm?: string;
      page: number;
      limit: number;
    },
    tx?: any
  ): Promise<{ contributions: MemberContributionWithRelations[]; total: number }> {
    const db = tx || prisma
    const where: Prisma.MemberContributionWhereInput = { cycleId };

    if (filters?.status) {
      where.contributionStatus = filters.status;
    }

    if (filters?.agentId) {
      where.agentId = filters.agentId;
    }

    if (filters?.searchTerm) {
      where.OR = [
        { memberName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { memberCode: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;

    const contributions = await db.memberContribution.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { memberCode: 'asc' },
      include: {
        cycle: true,
        member: {
          select: {
            memberId: true,
            memberCode: true,
            firstName: true,
            lastName: true,
            agentId: true,
          },
        },
        agent: {
          select: {
            agentId: true,
            agentCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })
    const total = await db.memberContribution.count({ where })
    return {
      contributions: contributions.map((c: any) => this.mapToEntityWithRelations(c)),
      total,
    };
  }

  async findByMemberId(
    memberId: string,
    filters: {
      status?: MemberContributionStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ contributions: MemberContributionWithRelations[]; total: number }> {
    const where: Prisma.MemberContributionWhereInput = { memberId };

    if (filters.status) {
      where.contributionStatus = filters.status;
    }

    const [contributions, total] = await Promise.all([
      prisma.memberContribution.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cycle: true,
          member: true,
          agent: true
        },
      }),
      prisma.memberContribution.count({ where }),
    ]);

    return {
      contributions: contributions.map((c: any) => ({
        ...this.mapToEntity(c),
        cycle: c.cycle ? {
          cycleId: c.cycle.cycleId,
          cycleNumber: c.cycle.cycleNumber,
          deathClaimId: c.cycle.deathClaimId,
          claimNumber: c.cycle.claimNumber,
          deceasedMemberId: c.cycle.deceasedMemberId,
          deceasedMemberName: c.cycle.deceasedMemberName,
          benefitAmount: parseFloat(c.cycle.benefitAmount.toString()),
          forumId: c.cycle.forumId,
          startDate: c.cycle.startDate,
          collectionDeadline: c.cycle.collectionDeadline,
          cycleStatus: c.cycle.cycleStatus,
          totalMembers: c.cycle.totalMembers,
          totalExpectedAmount: parseFloat(c.cycle.totalExpectedAmount.toString()),
          totalCollectedAmount: parseFloat(c.cycle.totalCollectedAmount.toString()),
          totalPendingAmount: parseFloat(c.cycle.totalPendingAmount.toString()),
          membersCollected: c.cycle.membersCollected,
          membersPending: c.cycle.membersPending,
          membersMissed: c.cycle.membersMissed,
          closedDate: c.cycle.closedDate,
          closedBy: c.cycle.closedBy,
          createdAt: c.cycle.createdAt,
          updatedAt: c.cycle.updatedAt,
        } : undefined,
        member: c.member,
        agent: c.agent,
      })),
      total,
    };
  }

  async findByAgentId(
    agentId: string,
    filters: {
      cycleId?: string;
      status?: MemberContributionStatus;
      search?: string;
      page: number;
      limit: number;
    }
  ): Promise<{ contributions: MemberContributionWithRelations[]; total: number }> {
    const where: Prisma.MemberContributionWhereInput = { agentId };

    if (filters.cycleId) {
      where.cycleId = filters.cycleId;
    }

    if (filters.status) {
      where.contributionStatus = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { memberName: { contains: filters.search, mode: 'insensitive' } },
        { memberCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [contributions, total] = await Promise.all([
      prisma.memberContribution.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cycle: true,
          member: {
            select: {
              memberId: true,
              memberCode: true,
              firstName: true,
              lastName: true,
              agentId: true,
              wallet: {
                select: {
                  currentBalance: true,
                },
              },
            },
          },
          agent: {
            select: {
              agentId: true,
              agentCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.memberContribution.count({ where }),
    ]);
    return {
      contributions: contributions.map((c: any) => ({
        ...this.mapToEntity(c),
        cycle: {
          ...c.cycle,
          benefitAmount: parseFloat(c.cycle.benefitAmount.toString()),
          totalExpectedAmount: parseFloat(c.cycle.totalExpectedAmount.toString()),
          totalCollectedAmount: parseFloat(c.cycle.totalCollectedAmount.toString()),
          totalPendingAmount: parseFloat(c.cycle.totalPendingAmount.toString()),
        },
        member: c.member
          ? {
              ...c.member,
              wallet: c.member.wallet
                ? { currentBalance: Number(c.member.wallet.currentBalance) }
                : null,
            }
          : undefined,
        agent: c.agent,
      })),
      total,
    };
  }

  async getAgentContributionSummary(
    agentId: string
  ): Promise<{
    totalPending: number;
    totalPendingAmount: number;
    activeCycles: Array<{
      cycleId: string;
      cycleNumber: string;
      collectionDeadline: Date;
    }>;
  }> {
    const [totalPending, pendingAgg, activeCycles] = await Promise.all([
      prisma.memberContribution.count({
        where: { agentId, contributionStatus: MemberContributionStatus.Pending },
      }),
      prisma.memberContribution.aggregate({
        where: { agentId, contributionStatus: MemberContributionStatus.Pending },
        _sum: { expectedAmount: true },
      }),
      prisma.contributionCycle.findMany({
        where: {
          cycleStatus: 'Active',
          contributions: { some: { agentId } },
        },
        select: {
          cycleId: true,
          cycleNumber: true,
          collectionDeadline: true,
        },
        orderBy: { collectionDeadline: 'asc' },
      }),
    ]);

    return {
      totalPending,
      totalPendingAmount: Number(pendingAgg._sum.expectedAmount ?? 0),
      activeCycles,
    };
  }

  async findPreviousMissedContribution(
    memberId: string,
    excludeCycleId: string,
    tx?: any
  ): Promise<MemberContribution | null> {
    const db = tx || prisma;

    const contribution = await db.memberContribution.findFirst({
      where: {
        memberId,
        contributionStatus: MemberContributionStatus.Missed,
        cycleId: { not: excludeCycleId },
      },
      orderBy: { createdAt: 'desc' },
    });

    return contribution ? this.mapToEntity(contribution) : null;
  }

  async findPendingByCycleId(cycleId: string, tx?: any): Promise<MemberContribution[]> {
    const db = tx || prisma;

    const contributions = await db.memberContribution.findMany({
      where: {
        cycleId,
        contributionStatus: {
          in: [
            MemberContributionStatus.Pending,
            MemberContributionStatus.WalletDebitRequested,
          ],
        },
      },
    });

    return contributions.map(this.mapToEntity);
  }

  async calculateCycleStatistics(
    cycleId: string,
    tx?: any
  ): Promise<{
    totalCollected: number;
    totalPending: number;
    totalMissed: number;
    collectedAmount: number;
  }> {
    const db = tx || prisma;

    const [collected, pending, missed, amounts] = await Promise.all([
      db.memberContribution.count({
        where: {
          cycleId,
          contributionStatus: MemberContributionStatus.Collected,
        },
      }),
      db.memberContribution.count({
        where: {
          cycleId,
          contributionStatus: {
            in: [
              MemberContributionStatus.Pending,
              MemberContributionStatus.WalletDebitRequested,
            ],
          },
        },
      }),
      db.memberContribution.count({
        where: {
          cycleId,
          contributionStatus: MemberContributionStatus.Missed,
        },
      }),
      db.memberContribution.aggregate({
        where: {
          cycleId,
          contributionStatus: MemberContributionStatus.Collected,
        },
        _sum: {
          expectedAmount: true,
        },
      }),
    ]);

    return {
      totalCollected: collected,
      totalPending: pending,
      totalMissed: missed,
      collectedAmount: parseFloat(amounts._sum.expectedAmount?.toString() || '0'),
    };
  }

  private mapToEntity(contribution: any): MemberContribution {
    return {
      contributionId: contribution.contributionId,
      cycleId: contribution.cycleId,
      memberId: contribution.memberId,
      memberCode: contribution.memberCode,
      memberName: contribution.memberName,
      tierId: contribution.tierId,
      agentId: contribution.agentId,
      expectedAmount: parseFloat(contribution.expectedAmount.toString()),
      contributionStatus: contribution.contributionStatus,
      paymentMethod: contribution.paymentMethod,
      collectionDate: contribution.collectionDate,
      collectedBy: contribution.collectedBy,
      walletDebitRequestId: contribution.walletDebitRequestId,
      debitAcknowledgedAt: contribution.debitAcknowledgedAt,
      cashReceiptReference: contribution.cashReceiptReference,
      journalEntryId: contribution.journalEntryId,
      isConsecutiveMiss: contribution.isConsecutiveMiss,
      createdAt: contribution.createdAt,
      updatedAt: contribution.updatedAt,
    };
  }

  private mapToEntityWithRelations(contribution: any): MemberContributionWithRelations {
    return {
      ...this.mapToEntity(contribution),
      cycle: contribution.cycle ? {
        cycleId: contribution.cycle.cycleId,
        cycleNumber: contribution.cycle.cycleNumber,
        deathClaimId: contribution.cycle.deathClaimId,
        claimNumber: contribution.cycle.claimNumber,
        deceasedMemberId: contribution.cycle.deceasedMemberId,
        deceasedMemberName: contribution.cycle.deceasedMemberName,
        benefitAmount: parseFloat(contribution.cycle.benefitAmount.toString()),
        forumId: contribution.cycle.forumId,
        startDate: contribution.cycle.startDate,
        collectionDeadline: contribution.cycle.collectionDeadline,
        cycleStatus: contribution.cycle.cycleStatus,
        totalMembers: contribution.cycle.totalMembers,
        totalExpectedAmount: parseFloat(contribution.cycle.totalExpectedAmount.toString()),
        totalCollectedAmount: parseFloat(contribution.cycle.totalCollectedAmount.toString()),
        totalPendingAmount: parseFloat(contribution.cycle.totalPendingAmount.toString()),
        membersCollected: contribution.cycle.membersCollected,
        membersPending: contribution.cycle.membersPending,
        membersMissed: contribution.cycle.membersMissed,
        closedDate: contribution.cycle.closedDate,
        closedBy: contribution.cycle.closedBy,
        createdAt: contribution.cycle.createdAt,
        updatedAt: contribution.cycle.updatedAt,
      } : undefined,
      member: contribution.member,
      agent: contribution.agent,
    };
  }
}
