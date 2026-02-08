/**
 * Service for managing Areas
 * Handles area CRUD operations with permission checks
 */

import type { AreaRepository, ForumRepository } from '../domain/repositories';
import type { Area } from '../domain/entities';
import type { UserRepository, RoleRepository, UserRoleRepository } from '@/modules/iam/domain/repositories';
import { BadRequestError, NotFoundError } from '@/shared/utils/error-handling/httpErrors';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { searchService, SearchRequest } from '@/shared/infrastructure/search';
import { cashCustodyService } from '@/modules/cash-management';

export class AreaService {
  constructor(
    private readonly areaRepo: AreaRepository,
    private readonly forumRepo: ForumRepository,
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
    private readonly userRoleRepo: UserRoleRepository
  ) {}

  /**
   * Create a new area (Super Admin or Forum Admin of parent forum)
   */
  async createArea(data: {
    forumId: string;
    areaCode: string;
    areaName: string;
    adminUserId: string;
    establishedDate: Date;
    createdBy: string;
  }): Promise<Area> {
    // Validate areaCode format
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(data.areaCode)) {
      throw new BadRequestError(
        'areaCode must be alphanumeric with hyphens/underscores, 3-50 characters'
      );
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
      throw new BadRequestError(
        `Area code ${data.areaCode} already exists in this forum`
      );
    }

    // Validate admin user exists
    const adminUser = await this.userRepo.findById(data.adminUserId);
    if (!adminUser) {
      throw new NotFoundError('Admin user not found');
    }

    return await prisma.$transaction(async (tx: any) => {
      const area = await this.areaRepo.create(data, tx);

      // Assign area_admin role to adminUserId
      const areaAdminRole = await this.roleRepo.findByCode('area_admin', tx);
      if (areaAdminRole) {
        await this.userRoleRepo.create(
          {
            userId: data.adminUserId,
            roleId: areaAdminRole.roleId,
            scopeEntityType: 'Area',
            scopeEntityId: area.areaId,
            assignedBy: data.createdBy,
          },
          tx
        );
      }
      
      return area;
    });
  }

  /**
   * Update area details
   */
  async updateArea(
    areaId: string,
    data: {
      areaName?: string;
      establishedDate?: Date;
      updatedBy: string;
    }
  ): Promise<Area> {
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
  async assignAreaAdmin(
    areaId: string,
    newAdminUserId: string,
    assignedBy: string
  ): Promise<Area> {
    const area = await this.areaRepo.findById(areaId);
    if (!area) {
      throw new NotFoundError('Area not found');
    }

    // Validate new admin user exists
    const newAdmin = await this.userRepo.findById(newAdminUserId);
    if (!newAdmin) {
      throw new NotFoundError('New admin user not found');
    }

    // Get the area_admin role
    const areaAdminRole = await this.roleRepo.findByCode('area_admin');
    if (!areaAdminRole) {
      throw new BadRequestError('Area Admin role not configured in system');
    }

    const oldAdminUserId = area.adminUserId;

    // Check if old admin can be reassigned (cash custody validation)
    if (oldAdminUserId && oldAdminUserId !== newAdminUserId) {
      const validation = await cashCustodyService.validateAdminCanBeReassigned(oldAdminUserId);
      if (!validation.canReassign) {
        throw new BadRequestError(validation.reason || 'Cannot reassign admin with active cash custody');
      }
    }

    return await prisma.$transaction(async (tx: any) => {
      // 1. Update area entity with new admin
      const updatedArea = await this.areaRepo.updateAdmin(
        areaId,
        newAdminUserId,
        assignedBy,
        tx
      );

      // 2. Revoke old admin's area_admin role for this area (if different from new admin)
      if (oldAdminUserId && oldAdminUserId !== newAdminUserId) {
        const oldAdminRole = await this.userRoleRepo.findByUserAndRole(
          oldAdminUserId,
          areaAdminRole.roleId,
          areaId,
          tx
        );
        if (oldAdminRole && oldAdminRole.isActive) {
          await this.userRoleRepo.updateById(
            oldAdminRole.userRoleId,
            {
              isActive: false,
              revokedAt: new Date(),
              revokedBy: assignedBy,
            },
            tx
          );
        }
      }

      // 3. Assign area_admin role to new admin (check if already has it)
      const existingNewAdminRole = await this.userRoleRepo.findByUserAndRole(
        newAdminUserId,
        areaAdminRole.roleId,
        areaId,
        tx
      );

      if (!existingNewAdminRole) {
        // Create new role assignment
        await this.userRoleRepo.create(
          {
            userId: newAdminUserId,
            roleId: areaAdminRole.roleId,
            scopeEntityType: 'Area',
            scopeEntityId: areaId,
            assignedBy,
          },
          tx
        );
      } else if (!existingNewAdminRole.isActive) {
        // Reactivate if previously revoked
        await this.userRoleRepo.updateById(
          existingNewAdminRole.userRoleId,
          {
            isActive: true,
            revokedAt: null,
            revokedBy: null,
            assignedBy,
          },
          tx
        );
      }

      return updatedArea;
    });
  }

  /**
   * Get area by ID
   */
  async getAreaById(areaId: string): Promise<Area> {
    const area = await this.areaRepo.findById(areaId);
    if (!area) {
      throw new NotFoundError('Area not found');
    }
    return area;
  }

  /**
   * List areas by forum
   */
  async listAreasByForum(forumId: string): Promise<Area[]> {
    return this.areaRepo.listByForum(forumId);
  }

  /**
   * Search areas with advanced filtering
   */
  async searchAreas(searchRequest: Omit<SearchRequest, 'model'>) {
    return searchService.execute({
      ...searchRequest,
      model: 'Area'
    });
  }

  /**
   * Get area by ID with admin and forum details
   */
  async getAreaByIdWithDetails(areaId: string): Promise<any> {
    const area = await prisma.area.findUnique({
      where: { areaId },
      include: {
        forum: {
          select: {
            forumId: true,
            forumCode: true,
            forumName: true,
          },
        },
      },
    });

    if (!area) {
      throw new NotFoundError('Area not found');
    }

    // Fetch admin user details
    const adminUser = await this.userRepo.findById(area.adminUserId);

    return {
      areaId: area.areaId,
      areaCode: area.areaCode,
      areaName: area.areaName,
      establishedDate: area.establishedDate,
      forumId: area.forumId,
      forumName: area.forum.forumName,
      adminUserId: area.adminUserId,
      admin: adminUser
        ? {
            userId: adminUser.userId,
            name: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim(),
            email: adminUser.email,
            phone: null,
          }
        : null,
      createdAt: area.createdAt,
      updatedAt: area.updatedAt,
    };
  }

  /**
   * Get area statistics
   */
  async getAreaStats(areaId: string): Promise<{
    areaId: string;
    totalUnits: number;
    totalAgents: number;
    activeAgents: number;
    totalMembers: number;
    activeMembers: number;
  }> {
    const area = await this.areaRepo.findById(areaId);
    if (!area) {
      throw new NotFoundError('Area not found');
    }

    // Count units
    const totalUnits = await prisma.unit.count({
      where: { areaId },
    });

    // Count agents via units
    const agentCounts = await prisma.agent.groupBy({
      by: ['agentStatus'],
      where: { areaId },
      _count: true,
    });

    const totalAgents = agentCounts.reduce((sum, g) => sum + g._count, 0);
    const activeAgents = agentCounts.find((g) => g.agentStatus === 'Active')?._count || 0;

    // Count members via units
    const memberCounts = await prisma.member.groupBy({
      by: ['memberStatus'],
      where: { areaId },
      _count: true,
    });

    const totalMembers = memberCounts.reduce((sum, g) => sum + g._count, 0);
    const activeMembers = memberCounts.find((g) => g.memberStatus === 'Active')?._count || 0;

    return {
      areaId,
      totalUnits,
      totalAgents,
      activeAgents,
      totalMembers,
      activeMembers,
    };
  }

  /**
   * List units by area with pagination and counts
   */
  async listUnitsByAreaWithDetails(
    areaId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    summary: {
      totalUnits: number;
      totalAgents: number;
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
    const area = await this.areaRepo.findById(areaId);
    if (!area) {
      throw new NotFoundError('Area not found');
    }

    const skip = (page - 1) * pageSize;

    // Get total counts for summary
    const totalUnits = await prisma.unit.count({ where: { areaId } });
    const totalAgents = await prisma.agent.count({ where: { areaId } });
    const totalMembers = await prisma.member.count({ where: { areaId } });

    // Get units with pagination
    const units = await prisma.unit.findMany({
      where: { areaId },
      skip,
      take: pageSize,
      orderBy: { unitName: 'asc' },
    });

    // Get agent counts and member counts per unit
    const unitIds = units.map((u) => u.unitId);

    const agentCounts = await prisma.agent.groupBy({
      by: ['unitId'],
      where: { unitId: { in: unitIds } },
      _count: true,
    });

    const memberCounts = await prisma.member.groupBy({
      by: ['unitId'],
      where: { unitId: { in: unitIds } },
      _count: true,
    });

    // Get admin users for all units
    const adminUserIds = [...new Set(units.map((u) => u.adminUserId))];
    const adminUsers = await prisma.user.findMany({
      where: { userId: { in: adminUserIds } },
      select: { userId: true, firstName: true, lastName: true, email: true },
    });
    const adminUserMap = new Map(adminUsers.map((u) => [u.userId, u]));

    const agentCountMap = new Map(agentCounts.map((c) => [c.unitId, c._count]));
    const memberCountMap = new Map(memberCounts.map((c) => [c.unitId, c._count]));

    const items = units.map((unit) => {
      const adminUser = adminUserMap.get(unit.adminUserId);
      return {
        ...unit,
        admin: adminUser
          ? {
              userId: adminUser.userId,
              name: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim(),
            }
          : null,
        agentCount: agentCountMap.get(unit.unitId) || 0,
        memberCount: memberCountMap.get(unit.unitId) || 0,
      };
    });

    return {
      summary: {
        totalUnits,
        totalAgents,
        totalMembers,
      },
      items,
      pagination: {
        page,
        pageSize,
        totalItems: totalUnits,
        totalPages: Math.ceil(totalUnits / pageSize),
      },
    };
  }
}
