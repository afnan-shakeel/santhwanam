import prisma from '@/shared/infrastructure/prisma/prismaClient'
import AppError from '@/shared/utils/error-handling/AppError'
import { PrismaUserRepository } from '@/modules/iam/infrastructure/prisma/userRepository'
import { PrismaRoleRepository } from '@/modules/iam/infrastructure/prisma/roleRepository'
import { PrismaUserRoleRepository } from '@/modules/iam/infrastructure/prisma/userRoleRepository'
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager'

export interface AssignRoleCommand {
  userId: string
  roleId: string
  scopeEntityType?: 'None' | 'Forum' | 'Area' | 'Unit' | 'Agent'
  scopeEntityId?: string | null
}

export class AssignRoleToUserHandler {
  constructor() {}

  async execute(cmd: AssignRoleCommand) {
    if (!cmd || !cmd.userId || !cmd.roleId) throw new AppError('Invalid payload', 400)

    const userRepo = new PrismaUserRepository()
    const roleRepo = new PrismaRoleRepository()
    const userRoleRepo = new PrismaUserRoleRepository()

    // Validate existence
    const role = await roleRepo.findById(cmd.roleId)
    if (!role) throw new AppError('Role not found', 400)
    if (!role.isActive) throw new AppError('Role is not active', 400)

    const user = await userRepo.findById(cmd.userId)
    if (!user) throw new AppError('User not found', 400)

    // Validate scope requirements
    if (role.scopeType !== 'None') {
      if (!cmd.scopeEntityId) throw new AppError('Scope entity id required for this role', 400)
      if (cmd.scopeEntityType !== role.scopeType) throw new AppError('Scope type mismatch', 400)
    }

    // Create user role in transaction, avoid duplicates
    const created = await prisma.$transaction(async (tx) => {
      const existing = await userRoleRepo.findByUserAndRole(cmd.userId, cmd.roleId, cmd.scopeEntityId ?? null, tx as any)
      if (existing && existing.isActive) throw new AppError('User already has this role in the given scope', 409)

      const actorId = asyncLocalStorage.tryGetUserId()
      if (!actorId) throw new AppError('Unauthenticated', 401)

      const ur = await userRoleRepo.create({
        userId: cmd.userId,
        roleId: cmd.roleId,
        scopeEntityType: cmd.scopeEntityType ?? null,
        scopeEntityId: cmd.scopeEntityId ?? null,
        assignedBy: actorId,
      }, tx as any)

      return ur
    })

    return created
  }
}

export const assignRoleToUserHandler = new AssignRoleToUserHandler()
