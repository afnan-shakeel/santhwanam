import prisma from '@/shared/infrastructure/prisma/prismaClient'
import { UserRoleRepository } from '../../domain/repositories'

export class PrismaUserRoleRepository implements UserRoleRepository {
  async create(data: { userId: string; roleId: string; scopeEntityType?: string | null; scopeEntityId?: string | null; assignedBy?: string | null }, tx?: any): Promise<any> {
    const client = tx ?? prisma
    const ur = await client.userRole.create({ data })
    return ur
  }

  async createMany(data: Array<{ userId: string; roleId: string; scopeEntityType?: string | null; scopeEntityId?: string | null; assignedBy?: string | null }>, tx?: any): Promise<void> {
    const client = tx ?? prisma
    await client.userRole.createMany({ data })
  }

  async findById(id: string, tx?: any): Promise<any | null> {
    const client = tx ?? prisma
    const ur = await client.userRole.findUnique({ where: { userRoleId: id } })
    return ur ?? null
  }

  async findByUserAndRole(userId: string, roleId: string, scopeEntityId?: string | null, tx?: any): Promise<any | null> {
    const client = tx ?? prisma
    const where: any = { userId, roleId }
    if (scopeEntityId === undefined) {
      // do not include scopeEntityId in where
    } else {
      where.scopeEntityId = scopeEntityId
    }
    const ur = await client.userRole.findFirst({ where })
    return ur ?? null
  }

  async updateById(id: string, updates: Partial<any>, tx?: any): Promise<any> {
    const client = tx ?? prisma
    const u = await client.userRole.update({ where: { userRoleId: id }, data: updates })
    return u
  }

  async deleteByUserId(userId: string, tx?: any): Promise<void> {
    const client = tx ?? prisma
    await client.userRole.deleteMany({ where: { userId } })
  }
}

export default PrismaUserRoleRepository
