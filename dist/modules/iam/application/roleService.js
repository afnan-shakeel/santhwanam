import { ConflictError } from '@/shared/utils/error-handling/httpErrors';
import { searchService } from '@/shared/infrastructure/search';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { NotFoundError } from '@/shared/utils/error-handling/httpErrors';
export class RoleService {
    repo;
    permissionRepo;
    rolePermissionRepo;
    constructor(repo, permissionRepo, rolePermissionRepo) {
        this.repo = repo;
        this.permissionRepo = permissionRepo;
        this.rolePermissionRepo = rolePermissionRepo;
    }
    async listRoles() {
        return this.repo.listAll();
    }
    async getRoleById(roleId) {
        const r = await this.repo.findById(roleId);
        if (!r)
            throw new NotFoundError('Role not found');
        // fetch permission ids associated with role
        const perms = await prisma.rolePermission.findMany({ where: { roleId } });
        const permissionIds = perms.map((p) => p.permissionId);
        return { ...r, permissionIds };
    }
    async searchRoles(searchRequest) {
        return searchService.execute({
            ...searchRequest,
            model: 'Role'
        });
    }
    async createRole(data) {
        const exists = await this.repo.findByCode(data.roleCode);
        if (exists)
            throw new ConflictError('Role Code already exists');
        // Validate permission ids exist (if provided)
        if (data.permissionIds && data.permissionIds.length > 0) {
            const cnt = await this.permissionRepo.countByIds(data.permissionIds);
            if (cnt !== data.permissionIds.length)
                throw new ConflictError('One or more permissionIds are invalid');
        }
        // Create role and assign permissions in a transaction using repository with tx
        const repo = this.repo;
        const createdRole = await prisma.$transaction(async (tx) => {
            const r = await repo.create({
                roleCode: data.roleCode,
                roleName: data.roleName,
                description: data.description ?? null,
                scopeType: data.scopeType,
                isSystemRole: data.isSystemRole ?? false,
            }, tx);
            if (data.permissionIds && data.permissionIds.length > 0) {
                const creates = data.permissionIds.map((pid) => ({ roleId: r.roleId, permissionId: pid }));
                await this.rolePermissionRepo.createMany(creates, tx);
            }
            return r;
        });
        return {
            ...createdRole,
            permissionIds: data.permissionIds ?? [],
        };
    }
    async updateRole(roleId, updates) {
        if (updates.roleCode) {
            const existing = await this.repo.findByCode(updates.roleCode);
            if (existing && existing.roleId !== roleId) {
                throw new ConflictError('Role Code already exists');
            }
        }
        const current = await this.repo.findById(roleId);
        if (!current)
            throw new ConflictError('Role not found');
        // Prevent toggling system role flag for system roles if needed
        if (current.isSystemRole && updates.isSystemRole === false) {
            throw new ConflictError('Cannot demote a system role');
        }
        // If permissionIds provided, replace role permissions in a transaction using repository with tx
        if (updates.permissionIds) {
            if (updates.permissionIds.length > 0) {
                const cnt = await this.permissionRepo.countByIds(updates.permissionIds);
                if (cnt !== updates.permissionIds.length)
                    throw new ConflictError('One or more permissionIds are invalid');
            }
            const repo = this.repo;
            const updated = await prisma.$transaction(async (tx) => {
                // prepare updates without permissionIds
                const { permissionIds, ...roleUpdates } = updates;
                const r = await repo.updateById(roleId, roleUpdates, tx);
                // remove existing permissions and insert new ones via repository
                await this.rolePermissionRepo.deleteByRoleId(roleId, tx);
                if (updates.permissionIds && updates.permissionIds.length > 0) {
                    const creates = updates.permissionIds.map((pid) => ({ roleId, permissionId: pid }));
                    await this.rolePermissionRepo.createMany(creates, tx);
                }
                return r;
            });
            return { ...updated, permissionIds: updates.permissionIds ?? [] };
        }
        // No permission changes — delegate to repository update
        return this.repo.updateById(roleId, updates);
    }
}
//# sourceMappingURL=roleService.js.map