/**
 * Service for managing Areas
 * Handles area CRUD operations with permission checks
 */
import { BadRequestError, NotFoundError } from '@/shared/utils/error-handling/httpErrors';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { searchService } from '@/shared/infrastructure/search';
export class AreaService {
    areaRepo;
    forumRepo;
    userRepo;
    constructor(areaRepo, forumRepo, userRepo) {
        this.areaRepo = areaRepo;
        this.forumRepo = forumRepo;
        this.userRepo = userRepo;
    }
    /**
     * Create a new area (Super Admin or Forum Admin of parent forum)
     */
    async createArea(data) {
        // Validate areaCode format
        if (!/^[a-zA-Z0-9_-]{3,50}$/.test(data.areaCode)) {
            throw new BadRequestError('areaCode must be alphanumeric with hyphens/underscores, 3-50 characters');
        }
        // Validate areaName length
        if (data.areaName.length < 3 || data.areaName.length > 255) {
            throw new BadRequestError('areaName must be 3-255 characters');
        }
        // Validate established date
        if (data.establishedDate > new Date()) {
            throw new BadRequestError('establishedDate cannot be in the future');
        }
        // Validate forum exists
        const forum = await this.forumRepo.findById(data.forumId);
        if (!forum) {
            throw new NotFoundError('Parent forum not found');
        }
        // Check areaCode uniqueness within forum
        const exists = await this.areaRepo.existsByCode(data.forumId, data.areaCode);
        if (exists) {
            throw new BadRequestError(`Area code ${data.areaCode} already exists in this forum`);
        }
        // Validate admin user exists
        const adminUser = await this.userRepo.findById(data.adminUserId);
        if (!adminUser) {
            throw new NotFoundError('Admin user not found');
        }
        return await prisma.$transaction(async (tx) => {
            const area = await this.areaRepo.create(data, tx);
            // TODO: Assign Area Admin role to adminUserId
            return area;
        });
    }
    /**
     * Update area details
     */
    async updateArea(areaId, data) {
        const area = await this.areaRepo.findById(areaId);
        if (!area) {
            throw new NotFoundError('Area not found');
        }
        // Validate areaName if provided
        if (data.areaName && (data.areaName.length < 3 || data.areaName.length > 255)) {
            throw new BadRequestError('areaName must be 3-255 characters');
        }
        // Validate establishedDate if provided
        if (data.establishedDate && data.establishedDate > new Date()) {
            throw new BadRequestError('establishedDate cannot be in the future');
        }
        return this.areaRepo.update(areaId, data);
    }
    /**
     * Assign area admin
     */
    async assignAreaAdmin(areaId, newAdminUserId, assignedBy) {
        const area = await this.areaRepo.findById(areaId);
        if (!area) {
            throw new NotFoundError('Area not found');
        }
        // Validate new admin user exists
        const newAdmin = await this.userRepo.findById(newAdminUserId);
        if (!newAdmin) {
            throw new NotFoundError('New admin user not found');
        }
        return await prisma.$transaction(async (tx) => {
            const updatedArea = await this.areaRepo.updateAdmin(areaId, newAdminUserId, assignedBy, tx);
            // TODO: Revoke old admin's Area Admin role, assign to new admin
            return updatedArea;
        });
    }
    /**
     * Get area by ID
     */
    async getAreaById(areaId) {
        const area = await this.areaRepo.findById(areaId);
        if (!area) {
            throw new NotFoundError('Area not found');
        }
        return area;
    }
    /**
     * List areas by forum
     */
    async listAreasByForum(forumId) {
        return this.areaRepo.listByForum(forumId);
    }
    /**
     * Search areas with advanced filtering
     */
    async searchAreas(searchRequest) {
        return searchService.execute({
            ...searchRequest,
            model: 'Area'
        });
    }
}
//# sourceMappingURL=areaService.js.map