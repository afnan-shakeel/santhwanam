import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaRoleRepository {
    async create(data, tx) {
        const db = tx ?? prisma;
        const r = await db.role.create({
            data: {
                roleCode: data.roleCode,
                roleName: data.roleName,
                description: data.description ?? null,
                scopeType: data.scopeType,
                isActive: true,
                isSystemRole: data.isSystemRole ?? false,
            },
        });
        return {
            roleId: r.roleId,
            roleCode: r.roleCode,
            roleName: r.roleName,
            description: r.description,
            scopeType: r.scopeType,
            isActive: r.isActive,
            isSystemRole: r.isSystemRole,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt ?? null,
        };
    }
    async findByCode(code, tx) {
        const db = tx ?? prisma;
        const r = await db.role.findUnique({ where: { roleCode: code } });
        if (!r)
            return null;
        return {
            roleId: r.roleId,
            roleCode: r.roleCode,
            roleName: r.roleName,
            description: r.description,
            scopeType: r.scopeType,
            isActive: r.isActive,
            isSystemRole: r.isSystemRole,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt ?? null,
        };
    }
    async listAll(tx) {
        const db = tx ?? prisma;
        const rows = await db.role.findMany({ orderBy: { createdAt: 'asc' } });
        return rows.map((r) => ({
            roleId: r.roleId,
            roleCode: r.roleCode,
            roleName: r.roleName,
            description: r.description,
            scopeType: r.scopeType,
            isActive: r.isActive,
            isSystemRole: r.isSystemRole,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt ?? null,
        }));
    }
    async findById(id, tx) {
        const db = tx ?? prisma;
        const r = await db.role.findUnique({ where: { roleId: id } });
        if (!r)
            return null;
        return {
            roleId: r.roleId,
            roleCode: r.roleCode,
            roleName: r.roleName,
            description: r.description,
            scopeType: r.scopeType,
            isActive: r.isActive,
            isSystemRole: r.isSystemRole,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt ?? null,
        };
    }
    async updateById(id, updates, tx) {
        const db = tx ?? prisma;
        const r = await db.role.update({
            where: { roleId: id },
            data: {
                roleCode: updates.roleCode,
                roleName: updates.roleName,
                description: updates.description ?? undefined,
                scopeType: updates.scopeType,
                isActive: updates.isActive,
                isSystemRole: updates.isSystemRole,
            },
        });
        return {
            roleId: r.roleId,
            roleCode: r.roleCode,
            roleName: r.roleName,
            description: r.description,
            scopeType: r.scopeType,
            isActive: r.isActive,
            isSystemRole: r.isSystemRole,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt ?? null,
        };
    }
}
//# sourceMappingURL=roleRepository.js.map