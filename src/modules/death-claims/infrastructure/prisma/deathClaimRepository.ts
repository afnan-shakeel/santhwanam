/**
 * Prisma implementation of DeathClaimRepository
 */

import { DeathClaimRepository } from '../../domain/repositories';
import { DeathClaim } from '../../domain/entities';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { report } from 'process';

export class PrismaDeathClaimRepository implements DeathClaimRepository {
  async create(data: Omit<DeathClaim, 'createdAt' | 'updatedAt'>, tx?: any): Promise<DeathClaim> {
    const db = tx || prisma;

    const claim = await db.deathClaim.create({
      data: {
        claimId: data.claimId,
        claimNumber: data.claimNumber,
        claimStatus: data.claimStatus,
        approvalRequestId: data.approvalRequestId,
        memberId: data.memberId,
        memberCode: data.memberCode,
        memberName: data.memberName,
        tierId: data.tierId,
        agentId: data.agentId,
        unitId: data.unitId,
        areaId: data.areaId,
        forumId: data.forumId,
        deathDate: data.deathDate,
        deathPlace: data.deathPlace,
        causeOfDeath: data.causeOfDeath,
        reportedBy: data.reportedBy,
        reportedByRole: data.reportedByRole,
        reportedDate: data.reportedDate,
        initialNotes: data.initialNotes,
        nomineeId: data.nomineeId,
        nomineeName: data.nomineeName,
        nomineeRelation: data.nomineeRelation,
        nomineeContactNumber: data.nomineeContactNumber,
        nomineeAddress: data.nomineeAddress as any,
        benefitAmount: data.benefitAmount,
        verificationStatus: data.verificationStatus,
        verifiedBy: data.verifiedBy,
        verifiedDate: data.verifiedDate,
        verificationNotes: data.verificationNotes,
        settlementStatus: data.settlementStatus,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        paymentDate: data.paymentDate,
        paidBy: data.paidBy,
        nomineeAcknowledgment: data.nomineeAcknowledgment,
        journalEntryId: data.journalEntryId,
        approvedAt: data.approvedAt,
        settledAt: data.settledAt,
        approvedBy: data.approvedBy,
        rejectedBy: data.rejectedBy,
        rejectionReason: data.rejectionReason,
      },
    });

    return this.mapToDomain(claim);
  }

  async findById(claimId: string, tx?: any): Promise<DeathClaim | null> {
    const db = tx || prisma;

    const claim = await db.deathClaim.findUnique({
      where: { claimId },
    });

    return claim ? this.mapToDomain(claim) : null;
  }

  async findByIdWithDetails(claimId: string, tx?: any): Promise<DeathClaim | null> {
    const db = tx || prisma;

    const claim = await db.deathClaim.findUnique({
      where: { claimId },
      include: {
        member: {
          include: {
            tier: true,
            agent: true,
            unit: {
              include: {
                area: {
                  include: {
                    forum: true,
                  },
                },
              },
            },
            nominees: true,
            wallet: true,
          },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        contributionCycles: {
          include: {
            contributions: {
              where: { contributionStatus: { in: ['Collected', 'Pending', 'Missed'] } },
              select: {
                contributionStatus: true,
                expectedAmount: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        approvalRequest: {
          select:{
            requestId: true,
            workflowId: true,
            entityType: true,
            entityId: true,
            status: true,
            currentStageOrder: true,
            requestedAt: true,
          }
        },
        reportedByUser: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        verifiedByUser: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        }  
      },
    });

    if (!claim) return null;

    // Get member's contribution stats
    const contributionStats = await db.memberContribution.aggregate({
      where: { memberId: claim.memberId },
      _count: { contributionId: true },
      _sum: { expectedAmount: true },
    });

    // Get member's wallet balance
    const memberWallet = await db.wallet.findUnique({
      where: { memberId: claim.memberId },
      select: { currentBalance: true },
    });

    return {
      ...this.mapToDomain(claim),
      member: {
        memberId: claim.member.memberId,
        memberCode: claim.member.memberCode,
        firstName: claim.member.firstName,
        lastName: claim.member.lastName,
        // fullName: `${claim.member.firstName} ${claim.member.lastName}`,
        dateOfBirth: claim.member.dateOfBirth,
        tier: {
          tierId: claim.member.tier.tierId,
          tierName: claim.member.tier.tierName,
          deathBenefitAmount: Number(claim.member.tier.deathBenefitAmount),
          contributionAmount: Number(claim.member.tier.contributionAmount),
        },
        agent: {
          agentId: claim.member.agent.agentId,
          agentCode: claim.member.agent.agentCode,
          firstName: claim.member.agent.firstName,
          lastName: claim.member.agent.lastName,
        },
        unit: {
          unitId: claim.member.unit.unitId,
          unitName: claim.member.unit.unitName,
          area: {
            areaId: claim.member.unit.area.areaId,
            areaName: claim.member.unit.area.areaName,
            forum: {
              forumId: claim.member.unit.area.forum.forumId,
              forumName: claim.member.unit.area.forum.forumName,
            },
          },
        },
        createdAt: claim.member.createdAt,
        contributionsPaid: contributionStats._count.contributionId || 0,
        totalContributed: Number(contributionStats._sum.expectedAmount || 0),
        membershipDuration: this.calculateDuration(claim.member.createdAt, claim.deathDate),
        wallet: { currentBalance: Number(memberWallet?.currentBalance || 0) },

        nominees: claim.member.nominees.map((nominee: any) => ({
          nomineeId: nominee.nomineeId,
          name: nominee.name,
          relationType: nominee.relationType,
          contactNumber: nominee.contactNumber,
          idProofNumber: nominee.idProofNumber,
          dateOfBirth: nominee.dateOfBirth,
          addressLine1: nominee.addressLine1,
          addressLine2: nominee.addressLine2,
          city: nominee.city,
          postalCode: nominee.postalCode,
          state: nominee.state,
          country: nominee.country,
          priority: nominee.priority,
        })),
      },
      documents: claim.documents.map((doc: any) => ({
          documentId: doc.documentId,
          claimId: doc.claimId,
          documentType: doc.documentType,
          documentName: doc.documentName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          fileUrl: doc.fileUrl,
          uploadedAt: doc.uploadedAt,
          uploadedBy: doc.uploadedBy,
          verificationStatus: doc.verificationStatus,
          verifiedBy: doc.verifiedBy,
          verifiedAt: doc.verifiedAt,
          rejectionReason: doc.rejectionReason,
        })),
      contributionCycle: claim.contributionCycles[0] ? {
        cycleId: claim.contributionCycles[0].cycleId,
        cycleNumber: claim.contributionCycles[0].cycleNumber,
        cycleStatus: claim.contributionCycles[0].cycleStatus,
        benefitAmount: Number(claim.contributionCycles[0].benefitAmount),
        totalExpectedAmount: claim.contributionCycles[0].totalExpectedAmount,
        totalMembers: claim.contributionCycles[0].totalMembers,
        totalCollectedAmount: Number(claim.contributionCycles[0].totalCollectedAmount),
        collectionPercentage: claim.contributionCycles[0].totalMembers > 0
          ? Math.round((claim.contributionCycles[0].membersCollected / claim.contributionCycles[0].totalMembers) * 100)
          : 0,
        membersCollected: claim.contributionCycles[0].membersCollected,
        membersPending: claim.contributionCycles[0].membersPending,
        membersMissed: claim.contributionCycles[0].membersMissed,
        startDate: claim.contributionCycles[0].startDate,
        collectionDeadline: claim.contributionCycles[0].collectionDeadline,
        daysRemaining: this.calculateDaysRemaining(claim.contributionCycles[0].collectionDeadline),
      } : undefined,
      reportedByUser: {
        userId: claim.reportedByUser?.userId,
        firstName: claim.reportedByUser?.firstName,
        lastName: claim.reportedByUser?.lastName,
        email: claim.reportedByUser?.email,
      },
      approvalRequest: {
        requestId: claim.approvalRequest?.requestId,
        workflowId: claim.approvalRequest?.workflowId,
        entityType: claim.approvalRequest?.entityType,
        entityId: claim.approvalRequest?.entityId,
        status: claim.approvalRequest?.status,
        currentStageOrder: claim.approvalRequest?.currentStageOrder,
        requestedAt: claim.approvalRequest?.requestedAt,

      },
      verifiedByUser: {
        userId: claim.verifiedByUser?.userId,
        firstName: claim.verifiedByUser?.firstName,
        lastName: claim.verifiedByUser?.lastName,
        email: claim.verifiedByUser?.email,
      }
    };
  }

  private calculateDuration(startDate: Date, endDate: Date): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    return `${months} months, ${days} days`;
  }

  private calculateDaysRemaining(gracePeriodEnds: Date): number {
    const now = new Date();
    const diffMs = new Date(gracePeriodEnds).getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  async findByClaimNumber(claimNumber: string, tx?: any): Promise<DeathClaim | null> {
    const db = tx || prisma;

    const claim = await db.deathClaim.findUnique({
      where: { claimNumber },
    });

    return claim ? this.mapToDomain(claim) : null;
  }

  async findByMemberId(memberId: string, tx?: any): Promise<DeathClaim | null> {
    const db = tx || prisma;

    const claim = await db.deathClaim.findFirst({
      where: { memberId },
    });

    return claim ? this.mapToDomain(claim) : null;
  }

  async update(claimId: string, data: Partial<DeathClaim>, tx?: any): Promise<DeathClaim> {
    const db = tx || prisma;

    const updateData: any = { ...data };

    // Convert nomineeAddress to any if present
    if (data.nomineeAddress) {
      updateData.nomineeAddress = data.nomineeAddress as any;
    }

    const claim = await db.deathClaim.update({
      where: { claimId },
      data: updateData,
    });

    return this.mapToDomain(claim);
  }

  async getLastClaimNumberByYear(year: number, tx?: any): Promise<string | null> {
    const db = tx || prisma;

    const claim = await db.deathClaim.findFirst({
      where: {
        claimNumber: {
          startsWith: `DC-${year}-`,
        },
      },
      orderBy: {
        claimNumber: 'desc',
      },
    });

    return claim?.claimNumber || null;
  }

  async list(
    filters: {
      claimStatus?: string;
      forumId?: string;
      areaId?: string;
      unitId?: string;
      agentId?: string;
      skip?: number;
      take?: number;
    },
    tx?: any
  ): Promise<{ claims: DeathClaim[]; total: number }> {
    const db = tx || prisma;

    const where: any = {};

    if (filters.claimStatus) {
      where.claimStatus = filters.claimStatus;
    }
    if (filters.forumId) {
      where.forumId = filters.forumId;
    }
    if (filters.areaId) {
      where.areaId = filters.areaId;
    }
    if (filters.unitId) {
      where.unitId = filters.unitId;
    }
    if (filters.agentId) {
      where.agentId = filters.agentId;
    }

    const [claims, total] = await Promise.all([
      db.deathClaim.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: filters.skip || 0,
        take: filters.take || 20,
      }),
      db.deathClaim.count({ where }),
    ]);

    return {
      claims: claims.map((c: any) => this.mapToDomain(c)),
      total,
    };
  }

  async getDashboardStats(tx?: any): Promise<{
    pendingVerification: number;
    underContribution: number;
    approvedForPayout: number;
    totalThisYear: number;
    totalBenefitsPaidYTD: number;
    pendingCollections: number;
    successRate: number;
  }> {
    const db = tx || prisma;
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);

    // Count claims by status
    const [
      pendingVerification,
      underContribution,
      approvedForPayout,
      totalThisYear,
      totalAllTime,
      approvedAllTime,
      settledClaims,
    ] = await Promise.all([
      db.deathClaim.count({
        where: { claimStatus: 'UnderVerification' },
      }),
      db.deathClaim.count({
        where: { claimStatus: 'Approved' },
      }),
      db.deathClaim.count({
        where: { 
          claimStatus: 'Approved',
          settlementStatus: 'Pending',
        },
      }),
      db.deathClaim.count({
        where: {
          createdAt: { gte: yearStart },
        },
      }),
      db.deathClaim.count(),
      db.deathClaim.count({
        where: { claimStatus: 'Approved' },
      }),
      db.deathClaim.findMany({
        where: {
          settlementStatus: 'Completed',
          settledAt: { gte: yearStart },
        },
        select: {
          benefitAmount: true,
        },
      }),
    ]);

    // Calculate total benefits paid YTD
    const totalBenefitsPaidYTD = settledClaims.reduce(
      (sum: any, claim: any) => sum + (claim.benefitAmount ? Number(claim.benefitAmount) : 0),
      0
    );

    // Get pending collections from contribution cycles
    const contributionCycles = await db.contributionCycle.findMany({
      where: {
        cycleStatus: 'Active',
      },
      select: {
        benefitAmount: true,
        totalMembers: true,
        membersCollected: true,
      },
    });

    const pendingCollections = contributionCycles.reduce(
      (sum: any, cycle: any) => {
        const pendingMembers = cycle.totalMembers - cycle.collectedCount;
        return sum + pendingMembers * Number(cycle.benefitAmount);
      },
      0
    );

    // Calculate success rate (Approved claims / Total claims)
    const successRate = totalAllTime > 0 
      ? Math.round((approvedAllTime / totalAllTime) * 100) 
      : 0;

    return {
      pendingVerification,
      underContribution,
      approvedForPayout,
      totalThisYear,
      totalBenefitsPaidYTD,
      pendingCollections,
      successRate,
    };
  }

  private mapToDomain(prismaData: any): DeathClaim {
    return {
      claimId: prismaData.claimId,
      claimNumber: prismaData.claimNumber,
      claimStatus: prismaData.claimStatus,
      approvalRequestId: prismaData.approvalRequestId,
      memberId: prismaData.memberId,
      memberCode: prismaData.memberCode,
      memberName: prismaData.memberName,
      tierId: prismaData.tierId,
      agentId: prismaData.agentId,
      unitId: prismaData.unitId,
      areaId: prismaData.areaId,
      forumId: prismaData.forumId,
      deathDate: prismaData.deathDate,
      deathPlace: prismaData.deathPlace,
      causeOfDeath: prismaData.causeOfDeath,
      reportedBy: prismaData.reportedBy,
      reportedByRole: prismaData.reportedByRole,
      reportedDate: prismaData.reportedDate,
      initialNotes: prismaData.initialNotes,
      nomineeId: prismaData.nomineeId,
      nomineeName: prismaData.nomineeName,
      nomineeRelation: prismaData.nomineeRelation,
      nomineeContactNumber: prismaData.nomineeContactNumber,
      nomineeAddress: prismaData.nomineeAddress as Record<string, unknown>,
      benefitAmount: prismaData.benefitAmount ? Number(prismaData.benefitAmount) : null,
      verificationStatus: prismaData.verificationStatus,
      verifiedBy: prismaData.verifiedBy,
      verifiedDate: prismaData.verifiedDate,
      verificationNotes: prismaData.verificationNotes,
      settlementStatus: prismaData.settlementStatus,
      paymentMethod: prismaData.paymentMethod,
      paymentReference: prismaData.paymentReference,
      paymentDate: prismaData.paymentDate,
      paidBy: prismaData.paidBy,
      nomineeAcknowledgment: prismaData.nomineeAcknowledgment,
      journalEntryId: prismaData.journalEntryId,
      createdAt: prismaData.createdAt,
      approvedAt: prismaData.approvedAt,
      settledAt: prismaData.settledAt,
      updatedAt: prismaData.updatedAt,
      approvedBy: prismaData.approvedBy,
      rejectedBy: prismaData.rejectedBy,
      rejectionReason: prismaData.rejectionReason,
    };
  }
}
