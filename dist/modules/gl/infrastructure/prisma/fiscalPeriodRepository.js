/**
 * Prisma implementation of FiscalPeriodRepository
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { PeriodStatus } from '../../domain/entities';
export class PrismaFiscalPeriodRepository {
    async create(period, tx) {
        const db = tx || prisma;
        const created = await db.fiscalPeriod.create({
            data: {
                fiscalYear: period.fiscalYear,
                periodNumber: period.periodNumber,
                periodName: period.periodName,
                startDate: period.startDate,
                endDate: period.endDate,
                status: period.status,
                closedAt: period.closedAt,
                closedBy: period.closedBy,
            },
        });
        return this.mapToDomain(created);
    }
    async update(periodId, data, tx) {
        const db = tx || prisma;
        const updated = await db.fiscalPeriod.update({
            where: { periodId },
            data: {
                periodName: data.periodName,
                status: data.status,
                closedAt: data.closedAt,
                closedBy: data.closedBy,
            },
        });
        return this.mapToDomain(updated);
    }
    async findById(periodId, tx) {
        const db = tx || prisma;
        const period = await db.fiscalPeriod.findUnique({
            where: { periodId },
        });
        return period ? this.mapToDomain(period) : null;
    }
    async findAll(tx) {
        const db = tx || prisma;
        const periods = await db.fiscalPeriod.findMany({
            orderBy: [{ fiscalYear: 'desc' }, { periodNumber: 'desc' }],
        });
        return periods.map((period) => this.mapToDomain(period));
    }
    async findByYear(fiscalYear, tx) {
        const db = tx || prisma;
        const periods = await db.fiscalPeriod.findMany({
            where: { fiscalYear },
            orderBy: { periodNumber: 'asc' },
        });
        return periods.map((period) => this.mapToDomain(period));
    }
    async findByStatus(status, tx) {
        const db = tx || prisma;
        const periods = await db.fiscalPeriod.findMany({
            where: { status },
            orderBy: [{ fiscalYear: 'desc' }, { periodNumber: 'desc' }],
        });
        return periods.map((period) => this.mapToDomain(period));
    }
    async findCurrent(tx) {
        const db = tx || prisma;
        const now = new Date();
        const period = await db.fiscalPeriod.findFirst({
            where: {
                startDate: { lte: now },
                endDate: { gte: now },
                status: PeriodStatus.Open,
            },
        });
        return period ? this.mapToDomain(period) : null;
    }
    async findByDate(date, tx) {
        const db = tx || prisma;
        const period = await db.fiscalPeriod.findFirst({
            where: {
                startDate: { lte: date },
                endDate: { gte: date },
            },
        });
        return period ? this.mapToDomain(period) : null;
    }
    async close(periodId, userId, tx) {
        const db = tx || prisma;
        const updated = await db.fiscalPeriod.update({
            where: { periodId },
            data: {
                status: PeriodStatus.Closed,
                closedAt: new Date(),
                closedBy: userId,
            },
        });
        return this.mapToDomain(updated);
    }
    mapToDomain(prismaPeriod) {
        return {
            periodId: prismaPeriod.periodId,
            fiscalYear: prismaPeriod.fiscalYear,
            periodNumber: prismaPeriod.periodNumber,
            periodName: prismaPeriod.periodName,
            startDate: prismaPeriod.startDate,
            endDate: prismaPeriod.endDate,
            status: prismaPeriod.status,
            closedAt: prismaPeriod.closedAt,
            closedBy: prismaPeriod.closedBy,
            createdAt: prismaPeriod.createdAt,
        };
    }
}
//# sourceMappingURL=fiscalPeriodRepository.js.map