/**
 * Service for managing Units
 * Handles unit CRUD operations with permission checks
 */
import { BadRequestError, NotFoundError } from '@/shared/utils/error-handling/httpErrors';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { searchService } from '@/shared/infrastructure/search';
export class UnitService {
    unitRepo;
    areaRepo;
    forumRepo;
    userRepo;
    constructor(unitRepo, areaRepo, forumRepo, userRepo) {
        this.unitRepo = unitRepo;
        this.areaRepo = areaRepo;
        this.forumRepo = forumRepo;
        this.userRepo = userRepo;
    }
    /**
     * Create a new unit
     */
    async createUnit(data) {
        // Validate unitCode format
        if (!/^[a-zA-Z0-9_-]{3,50}$/.test(data.unitCode)) {
            throw new BadRequestError('unitCode must be alphanumeric with hyphens/underscores, 3-50 characters');
        }
        // Validate unitName length
        if (data.unitName.length < 3 || data.unitName.length > 255) {
            throw new BadRequestError('unitName must be 3-255 characters');
        }
        // Validate established date
        if (data.establishedDate > new Date()) {
            throw new BadRequestError('establishedDate cannot be in the future');
        }
        // Validate area exists and get forumId
        const area = await this.areaRepo.findById(data.areaId);
        if (!area) {
            throw new NotFoundError('Parent area not found');
        }
        // Check unitCode uniqueness within area
        const exists = await this.unitRepo.existsByCode(data.areaId, data.unitCode);
        if (exists) {
            throw new BadRequestError(`Unit code ${data.unitCode} already exists in this area`);
        }
        // Validate admin user exists
        const adminUser = await this.userRepo.findById(data.adminUserId);
        if (!adminUser) {
            throw new NotFoundError('Admin user not found');
        }
        return await prisma.$transaction(async (tx) => {
            const unit = await this.unitRepo.create({
                ...data,
                forumId: area.forumId, // Denormalize forumId from area
            }, tx);
            // TODO: Assign Unit Admin role to adminUserId
            return unit;
        });
    }
    /**
     * Update unit details
     */
    async updateUnit(unitId, data) {
        const unit = await this.unitRepo.findById(unitId);
        if (!unit) {
            throw new NotFoundError('Unit not found');
        }
        // Validate unitName if provided
        if (data.unitName && (data.unitName.length < 3 || data.unitName.length > 255)) {
            throw new BadRequestError('unitName must be 3-255 characters');
        }
        // Validate establishedDate if provided
        if (data.establishedDate && data.establishedDate > new Date()) {
            throw new BadRequestError('establishedDate cannot be in the future');
        }
        return this.unitRepo.update(unitId, data);
    }
    /**
     * Assign unit admin
     */
    async assignUnitAdmin(unitId, newAdminUserId, assignedBy) {
        const unit = await this.unitRepo.findById(unitId);
        if (!unit) {
            throw new NotFoundError('Unit not found');
        }
        // Validate new admin user exists
        const newAdmin = await this.userRepo.findById(newAdminUserId);
        if (!newAdmin) {
            throw new NotFoundError('New admin user not found');
        }
        return await prisma.$transaction(async (tx) => {
            const updatedUnit = await this.unitRepo.updateAdmin(unitId, newAdminUserId, assignedBy, tx);
            // TODO: Revoke old admin's Unit Admin role, assign to new admin
            return updatedUnit;
        });
    }
    /**
     * Get unit by ID
     */
    async getUnitById(unitId) {
        const unit = await this.unitRepo.findById(unitId);
        if (!unit) {
            throw new NotFoundError('Unit not found');
        }
        return unit;
    }
    /**
     * List units by area
     */
    async listUnitsByArea(areaId) {
        return this.unitRepo.listByArea(areaId);
    }
    /**
     * List units by forum
     */
    async listUnitsByForum(forumId) {
        return this.unitRepo.listByForum(forumId);
    }
    /**
     * Search units with advanced filtering
     */
    async searchUnits(searchRequest) {
        return searchService.execute({
            ...searchRequest,
            model: 'Unit'
        });
    }
}
//# sourceMappingURL=unitService.js.map