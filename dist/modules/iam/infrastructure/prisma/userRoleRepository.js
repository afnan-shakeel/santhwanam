import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaUserRoleRepository {
    async create(data, tx) {
        const client = tx ?? prisma;
        const ur = await client.userRole.create({ data });
        return ur;
    }
    async createMany(data, tx) {
        const client = tx ?? prisma;
        await client.userRole.createMany({ data });
    }
    async findById(id, tx) {
        const client = tx ?? prisma;
        const ur = await client.userRole.findUnique({ where: { userRoleId: id } });
        return ur ?? null;
    }
    async findByUserAndRole(userId, roleId, scopeEntityId, tx) {
        const client = tx ?? prisma;
        const where = { userId, roleId };
        if (scopeEntityId === undefined) {
            // do not include scopeEntityId in where
        }
        else {
            where.scopeEntityId = scopeEntityId;
        }
        const ur = await client.userRole.findFirst({ where });
        return ur ?? null;
    }
    async updateById(id, updates, tx) {
        const client = tx ?? prisma;
        const u = await client.userRole.update({ where: { userRoleId: id }, data: updates });
        return u;
    }
    async deleteByUserId(userId, tx) {
        const client = tx ?? prisma;
        await client.userRole.deleteMany({ where: { userId } });
    }
}
export default PrismaUserRoleRepository;
//# sourceMappingURL=userRoleRepository.js.map