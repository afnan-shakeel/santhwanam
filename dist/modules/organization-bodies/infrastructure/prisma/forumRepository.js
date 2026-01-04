/**
 * Prisma implementation of ForumRepository
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaForumRepository {
    async create(data, tx) {
        const client = tx ?? prisma;
        return client.forum.create({
            data: {
                forumCode: data.forumCode,
                forumName: data.forumName,
                adminUserId: data.adminUserId,
                establishedDate: data.establishedDate,
                createdBy: data.createdBy,
            },
        });
    }
    async findById(forumId, tx) {
        const client = tx ?? prisma;
        return client.forum.findUnique({
            where: { forumId },
        });
    }
    async findByCode(forumCode, tx) {
        const client = tx ?? prisma;
        return client.forum.findUnique({
            where: { forumCode },
        });
    }
    async update(forumId, data, tx) {
        const client = tx ?? prisma;
        return client.forum.update({
            where: { forumId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    async updateAdmin(forumId, adminUserId, updatedBy, tx) {
        const client = tx ?? prisma;
        return client.forum.update({
            where: { forumId },
            data: {
                adminUserId,
                updatedBy,
                updatedAt: new Date(),
            },
        });
    }
    async listAll(tx) {
        const client = tx ?? prisma;
        return client.forum.findMany({
            orderBy: { forumName: 'asc' },
        });
    }
    async existsByCode(forumCode, tx) {
        const client = tx ?? prisma;
        const count = await client.forum.count({
            where: { forumCode },
        });
        return count > 0;
    }
}
//# sourceMappingURL=forumRepository.js.map