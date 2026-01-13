import prisma from '@/shared/infrastructure/prisma/prismaClient'
import AppError from '@/shared/utils/error-handling/AppError'
import { PrismaUserRoleRepository } from '@/modules/iam/infrastructure/prisma/userRoleRepository'
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager'

export interface RevokeRoleCommand {
  userRoleId: string
}

export class RevokeRoleFromUserHandler {
  constructor() {}

  async execute(cmd: RevokeRoleCommand) {
    if (!cmd || !cmd.userRoleId) throw new AppError('Invalid payload', 400)

    const userRoleRepo = new PrismaUserRoleRepository()

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await userRoleRepo.findById(cmd.userRoleId, tx as any)
      if (!existing) throw new AppError('UserRole not found', 404)
      if (!existing.isActive) throw new AppError('UserRole already revoked', 400)

      const actorId = asyncLocalStorage.tryGetUserId()
      if (!actorId) throw new AppError('Unauthenticated', 401)

      const u = await userRoleRepo.updateById(cmd.userRoleId, {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: actorId,
      }, tx as any)

      return u
    })

    return updated
  }
}

export const revokeRoleFromUserHandler = new RevokeRoleFromUserHandler()