/**
 * Prisma implementation of JournalEntryRepository
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { EntryStatus } from '../../domain/entities';
export class PrismaJournalEntryRepository {
    async create(entry, tx) {
        const db = tx || prisma;
        const entryNumber = await this.generateEntryNumber(tx);
        const created = await db.journalEntry.create({
            data: {
                entryNumber,
                entryDate: entry.entryDate,
                postingDate: entry.postingDate,
                description: entry.description,
                reference: entry.reference,
                sourceModule: entry.sourceModule,
                sourceEntityId: entry.sourceEntityId,
                sourceTransactionType: entry.sourceTransactionType,
                entryStatus: entry.entryStatus,
                reversedEntryId: entry.reversedEntryId,
                reversalReason: entry.reversalReason,
                reversedAt: entry.reversedAt,
                reversedBy: entry.reversedBy,
                totalDebit: entry.totalDebit,
                totalCredit: entry.totalCredit,
                isBalanced: Math.abs(entry.totalDebit - entry.totalCredit) < 0.01,
                createdBy: entry.createdBy,
                postedAt: entry.postedAt,
                postedBy: entry.postedBy,
            },
        });
        return this.mapToDomain(created);
    }
    async update(entryId, data, tx) {
        const db = tx || prisma;
        const updated = await db.journalEntry.update({
            where: { entryId },
            data: {
                description: data.description,
                reference: data.reference,
                totalDebit: data.totalDebit,
                totalCredit: data.totalCredit,
                isBalanced: data.totalDebit && data.totalCredit ? Math.abs(data.totalDebit - data.totalCredit) < 0.01 : undefined,
                updatedAt: new Date(),
            },
        });
        return this.mapToDomain(updated);
    }
    async findById(entryId, tx) {
        const db = tx || prisma;
        const entry = await db.journalEntry.findUnique({
            where: { entryId },
            include: { lines: true },
        });
        return entry ? this.mapToDomain(entry) : null;
    }
    async findByNumber(entryNumber, tx) {
        const db = tx || prisma;
        const entry = await db.journalEntry.findUnique({
            where: { entryNumber },
            include: { lines: true },
        });
        return entry ? this.mapToDomain(entry) : null;
    }
    async findAll(tx) {
        const db = tx || prisma;
        const entries = await db.journalEntry.findMany({
            orderBy: { entryDate: 'desc' },
        });
        return entries.map((entry) => this.mapToDomain(entry));
    }
    async findByStatus(status, tx) {
        const db = tx || prisma;
        const entries = await db.journalEntry.findMany({
            where: { entryStatus: status },
            orderBy: { entryDate: 'desc' },
        });
        return entries.map((entry) => this.mapToDomain(entry));
    }
    async findByDateRange(startDate, endDate, tx) {
        const db = tx || prisma;
        const entries = await db.journalEntry.findMany({
            where: {
                entryDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { entryDate: 'asc' },
        });
        return entries.map((entry) => this.mapToDomain(entry));
    }
    async findByAccount(accountId, tx) {
        const db = tx || prisma;
        const entries = await db.journalEntry.findMany({
            where: {
                lines: {
                    some: { accountId },
                },
            },
            orderBy: { entryDate: 'desc' },
        });
        return entries.map((entry) => this.mapToDomain(entry));
    }
    async findBySource(sourceModule, sourceEntityId, tx) {
        const db = tx || prisma;
        const entries = await db.journalEntry.findMany({
            where: {
                sourceModule,
                sourceEntityId,
            },
            orderBy: { entryDate: 'desc' },
        });
        return entries.map((entry) => this.mapToDomain(entry));
    }
    async findUnbalanced(tx) {
        const db = tx || prisma;
        const entries = await db.journalEntry.findMany({
            where: { isBalanced: false },
            orderBy: { entryDate: 'desc' },
        });
        return entries.map((entry) => this.mapToDomain(entry));
    }
    async post(entryId, userId, tx) {
        const db = tx || prisma;
        const updated = await db.journalEntry.update({
            where: { entryId },
            data: {
                entryStatus: EntryStatus.Posted,
                postingDate: new Date(),
                postedAt: new Date(),
                postedBy: userId,
                updatedAt: new Date(),
            },
        });
        return this.mapToDomain(updated);
    }
    async reverse(entryId, userId, reason, tx) {
        const db = tx || prisma;
        const updated = await db.journalEntry.update({
            where: { entryId },
            data: {
                entryStatus: EntryStatus.Reversed,
                reversalReason: reason,
                reversedAt: new Date(),
                reversedBy: userId,
                updatedAt: new Date(),
            },
        });
        return this.mapToDomain(updated);
    }
    async generateEntryNumber(tx) {
        const db = tx || prisma;
        const year = new Date().getFullYear();
        const prefix = `JE${year}`;
        const lastEntry = await db.journalEntry.findFirst({
            where: {
                entryNumber: {
                    startsWith: prefix,
                },
            },
            orderBy: { entryNumber: 'desc' },
        });
        if (!lastEntry) {
            return `${prefix}-00001`;
        }
        const lastNumber = parseInt(lastEntry.entryNumber.split('-')[1]);
        const nextNumber = (lastNumber + 1).toString().padStart(5, '0');
        return `${prefix}-${nextNumber}`;
    }
    mapToDomain(prismaEntry) {
        return {
            entryId: prismaEntry.entryId,
            entryNumber: prismaEntry.entryNumber,
            entryDate: prismaEntry.entryDate,
            postingDate: prismaEntry.postingDate,
            description: prismaEntry.description,
            reference: prismaEntry.reference,
            sourceModule: prismaEntry.sourceModule,
            sourceEntityId: prismaEntry.sourceEntityId,
            sourceTransactionType: prismaEntry.sourceTransactionType,
            entryStatus: prismaEntry.entryStatus,
            reversedEntryId: prismaEntry.reversedEntryId,
            reversalReason: prismaEntry.reversalReason,
            reversedAt: prismaEntry.reversedAt,
            reversedBy: prismaEntry.reversedBy,
            totalDebit: Number(prismaEntry.totalDebit),
            totalCredit: Number(prismaEntry.totalCredit),
            isBalanced: prismaEntry.isBalanced,
            createdAt: prismaEntry.createdAt,
            createdBy: prismaEntry.createdBy,
            postedAt: prismaEntry.postedAt,
            postedBy: prismaEntry.postedBy,
            updatedAt: prismaEntry.updatedAt,
        };
    }
}
//# sourceMappingURL=journalEntryRepository.js.map