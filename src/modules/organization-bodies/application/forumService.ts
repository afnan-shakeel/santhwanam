/**
 * Service for managing Forums
 * Handles forum CRUD operations with permission checks
 */

import type { ForumRepository } from '../domain/repositories';
import type { Forum } from '../domain/entities';
import type { UserRepository } from '@/modules/iam/domain/repositories';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/shared/utils/error-handling/httpErrors';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { searchService, SearchRequest } from '@/shared/infrastructure/search';

export class ForumService {
  constructor(
    private readonly forumRepo: ForumRepository,
    private readonly userRepo: UserRepository
  ) {}

  /**
   * Create a new forum (Super Admin only)
   */
  async createForum(data: {
    forumCode: string;
    forumName: string;
    adminUserId: string;
    establishedDate: Date;
    createdBy: string;
  }): Promise<Forum> {
    // Validate forumCode format
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(data.forumCode)) {
      throw new BadRequestError(
        'forumCode must be alphanumeric with hyphens/underscores, 3-50 characters'
      );
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
    return await prisma.$transaction(async (tx: any) => {
      const forum = await this.forumRepo.create(data, tx);

      // TODO: Assign Forum Admin role to adminUserId
      // Will be implemented after role assignment logic is ready

      return forum;
    });
  }

  /**
   * Update forum details
   */
  async updateForum(
    forumId: string,
    data: {
      forumName?: string;
      establishedDate?: Date;
      updatedBy: string;
    }
  ): Promise<Forum> {
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
  async assignForumAdmin(
    forumId: string,
    newAdminUserId: string,
    assignedBy: string
  ): Promise<Forum> {
    const forum = await this.forumRepo.findById(forumId);
    if (!forum) {
      throw new NotFoundError('Forum not found');
    }

    // Validate new admin user exists
    const newAdmin = await this.userRepo.findById(newAdminUserId);
    if (!newAdmin) {
      throw new NotFoundError('New admin user not found');
    }

    return await prisma.$transaction(async (tx: any) => {
      const updatedForum = await this.forumRepo.updateAdmin(
        forumId,
        newAdminUserId,
        assignedBy,
        tx
      );

      // TODO: Revoke old admin's Forum Admin role, assign to new admin
      // Will be implemented after role assignment logic is ready

      return updatedForum;
    });
  }

  /**
   * Get forum by ID
   */
  async getForumById(forumId: string): Promise<Forum> {
    const forum = await this.forumRepo.findById(forumId);
    if (!forum) {
      throw new NotFoundError('Forum not found');
    }
    return forum;
  }

  /**
   * Get forum by code
   */
  async getForumByCode(forumCode: string): Promise<Forum> {
    const forum = await this.forumRepo.findByCode(forumCode);
    if (!forum) {
      throw new NotFoundError('Forum not found');
    }
    return forum;
  }

  /**
   * List all forums
   */
  async listForums(): Promise<Forum[]> {
    return this.forumRepo.listAll();
  }

  /**
   * Search forums with advanced filtering
   */
  async searchForums(searchRequest: Omit<SearchRequest, 'model'>) {
    return searchService.execute({
      ...searchRequest,
      model: 'Forum'
    });
  }

  /**
   * Get forum by ID with admin details
   */
  async getForumByIdWithDetails(forumId: string): Promise<any> {
    const forum = await prisma.forum.findUnique({
      where: { forumId },
    });

    if (!forum) {
      throw new NotFoundError('Forum not found');
    }

    // Fetch admin user details
    const adminUser = await this.userRepo.findById(forum.adminUserId);

    return {
      ...forum,
      admin: adminUser
        ? {
            userId: adminUser.userId,
            name: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim(),
            email: adminUser.email,
            phone: null, // User model doesn't have phone, can be extended if needed
          }
        : null,
    };
  }

  /**
   * Get forum statistics
   */
  async getForumStats(forumId: string): Promise<{
    forumId: string;
    totalAreas: number;
    totalUnits: number;
    totalAgents: number;
    activeAgents: number;
    totalMembers: number;
    activeMembers: number;
    pendingApprovals: number;
  }> {
    const forum = await this.forumRepo.findById(forumId);
    if (!forum) {
      throw new NotFoundError('Forum not found');
    }

    // Count areas
    const totalAreas = await prisma.area.count({
      where: { forumId },
    });

    // Count units
    const totalUnits = await prisma.unit.count({
      where: { forumId },
    });

    // Count agents
    const agentCounts = await prisma.agent.groupBy({
      by: ['agentStatus'],
      where: { forumId },
      _count: true,
    });

    const totalAgents = agentCounts.reduce((sum, g) => sum + g._count, 0);
    const activeAgents = agentCounts.find((g) => g.agentStatus === 'Active')?._count || 0;

    // Count members
    const memberCounts = await prisma.member.groupBy({
      by: ['memberStatus'],
      where: { forumId },
      _count: true,
    });

    const totalMembers = memberCounts.reduce((sum, g) => sum + g._count, 0);
    const activeMembers = memberCounts.find((g) => g.memberStatus === 'Active')?._count || 0;

    // Count pending approvals
    const pendingApprovals = await prisma.approvalRequest.count({
      where: {
        forumId,
        status: 'Pending',
      },
    });

    return {
      forumId,
      totalAreas,
      totalUnits,
      totalAgents,
      activeAgents,
      totalMembers,
      activeMembers,
      pendingApprovals,
    };
  }

  /**
   * List areas by forum with pagination and counts
   */
  async listAreasByForumWithDetails(
    forumId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    summary: {
      totalAreas: number;
      totalUnits: number;
      totalMembers: number;
    };
    items: any[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const forum = await this.forumRepo.findById(forumId);
    if (!forum) {
      throw new NotFoundError('Forum not found');
    }

    const skip = (page - 1) * pageSize;

    // Get total counts for summary
    const totalAreas = await prisma.area.count({ where: { forumId } });
    const totalUnits = await prisma.unit.count({ where: { forumId } });
    const totalMembers = await prisma.member.count({ where: { forumId } });

    // Get areas with pagination
    const areas = await prisma.area.findMany({
      where: { forumId },
      skip,
      take: pageSize,
      orderBy: { areaName: 'asc' },
    });

    // Get unit counts and member counts per area
    const areaIds = areas.map((a) => a.areaId);

    const unitCounts = await prisma.unit.groupBy({
      by: ['areaId'],
      where: { areaId: { in: areaIds } },
      _count: true,
    });

    const memberCounts = await prisma.member.groupBy({
      by: ['areaId'],
      where: { areaId: { in: areaIds } },
      _count: true,
    });

    // Get admin users for all areas
    const adminUserIds = [...new Set(areas.map((a) => a.adminUserId))];
    const adminUsers = await prisma.user.findMany({
      where: { userId: { in: adminUserIds } },
      select: { userId: true, firstName: true, lastName: true, email: true },
    });
    const adminUserMap = new Map(adminUsers.map((u) => [u.userId, u]));

    const unitCountMap = new Map(unitCounts.map((c) => [c.areaId, c._count]));
    const memberCountMap = new Map(memberCounts.map((c) => [c.areaId, c._count]));

    const items = areas.map((area) => {
      const adminUser = adminUserMap.get(area.adminUserId);
      return {
        ...area,
        admin: adminUser
          ? {
              userId: adminUser.userId,
              name: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim(),
            }
          : null,
        unitCount: unitCountMap.get(area.areaId) || 0,
        memberCount: memberCountMap.get(area.areaId) || 0,
      };
    });

    return {
      summary: {
        totalAreas,
        totalUnits,
        totalMembers,
      },
      items,
      pagination: {
        page,
        pageSize,
        totalItems: totalAreas,
        totalPages: Math.ceil(totalAreas / pageSize),
      },
    };
  }
}
