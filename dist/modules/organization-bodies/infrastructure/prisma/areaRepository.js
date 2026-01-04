/**
 * Prisma implementation of AreaRepository
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaAreaRepository {
    async create(data, tx) {
        const client = tx ?? prisma;
        return client.area.create({
            data: {
                forumId: data.forumId,
                areaCode: data.areaCode,
                areaName: data.areaName,
                adminUserId: data.adminUserId,
                establishedDate: data.establishedDate,
                createdBy: data.createdBy,
            },
        });
    }
    async findById(areaId, tx) {
        const client = tx ?? prisma;
        return client.area.findUnique({
            where: { areaId },
        });
    }
    async findByCode(forumId, areaCode, tx) {
        const client = tx ?? prisma;
        return client.area.findUnique({
            where: {
                forumId_areaCode: {
                    forumId,
                    areaCode,
                },
            },
        });
    }
    async update(areaId, data, tx) {
        const client = tx ?? prisma;
        return client.area.update({
            where: { areaId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    async updateAdmin(areaId, adminUserId, updatedBy, tx) {
        const client = tx ?? prisma;
        return client.area.update({
            where: { areaId },
            data: {
                adminUserId,
                updatedBy,
                updatedAt: new Date(),
            },
        });
    }
    async listByForum(forumId, tx) {
        const client = tx ?? prisma;
        return client.area.findMany({
            where: { forumId },
            orderBy: { areaName: 'asc' },
        });
    }
    async existsByCode(forumId, areaCode, tx) {
        const client = tx ?? prisma;
        const count = await client.area.count({
            where: {
                forumId,
                areaCode,
            },
        });
        return count > 0;
    }
}
//# sourceMappingURL=areaRepository.js.map