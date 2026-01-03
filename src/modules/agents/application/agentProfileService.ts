/**
 * Application: Agent Profile Service
 * Handles agent profile, stats, members list, performance, and hierarchy
 */

import { AgentRepository } from "../domain/repositories";
import { Agent } from "../domain/entities";
import { NotFoundError } from "@/shared/utils/error-handling/httpErrors";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { MemberStatus as PrismaMemberStatus, MemberRegistrationStatus } from "@/generated/prisma/client";

// Types
export interface AgentProfile extends Agent {
  unit?: {
    unitId: string;
    unitCode: string;
    unitName: string;
  };
  area?: {
    areaId: string;
    areaCode: string;
    areaName: string;
  };
  forum?: {
    forumId: string;
    forumCode: string;
    forumName: string;
  };
}

export interface AgentStats {
  totalMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  frozenMembers: number;
  closedMembers: number;
  pendingApprovals: number;
  newMembersThisMonth: number;
}

export interface AgentMembersQuery {
  page: number;
  limit: number;
  status?: string;
  tier?: string;
  search?: string;
}

export interface AgentMember {
  memberId: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string | null;
  memberStatus: string | null;
  registrationStatus: string;
  tier: {
    tierId: string;
    tierCode: string;
    tierName: string;
  };
  createdAt: Date;
  registeredAt: Date | null;
}

export interface AgentMembersResponse {
  members: AgentMember[];
  total: number;
  page: number;
  limit: number;
}

export interface MonthlyTrend {
  month: string;
  count: number;
}

export interface RetentionTrend {
  month: string;
  rate: number;
}

export interface AgentPerformance {
  period: string;
  memberAcquisition: {
    newMembersThisMonth: number;
    monthlyTrend: MonthlyTrend[];
  };
  retention: {
    retentionRate: number;
    totalMembers: number;
    activeMembers: number;
    suspendedMembers: number;
    frozenMembers: number;
    closedMembers: number;
    retentionTrend: RetentionTrend[];
  };
}

export interface AgentHierarchy {
  unit: {
    unitId: string;
    unitCode: string;
    unitName: string;
  } | null;
  area: {
    areaId: string;
    areaCode: string;
    areaName: string;
  } | null;
  forum: {
    forumId: string;
    forumCode: string;
    forumName: string;
  } | null;
}

export interface UpdateAgentProfileInput {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  contactNumber?: string;
  alternateContactNumber?: string | null;
  email?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  updatedBy: string;
}

export class AgentProfileService {
  constructor(private agentRepository: AgentRepository) {}

  /**
   * Get agent profile with hierarchy details
   */
  async getAgentProfile(agentId: string): Promise<AgentProfile> {
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      include: {
        unit: {
          select: {
            unitId: true,
            unitCode: true,
            unitName: true,
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
        },
      },
    });

    if (!agent) {
      throw new NotFoundError("Agent not found");
    }

    return {
      ...agent,
      unit: agent.unit
        ? {
            unitId: agent.unit.unitId,
            unitCode: agent.unit.unitCode,
            unitName: agent.unit.unitName,
          }
        : undefined,
      area: agent.unit?.area
        ? {
            areaId: agent.unit.area.areaId,
            areaCode: agent.unit.area.areaCode,
            areaName: agent.unit.area.areaName,
          }
        : undefined,
      forum: agent.unit?.area?.forum
        ? {
            forumId: agent.unit.area.forum.forumId,
            forumCode: agent.unit.area.forum.forumCode,
            forumName: agent.unit.area.forum.forumName,
          }
        : undefined,
    } as AgentProfile;
  }

  /**
   * Get agent profile by user ID (for logged-in agent)
   */
  async getAgentProfileByUserId(userId: string): Promise<AgentProfile> {
    const agent = await prisma.agent.findFirst({
      where: { userId },
      include: {
        unit: {
          select: {
            unitId: true,
            unitCode: true,
            unitName: true,
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
        },
      },
    });

    if (!agent) {
      throw new NotFoundError("Agent profile not found for user");
    }

    return {
      ...agent,
      unit: agent.unit
        ? {
            unitId: agent.unit.unitId,
            unitCode: agent.unit.unitCode,
            unitName: agent.unit.unitName,
          }
        : undefined,
      area: agent.unit?.area
        ? {
            areaId: agent.unit.area.areaId,
            areaCode: agent.unit.area.areaCode,
            areaName: agent.unit.area.areaName,
          }
        : undefined,
      forum: agent.unit?.area?.forum
        ? {
            forumId: agent.unit.area.forum.forumId,
            forumCode: agent.unit.area.forum.forumCode,
            forumName: agent.unit.area.forum.forumName,
          }
        : undefined,
    } as AgentProfile;
  }

  /**
   * Update agent profile
   */
  async updateAgentProfile(
    agentId: string,
    input: UpdateAgentProfileInput
  ): Promise<AgentProfile> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundError("Agent not found");
    }

    await this.agentRepository.update(agentId, {
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      contactNumber: input.contactNumber,
      alternateContactNumber: input.alternateContactNumber,
      email: input.email,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
      updatedBy: input.updatedBy,
    });

    return this.getAgentProfile(agentId);
  }

  /**
   * Get agent dashboard stats
   */
  async getAgentStats(agentId: string): Promise<AgentStats> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundError("Agent not found");
    }

    // Get member counts by status
    const [
      totalMembers,
      activeMembers,
      suspendedMembers,
      frozenMembers,
      closedMembers,
      pendingApprovals,
      newMembersThisMonth,
    ] = await Promise.all([
      // Total approved members
      prisma.member.count({
        where: {
          agentId,
          registrationStatus: MemberRegistrationStatus.Approved,
        },
      }),
      // Active members
      prisma.member.count({
        where: {
          agentId,
          registrationStatus: MemberRegistrationStatus.Approved,
          memberStatus: PrismaMemberStatus.Active,
        },
      }),
      // Suspended members
      prisma.member.count({
        where: {
          agentId,
          registrationStatus: MemberRegistrationStatus.Approved,
          memberStatus: PrismaMemberStatus.Suspended,
        },
      }),
      // Frozen members
      prisma.member.count({
        where: {
          agentId,
          registrationStatus: MemberRegistrationStatus.Approved,
          memberStatus: PrismaMemberStatus.Frozen,
        },
      }),
      // Closed members
      prisma.member.count({
        where: {
          agentId,
          registrationStatus: MemberRegistrationStatus.Approved,
          memberStatus: PrismaMemberStatus.Closed,
        },
      }),
      // Pending approvals
      prisma.member.count({
        where: {
          agentId,
          registrationStatus: MemberRegistrationStatus.PendingApproval,
        },
      }),
      // New members this month
      prisma.member.count({
        where: {
          agentId,
          registrationStatus: MemberRegistrationStatus.Approved,
          registeredAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      totalMembers,
      activeMembers,
      suspendedMembers,
      frozenMembers,
      closedMembers,
      pendingApprovals,
      newMembersThisMonth,
    };
  }

  /**
   * Get agent's members list with pagination and filtering
   */
  async getAgentMembers(
    agentId: string,
    query: AgentMembersQuery
  ): Promise<AgentMembersResponse> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundError("Agent not found");
    }

    const { page = 1, limit = 20, status, tier, search } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      agentId,
      registrationStatus: MemberRegistrationStatus.Approved,
    };

    if (status) {
      where.memberStatus = status as PrismaMemberStatus;
    }

    if (tier) {
      where.tierId = tier;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { memberCode: { contains: search, mode: "insensitive" } },
        { contactNumber: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          memberId: true,
          memberCode: true,
          firstName: true,
          lastName: true,
          contactNumber: true,
          email: true,
          memberStatus: true,
          registrationStatus: true,
          createdAt: true,
          registeredAt: true,
          tier: {
            select: {
              tierId: true,
              tierCode: true,
              tierName: true,
            },
          },
        },
      }),
      prisma.member.count({ where }),
    ]);

    return {
      members: members.map((m) => ({
        memberId: m.memberId,
        memberCode: m.memberCode,
        firstName: m.firstName,
        lastName: m.lastName,
        contactNumber: m.contactNumber,
        email: m.email,
        memberStatus: m.memberStatus,
        registrationStatus: m.registrationStatus,
        tier: m.tier,
        createdAt: m.createdAt,
        registeredAt: m.registeredAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(
    agentId: string,
    period: string = "thisMonth"
  ): Promise<AgentPerformance> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundError("Agent not found");
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get monthly acquisition trend (last 12 months)
    const monthlyTrend: MonthlyTrend[] = [];
    const retentionTrend: RetentionTrend[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const nextDate = new Date(currentYear, currentMonth - i + 1, 1);
      const monthName = date.toLocaleString("default", { month: "short" });

      // Count new members for this month
      const newMembers = await prisma.member.count({
        where: {
          agentId,
          registrationStatus: MemberRegistrationStatus.Approved,
          registeredAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      monthlyTrend.push({ month: monthName, count: newMembers });

      // Calculate retention rate for this month
      const totalAtEndOfMonth = await prisma.member.count({
        where: {
          agentId,
          registrationStatus: MemberRegistrationStatus.Approved,
          registeredAt: {
            lt: nextDate,
          },
        },
      });

      const activeAtEndOfMonth = await prisma.member.count({
        where: {
          agentId,
          registrationStatus: MemberRegistrationStatus.Approved,
          memberStatus: PrismaMemberStatus.Active,
          registeredAt: {
            lt: nextDate,
          },
        },
      });

      const rate =
        totalAtEndOfMonth > 0
          ? Math.round((activeAtEndOfMonth / totalAtEndOfMonth) * 100)
          : 100;
      retentionTrend.push({ month: monthName, rate });
    }

    // Get current stats
    const [totalMembers, activeMembers, suspendedMembers, frozenMembers, closedMembers] =
      await Promise.all([
        prisma.member.count({
          where: {
            agentId,
            registrationStatus: MemberRegistrationStatus.Approved,
          },
        }),
        prisma.member.count({
          where: {
            agentId,
            registrationStatus: MemberRegistrationStatus.Approved,
            memberStatus: PrismaMemberStatus.Active,
          },
        }),
        prisma.member.count({
          where: {
            agentId,
            registrationStatus: MemberRegistrationStatus.Approved,
            memberStatus: PrismaMemberStatus.Suspended,
          },
        }),
        prisma.member.count({
          where: {
            agentId,
            registrationStatus: MemberRegistrationStatus.Approved,
            memberStatus: PrismaMemberStatus.Frozen,
          },
        }),
        prisma.member.count({
          where: {
            agentId,
            registrationStatus: MemberRegistrationStatus.Approved,
            memberStatus: PrismaMemberStatus.Closed,
          },
        }),
      ]);

    // Get period label
    const periodLabel = this.getPeriodLabel(period, now);

    // Get new members for the period
    const periodDates = this.getPeriodDates(period, now);
    const newMembersThisMonth = await prisma.member.count({
      where: {
        agentId,
        registrationStatus: MemberRegistrationStatus.Approved,
        registeredAt: {
          gte: periodDates.start,
          lt: periodDates.end,
        },
      },
    });

    const retentionRate =
      totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 100;

    return {
      period: periodLabel,
      memberAcquisition: {
        newMembersThisMonth,
        monthlyTrend,
      },
      retention: {
        retentionRate,
        totalMembers,
        activeMembers,
        suspendedMembers,
        frozenMembers,
        closedMembers,
        retentionTrend,
      },
    };
  }

  /**
   * Get agent hierarchy
   */
  async getAgentHierarchy(agentId: string): Promise<AgentHierarchy> {
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      include: {
        unit: {
          select: {
            unitId: true,
            unitCode: true,
            unitName: true,
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
        },
      },
    });

    if (!agent) {
      throw new NotFoundError("Agent not found");
    }

    return {
      unit: agent.unit
        ? {
            unitId: agent.unit.unitId,
            unitCode: agent.unit.unitCode,
            unitName: agent.unit.unitName,
          }
        : null,
      area: agent.unit?.area
        ? {
            areaId: agent.unit.area.areaId,
            areaCode: agent.unit.area.areaCode,
            areaName: agent.unit.area.areaName,
          }
        : null,
      forum: agent.unit?.area?.forum
        ? {
            forumId: agent.unit.area.forum.forumId,
            forumCode: agent.unit.area.forum.forumCode,
            forumName: agent.unit.area.forum.forumName,
          }
        : null,
    };
  }

  /**
   * Export agent's members (returns data for CSV/Excel generation)
   */
  async exportAgentMembers(
    agentId: string,
    format: "csv" | "excel" = "csv"
  ): Promise<AgentMember[]> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundError("Agent not found");
    }

    const members = await prisma.member.findMany({
      where: {
        agentId,
        registrationStatus: MemberRegistrationStatus.Approved,
      },
      orderBy: { memberCode: "asc" },
      select: {
        memberId: true,
        memberCode: true,
        firstName: true,
        lastName: true,
        contactNumber: true,
        email: true,
        memberStatus: true,
        registrationStatus: true,
        createdAt: true,
        registeredAt: true,
        tier: {
          select: {
            tierId: true,
            tierCode: true,
            tierName: true,
          },
        },
      },
    });

    return members.map((m) => ({
      memberId: m.memberId,
      memberCode: m.memberCode,
      firstName: m.firstName,
      lastName: m.lastName,
      contactNumber: m.contactNumber,
      email: m.email,
      memberStatus: m.memberStatus,
      registrationStatus: m.registrationStatus,
      tier: m.tier,
      createdAt: m.createdAt,
      registeredAt: m.registeredAt,
    }));
  }

  // Helper methods
  private getPeriodLabel(period: string, now: Date): string {
    switch (period) {
      case "lastMonth": {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return lastMonth.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      }
      case "thisYear":
        return now.getFullYear().toString();
      case "thisMonth":
      default:
        return now.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
    }
  }

  private getPeriodDates(
    period: string,
    now: Date
  ): { start: Date; end: Date } {
    switch (period) {
      case "lastMonth": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end };
      }
      case "thisYear": {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear() + 1, 0, 1);
        return { start, end };
      }
      case "thisMonth":
      default: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { start, end };
      }
    }
  }
}
