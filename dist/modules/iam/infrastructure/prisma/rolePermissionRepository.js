import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaRolePermissionRepository {
    async createMany(data, tx) {
        const client = tx ?? prisma;
        // Prisma createMany returns a count; we ignore it and return void
        await client.rolePermission.createMany({ data });
    }
    async deleteByRoleId(roleId, tx) {
        const client = tx ?? prisma;
        await client.rolePermission.deleteMany({ where: { roleId } });
    }
}
export default PrismaRolePermissionRepository;
//# sourceMappingURL=rolePermissionRepository.js.map