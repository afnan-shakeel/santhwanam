/**
 * Prisma implementation of JournalEntryLineRepository
 */

import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { JournalEntryLineRepository } from '../../domain/repositories';
import { JournalEntryLine } from '../../domain/entities';

export class PrismaJournalEntryLineRepository implements JournalEntryLineRepository {
  async create(line: Omit<JournalEntryLine, 'lineId' | 'createdAt'>, tx?: any): Promise<JournalEntryLine> {
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

  async createMany(
    lines: Omit<JournalEntryLine, 'lineId' | 'createdAt'>[],
    tx?: any
  ): Promise<JournalEntryLine[]> {
    const db = tx || prisma;
    // Use direct db calls for each create (no transaction wrapper here)
    const created = await Promise.all(
      lines.map((line) =>
        db.journalEntryLine.create({
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
        })
      )
    );

    return created.map((line: any) => this.mapToDomain(line));
  }

  async findById(lineId: string, tx?: any): Promise<JournalEntryLine | null> {
    const db = tx || prisma;
    const line = await db.journalEntryLine.findUnique({
      where: { lineId },
    });

    return line ? this.mapToDomain(line) : null;
  }

  async findByEntry(entryId: string, tx?: any): Promise<JournalEntryLine[]> {
    const db = tx || prisma;
    const lines = await db.journalEntryLine.findMany({
      where: { entryId },
      orderBy: { lineNumber: 'asc' },
    });

    return lines.map((line: any) => this.mapToDomain(line));
  }

  async findByAccount(accountId: string, tx?: any): Promise<JournalEntryLine[]> {
    const db = tx || prisma;
    const lines = await db.journalEntryLine.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });

    return lines.map((line: any) => this.mapToDomain(line));
  }

  async findByAccountAndDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date,
    tx?: any
  ): Promise<JournalEntryLine[]> {
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

    return lines.map((line: any) => this.mapToDomain(line));
  }

  async calculateEntryTotals(entryId: string, tx?: any): Promise<{ totalDebit: number; totalCredit: number }> {
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

  private mapToDomain(prismaLine: any): JournalEntryLine {
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
