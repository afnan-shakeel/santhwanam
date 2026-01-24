// Infrastructure: Wallet Repository (Prisma)

import prisma from "@/shared/infrastructure/prisma/prismaClient";
import {
  WalletRepository,
} from "../../domain/repositories";
import { Wallet, WalletStatistics } from "../../domain/entities";

export class PrismaWalletRepository implements WalletRepository {
  async create(
    wallet: Omit<Wallet, "createdAt" | "updatedAt">,
    tx?: any
  ): Promise<Wallet> {
    const db = tx || prisma;
    const created = await db.wallet.create({
      data: {
        walletId: wallet.walletId,
        memberId: wallet.memberId,
        currentBalance: wallet.currentBalance,
        createdAt: new Date(),
        updatedAt: null,
      },
    });
    return this.mapToEntity(created);
  }

  async findById(walletId: string, tx?: any): Promise<Wallet | null> {
    const db = tx || prisma;
    const wallet = await db.wallet.findUnique({
      where: { walletId },
    });
    return wallet ? this.mapToEntity(wallet) : null;
  }

  async findByMemberId(memberId: string, tx?: any): Promise<Wallet | null> {
    const db = tx || prisma;
    const wallet = await db.wallet.findUnique({
      where: { memberId },
    });
    return wallet ? this.mapToEntity(wallet) : null;
  }

  async update(
    walletId: string,
    data: Partial<Omit<Wallet, "walletId" | "memberId" | "createdAt">>,
    tx?: any
  ): Promise<Wallet> {
    const db = tx || prisma;
    const updated = await db.wallet.update({
      where: { walletId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return this.mapToEntity(updated);
  }

  async incrementBalance(
    walletId: string,
    amount: number,
    tx?: any
  ): Promise<Wallet> {
    const db = tx || prisma;
    const updated = await db.wallet.update({
      where: { walletId },
      data: {
        currentBalance: { increment: amount },
        updatedAt: new Date(),
      },
    });
    return this.mapToEntity(updated);
  }

  async decrementBalance(
    walletId: string,
    amount: number,
    tx?: any
  ): Promise<Wallet> {
    const db = tx || prisma;
    const updated = await db.wallet.update({
      where: { walletId },
      data: {
        currentBalance: { decrement: amount },
        updatedAt: new Date(),
      },
    });
    return this.mapToEntity(updated);
  }

  async findAll(filters: {
    minBalance?: number;
    maxBalance?: number;
    searchQuery?: string;
    page: number;
    limit: number;
  }): Promise<{ wallets: Wallet[]; total: number }> {
    const where: any = {};

    if (filters.minBalance !== undefined || filters.maxBalance !== undefined) {
      where.currentBalance = {};
      if (filters.minBalance !== undefined) {
        where.currentBalance.gte = filters.minBalance;
      }
      if (filters.maxBalance !== undefined) {
        where.currentBalance.lte = filters.maxBalance;
      }
    }

    if (filters.searchQuery) {
      where.member = {
        OR: [
          { firstName: { contains: filters.searchQuery, mode: "insensitive" } },
          { lastName: { contains: filters.searchQuery, mode: "insensitive" } },
          { memberCode: { contains: filters.searchQuery, mode: "insensitive" } },
        ],
      };
    }

    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        include: {
          member: {
            select: {
              memberId: true,
              memberCode: true,
              firstName: true,
              lastName: true,
              agent: {
                select: {
                  agentId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.wallet.count({ where }),
    ]);

    return {
      wallets: wallets.map((w) => this.mapToEntity(w)),
      total,
    };
  }

  async findLowBalanceWallets(
    threshold: number,
    page: number,
    limit: number
  ): Promise<{ wallets: Wallet[]; total: number }> {
    const where = {
      currentBalance: { lt: threshold },
    };

    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        include: {
          member: {
            select: {
              memberId: true,
              memberCode: true,
              firstName: true,
              lastName: true,
              tier: {
                select:{
                  tierId: true,
                  tierName: true,
                  contributionAmount: true,
                  advanceDepositAmount: true,
                }
              },
              agent: {
                select: {
                  agentId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { currentBalance: "asc" },
      }),
      prisma.wallet.count({ where }),
    ]);

    return {
      wallets: wallets.map((w) => this.mapToEntity(w)),
      total,
    };
  }

  async getStatistics(): Promise<WalletStatistics> {
    const [aggregation, lowBalanceCount] = await Promise.all([
      prisma.wallet.aggregate({
        _count: { walletId: true },
        _sum: { currentBalance: true },
        _avg: { currentBalance: true },
      }),
      prisma.wallet.count({
        where: { currentBalance: { lt: 200 } },
      }),
    ]);

    return {
      totalWallets: aggregation._count.walletId,
      totalBalance: Number(aggregation._sum.currentBalance) || 0,
      averageBalance: Number(aggregation._avg.currentBalance) || 0,
      lowBalanceCount,
    };
  }

  private mapToEntity(dbWallet: any): Wallet {
    return {
      walletId: dbWallet.walletId,
      memberId: dbWallet.memberId,
      currentBalance: Number(dbWallet.currentBalance),
      createdAt: dbWallet.createdAt,
      updatedAt: dbWallet.updatedAt,
      member: dbWallet.member && {
        memberId: dbWallet.member.memberId,
        memberCode: dbWallet.member.memberCode,
        firstName: dbWallet.member.firstName,
        lastName: dbWallet.member.lastName,
        agent: dbWallet.member.agent && {
          agentId: dbWallet.member.agent.agentId,
          firstName: dbWallet.member.agent.firstName,
          lastName: dbWallet.member.agent.lastName,
        },
        tier: dbWallet.member.tier && {
          tierId: dbWallet.member.tier.tierId,
          tierName: dbWallet.member.tier.tierName,
          contributionAmount: Number(dbWallet.member.tier.contributionAmount),
          advanceDepositAmount: Number(dbWallet.member.tier.advanceDepositAmount),
        },
      },
    };
  }
}
