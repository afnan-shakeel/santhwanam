import prisma from '@/shared/infrastructure/prisma/prismaClient'
import { RolePermissionRepository } from '../../domain/repositories'

export class PrismaRolePermissionRepository implements RolePermissionRepository {
  async createMany(data: Array<{ roleId: string; permissionId: string }>, tx?: any): Promise<void> {
    const client = tx ?? prisma
    // Prisma createMany returns a count; we ignore it and return void
    await client.rolePermission.createMany({ data })
  }

  async deleteByRoleId(roleId: string, tx?: any): Promise<void> {
    const client = tx ?? prisma
    await client.rolePermission.deleteMany({ where: { roleId } })
  }
}

export default PrismaRolePermissionRepository
