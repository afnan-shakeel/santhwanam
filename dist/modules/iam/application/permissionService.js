import { ConflictError } from '@/shared/utils/error-handling/httpErrors';
import { searchService } from '@/shared/infrastructure/search';
export class PermissionService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async searchPermissions(searchRequest) {
        return searchService.execute({
            ...searchRequest,
            model: 'Permission'
        });
    }
    async createPermission(data) {
        const exists = await this.repo.findByCode(data.permissionCode);
        if (exists)
            throw new ConflictError('Permission Code already exists');
        return this.repo.create(data);
    }
    async updatePermission(permissionId, updates) {
        // If changing code, ensure new code isn't already used by another permission
        if (updates.permissionCode) {
            const existing = await this.repo.findByCode(updates.permissionCode);
            if (existing && existing.permissionId !== permissionId) {
                throw new ConflictError('Permission Code already exists');
            }
        }
        // Ensure permission exists
        const current = await this.repo.findById(permissionId);
        if (!current)
            throw new ConflictError('Permission not found');
        return this.repo.updateById(permissionId, updates);
    }
}
//# sourceMappingURL=permissionService.js.map