// Infrastructure: Wallet Deposit Request Repository (Prisma)

import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { WalletDepositRequestRepository } from "../../domain/repositories";
import {
  WalletDepositRequest,
  WalletDepositRequestStatus,
} from "../../domain/entities";

export class PrismaWalletDepositRequestRepository
  implements WalletDepositRequestRepository
{
  async create(
    request: Omit<
      WalletDepositRequest,
      "createdAt" | "approvedAt" | "rejectedAt"
    >,
    tx?: any
  ): Promise<WalletDepositRequest> {
    const db = tx || prisma;
    const created = await db.walletDepositRequest.create({
      data: {
        depositRequestId: request.depositRequestId,
        memberId: request.memberId,
        walletId: request.walletId,
        amount: request.amount,
        collectionDate: request.collectionDate,
        collectedBy: request.collectedBy,
        notes: request.notes,
        requestStatus: request.requestStatus,
        approvalRequestId: request.approvalRequestId,
        journalEntryId: request.journalEntryId,
        createdAt: new Date(),
        approvedAt: null,
        rejectedAt: null,
      },
    });
    return this.mapToEntity(created);
  }

  async findById(
    depositRequestId: string,
    tx?: any
  ): Promise<WalletDepositRequest | null> {
    const db = tx || prisma;
    const request = await db.walletDepositRequest.findUnique({
      where: { depositRequestId },
    });
    return request ? this.mapToEntity(request) : null;
  }

  async findByIdWithRelations(
    depositRequestId: string,
    tx?: any
  ): Promise<(WalletDepositRequest & { member?: any; wallet?: any }) | null> {
    const db = tx || prisma;
    const request = await db.walletDepositRequest.findUnique({
      where: { depositRequestId },
      include: {
        member: {
          select: {
            memberId: true,
            memberCode: true,
            firstName: true,
            lastName: true,
            agentId: true,
            unitId: true,
            areaId: true,
            forumId: true,
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
      status?: WalletDepositRequestStatus;
      page: number;
      limit: number;
    }
  ): Promise<{ requests: WalletDepositRequest[]; total: number }> {
    const where: any = { memberId };

    if (filters.status) {
      where.requestStatus = filters.status;
    }

    const [requests, total] = await Promise.all([
      prisma.walletDepositRequest.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.walletDepositRequest.count({ where }),
    ]);

    return {
      requests: requests.map((r) => this.mapToEntity(r)),
      total,
    };
  }

  async findPending(filters: {
    collectedBy?: string;
    page: number;
    limit: number;
  }): Promise<{ requests: WalletDepositRequest[]; total: number }> {
    const where: any = { requestStatus: "PendingApproval" };

    if (filters.collectedBy) {
      where.collectedBy = filters.collectedBy;
    }

    const [requests, total] = await Promise.all([
      prisma.walletDepositRequest.findMany({
        where,
        include: {
          member: {
            select: {
              memberId: true,
              memberCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.walletDepositRequest.count({ where }),
    ]);

    return {
      requests: requests.map((r) => this.mapToEntity(r)),
      total,
    };
  }

  async update(
    depositRequestId: string,
    data: Partial<
      Omit<
        WalletDepositRequest,
        "depositRequestId" | "memberId" | "walletId" | "createdAt"
      >
    >,
    tx?: any
  ): Promise<WalletDepositRequest> {
    const db = tx || prisma;
    const updated = await db.walletDepositRequest.update({
      where: { depositRequestId },
      data,
    });
    return this.mapToEntity(updated);
  }

  private mapToEntity(dbRequest: any): WalletDepositRequest {
    return {
      depositRequestId: dbRequest.depositRequestId,
      memberId: dbRequest.memberId,
      walletId: dbRequest.walletId,
      amount: Number(dbRequest.amount),
      collectionDate: dbRequest.collectionDate,
      collectedBy: dbRequest.collectedBy,
      notes: dbRequest.notes,
      requestStatus: dbRequest.requestStatus,
      approvalRequestId: dbRequest.approvalRequestId,
      journalEntryId: dbRequest.journalEntryId,
      createdAt: dbRequest.createdAt,
      approvedAt: dbRequest.approvedAt,
      rejectedAt: dbRequest.rejectedAt,
    };
  }
}
