// Infrastructure: Wallet Transaction Repository (Prisma)

import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { WalletTransactionRepository } from "../../domain/repositories";
import { WalletTransaction } from "../../domain/entities";

export class PrismaWalletTransactionRepository
  implements WalletTransactionRepository
{
  async create(
    transaction: Omit<WalletTransaction, "createdAt">,
    tx?: any
  ): Promise<WalletTransaction> {
    const db = tx || prisma;
    const created = await db.walletTransaction.create({
      data: {
        transactionId: transaction.transactionId,
        walletId: transaction.walletId,
        transactionType: transaction.transactionType,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        sourceModule: transaction.sourceModule,
        sourceEntityId: transaction.sourceEntityId,
        description: transaction.description,
        journalEntryId: transaction.journalEntryId,
        status: transaction.status,
        createdBy: transaction.createdBy,
        createdAt: new Date(),
      },
    });
    return this.mapToEntity(created);
  }

  async findById(
    transactionId: string,
    tx?: any
  ): Promise<WalletTransaction | null> {
    const db = tx || prisma;
    const transaction = await db.walletTransaction.findUnique({
      where: { transactionId },
    });
    return transaction ? this.mapToEntity(transaction) : null;
  }

  async findByWalletId(
    walletId: string,
    filters: {
      transactionType?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page: number;
      limit: number;
    }
  ): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const where: any = { walletId };

    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => this.mapToEntity(t)),
      total,
    };
  }

  async findRecentByWalletId(
    walletId: string,
    limit: number
  ): Promise<WalletTransaction[]> {
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return transactions.map((t) => this.mapToEntity(t));
  }

  private mapToEntity(dbTransaction: any): WalletTransaction {
    return {
      transactionId: dbTransaction.transactionId,
      walletId: dbTransaction.walletId,
      transactionType: dbTransaction.transactionType,
      amount: Number(dbTransaction.amount),
      balanceAfter: Number(dbTransaction.balanceAfter),
      sourceModule: dbTransaction.sourceModule,
      sourceEntityId: dbTransaction.sourceEntityId,
      description: dbTransaction.description,
      journalEntryId: dbTransaction.journalEntryId,
      status: dbTransaction.status,
      createdBy: dbTransaction.createdBy,
      createdAt: dbTransaction.createdAt,
    };
  }
}
