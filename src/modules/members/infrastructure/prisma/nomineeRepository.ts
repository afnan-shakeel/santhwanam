// Infrastructure: Prisma implementation of NomineeRepository

import { Nominee } from "../../domain/entities";
import { NomineeRepository } from "../../domain/repositories";
import prisma from "@/shared/infrastructure/prisma/prismaClient";

export class PrismaNomineeRepository implements NomineeRepository {
  async create(nominee: Omit<Nominee, "createdAt" | "updatedAt">, tx?: any): Promise<Nominee> {
    const db = tx || prisma;
    const created = await db.nominee.create({
      data: {
        nomineeId: nominee.nomineeId,
        memberId: nominee.memberId,
        name: nominee.name,
        relationType: nominee.relationType,
        dateOfBirth: nominee.dateOfBirth,
        contactNumber: nominee.contactNumber,
        alternateContactNumber: nominee.alternateContactNumber,
        addressLine1: nominee.addressLine1,
        addressLine2: nominee.addressLine2,
        city: nominee.city,
        state: nominee.state,
        postalCode: nominee.postalCode,
        country: nominee.country,
        idProofType: nominee.idProofType,
        idProofNumber: nominee.idProofNumber,
        idProofDocumentId: nominee.idProofDocumentId,
        priority: nominee.priority,
        isActive: nominee.isActive,
      },
    });

    return this.toDomain(created);
  }

  async findById(nomineeId: string, tx?: any): Promise<Nominee | null> {
    const db = tx || prisma;
    const nominee = await db.nominee.findUnique({ where: { nomineeId } });
    return nominee ? this.toDomain(nominee) : null;
  }

  async findByMemberId(memberId: string, tx?: any): Promise<Nominee[]> {
    const db = tx || prisma;
    const nominees = await db.nominee.findMany({ where: { memberId } });
    return nominees.map((n: any) => this.toDomain(n));
  }

  async findActiveByMemberId(memberId: string, tx?: any): Promise<Nominee[]> {
    const db = tx || prisma;
    const nominees = await db.nominee.findMany({
      where: { memberId, isActive: true },
    });
    return nominees.map((n: any) => this.toDomain(n));
  }

  async update(
    nomineeId: string,
    data: Partial<Omit<Nominee, "nomineeId" | "memberId" | "createdAt">>,
    tx?: any
  ): Promise<Nominee> {
    const db = tx || prisma;
    const nominee = await db.nominee.update({
      where: { nomineeId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(nominee);
  }

  async softDelete(nomineeId: string, tx?: any): Promise<void> {
    const db = tx || prisma;
    await db.nominee.update({
      where: { nomineeId },
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  async countActiveByMemberId(memberId: string, tx?: any): Promise<number> {
    const db = tx || prisma;
    return await db.nominee.count({
      where: { memberId, isActive: true },
    });
  }

  async search(filters: {
    name?: string;
    contactNumber?: string;
    page: number;
    limit: number;
  }): Promise<{ nominees: Nominee[]; total: number }> {
    const skip = (filters.page - 1) * filters.limit;

    const where: any = { isActive: true };

    if (filters.name) {
      where.name = {
        contains: filters.name,
        mode: 'insensitive',
      };
    }

    if (filters.contactNumber) {
      where.OR = [
        {
          contactNumber: {
            contains: filters.contactNumber,
          },
        },
        {
          alternateContactNumber: {
            contains: filters.contactNumber,
          },
        },
      ];
    }

    const [nominees, total] = await Promise.all([
      prisma.nominee.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          member: {
            select: {
              memberCode: true,
              firstName: true,
              middleName: true,
              lastName: true,
              contactNumber: true,
              memberStatus: true,
            },
          },
        },
      }),
      prisma.nominee.count({ where }),
    ]);

    return {
      nominees: nominees.map((n: any) => this.toDomain(n)),
      total,
    };
  }

  private toDomain(prismaData: any): Nominee {
    return {
      nomineeId: prismaData.nomineeId,
      memberId: prismaData.memberId,
      name: prismaData.name,
      relationType: prismaData.relationType,
      dateOfBirth: prismaData.dateOfBirth,
      contactNumber: prismaData.contactNumber,
      alternateContactNumber: prismaData.alternateContactNumber,
      addressLine1: prismaData.addressLine1,
      addressLine2: prismaData.addressLine2,
      city: prismaData.city,
      state: prismaData.state,
      postalCode: prismaData.postalCode,
      country: prismaData.country,
      idProofType: prismaData.idProofType,
      idProofNumber: prismaData.idProofNumber,
      idProofDocumentId: prismaData.idProofDocumentId,
      priority: prismaData.priority,
      isActive: prismaData.isActive,
      createdAt: prismaData.createdAt,
      updatedAt: prismaData.updatedAt,
    };
  }
}
