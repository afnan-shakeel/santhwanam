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
     * Get unit by ID with admin, area and forum details
     */
    async getUnitById(unitId) {
        const unit = await this.unitRepo.findById(unitId);
        if (!unit) {
            throw new NotFoundError('Unit not found');
        }
        return this.enrichUnitWithDetails(unit);
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
    /**
     * Get unit stats (counts: agents, members, pending approvals)
     */
    async getUnitStats(unitId) {
        const unit = await this.unitRepo.findById(unitId);
        if (!unit) {
            throw new NotFoundError('Unit not found');
        }
        // Query counts
        const [agentData, memberData, pendingApprovalsData] = await Promise.all([
            prisma.agent.aggregate({
                where: { unitId },
                _count: { agentId: true },
            }),
            prisma.member.aggregate({
                where: { unitId },
                _count: { memberId: true },
            }),
            prisma.approvalRequest.count({
                where: {
                    unitId,
                    status: 'Pending',
                },
            }),
        ]);
        // Count active agents
        const activeAgentData = await prisma.agent.aggregate({
            where: {
                unitId,
                status: 'Active',
            },
            _count: { agentId: true },
        });
        // Count active and suspended members
        const [activeMemberData, suspendedMemberData] = await Promise.all([
            prisma.member.aggregate({
                where: {
                    unitId,
                    memberStatus: 'Active',
                },
                _count: { memberId: true },
            }),
            prisma.member.aggregate({
                where: {
                    unitId,
                    memberStatus: 'Suspended',
                },
                _count: { memberId: true },
            }),
        ]);
        return {
            unitId,
            totalAgents: agentData._count.agentId,
            activeAgents: activeAgentData._count.agentId,
            totalMembers: memberData._count.memberId,
            activeMembers: activeMemberData._count.memberId,
            suspendedMembers: suspendedMemberData._count.memberId,
            pendingApprovals: pendingApprovalsData,
        };
    }
    /**
     * Get units in area with counts and pagination
     */
    async listUnitsByAreaWithCounts(areaId, skip = 0, take = 20) {
        const area = await this.areaRepo.findById(areaId);
        if (!area) {
            throw new NotFoundError('Area not found');
        }
        // Get total count
        const totalUnits = await prisma.unit.count({ where: { areaId } });
        // Get paginated units with admin info
        const units = await prisma.unit.findMany({
            where: { areaId },
            include: {
                admin: {
                    select: { userId: true, firstName: true, lastName: true },
                },
            },
            skip,
            take,
        });
        // Get agent and member counts for each unit
        const itemsWithCounts = await Promise.all(units.map(async (unit) => {
            const [agentCount, memberCount] = await Promise.all([
                prisma.agent.count({ where: { unitId: unit.unitId } }),
                prisma.member.count({ where: { unitId: unit.unitId } }),
            ]);
            return {
                ...unit,
                admin: unit.admin ? {
                    userId: unit.admin.userId,
                    firstName: unit.admin.firstName,
                    lastName: unit.admin.lastName,
                } : null,
                agentCount,
                memberCount,
            };
        }));
        // Get summary counts for area
        const [totalAgents, totalMembers] = await Promise.all([
            prisma.agent.count({ where: { areaId } }),
            prisma.member.count({ where: { areaId } }),
        ]);
        return {
            summary: {
                totalUnits,
                totalAgents,
                totalMembers,
            },
            items: itemsWithCounts,
            pagination: {
                skip,
                take,
                total: totalUnits,
                totalPages: Math.ceil(totalUnits / take),
            },
        };
    }
    /**
     * Enrich unit with admin, area and forum details
     */
    async enrichUnitWithDetails(unit) {
        const [admin, area, forum] = await Promise.all([
            this.userRepo.findById(unit.adminUserId),
            this.areaRepo.findById(unit.areaId),
            this.forumRepo.findById(unit.forumId),
        ]);
        return {
            ...unit,
            admin: admin ? {
                userId: admin.userId,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
            } : null,
            area: area ? {
                areaId: area.areaId,
                areaCode: area.areaCode,
                areaName: area.areaName,
            } : null,
            forum: forum ? {
                forumId: forum.forumId,
                forumCode: forum.forumCode,
                forumName: forum.forumName,
            } : null,
        };
    }
}
//# sourceMappingURL=unitService.js.map