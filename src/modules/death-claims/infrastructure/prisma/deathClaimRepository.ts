/**
 * Prisma implementation of DeathClaimRepository
 */

import { DeathClaimRepository } from '../../domain/repositories';
import { DeathClaim } from '../../domain/entities';
import prisma from '@/shared/infrastructure/prisma/prismaClient';

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
