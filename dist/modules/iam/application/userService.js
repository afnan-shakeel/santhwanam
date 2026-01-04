import { searchService } from '@/shared/infrastructure/search';
import { NotFoundError } from '@/shared/utils/error-handling/httpErrors';
export class UserService {
    userRepo;
    constructor(userRepo) {
        this.userRepo = userRepo;
    }
    async searchUsers(searchRequest) {
        return searchService.execute({ ...searchRequest, model: 'User' });
    }
    async updateUser(userId, updates) {
        // Basic validation can be added here if desired
        const existing = await this.userRepo.findById(userId);
        if (!existing)
            throw new Error('User not found');
        const updated = await this.userRepo.updateById(userId, updates);
        return updated;
    }
    async getUserById(userId) {
        const u = await this.userRepo.findById(userId);
        if (!u)
            throw new NotFoundError('User not found');
        return u;
    }
}
export default UserService;
//# sourceMappingURL=userService.js.map