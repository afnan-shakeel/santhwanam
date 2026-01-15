// Infrastructure: Wallet Debit Request Repository (Prisma)

import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { WalletDebitRequestRepository } from "../../domain/repositories";
import {
  WalletDebitRequest,
  WalletDebitRequestStatus,
} from "../../domain/entities";

export class PrismaWalletDebitRequestRepository
  implements WalletDebitRequestRepository
{
  async create(
    request: Omit<WalletDebitRequest, "createdAt" | "acknowledgedAt" | "completedAt"> & {
      acknowledgedAt?: Date | null;
      completedAt?: Date | null;
    },
    tx?: any
  ): Promise<WalletDebitRequest> {
    const db = tx || prisma;
    const created = await db.walletDebitRequest.create({
      data: {
        debitRequestId: request.debitRequestId,
        memberId: request.memberId,
        walletId: request.walletId,
        amount: request.amount,
        purpose: request.purpose,
        contributionCycleId: request.contributionCycleId,
        contributionId: request.contributionId,
        status: request.status,
        isAutoDebit: request.isAutoDebit ?? false,
        createdAt: new Date(),
        acknowledgedAt: request.acknowledgedAt ?? null,
        completedAt: request.completedAt ?? null,
      },
    });
    return this.mapToEntity(created);
  }

  async findById(
    debitRequestId: string,
    tx?: any
  ): Promise<WalletDebitRequest | null> {
    const db = tx || prisma;
    const request = await db.walletDebitRequest.findUnique({
      where: { debitRequestId },
    });
    return request ? this.mapToEntity(request) : null;
  }

  async findByIdWithRelations(
    debitRequestId: string,
    tx?: any
  ): Promise<(WalletDebitRequest & { member?: any; wallet?: any }) | null> {
    const db = tx || prisma;
    const request = await db.walletDebitRequest.findUnique({
      where: { debitRequestId },
      include: {
        member: {
          select: {
            memberId: true,
            memberCode: true,
            firstName: true,
            lastName: true,
            agentId: true,
          },
        },
        wallet: true,
      },
    });
    if (!request) return null;
    return {
      ...this.mapToEntity(request),
      member: request.member,
      wallet: request.wallet,
    };
  }

  async findByMemberId(
    memberId: string,
    filters: {
      status?: WalletDebitRequestStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ requests: WalletDebitRequest[]; total: number }> {
    const where: any = { memberId };

    if (filters.status) {
      where.status = filters.status;
    }

    const [requests, total] = await Promise.all([
      prisma.walletDebitRequest.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.walletDebitRequest.count({ where }),
    ]);

    return {
      requests: requests.map((r) => this.mapToEntity(r)),
      total,
    };
  }

  async findPendingAcknowledgment(filters: {
    agentId?: string;
    page: number;
    limit: number;
  }): Promise<{ requests: WalletDebitRequest[]; total: number }> {
    const where: any = { status: "PendingAcknowledgment" };

    if (filters.agentId) {
      where.member = { agentId: filters.agentId };
    }

    const [requests, total] = await Promise.all([
      prisma.walletDebitRequest.findMany({
        where,
        include: {
          member: {
            select: {
              memberId: true,
              memberCode: true,
              firstName: true,
              lastName: true,
              agentId: true,
            },
          },
          wallet: true,
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.walletDebitRequest.count({ where }),
    ]);

    return {
      requests: requests.map((r) => this.mapToEntity(r)),
      total,
    };
  }

  async update(
    debitRequestId: string,
    data: Partial<
      Omit<
        WalletDebitRequest,
        "debitRequestId" | "memberId" | "walletId" | "createdAt"
      >
    >,
    tx?: any
  ): Promise<WalletDebitRequest> {
    const db = tx || prisma;
    const updated = await db.walletDebitRequest.update({
      where: { debitRequestId },
      data,
    });
    return this.mapToEntity(updated);
  }

  private mapToEntity(dbRequest: any): WalletDebitRequest {
    return {
      debitRequestId: dbRequest.debitRequestId,
      memberId: dbRequest.memberId,
      walletId: dbRequest.walletId,
      amount: Number(dbRequest.amount),
      purpose: dbRequest.purpose,
      contributionCycleId: dbRequest.contributionCycleId,
      contributionId: dbRequest.contributionId,
      status: dbRequest.status,
      isAutoDebit: dbRequest.isAutoDebit ?? false,
      createdAt: dbRequest.createdAt,
      acknowledgedAt: dbRequest.acknowledgedAt,
      completedAt: dbRequest.completedAt,
    };
  }
}
