import { PermissionRepository } from '../domain/repositories'
import { ConflictError } from '@/shared/utils/error-handling/httpErrors'
import { searchService, SearchRequest } from '@/shared/infrastructure/search'

export class PermissionService {
  constructor(private repo: PermissionRepository) {}

  async searchPermissions(searchRequest: Omit<SearchRequest, 'model'>) {
    return searchService.execute({
      ...searchRequest,
      model: 'Permission'
    })
  }

  async createPermission(data: {
    permissionCode: string
    permissionName: string
    description?: string | null
    module?: string | null
    action?: string | null
  }) {
    const exists = await this.repo.findByCode(data.permissionCode)
    if (exists) throw new ConflictError('Permission Code already exists')
    return this.repo.create(data)
  }

  async updatePermission(permissionId: string, updates: Partial<{
    permissionCode: string
    permissionName: string
    description?: string | null
    module?: string | null
    action?: string | null
    isActive?: boolean
  }>) {
    // If changing code, ensure new code isn't already used by another permission
    if (updates.permissionCode) {
      const existing = await this.repo.findByCode(updates.permissionCode)
      if (existing && existing.permissionId !== permissionId) {
        throw new ConflictError('Permission Code already exists')
      }
    }

    // Ensure permission exists
    const current = await this.repo.findById(permissionId)
    if (!current) throw new ConflictError('Permission not found')

    return this.repo.updateById(permissionId, updates)
  }
}
