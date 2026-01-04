/**
 * Prisma implementation of JournalEntryLineRepository
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaJournalEntryLineRepository {
    async create(line, tx) {
        const db = tx || prisma;
        const created = await db.journalEntryLine.create({
            data: {
                entryId: line.entryId,
                lineNumber: line.lineNumber,
                accountId: line.accountId,
                accountCode: line.accountCode,
                accountName: line.accountName,
                debitAmount: line.debitAmount,
                creditAmount: line.creditAmount,
                description: line.description,
            },
        });
        return this.mapToDomain(created);
    }
    async createMany(lines, tx) {
        const db = tx || prisma;
        // Use direct db calls for each create (no transaction wrapper here)
        const created = await Promise.all(lines.map((line) => db.journalEntryLine.create({
            data: {
                entryId: line.entryId,
                lineNumber: line.lineNumber,
                accountId: line.accountId,
                accountCode: line.accountCode,
                accountName: line.accountName,
                debitAmount: line.debitAmount,
                creditAmount: line.creditAmount,
                description: line.description,
            },
        })));
        return created.map((line) => this.mapToDomain(line));
    }
    async findById(lineId, tx) {
        const db = tx || prisma;
        const line = await db.journalEntryLine.findUnique({
            where: { lineId },
        });
        return line ? this.mapToDomain(line) : null;
    }
    async findByEntry(entryId, tx) {
        const db = tx || prisma;
        const lines = await db.journalEntryLine.findMany({
            where: { entryId },
            orderBy: { lineNumber: 'asc' },
        });
        return lines.map((line) => this.mapToDomain(line));
    }
    async findByAccount(accountId, tx) {
        const db = tx || prisma;
        const lines = await db.journalEntryLine.findMany({
            where: { accountId },
            orderBy: { createdAt: 'desc' },
        });
        return lines.map((line) => this.mapToDomain(line));
    }
    async findByAccountAndDateRange(accountId, startDate, endDate, tx) {
        const db = tx || prisma;
        const lines = await db.journalEntryLine.findMany({
            where: {
                accountId,
                entry: {
                    entryDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                    entryStatus: 'Posted',
                },
            },
            include: {
                entry: true,
            },
            orderBy: { createdAt: 'asc' },
        });
        return lines.map((line) => this.mapToDomain(line));
    }
    async calculateEntryTotals(entryId, tx) {
        const db = tx || prisma;
        const result = await db.journalEntryLine.aggregate({
            where: { entryId },
            _sum: {
                debitAmount: true,
                creditAmount: true,
            },
        });
        return {
            totalDebit: Number(result._sum.debitAmount || 0),
            totalCredit: Number(result._sum.creditAmount || 0),
        };
    }
    mapToDomain(prismaLine) {
        return {
            lineId: prismaLine.lineId,
            entryId: prismaLine.entryId,
            lineNumber: prismaLine.lineNumber,
            accountId: prismaLine.accountId,
            accountCode: prismaLine.accountCode,
            accountName: prismaLine.accountName,
            debitAmount: Number(prismaLine.debitAmount),
            creditAmount: Number(prismaLine.creditAmount),
            description: prismaLine.description,
            createdAt: prismaLine.createdAt,
        };
    }
}
//# sourceMappingURL=journalEntryLineRepository.js.map