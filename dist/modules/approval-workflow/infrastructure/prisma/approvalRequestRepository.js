/**
 * Prisma implementation of ApprovalRequestRepository
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaApprovalRequestRepository {
    async create(data, tx) {
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
    async findById(requestId, tx) {
        const client = tx ?? prisma;
        return client.approvalRequest.findUnique({
            where: { requestId },
            include: {
                requestedByUser: true,
            },
        });
    }
    async updateStatus(requestId, data, tx) {
        const client = tx ?? prisma;
        return client.approvalRequest.update({
            where: { requestId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    async findPendingByEntity(entityType, entityId, tx) {
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
    async findByRequestedBy(userId, tx) {
        const client = tx ?? prisma;
        return client.approvalRequest.findMany({
            where: { requestedBy: userId },
            orderBy: { requestedAt: 'desc' },
        });
    }
    async findByStatus(status, tx) {
        const client = tx ?? prisma;
        return client.approvalRequest.findMany({
            where: { status },
            orderBy: { requestedAt: 'desc' },
        });
    }
    async countPendingByWorkflow(workflowId, tx) {
        const client = tx ?? prisma;
        return client.approvalRequest.count({
            where: {
                workflowId,
                status: 'Pending',
            },
        });
    }
}
//# sourceMappingURL=approvalRequestRepository.js.map