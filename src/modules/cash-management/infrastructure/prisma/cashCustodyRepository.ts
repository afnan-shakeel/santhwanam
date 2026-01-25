// Infrastructure: Prisma Cash Custody Repository Implementation

import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { Prisma } from '@/generated/prisma/client';
import { CashCustodyRepository } from '../../domain/repositories';
import {
  CashCustody,
  CashCustodyWithRelations,
  CashCustodyUserRole,
  CashCustodyStatus,
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
function mapToDomain(record: any): CashCustody {
  return {
    custodyId: record.custodyId,
    userId: record.userId,
    userRole: record.userRole as CashCustodyUserRole,
    glAccountCode: record.glAccountCode,
    unitId: record.unitId,
    areaId: record.areaId,
    forumId: record.forumId,
    status: record.status as CashCustodyStatus,
    currentBalance: toNumber(record.currentBalance),
    totalReceived: toNumber(record.totalReceived),
    totalTransferred: toNumber(record.totalTransferred),
    lastTransactionAt: record.lastTransactionAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deactivatedAt: record.deactivatedAt,
    deactivatedBy: record.deactivatedBy,
    deactivatedReason: record.deactivatedReason,
  };
}

/**
 * Map with relations
 */
function mapWithRelations(record: any): CashCustodyWithRelations {
  const base = mapToDomain(record);
  return {
    ...base,
    user: record.user
      ? {
          userId: record.user.userId,
          firstName: record.user.firstName,
          lastName: record.user.lastName,
          email: record.user.email,
        }
      : undefined,
    unit: record.unit
      ? {
          unitId: record.unit.unitId,
          unitCode: record.unit.unitCode,
          unitName: record.unit.unitName,
        }
      : null,
    area: record.area
      ? {
          areaId: record.area.areaId,
          areaCode: record.area.areaCode,
          areaName: record.area.areaName,
        }
      : null,
    forum: record.forum
      ? {
          forumId: record.forum.forumId,
          forumCode: record.forum.forumCode,
          forumName: record.forum.forumName,
        }
      : null,
  };
}

export class PrismaCashCustodyRepository implements CashCustodyRepository {
  async create(
    data: Omit<CashCustody, 'custodyId' | 'createdAt' | 'updatedAt'>,
    tx?: any
  ): Promise<CashCustody> {
    const db = tx || prisma;
    const record = await db.cashCustody.create({
      data: {
        userId: data.userId,
        userRole: data.userRole,
        glAccountCode: data.glAccountCode,
        unitId: data.unitId,
        areaId: data.areaId,
        forumId: data.forumId,
        status: data.status,
        currentBalance: data.currentBalance,
        totalReceived: data.totalReceived,
        totalTransferred: data.totalTransferred,
        lastTransactionAt: data.lastTransactionAt,
        deactivatedAt: data.deactivatedAt,
        deactivatedBy: data.deactivatedBy,
        deactivatedReason: data.deactivatedReason,
      },
    });
    return mapToDomain(record);
  }

  async findById(custodyId: string, tx?: any): Promise<CashCustody | null> {
    const db = tx || prisma;
    const record = await db.cashCustody.findUnique({
      where: { custodyId },
    });
    return record ? mapToDomain(record) : null;
  }

  async findByIdWithRelations(
    custodyId: string,
    tx?: any
  ): Promise<CashCustodyWithRelations | null> {
    const db = tx || prisma;
    const record = await db.cashCustody.findUnique({
      where: { custodyId },
      include: {
        user: true,
        unit: true,
        area: true,
        forum: true,
      },
    });
    return record ? mapWithRelations(record) : null;
  }

  async findActiveByUserId(userId: string, tx?: any): Promise<CashCustody | null> {
    const db = tx || prisma;
    const record = await db.cashCustody.findFirst({
      where: {
        userId,
        status: CashCustodyStatus.Active,
      },
    });
    return record ? mapToDomain(record) : null;
  }

  async findByUserIdWithRelations(
    userId: string,
    tx?: any
  ): Promise<CashCustodyWithRelations | null> {
    const db = tx || prisma;
    const record = await db.cashCustody.findFirst({
      where: {
        userId,
        status: CashCustodyStatus.Active,
      },
      include: {
        user: true,
        unit: true,
        area: true,
        forum: true,
      },
    });
    return record ? mapWithRelations(record) : null;
  }

  async update(
    custodyId: string,
    data: Partial<Omit<CashCustody, 'custodyId' | 'createdAt' | 'updatedAt'>>,
    tx?: any
  ): Promise<CashCustody> {
    const db = tx || prisma;
    const record = await db.cashCustody.update({
      where: { custodyId },
      data,
    });
    return mapToDomain(record);
  }

  async incrementBalance(custodyId: string, amount: number, tx?: any): Promise<CashCustody> {
    const db = tx || prisma;
    const record = await db.cashCustody.update({
      where: { custodyId },
      data: {
        currentBalance: { increment: amount },
        totalReceived: { increment: amount },
        lastTransactionAt: new Date(),
      },
    });
    return mapToDomain(record);
  }

  async decrementBalance(custodyId: string, amount: number, tx?: any): Promise<CashCustody> {
    const db = tx || prisma;
    const record = await db.cashCustody.update({
      where: { custodyId },
      data: {
        currentBalance: { decrement: amount },
        totalTransferred: { increment: amount },
        lastTransactionAt: new Date(),
      },
    });
    return mapToDomain(record);
  }

  async findAll(filters: {
    userId?: string;
    userRole?: CashCustodyUserRole;
    status?: CashCustodyStatus;
    forumId?: string;
    areaId?: string;
    unitId?: string;
    page: number;
    limit: number;
  }): Promise<{ custodies: CashCustodyWithRelations[]; total: number }> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.userRole) where.userRole = filters.userRole;
    if (filters.status) where.status = filters.status;
    if (filters.forumId) where.forumId = filters.forumId;
    if (filters.areaId) where.areaId = filters.areaId;
    if (filters.unitId) where.unitId = filters.unitId;

    const [records, total] = await Promise.all([
      prisma.cashCustody.findMany({
        where,
        include: {
          user: true,
          unit: true,
          area: true,
          forum: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.cashCustody.count({ where }),
    ]);

    return {
      custodies: records.map(mapWithRelations),
      total,
    };
  }

  async findByGlAccountCode(
    glAccountCode: string,
    filters: {
      status?: CashCustodyStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ custodies: CashCustodyWithRelations[]; total: number }> {
    const where: any = { glAccountCode };
    if (filters.status) where.status = filters.status;

    const [records, total] = await Promise.all([
      prisma.cashCustody.findMany({
        where,
        include: {
          user: true,
          unit: true,
          area: true,
          forum: true,
        },
        orderBy: { currentBalance: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.cashCustody.count({ where }),
    ]);

    return {
      custodies: records.map(mapWithRelations),
      total,
    };
  }

  async getTotalBalanceByGlAccount(glAccountCode: string, tx?: any): Promise<number> {
    const db = tx || prisma;
    const result = await db.cashCustody.aggregate({
      where: {
        glAccountCode,
        status: CashCustodyStatus.Active,
      },
      _sum: {
        currentBalance: true,
      },
    });
    return toNumber(result._sum.currentBalance);
  }

  async countActiveByGlAccount(glAccountCode: string, tx?: any): Promise<number> {
    const db = tx || prisma;
    return db.cashCustody.count({
      where: {
        glAccountCode,
        status: CashCustodyStatus.Active,
      },
    });
  }

  async findOverdue(filters: {
    thresholdDays: number;
    forumId?: string;
    areaId?: string;
    userRole?: CashCustodyUserRole;
  }): Promise<CashCustodyWithRelations[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - filters.thresholdDays);

    const where: any = {
      status: CashCustodyStatus.Active,
      currentBalance: { gt: 0 },
      OR: [
        { lastTransactionAt: { lt: thresholdDate } },
        { lastTransactionAt: null },
      ],
    };

    if (filters.forumId) where.forumId = filters.forumId;
    if (filters.areaId) where.areaId = filters.areaId;
    if (filters.userRole) where.userRole = filters.userRole;

    const records = await prisma.cashCustody.findMany({
      where,
      include: {
        user: true,
        unit: true,
        area: true,
        forum: true,
      },
      orderBy: { lastTransactionAt: 'asc' },
    });

    return records.map(mapWithRelations);
  }

  async getBalancesByRole(
    forumId?: string,
    areaId?: string
  ): Promise<
    Array<{
      userRole: CashCustodyUserRole;
      totalBalance: number;
      userCount: number;
    }>
  > {
    const where: any = { status: CashCustodyStatus.Active };
    if (forumId) where.forumId = forumId;
    if (areaId) where.areaId = areaId;

    const result = await prisma.cashCustody.groupBy({
      by: ['userRole'],
      where,
      _sum: {
        currentBalance: true,
      },
      _count: {
        custodyId: true,
      },
    });

    return result.map((r) => ({
      userRole: r.userRole as CashCustodyUserRole,
      totalBalance: toNumber(r._sum.currentBalance),
      userCount: r._count.custodyId,
    }));
  }
}
