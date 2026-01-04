/**
 * Prisma implementation of ApprovalWorkflowRepository
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaApprovalWorkflowRepository {
    async create(data, tx) {
        const client = tx ?? prisma;
        return client.approvalWorkflow.create({
            data: {
                workflowCode: data.workflowCode,
                workflowName: data.workflowName,
                description: data.description,
                module: data.module,
                entityType: data.entityType,
                isActive: data.isActive ?? true,
                requiresAllStages: data.requiresAllStages ?? true,
                createdBy: data.createdBy,
            },
        });
    }
    async findById(workflowId, tx) {
        const client = tx ?? prisma;
        return client.approvalWorkflow.findUnique({
            where: { workflowId },
            include: { stages: true },
        });
    }
    async findByCode(workflowCode, tx) {
        const client = tx ?? prisma;
        return client.approvalWorkflow.findUnique({
            where: { workflowCode },
        });
    }
    async update(workflowId, data, tx) {
        const client = tx ?? prisma;
        return client.approvalWorkflow.update({
            where: { workflowId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    async listActive(module, tx) {
        const client = tx ?? prisma;
        return client.approvalWorkflow.findMany({
            where: {
                isActive: true,
                ...(module && { module }),
            },
            orderBy: { workflowName: 'asc' },
        });
    }
    async listAll(tx) {
        const client = tx ?? prisma;
        return client.approvalWorkflow.findMany({
            orderBy: { workflowName: 'asc' },
        });
    }
}
//# sourceMappingURL=approvalWorkflowRepository.js.map