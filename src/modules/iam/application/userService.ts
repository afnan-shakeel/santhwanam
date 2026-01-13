import { SearchRequest, searchService } from '@/shared/infrastructure/search'
import { UserRepository } from '../domain/repositories'
import { NotFoundError } from '@/shared/utils/error-handling/httpErrors'

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async searchUsers(searchRequest: Omit<SearchRequest, 'model'>) {
    return searchService.execute({ ...searchRequest, model: 'User' })
  }

  async updateUser(userId: string, updates: Partial<any>) {
    // Basic validation can be added here if desired
    const existing = await this.userRepo.findById(userId)
    if (!existing) throw new Error('User not found')

    const updated = await this.userRepo.updateById(userId, updates)
    return updated
  }

  async getUserById(userId: string) {
    const u = await this.userRepo.findById(userId)
    if (!u) throw new NotFoundError('User not found')
    return u
  }

  async getUserWithRoles(userId: string) {
    const u = await this.userRepo.findByIdWithRoles(userId)
    if (!u) throw new NotFoundError('User not found')
    
    // Transform userRoles to match the expected response format
    const rolesWithDetails = u.userRoles?.map((ur: any) => ({
      userRoleId: ur.userRoleId,
      roleId: ur.roleId,
      roleCode: ur.role?.roleCode,
      roleName: ur.role?.roleName,
      scopeType: ur.role?.scopeType,
      scopeEntityType: ur.scopeEntityType,
      scopeEntityId: ur.scopeEntityId,
      scopeEntityName: null, // Will be populated if needed with additional queries
      isSystemRole: ur.role?.isSystemRole,
      isActive: ur.isActive,
      assignedAt: ur.assignedAt,
      assignedBy: ur.assignedByUser ? {
        userId: ur.assignedByUser.userId,
        name: [ur.assignedByUser.firstName, ur.assignedByUser.lastName].filter(Boolean).join(' ') || ur.assignedByUser.email
      } : null
    })) || []

    return {
      userId: u.userId,
      externalAuthId: u.externalAuthId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastSyncedAt: u.lastSyncedAt,
      roles: rolesWithDetails
    }
  }
}

export default UserService
