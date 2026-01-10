// Infrastructure: Prisma implementation of MemberRepository

import {
  Member,
  RegistrationStatus,
  MemberStatus,
} from "../../domain/entities";
import { MemberRepository } from "../../domain/repositories";
import prisma from "@/shared/infrastructure/prisma/prismaClient";

export class PrismaMemberRepository implements MemberRepository {
  async create(
    data: Omit<Member, "createdAt" | "updatedAt">,
    tx?: any
  ): Promise<Member> {
    const db = tx || prisma;
    const member = await db.member.create({
      data: {
        memberId: data.memberId,
        memberCode: data.memberCode,
        registrationStatus: data.registrationStatus,
        registrationStep: data.registrationStep,
        approvalRequestId: data.approvalRequestId,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        contactNumber: data.contactNumber,
        alternateContactNumber: data.alternateContactNumber,
        email: data.email,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        tierId: data.tierId,
        agentId: data.agentId,
        unitId: data.unitId,
        areaId: data.areaId,
        forumId: data.forumId,
        memberStatus: data.memberStatus,
        suspensionCounter: data.suspensionCounter,
        suspensionReason: data.suspensionReason,
        suspendedAt: data.suspendedAt,
        registeredAt: data.registeredAt,
        createdBy: data.createdBy,
        approvedBy: data.approvedBy,
      },
    });

    return this.toDomain(member);
  }

  async findById(memberId: string, tx?: any): Promise<Member | null> {
    const db = tx || prisma;
    const member = await db.member.findUnique({ where: { memberId } });
    return member ? this.toDomain(member) : null;
  }

  async findByMemberCode(memberCode: string, tx?: any): Promise<Member | null> {
    const db = tx || prisma;
    const member = await db.member.findUnique({ where: { memberCode } });
    return member ? this.toDomain(member) : null;
  }

  async findByUserId(userId: string, tx?: any): Promise<Member | null> {
    const db = tx || prisma;
    const member = await db.member.findFirst({ where: { userId } });
    return member ? this.toDomain(member) : null;
  }

  async update(
    memberId: string,
    data: Partial<Omit<Member, "memberId" | "memberCode" | "createdAt">>,
    tx?: any
  ): Promise<Member> {
    const db = tx || prisma;
    const member = await db.member.update({
      where: { memberId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(member);
  }

  async findAll(filters: {
    registrationStatus?: RegistrationStatus;
    memberStatus?: MemberStatus;
    unitId?: string;
    agentId?: string;
    tierId?: string;
    searchQuery?: string;
    page: number;
    limit: number;
  }): Promise<{ members: Member[]; total: number }> {
    const where: any = {};

    if (filters.registrationStatus) {
      where.registrationStatus = filters.registrationStatus;
    }
    if (filters.memberStatus) {
      where.memberStatus = filters.memberStatus;
    }
    if (filters.unitId) {
      where.unitId = filters.unitId;
    }
    if (filters.agentId) {
      where.agentId = filters.agentId;
    }
    if (filters.tierId) {
      where.tierId = filters.tierId;
    }
    if (filters.searchQuery) {
      where.OR = [
        { memberCode: { contains: filters.searchQuery, mode: "insensitive" } },
        { firstName: { contains: filters.searchQuery, mode: "insensitive" } },
        { lastName: { contains: filters.searchQuery, mode: "insensitive" } },
        {
          contactNumber: {
            contains: filters.searchQuery,
            mode: "insensitive",
          },
        },
      ];
    }

    const offset = (filters.page - 1) * filters.limit;

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: filters.limit,
      }),
      prisma.member.count({ where }),
    ]);

    return {
      members: members.map((m) => this.toDomain(m)),
      total,
    };
  }

  async getLastMemberCodeByYear(year: number, tx?: any): Promise<string | null> {
    const db = tx || prisma;
    const member = await db.member.findFirst({
      where: {
        memberCode: {
          startsWith: `MEM-${year}-`,
        },
      },
      orderBy: {
        memberCode: "desc",
      },
    });

    return member ? member.memberCode : null;
  }

  async findActiveMembers(
    filters: { excludeMemberId?: string },
    tx?: any
  ): Promise<Array<Member & { tier?: { contributionAmount: number } }>> {
    const db = tx || prisma;

    const where: any = {
      memberStatus: "Active",
      registrationStatus: "Approved",
    };

    if (filters.excludeMemberId) {
      where.memberId = { not: filters.excludeMemberId };
    }

    const members = await db.member.findMany({
      where,
      include: {
        tier: {
          select: {
            contributionAmount: true,
          },
        },
      },
    });

    return members.map((m: any) => ({
      ...this.toDomain(m),
      tier: m.tier ? { contributionAmount: Number(m.tier.contributionAmount) } : undefined,
    }));
  }

  private toDomain(prismaData: any): Member {
    return {
      memberId: prismaData.memberId,
      memberCode: prismaData.memberCode,
      registrationStatus: prismaData.registrationStatus as RegistrationStatus,
      registrationStep: prismaData.registrationStep,
      approvalRequestId: prismaData.approvalRequestId,
      firstName: prismaData.firstName,
      middleName: prismaData.middleName,
      lastName: prismaData.lastName,
      dateOfBirth: prismaData.dateOfBirth,
      gender: prismaData.gender,
      contactNumber: prismaData.contactNumber,
      alternateContactNumber: prismaData.alternateContactNumber,
      email: prismaData.email,
      addressLine1: prismaData.addressLine1,
      addressLine2: prismaData.addressLine2,
      city: prismaData.city,
      state: prismaData.state,
      postalCode: prismaData.postalCode,
      country: prismaData.country,
      tierId: prismaData.tierId,
      agentId: prismaData.agentId,
      unitId: prismaData.unitId,
      areaId: prismaData.areaId,
      forumId: prismaData.forumId,
      memberStatus: prismaData.memberStatus as MemberStatus | null,
      suspensionCounter: prismaData.suspensionCounter,
      suspensionReason: prismaData.suspensionReason,
      suspendedAt: prismaData.suspendedAt,
      createdAt: prismaData.createdAt,
      registeredAt: prismaData.registeredAt,
      updatedAt: prismaData.updatedAt,
      createdBy: prismaData.createdBy,
      approvedBy: prismaData.approvedBy,
    };
  }
}
