import prisma from '@/shared/infrastructure/prisma/prismaClient'
import { UserRepository } from '../../domain/repositories'

export class PrismaUserRepository implements UserRepository {
  async create(data: Partial<any>, tx?: any): Promise<any> {
    const client = tx ?? prisma
    const u = await client.user.create({ data })
    return u
  }

  async findById(id: string, tx?: any): Promise<any | null> {
    const client = tx ?? prisma
    const u = await client.user.findUnique({ where: { userId: id } })
    return u ?? null
  }

  async findByEmail(email: string, tx?: any): Promise<any | null> {
    const client = tx ?? prisma
    const u = await client.user.findUnique({ where: { email } })
    return u ?? null
  }

  async findByIdWithRoles(id: string, tx?: any): Promise<any | null> {
    const client = tx ?? prisma
    const u = await client.user.findUnique({
      where: { userId: id },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            },
            // assignedByUser: {
            //   select: {
            //     userId: true,
            //     firstName: true,
            //     lastName: true,
            //     email: true
            //   }
            // }
          },
          orderBy: { assignedAt: 'desc' }
        }
      }
    })
    return u ?? null
  }

  async updateById(id: string, updates: Partial<any>, tx?: any): Promise<any> {
    const client = tx ?? prisma
    const u = await client.user.update({ where: { userId: id }, data: updates })
    return u
  }

  async listAll(): Promise<any[]> {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    return rows
  }
}

export default PrismaUserRepository
