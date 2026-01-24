/**
 * Prisma implementation of ApprovalRequestRepository
 */

import type { ApprovalRequestRepository } from '../../domain/repositories';
import type { ApprovalRequest, ApprovalRequestStatus } from '../../domain/entities';
import prisma from '@/shared/infrastructure/prisma/prismaClient';

export class PrismaApprovalRequestRepository implements ApprovalRequestRepository {

  async create(
    data: {
      workflowId: string;
      entityType: string;
      entityId: string;
      forumId?: string | null;
      areaId?: string | null;
      unitId?: string | null;
      requestedBy: string;
      requestedAt: Date;
      currentStageOrder?: number | null;
    },
    tx?: any
  ): Promise<ApprovalRequest> {
    const client = tx ?? prisma;
    return client.approvalRequest.create({
      data: {
        workflowId: data.workflowId,
        entityType: data.entityType,
        entityId: data.entityId,
        forumId: data.forumId,
        areaId: data.areaId,
        unitId: data.unitId,
        requestedBy: data.requestedBy,
        requestedAt: data.requestedAt,
        currentStageOrder: data.currentStageOrder,
      },
    });
  }

  async findById(requestId: string, tx?: any): Promise<ApprovalRequest | null> {
    const client = tx ?? prisma;
    return client.approvalRequest.findUnique({
      where: { requestId },
      include: {
        requestedByUser: true,
      },
    });
  }

  async updateStatus(
    requestId: string,
    data: {
      status: ApprovalRequestStatus;
      currentStageOrder?: number | null;
      approvedBy?: string | null;
      approvedAt?: Date | null;
      rejectedBy?: string | null;
      rejectedAt?: Date | null;
      rejectionReason?: string | null;
    },
    tx?: any
  ): Promise<ApprovalRequest> {
    const client = tx ?? prisma;
    return client.approvalRequest.update({
      where: { requestId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async findPendingByEntity(
    entityType: string,
    entityId: string,
    tx?: any
  ): Promise<ApprovalRequest | null> {
    const client = tx ?? prisma;
    return client.approvalRequest.findFirst({
      where: {
        entityType,
        entityId,
        status: 'Pending',
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findByRequestedBy(userId: string, tx?: any): Promise<ApprovalRequest[]> {
    const client = tx ?? prisma;
    return client.approvalRequest.findMany({
      where: { requestedBy: userId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findByStatus(status: ApprovalRequestStatus, tx?: any): Promise<ApprovalRequest[]> {
    const client = tx ?? prisma;
    return client.approvalRequest.findMany({
      where: { status },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async countPendingByWorkflow(workflowId: string, tx?: any): Promise<number> {
    const client = tx ?? prisma;
    return client.approvalRequest.count({
      where: {
        workflowId,
        status: 'Pending',
      },
    });
  }
}
