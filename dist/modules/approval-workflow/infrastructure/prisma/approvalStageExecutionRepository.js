/**
 * Prisma implementation of ApprovalStageExecutionRepository
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaApprovalStageExecutionRepository {
    async create(data, tx) {
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
    async createMany(executions, tx) {
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
    async findByRequest(requestId, tx) {
        const client = tx ?? prisma;
        return client.approvalStageExecution.findMany({
            where: { requestId },
            orderBy: { stageOrder: 'asc' },
            include: {
                reviewedByUser: true
            }
        });
    }
    async findById(executionId, tx) {
        const client = tx ?? prisma;
        return client.approvalStageExecution.findUnique({
            where: { executionId },
        });
    }
    async updateDecision(executionId, data, tx) {
        const client = tx ?? prisma;
        return client.approvalStageExecution.update({
            where: { executionId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    async findPendingByApprover(approverId, tx) {
        const client = tx ?? prisma;
        return client.approvalStageExecution.findMany({
            where: {
                assignedApproverId: approverId,
                status: 'Pending',
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByRequestAndStage(requestId, stageOrder, tx) {
        const client = tx ?? prisma;
        return client.approvalStageExecution.findFirst({
            where: {
                requestId,
                stageOrder,
            },
        });
    }
}
//# sourceMappingURL=approvalStageExecutionRepository.js.map