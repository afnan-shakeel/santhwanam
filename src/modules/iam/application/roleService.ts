import { RoleRepository, PermissionRepository, RolePermissionRepository } from '../domain/repositories'
import { ConflictError } from '@/shared/utils/error-handling/httpErrors'
import { searchService, SearchRequest } from '@/shared/infrastructure/search'
import prisma from '@/shared/infrastructure/prisma/prismaClient'

export class RoleService {
  constructor(
    private repo: RoleRepository,
    private permissionRepo: PermissionRepository,
    private rolePermissionRepo: RolePermissionRepository,
  ) {}

  async listRoles() {
    return this.repo.listAll()
  }

  async searchRoles(searchRequest: Omit<SearchRequest, 'model'>) {
    return searchService.execute({
      ...searchRequest,
      model: 'Role'
    })
  }

  async createRole(data: {
    roleCode: string
    roleName: string
    description?: string | null
    scopeType: 'None' | 'Forum' | 'Area' | 'Unit' | 'Agent'
    isSystemRole?: boolean
    permissionIds?: string[]
  }) {
    const exists = await this.repo.findByCode(data.roleCode)
    if (exists) throw new ConflictError('Role Code already exists')

    // Validate permission ids exist (if provided)
    if (data.permissionIds && data.permissionIds.length > 0) {
      const cnt = await this.permissionRepo.countByIds(data.permissionIds)
      if (cnt !== data.permissionIds.length) throw new ConflictError('One or more permissionIds are invalid')
    }

    // Create role and assign permissions in a transaction using repository with tx
    const repo = this.repo
    const createdRole = await prisma.$transaction(async (tx) => {
      const r = await repo.create({
        roleCode: data.roleCode,
        roleName: data.roleName,
        description: data.description ?? null,
        scopeType: data.scopeType as any,
        isSystemRole: data.isSystemRole ?? false,
      }, tx as any)

      if (data.permissionIds && data.permissionIds.length > 0) {
        const creates = data.permissionIds.map((pid) => ({ roleId: r.roleId, permissionId: pid }))
        await this.rolePermissionRepo.createMany(creates, tx as any)
      }

      return r
    })

    return {
      ...createdRole,
      permissionIds: data.permissionIds ?? [],
    }
  }

  async updateRole(roleId: string, updates: Partial<{
    roleCode: string
    roleName: string
    description?: string | null
    scopeType?: 'None' | 'Forum' | 'Area' | 'Unit' | 'Agent'
    isActive?: boolean
    isSystemRole?: boolean
    permissionIds?: string[]
  }>) {
    if (updates.roleCode) {
      const existing = await this.repo.findByCode(updates.roleCode)
      if (existing && existing.roleId !== roleId) {
        throw new ConflictError('Role Code already exists')
      }
    }

    const current = await this.repo.findById(roleId)
    if (!current) throw new ConflictError('Role not found')

    // Prevent toggling system role flag for system roles if needed
    if (current.isSystemRole && updates.isSystemRole === false) {
      throw new ConflictError('Cannot demote a system role')
    }

    // If permissionIds provided, replace role permissions in a transaction using repository with tx
    if (updates.permissionIds) {
      if (updates.permissionIds.length > 0) {
        const cnt = await this.permissionRepo.countByIds(updates.permissionIds)
        if (cnt !== updates.permissionIds.length) throw new ConflictError('One or more permissionIds are invalid')
      }

      const repo = this.repo
      const updated = await prisma.$transaction(async (tx) => {
        // prepare updates without permissionIds
        const { permissionIds, ...roleUpdates } = updates as any
        const r = await repo.updateById(roleId, roleUpdates, tx as any)

        // remove existing permissions and insert new ones via repository
        await this.rolePermissionRepo.deleteByRoleId(roleId, tx as any)
        if (updates.permissionIds && updates.permissionIds.length > 0) {
          const creates = updates.permissionIds.map((pid) => ({ roleId, permissionId: pid }))
          await this.rolePermissionRepo.createMany(creates, tx as any)
        }

        return r
      })

      return { ...updated, permissionIds: updates.permissionIds ?? [] }
    }

    // No permission changes — delegate to repository update
    return this.repo.updateById(roleId, updates as any)
  }
}
