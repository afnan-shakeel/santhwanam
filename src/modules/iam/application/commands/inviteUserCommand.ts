import prisma from '@/shared/infrastructure/prisma/prismaClient'
import { authClientService } from '@/shared/infrastructure/auth/services/authClientService'
import { PrismaUserRepository } from '../../infrastructure/prisma/userRepository'
import { PrismaUserRoleRepository } from '../../infrastructure/prisma/userRoleRepository'
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager'
import AppError from '@/shared/utils/error-handling/AppError'

export type ScopeType = 'None' | 'Forum' | 'Area' | 'Unit' | 'Agent'

export interface InviteRoleAssignment {
  roleId: string
  scopeEntityType?: ScopeType
  scopeEntityId?: string | null
}

export interface InviteUserCommand {
  email: string
  firstName?: string
  lastName?: string
  userMetadata?: Record<string, unknown>
  roles?: InviteRoleAssignment[]
}

export class InviteUserHandler {
  constructor() {}

  async execute(cmd: InviteUserCommand) {
    if (!cmd || !cmd.email) throw new AppError('Invalid invite payload', 400)

    // 1) Create the user in Supabase (invite flow)
    const supUser = await authClientService.inviteUser(cmd.email, cmd.userMetadata)
    if (!supUser || !supUser.id) throw new AppError('Failed to create external auth user', 500)

    const externalAuthId = supUser.id

    // 2) Persist local user and optional user roles in a single transaction
    const userRepo = new PrismaUserRepository()
    const userRoleRepo = new PrismaUserRoleRepository()

    // get actor from request context
    const actorId = asyncLocalStorage.tryGetUserId()
    if (!actorId) throw new AppError('Unauthenticated', 401)

    const created = await prisma.$transaction(async (tx) => {
      const user = await userRepo.create({
        externalAuthId,
        email: cmd.email,
        firstName: cmd.firstName ?? null,
        lastName: cmd.lastName ?? null,
      }, tx as any)

      if (cmd.roles && Array.isArray(cmd.roles) && cmd.roles.length > 0) {
        const userRoleCreates = cmd.roles.map((r) => ({
          userId: user.userId,
          roleId: r.roleId,
          scopeEntityType: r.scopeEntityType ?? null,
          scopeEntityId: r.scopeEntityId ?? null,
          assignedBy: actorId,
        }))

        // create many user roles via repository
        await userRoleRepo.createMany(userRoleCreates, tx as any)
      }

      return user
    })

    return created
  }
}

export const inviteUserHandler = new InviteUserHandler()
