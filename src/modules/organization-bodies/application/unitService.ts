/**
 * Service for managing Units
 * Handles unit CRUD operations with permission checks
 */

import type { UnitRepository, AreaRepository, ForumRepository } from '../domain/repositories';
import type { Unit } from '../domain/entities';
import type { UserRepository } from '@/modules/iam/domain/repositories';
import { BadRequestError, NotFoundError } from '@/shared/utils/error-handling/httpErrors';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { searchService, SearchRequest } from '@/shared/infrastructure/search';

export class UnitService {
  constructor(
    private readonly unitRepo: UnitRepository,
    private readonly areaRepo: AreaRepository,
    private readonly forumRepo: ForumRepository,
    private readonly userRepo: UserRepository
  ) {}

  /**
   * Create a new unit
   */
  async createUnit(data: {
    areaId: string;
    unitCode: string;
    unitName: string;
    adminUserId: string;
    establishedDate: Date;
    createdBy: string;
  }): Promise<Unit> {
    // Validate unitCode format
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(data.unitCode)) {
      throw new BadRequestError(
        'unitCode must be alphanumeric with hyphens/underscores, 3-50 characters'
      );
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
      throw new BadRequestError(
        `Unit code ${data.unitCode} already exists in this area`
      );
    }

    // Validate admin user exists
    const adminUser = await this.userRepo.findById(data.adminUserId);
    if (!adminUser) {
      throw new NotFoundError('Admin user not found');
    }

    return await prisma.$transaction(async (tx: any) => {
      const unit = await this.unitRepo.create(
        {
          ...data,
          forumId: area.forumId, // Denormalize forumId from area
        },
        tx
      );

      // TODO: Assign Unit Admin role to adminUserId

      return unit;
    });
  }

  /**
   * Update unit details
   */
  async updateUnit(
    unitId: string,
    data: {
      unitName?: string;
      establishedDate?: Date;
      updatedBy: string;
    }
  ): Promise<Unit> {
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
  async assignUnitAdmin(
    unitId: string,
    newAdminUserId: string,
    assignedBy: string
  ): Promise<Unit> {
    const unit = await this.unitRepo.findById(unitId);
    if (!unit) {
      throw new NotFoundError('Unit not found');
    }

    // Validate new admin user exists
    const newAdmin = await this.userRepo.findById(newAdminUserId);
    if (!newAdmin) {
      throw new NotFoundError('New admin user not found');
    }

    return await prisma.$transaction(async (tx: any) => {
      const updatedUnit = await this.unitRepo.updateAdmin(
        unitId,
        newAdminUserId,
        assignedBy,
        tx
      );

      // TODO: Revoke old admin's Unit Admin role, assign to new admin

      return updatedUnit;
    });
  }

  /**
   * Get unit by ID
   */
  async getUnitById(unitId: string): Promise<Unit> {
    const unit = await this.unitRepo.findById(unitId);
    if (!unit) {
      throw new NotFoundError('Unit not found');
    }
    return unit;
  }

  /**
   * List units by area
   */
  async listUnitsByArea(areaId: string): Promise<Unit[]> {
    return this.unitRepo.listByArea(areaId);
  }

  /**
   * List units by forum
   */
  async listUnitsByForum(forumId: string): Promise<Unit[]> {
    return this.unitRepo.listByForum(forumId);
  }

  /**
   * Search units with advanced filtering
   */
  async searchUnits(searchRequest: Omit<SearchRequest, 'model'>) {
    return searchService.execute({
      ...searchRequest,
      model: 'Unit'
    });
  }

  /**
   * Get unit by ID with admin, area, and forum details
   */
  async getUnitByIdWithDetails(unitId: string): Promise<any> {
    const unit = await prisma.unit.findUnique({
      where: { unitId },
      include: {
        area: {
          select: {
            areaId: true,
            areaCode: true,
            areaName: true,
            forum: {
              select: {
                forumId: true,
                forumCode: true,
                forumName: true,
              },
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundError('Unit not found');
    }

    // Fetch admin user details
    const adminUser = await this.userRepo.findById(unit.adminUserId);

    return {
      unitId: unit.unitId,
      unitCode: unit.unitCode,
      unitName: unit.unitName,
      establishedDate: unit.establishedDate,
      areaId: unit.areaId,
      areaName: unit.area.areaName,
      forumId: unit.forumId,
      forumName: unit.area.forum.forumName,
      adminUserId: unit.adminUserId,
      admin: adminUser
        ? {
            userId: adminUser.userId,
            name: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim(),
            email: adminUser.email,
            phone: null,
          }
        : null,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }

  /**
   * Get unit statistics
   */
  async getUnitStats(unitId: string): Promise<{
    unitId: string;
    totalAgents: number;
    activeAgents: number;
    totalMembers: number;
    activeMembers: number;
    suspendedMembers: number;
    pendingApprovals: number;
  }> {
    const unit = await this.unitRepo.findById(unitId);
    if (!unit) {
      throw new NotFoundError('Unit not found');
    }

    // Count agents
    const agentCounts = await prisma.agent.groupBy({
      by: ['agentStatus'],
      where: { unitId },
      _count: true,
    });

    const totalAgents = agentCounts.reduce((sum, g) => sum + g._count, 0);
    const activeAgents = agentCounts.find((g) => g.agentStatus === 'Active')?._count || 0;

    // Count members
    const memberCounts = await prisma.member.groupBy({
      by: ['memberStatus'],
      where: { unitId },
      _count: true,
    });

    const totalMembers = memberCounts.reduce((sum, g) => sum + g._count, 0);
    const activeMembers = memberCounts.find((g) => g.memberStatus === 'Active')?._count || 0;
    const suspendedMembers = memberCounts.find((g) => g.memberStatus === 'Suspended')?._count || 0;

    // Count pending approvals (member registrations)
    const pendingApprovals = await prisma.approvalRequest.count({
      where: {
        unitId,
        status: 'Pending',
        workflow: {
          workflowCode: 'member_registration',
        },
      },
    });

    return {
      unitId,
      totalAgents,
      activeAgents,
      totalMembers,
      activeMembers,
      suspendedMembers,
      pendingApprovals,
    };
  }
}
