/**
 * Service for managing Forums
 * Handles forum CRUD operations with permission checks
 */
import { BadRequestError, NotFoundError } from '@/shared/utils/error-handling/httpErrors';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { searchService } from '@/shared/infrastructure/search';
export class ForumService {
    forumRepo;
    userRepo;
    constructor(forumRepo, userRepo) {
        this.forumRepo = forumRepo;
        this.userRepo = userRepo;
    }
    /**
     * Create a new forum (Super Admin only)
     */
    async createForum(data) {
        // Validate forumCode format
        if (!/^[a-zA-Z0-9_-]{3,50}$/.test(data.forumCode)) {
            throw new BadRequestError('forumCode must be alphanumeric with hyphens/underscores, 3-50 characters');
        }
        // Validate forumName length
        if (data.forumName.length < 3 || data.forumName.length > 255) {
            throw new BadRequestError('forumName must be 3-255 characters');
        }
        // Validate established date is not in future
        console.log('Established Date:', data.establishedDate);
        if (data.establishedDate > new Date()) {
            throw new BadRequestError('establishedDate cannot be in the future');
        }
        // Check forumCode uniqueness
        const exists = await this.forumRepo.existsByCode(data.forumCode);
        if (exists) {
            throw new BadRequestError(`Forum code ${data.forumCode} already exists`);
        }
        // Validate admin user exists
        const adminUser = await this.userRepo.findById(data.adminUserId);
        if (!adminUser) {
            throw new NotFoundError('Admin user not found');
        }
        // Create forum in transaction
        return await prisma.$transaction(async (tx) => {
            const forum = await this.forumRepo.create(data, tx);
            // TODO: Assign Forum Admin role to adminUserId
            // Will be implemented after role assignment logic is ready
            return forum;
        });
    }
    /**
     * Update forum details
     */
    async updateForum(forumId, data) {
        const forum = await this.forumRepo.findById(forumId);
        if (!forum) {
            throw new NotFoundError('Forum not found');
        }
        // Validate forumName if provided
        if (data.forumName && (data.forumName.length < 3 || data.forumName.length > 255)) {
            throw new BadRequestError('forumName must be 3-255 characters');
        }
        // Validate establishedDate if provided
        if (data.establishedDate && data.establishedDate > new Date()) {
            throw new BadRequestError('establishedDate cannot be in the future');
        }
        return this.forumRepo.update(forumId, data);
    }
    /**
     * Assign forum admin (Super Admin only)
     */
    async assignForumAdmin(forumId, newAdminUserId, assignedBy) {
        const forum = await this.forumRepo.findById(forumId);
        if (!forum) {
            throw new NotFoundError('Forum not found');
        }
        // Validate new admin user exists
        const newAdmin = await this.userRepo.findById(newAdminUserId);
        if (!newAdmin) {
            throw new NotFoundError('New admin user not found');
        }
        return await prisma.$transaction(async (tx) => {
            const updatedForum = await this.forumRepo.updateAdmin(forumId, newAdminUserId, assignedBy, tx);
            // TODO: Revoke old admin's Forum Admin role, assign to new admin
            // Will be implemented after role assignment logic is ready
            return updatedForum;
        });
    }
    /**
     * Get forum by ID with admin details
     */
    async getForumById(forumId) {
        const forum = await this.forumRepo.findById(forumId);
        if (!forum) {
            throw new NotFoundError('Forum not found');
        }
        return this.enrichForumWithAdmin(forum);
    }
    /**
     * Get forum by code with admin details
     */
    async getForumByCode(forumCode) {
        const forum = await this.forumRepo.findByCode(forumCode);
        if (!forum) {
            throw new NotFoundError('Forum not found');
        }
        return this.enrichForumWithAdmin(forum);
    }
    /**
     * List all forums
     */
    async listForums() {
        return this.forumRepo.listAll();
    }
    /**
     * Search forums with advanced filtering
     */
    async searchForums(searchRequest) {
        return searchService.execute({
            ...searchRequest,
            model: 'Forum'
        });
    }
    /**
     * Get forum stats (counts: areas, units, agents, members, pending approvals)
     */
    async getForumStats(forumId) {
        const forum = await this.forumRepo.findById(forumId);
        if (!forum) {
            throw new NotFoundError('Forum not found');
        }
        // Query counts
        const [areaCount, unitCount, agentData, memberData, pendingApprovalsData] = await Promise.all([
            prisma.area.count({ where: { forumId } }),
            prisma.unit.count({ where: { forumId } }),
            prisma.agent.aggregate({
                where: { forumId },
                _count: { agentId: true },
            }),
            prisma.member.aggregate({
                where: { forumId },
                _count: { memberId: true },
            }),
            prisma.approvalRequest.count({
                where: {
                    forumId,
                    status: 'Pending',
                },
            }),
        ]);
        // Count active agents
        const activeAgentData = await prisma.agent.aggregate({
            where: {
                forumId,
                status: 'Active',
            },
            _count: { agentId: true },
        });
        // Count active members
        const activeMemberData = await prisma.member.aggregate({
            where: {
                forumId,
                memberStatus: 'Active',
            },
            _count: { memberId: true },
        });
        return {
            forumId,
            totalAreas: areaCount,
            totalUnits: unitCount,
            totalAgents: agentData._count.agentId,
            activeAgents: activeAgentData._count.agentId,
            totalMembers: memberData._count.memberId,
            activeMembers: activeMemberData._count.memberId,
            pendingApprovals: pendingApprovalsData,
        };
    }
    /**
     * Get areas in forum with counts and pagination
     */
    async listAreasByForumWithCounts(forumId, skip = 0, take = 20) {
        const forum = await this.forumRepo.findById(forumId);
        if (!forum) {
            throw new NotFoundError('Forum not found');
        }
        // Get total count
        const totalAreas = await prisma.area.count({ where: { forumId } });
        // Get paginated areas with admin info
        const areas = await prisma.area.findMany({
            where: { forumId },
            include: {
                admin: {
                    select: { userId: true, firstName: true, lastName: true },
                },
            },
            skip,
            take,
        });
        // Get unit and member counts for each area
        const itemsWithCounts = await Promise.all(areas.map(async (area) => {
            const [unitCount, memberCount] = await Promise.all([
                prisma.unit.count({ where: { areaId: area.areaId } }),
                prisma.member.count({ where: { areaId: area.areaId } }),
            ]);
            return {
                ...area,
                admin: area.admin ? {
                    userId: area.admin.userId,
                    firstName: area.admin.firstName,
                    lastName: area.admin.lastName,
                } : null,
                unitCount,
                memberCount,
            };
        }));
        // Get summary counts for forum
        const [totalUnits, totalMembers] = await Promise.all([
            prisma.unit.count({ where: { forumId } }),
            prisma.member.count({ where: { forumId } }),
        ]);
        return {
            summary: {
                totalAreas,
                totalUnits,
                totalMembers,
            },
            items: itemsWithCounts,
            pagination: {
                skip,
                take,
                total: totalAreas,
                totalPages: Math.ceil(totalAreas / take),
            },
        };
    }
    /**
     * Enrich forum with admin details
     */
    async enrichForumWithAdmin(forum) {
        const admin = await this.userRepo.findById(forum.adminUserId);
        return {
            ...forum,
            admin: admin ? {
                userId: admin.userId,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
            } : null,
        };
    }
}
//# sourceMappingURL=forumService.js.map