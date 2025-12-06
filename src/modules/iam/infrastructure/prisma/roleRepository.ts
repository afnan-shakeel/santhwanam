import prisma from '@/shared/infrastructure/prisma/prismaClient'
import { PrismaClient } from '@/generated/prisma/client'
import { Role } from '../../domain/entities'
import { RoleRepository } from '../../domain/repositories'

export class PrismaRoleRepository implements RoleRepository {
  async create(data: {
    roleCode: string
    roleName: string
    description?: string | null
    scopeType: Role['scopeType']
    isSystemRole?: boolean
  }, tx?: PrismaClient): Promise<Role> {
    const db = tx ?? prisma
    const r = await db.role.create({
      data: {
        roleCode: data.roleCode,
        roleName: data.roleName,
        description: data.description ?? null,
        scopeType: data.scopeType,
        isActive: true,
        isSystemRole: data.isSystemRole ?? false,
      },
    })
    return {
      roleId: r.roleId,
      roleCode: r.roleCode,
      roleName: r.roleName,
      description: r.description,
      scopeType: r.scopeType as Role['scopeType'],
      isActive: r.isActive,
      isSystemRole: r.isSystemRole,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? null,
    }
  }

  async findByCode(code: string, tx?: PrismaClient): Promise<Role | null> {
    const db = tx ?? prisma
    const r = await db.role.findUnique({ where: { roleCode: code } })
    if (!r) return null
    return {
      roleId: r.roleId,
      roleCode: r.roleCode,
      roleName: r.roleName,
      description: r.description,
      scopeType: r.scopeType as Role['scopeType'],
      isActive: r.isActive,
      isSystemRole: r.isSystemRole,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? null,
    }
  }

  async listAll(tx?: PrismaClient): Promise<Role[]> {
    const db = tx ?? prisma
    const rows = await db.role.findMany({ orderBy: { createdAt: 'asc' } })
    return rows.map((r) => ({
      roleId: r.roleId,
      roleCode: r.roleCode,
      roleName: r.roleName,
      description: r.description,
      scopeType: r.scopeType as Role['scopeType'],
      isActive: r.isActive,
      isSystemRole: r.isSystemRole,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? null,
    }))
  }

  async findById(id: string, tx?: PrismaClient): Promise<Role | null> {
    const db = tx ?? prisma
    const r = await db.role.findUnique({ where: { roleId: id } })
    if (!r) return null
    return {
      roleId: r.roleId,
      roleCode: r.roleCode,
      roleName: r.roleName,
      description: r.description,
      scopeType: r.scopeType as Role['scopeType'],
      isActive: r.isActive,
      isSystemRole: r.isSystemRole,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? null,
    }
  }

  async updateById(id: string, updates: Partial<{
    roleCode: string
    roleName: string
    description?: string | null
    scopeType: Role['scopeType']
    isActive?: boolean
    isSystemRole?: boolean
  }>, tx?: PrismaClient): Promise<Role> {
    const db = tx ?? prisma
    const r = await db.role.update({
      where: { roleId: id },
      data: {
        roleCode: updates.roleCode,
        roleName: updates.roleName,
        description: updates.description ?? undefined,
        scopeType: updates.scopeType as any,
        isActive: updates.isActive,
        isSystemRole: updates.isSystemRole,
      },
    })

    return {
      roleId: r.roleId,
      roleCode: r.roleCode,
      roleName: r.roleName,
      description: r.description,
      scopeType: r.scopeType as Role['scopeType'],
      isActive: r.isActive,
      isSystemRole: r.isSystemRole,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? null,
    }
  }
}
