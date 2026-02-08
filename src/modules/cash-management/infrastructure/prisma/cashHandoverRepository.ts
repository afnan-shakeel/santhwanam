// Infrastructure: Prisma Cash Handover Repository Implementation

import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { Prisma } from '@/generated/prisma/client';
import { CashHandoverRepository } from '../../domain/repositories';
import {
  CashHandover,
  CashHandoverWithRelations,
  CashHandoverStatus,
  CashCustodyUserRole,
} from '../../domain/entities';

/**
 * Convert Prisma Decimal to number
 */
function toNumber(val: Prisma.Decimal | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  return val.toNumber();
}

/**
 * Map Prisma model to domain entity
 */
function mapToDomain(record: any): CashHandover {
  return {
    handoverId: record.handoverId,
    handoverNumber: record.handoverNumber,
    fromUserId: record.fromUserId,
    fromUserRole: record.fromUserRole as CashCustodyUserRole,
    fromCustodyId: record.fromCustodyId,
    fromGlAccountCode: record.fromGlAccountCode,
    toUserId: record.toUserId,
    toUserRole: record.toUserRole,
    toCustodyId: record.toCustodyId,
    toGlAccountCode: record.toGlAccountCode,
    amount: toNumber(record.amount),
    unitId: record.unitId,
    areaId: record.areaId,
    forumId: record.forumId,
    status: record.status as CashHandoverStatus,
    handoverType: record.handoverType,
    sourceHandoverId: record.sourceHandoverId,
    requiresApproval: record.requiresApproval,
    approvalRequestId: record.approvalRequestId,
    journalEntryId: record.journalEntryId,
    initiatedAt: record.initiatedAt,
    acknowledgedAt: record.acknowledgedAt,
    rejectedAt: record.rejectedAt,
    cancelledAt: record.cancelledAt,
    initiatorNotes: record.initiatorNotes,
    receiverNotes: record.receiverNotes,
    rejectionReason: record.rejectionReason,
    createdBy: record.createdBy,
    updatedAt: record.updatedAt,
  };
}

/**
 * Map with relations
 */
function mapWithRelations(record: any): CashHandoverWithRelations {
  const base = mapToDomain(record);
  return {
    ...base,
    fromUser: record.fromUser
      ? {
          userId: record.fromUser.userId,
          firstName: record.fromUser.firstName,
          lastName: record.fromUser.lastName,
          email: record.fromUser.email,
        }
      : undefined,
    toUser: record.toUser
      ? {
          userId: record.toUser.userId,
          firstName: record.toUser.firstName,
          lastName: record.toUser.lastName,
          email: record.toUser.email,
        }
      : undefined,
    fromCustody: record.fromCustody
      ? {
          custodyId: record.fromCustody.custodyId,
          userId: record.fromCustody.userId,
          userRole: record.fromCustody.userRole,
          glAccountCode: record.fromCustody.glAccountCode,
          unitId: record.fromCustody.unitId,
          areaId: record.fromCustody.areaId,
          forumId: record.fromCustody.forumId,
          status: record.fromCustody.status,
          currentBalance: toNumber(record.fromCustody.currentBalance),
          totalReceived: toNumber(record.fromCustody.totalReceived),
          totalTransferred: toNumber(record.fromCustody.totalTransferred),
          lastTransactionAt: record.fromCustody.lastTransactionAt,
          createdAt: record.fromCustody.createdAt,
          updatedAt: record.fromCustody.updatedAt,
          deactivatedAt: record.fromCustody.deactivatedAt,
          deactivatedBy: record.fromCustody.deactivatedBy,
          deactivatedReason: record.fromCustody.deactivatedReason,
        }
      : undefined,
    toCustody: record.toCustody
      ? {
          custodyId: record.toCustody.custodyId,
          userId: record.toCustody.userId,
          userRole: record.toCustody.userRole,
          glAccountCode: record.toCustody.glAccountCode,
          unitId: record.toCustody.unitId,
          areaId: record.toCustody.areaId,
          forumId: record.toCustody.forumId,
          status: record.toCustody.status,
          currentBalance: toNumber(record.toCustody.currentBalance),
          totalReceived: toNumber(record.toCustody.totalReceived),
          totalTransferred: toNumber(record.toCustody.totalTransferred),
          lastTransactionAt: record.toCustody.lastTransactionAt,
          createdAt: record.toCustody.createdAt,
          updatedAt: record.toCustody.updatedAt,
          deactivatedAt: record.toCustody.deactivatedAt,
          deactivatedBy: record.toCustody.deactivatedBy,
          deactivatedReason: record.toCustody.deactivatedReason,
        }
      : null,
    forum: record.forum
      ? {
          forumId: record.forum.forumId,
          forumCode: record.forum.forumCode,
          forumName: record.forum.forumName,
        }
      : undefined,
    approvalRequest: record.approvalRequest
      ? {
          requestId: record.approvalRequest.requestId,
          status: record.approvalRequest.status,
        }
      : null,
  };
}

export class PrismaCashHandoverRepository implements CashHandoverRepository {
  async create(
    data: Omit<CashHandover, 'handoverId' | 'updatedAt'>,
    tx?: any
  ): Promise<CashHandover> {
    const db = tx || prisma;
    const record = await db.cashHandover.create({
      data: {
        handoverNumber: data.handoverNumber,
        fromUserId: data.fromUserId,
        fromUserRole: data.fromUserRole,
        fromCustodyId: data.fromCustodyId,
        fromGlAccountCode: data.fromGlAccountCode,
        toUserId: data.toUserId,
        toUserRole: data.toUserRole,
        toCustodyId: data.toCustodyId,
        toGlAccountCode: data.toGlAccountCode,
        amount: data.amount,
        unitId: data.unitId,
        areaId: data.areaId,
        forumId: data.forumId,
        status: data.status,
        handoverType: data.handoverType,
        sourceHandoverId: data.sourceHandoverId,
        requiresApproval: data.requiresApproval,
        approvalRequestId: data.approvalRequestId,
        journalEntryId: data.journalEntryId,
        initiatedAt: data.initiatedAt,
        acknowledgedAt: data.acknowledgedAt,
        rejectedAt: data.rejectedAt,
        cancelledAt: data.cancelledAt,
        initiatorNotes: data.initiatorNotes,
        receiverNotes: data.receiverNotes,
        rejectionReason: data.rejectionReason,
        createdBy: data.createdBy,
      },
    });
    return mapToDomain(record);
  }

  async findById(handoverId: string, tx?: any): Promise<CashHandover | null> {
    const db = tx || prisma;
    const record = await db.cashHandover.findUnique({
      where: { handoverId },
    });
    return record ? mapToDomain(record) : null;
  }

  async findByIdWithRelations(
    handoverId: string,
    tx?: any
  ): Promise<CashHandoverWithRelations | null> {
    const db = tx || prisma;
    const record = await db.cashHandover.findUnique({
      where: { handoverId },
      include: {
        fromUser: true,
        toUser: true,
        fromCustody: true,
        toCustody: true,
        forum: true,
        approvalRequest: true,
      },
    });
    return record ? mapWithRelations(record) : null;
  }

  async findByHandoverNumber(
    handoverNumber: string,
    tx?: any
  ): Promise<CashHandover | null> {
    const db = tx || prisma;
    const record = await db.cashHandover.findUnique({
      where: { handoverNumber },
    });
    return record ? mapToDomain(record) : null;
  }

  async update(
    handoverId: string,
    data: Partial<Omit<CashHandover, 'handoverId' | 'handoverNumber' | 'updatedAt'>>,
    tx?: any
  ): Promise<CashHandover> {
    const db = tx || prisma;
    const record = await db.cashHandover.update({
      where: { handoverId },
      data,
    });
    return mapToDomain(record);
  }

  async findAll(filters: {
    fromUserId?: string;
    toUserId?: string;
    status?: CashHandoverStatus;
    forumId?: string;
    requiresApproval?: boolean;
    page: number;
    limit: number;
  }): Promise<{ handovers: CashHandoverWithRelations[]; total: number }> {
    const where: any = {};

    if (filters.fromUserId) where.fromUserId = filters.fromUserId;
    if (filters.toUserId) where.toUserId = filters.toUserId;
    if (filters.status) where.status = filters.status;
    if (filters.forumId) where.forumId = filters.forumId;
    if (filters.requiresApproval !== undefined) where.requiresApproval = filters.requiresApproval;

    const [records, total] = await Promise.all([
      prisma.cashHandover.findMany({
        where,
        include: {
          fromUser: true,
          toUser: true,
          fromCustody: true,
          toCustody: true,
          forum: true,
          approvalRequest: true,
        },
        orderBy: { initiatedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.cashHandover.count({ where }),
    ]);

    return {
      handovers: records.map(mapWithRelations),
      total,
    };
  }

  async findPendingIncomingForUser(userId: string, tx?: any): Promise<CashHandoverWithRelations[]> {
    const db = tx || prisma;
    const records = await db.cashHandover.findMany({
      where: {
        toUserId: userId,
        status: CashHandoverStatus.Initiated,
      },
      include: {
        fromUser: true,
        toUser: true,
        fromCustody: true,
        toCustody: true,
        forum: true,
        approvalRequest: true,
      },
      orderBy: { initiatedAt: 'asc' },
    });
    return records.map(mapWithRelations);
  }

  async findPendingOutgoingForUser(userId: string, tx?: any): Promise<CashHandoverWithRelations[]> {
    const db = tx || prisma;
    const records = await db.cashHandover.findMany({
      where: {
        fromUserId: userId,
        status: CashHandoverStatus.Initiated,
      },
      include: {
        fromUser: true,
        toUser: true,
        fromCustody: true,
        toCustody: true,
        forum: true,
        approvalRequest: true,
      },
      orderBy: { initiatedAt: 'asc' },
    });
    return records.map(mapWithRelations);
  }

  async findPendingForRole(role: string, tx?: any): Promise<CashHandoverWithRelations[]> {
    const db = tx || prisma;
    const records = await db.cashHandover.findMany({
      where: {
        toUserRole: role,
        status: CashHandoverStatus.Initiated,
      },
      include: {
        fromUser: true,
        toUser: true,
        fromCustody: true,
        toCustody: true,
        forum: true,
        approvalRequest: true,
      },
      orderBy: { initiatedAt: 'asc' },
    });
    return records.map(mapWithRelations);
  }

  async getNextHandoverNumber(tx?: any): Promise<string> {
    const db = tx || prisma;
    const year = new Date().getFullYear();
    const prefix = `CHO-${year}-`;

    // Find the latest handover number for this year
    const latest = await db.cashHandover.findFirst({
      where: {
        handoverNumber: { startsWith: prefix },
      },
      orderBy: { handoverNumber: 'desc' },
    });

    let nextSeq = 1;
    if (latest) {
      const currentSeq = parseInt(latest.handoverNumber.replace(prefix, ''), 10);
      nextSeq = currentSeq + 1;
    }

    return `${prefix}${nextSeq.toString().padStart(5, '0')}`;
  }

  async sumPendingOutgoingAmount(userId: string, tx?: any): Promise<number> {
    const db = tx || prisma;
    const result = await db.cashHandover.aggregate({
      where: {
        fromUserId: userId,
        status: CashHandoverStatus.Initiated,
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount || 0;
  }

  async countPendingIncoming(userId: string, tx?: any): Promise<number> {
    const db = tx || prisma;
    return db.cashHandover.count({
      where: {
        toUserId: userId,
        status: CashHandoverStatus.Initiated,
      },
    });
  }

  async findUserHistory(
    userId: string,
    filters: {
      direction?: 'sent' | 'received' | 'all';
      status?: CashHandoverStatus;
      fromDate?: Date;
      toDate?: Date;
      page: number;
      limit: number;
    }
  ): Promise<{ handovers: CashHandoverWithRelations[]; total: number }> {
    const where: any = {};

    // Direction filter
    if (filters.direction === 'sent') {
      where.fromUserId = userId;
    } else if (filters.direction === 'received') {
      where.toUserId = userId;
    } else {
      where.OR = [{ fromUserId: userId }, { toUserId: userId }];
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Date range filter
    if (filters.fromDate || filters.toDate) {
      where.initiatedAt = {};
      if (filters.fromDate) where.initiatedAt.gte = filters.fromDate;
      if (filters.toDate) where.initiatedAt.lte = filters.toDate;
    }

    const [records, total] = await Promise.all([
      prisma.cashHandover.findMany({
        where,
        include: {
          fromUser: true,
          toUser: true,
          fromCustody: true,
          toCustody: true,
          forum: true,
          approvalRequest: true,
        },
        orderBy: { initiatedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.cashHandover.count({ where }),
    ]);

    return {
      handovers: records.map(mapWithRelations),
      total,
    };
  }

  async findAllPending(filters: {
    forumId?: string;
    areaId?: string;
    fromRole?: string;
    toRole?: string;
    minAgeHours?: number;
    page: number;
    limit: number;
  }): Promise<{ handovers: CashHandoverWithRelations[]; total: number }> {
    const where: any = {
      status: CashHandoverStatus.Initiated,
    };

    if (filters.forumId) where.forumId = filters.forumId;
    if (filters.areaId) where.areaId = filters.areaId;
    if (filters.fromRole) where.fromUserRole = filters.fromRole;
    if (filters.toRole) where.toUserRole = filters.toRole;

    if (filters.minAgeHours) {
      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() - filters.minAgeHours);
      where.initiatedAt = { lt: thresholdDate };
    }

    const [records, total] = await Promise.all([
      prisma.cashHandover.findMany({
        where,
        include: {
          fromUser: true,
          toUser: true,
          fromCustody: true,
          toCustody: true,
          forum: true,
          approvalRequest: true,
        },
        orderBy: { initiatedAt: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.cashHandover.count({ where }),
    ]);

    return {
      handovers: records.map(mapWithRelations),
      total,
    };
  }

  async countPendingRequiringApproval(forumId?: string, tx?: any): Promise<number> {
    const db = tx || prisma;
    const where: any = {
      status: CashHandoverStatus.Initiated,
      requiresApproval: true,
    };
    if (forumId) where.forumId = forumId;

    return db.cashHandover.count({ where });
  }
}
