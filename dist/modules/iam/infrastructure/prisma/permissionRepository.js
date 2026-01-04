import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaPermissionRepository {
    async create(data) {
        const p = await prisma.permission.create({
            data: {
                permissionCode: data.permissionCode,
                permissionName: data.permissionName,
                description: data.description ?? null,
                module: data.module ?? null,
                action: data.action ?? null,
                isActive: true,
            },
        });
        return {
            permissionId: p.permissionId,
            permissionCode: p.permissionCode,
            permissionName: p.permissionName,
            description: p.description,
            module: p.module,
            action: p.action,
            isActive: p.isActive,
            createdAt: p.createdAt,
        };
    }
    async findByCode(code) {
        const p = await prisma.permission.findUnique({ where: { permissionCode: code } });
        if (!p)
            return null;
        return {
            permissionId: p.permissionId,
            permissionCode: p.permissionCode,
            permissionName: p.permissionName,
            description: p.description,
            module: p.module,
            action: p.action,
            isActive: p.isActive,
            createdAt: p.createdAt,
        };
    }
    async listAll() {
        const rows = await prisma.permission.findMany({ orderBy: { createdAt: 'asc' } });
        return rows.map((p) => ({
            permissionId: p.permissionId,
            permissionCode: p.permissionCode,
            permissionName: p.permissionName,
            description: p.description,
            module: p.module,
            action: p.action,
            isActive: p.isActive,
            createdAt: p.createdAt,
        }));
    }
    async findById(id) {
        const p = await prisma.permission.findUnique({ where: { permissionId: id } });
        if (!p)
            return null;
        return {
            permissionId: p.permissionId,
            permissionCode: p.permissionCode,
            permissionName: p.permissionName,
            description: p.description,
            module: p.module,
            action: p.action,
            isActive: p.isActive,
            createdAt: p.createdAt,
        };
    }
    async updateById(id, updates) {
        const p = await prisma.permission.update({
            where: { permissionId: id },
            data: {
                permissionCode: updates.permissionCode,
                permissionName: updates.permissionName,
                description: updates.description ?? undefined,
                module: updates.module ?? undefined,
                action: updates.action ?? undefined,
                isActive: updates.isActive,
            },
        });
        return {
            permissionId: p.permissionId,
            permissionCode: p.permissionCode,
            permissionName: p.permissionName,
            description: p.description,
            module: p.module,
            action: p.action,
            isActive: p.isActive,
            createdAt: p.createdAt,
        };
    }
    async count(where, tx) {
        const client = tx ?? prisma;
        const c = await client.permission.count({ where: where ?? {} });
        return c;
    }
    async countByIds(ids, tx) {
        if (!ids || ids.length === 0)
            return 0;
        const client = tx ?? prisma;
        const c = await client.permission.count({ where: { permissionId: { in: ids } } });
        return c;
    }
}
//# sourceMappingURL=permissionRepository.js.map