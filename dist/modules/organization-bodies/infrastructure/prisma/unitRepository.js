/**
 * Prisma implementation of UnitRepository
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaUnitRepository {
    async create(data, tx) {
        const client = tx ?? prisma;
        return client.unit.create({
            data: {
                areaId: data.areaId,
                forumId: data.forumId,
                unitCode: data.unitCode,
                unitName: data.unitName,
                adminUserId: data.adminUserId,
                establishedDate: data.establishedDate,
                createdBy: data.createdBy,
            },
        });
    }
    async findById(unitId, tx) {
        const client = tx ?? prisma;
        return client.unit.findUnique({
            where: { unitId },
        });
    }
    async findByCode(areaId, unitCode, tx) {
        const client = tx ?? prisma;
        return client.unit.findUnique({
            where: {
                areaId_unitCode: {
                    areaId,
                    unitCode,
                },
            },
        });
    }
    async update(unitId, data, tx) {
        const client = tx ?? prisma;
        return client.unit.update({
            where: { unitId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    async updateAdmin(unitId, adminUserId, updatedBy, tx) {
        const client = tx ?? prisma;
        return client.unit.update({
            where: { unitId },
            data: {
                adminUserId,
                updatedBy,
                updatedAt: new Date(),
            },
        });
    }
    async listByArea(areaId, tx) {
        const client = tx ?? prisma;
        return client.unit.findMany({
            where: { areaId },
            orderBy: { unitName: 'asc' },
        });
    }
    async listByForum(forumId, tx) {
        const client = tx ?? prisma;
        return client.unit.findMany({
            where: { forumId },
            orderBy: { unitName: 'asc' },
        });
    }
    async existsByCode(areaId, unitCode, tx) {
        const client = tx ?? prisma;
        const count = await client.unit.count({
            where: {
                areaId,
                unitCode,
            },
        });
        return count > 0;
    }
}
//# sourceMappingURL=unitRepository.js.map