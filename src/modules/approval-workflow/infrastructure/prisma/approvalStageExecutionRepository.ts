/**
 * Prisma implementation of ApprovalStageExecutionRepository
 */

import type { ApprovalStageExecutionRepository } from '../../domain/repositories';
import type { ApprovalStageExecution, ApprovalStageStatus } from '../../domain/entities';
import prisma from '@/shared/infrastructure/prisma/prismaClient';

export class PrismaApprovalStageExecutionRepository implements ApprovalStageExecutionRepository {

  async create(
    data: {
      requestId: string;
      stageId: string;
      stageOrder: number;
      assignedApproverId?: string | null;
    },
    tx?: any
  ): Promise<ApprovalStageExecution> {
    const client = tx ?? prisma;
    return client.approvalStageExecution.create({
      data: {
        requestId: data.requestId,
        stageId: data.stageId,
        stageOrder: data.stageOrder,
        assignedApproverId: data.assignedApproverId,
      },
    });
  }

  async createMany(executions: Array<{
    requestId: string;
    stageId: string;
    stageOrder: number;
    assignedApproverId?: string | null;
  }>, tx?: any): Promise<void> {
    const client = tx ?? prisma;
    await client.approvalStageExecution.createMany({
      data: executions.map(exec => ({
        requestId: exec.requestId,
        stageId: exec.stageId,
        stageOrder: exec.stageOrder,
        assignedApproverId: exec.assignedApproverId,
      })),
    });
  }

  async findByRequest(requestId: string, tx?: any): Promise<ApprovalStageExecution[]> {
    const client = tx ?? prisma;
    return client.approvalStageExecution.findMany({
      where: { requestId },
      orderBy: { stageOrder: 'asc' },
      include: {
        reviewedByUser: true
      }
    });
  }

  async findById(executionId: string, tx?: any): Promise<ApprovalStageExecution | null> {
    const client = tx ?? prisma;
    return client.approvalStageExecution.findUnique({
      where: { executionId },
    });
  }

  async updateDecision(
    executionId: string,
    data: {
      status: ApprovalStageStatus;
      reviewedBy: string;
      reviewedAt: Date;
      decision: string;
      comments?: string | null;
    },
    tx?: any
  ): Promise<ApprovalStageExecution> {
    const client = tx ?? prisma;
    return client.approvalStageExecution.update({
      where: { executionId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async findPendingByApprover(approverId: string, tx?: any): Promise<ApprovalStageExecution[]> {
    const client = tx ?? prisma;
    return client.approvalStageExecution.findMany({
      where: {
        assignedApproverId: approverId,
        status: 'Pending',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByRequestAndStage(
    requestId: string,
    stageOrder: number,
    tx?: any
  ): Promise<ApprovalStageExecution | null> {
    const client = tx ?? prisma;
    return client.approvalStageExecution.findFirst({
      where: {
        requestId,
        stageOrder,
      },
    });
  }
}
