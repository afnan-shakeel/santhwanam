// Infrastructure: Prisma implementation of MembershipTierRepository
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { Prisma } from "../../../../generated/prisma/client";
export class PrismaMembershipTierRepository {
    async create(tier, tx) {
        const db = tx || prisma;
        const created = await db.membershipTier.create({
            data: {
                tierId: tier.tierId,
                tierCode: tier.tierCode,
                tierName: tier.tierName,
                description: tier.description,
                registrationFee: new Prisma.Decimal(tier.registrationFee),
                advanceDepositAmount: new Prisma.Decimal(tier.advanceDepositAmount),
                contributionAmount: new Prisma.Decimal(tier.contributionAmount),
                deathBenefitAmount: new Prisma.Decimal(tier.deathBenefitAmount),
                isActive: tier.isActive,
                isDefault: tier.isDefault,
                createdBy: tier.createdBy,
            },
        });
        return this.toDomain(created);
    }
    async findById(tierId, tx) {
        const db = tx || prisma;
        const tier = await db.membershipTier.findUnique({ where: { tierId } });
        return tier ? this.toDomain(tier) : null;
    }
    async findByTierCode(tierCode, tx) {
        const db = tx || prisma;
        const tier = await db.membershipTier.findUnique({
            where: { tierCode },
        });
        return tier ? this.toDomain(tier) : null;
    }
    async findAll(filters) {
        const where = {};
        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }
        const tiers = await prisma.membershipTier.findMany({
            where,
            orderBy: { tierCode: "asc" },
        });
        return tiers.map((t) => this.toDomain(t));
    }
    async findDefault() {
        const tier = await prisma.membershipTier.findFirst({
            where: { isDefault: true, isActive: true },
        });
        return tier ? this.toDomain(tier) : null;
    }
    async update(tierId, data, tx) {
        const db = tx || prisma;
        const updateData = {
            ...data,
            updatedAt: new Date(),
        };
        // Convert numbers to Decimal for Prisma
        if (data.registrationFee !== undefined) {
            updateData.registrationFee = new Prisma.Decimal(data.registrationFee);
        }
        if (data.advanceDepositAmount !== undefined) {
            updateData.advanceDepositAmount = new Prisma.Decimal(data.advanceDepositAmount);
        }
        if (data.contributionAmount !== undefined) {
            updateData.contributionAmount = new Prisma.Decimal(data.contributionAmount);
        }
        if (data.deathBenefitAmount !== undefined) {
            updateData.deathBenefitAmount = new Prisma.Decimal(data.deathBenefitAmount);
        }
        const tier = await db.membershipTier.update({
            where: { tierId },
            data: updateData,
        });
        return this.toDomain(tier);
    }
    toDomain(prismaData) {
        return {
            tierId: prismaData.tierId,
            tierCode: prismaData.tierCode,
            tierName: prismaData.tierName,
            description: prismaData.description,
            registrationFee: Number(prismaData.registrationFee),
            advanceDepositAmount: Number(prismaData.advanceDepositAmount),
            contributionAmount: Number(prismaData.contributionAmount),
            deathBenefitAmount: Number(prismaData.deathBenefitAmount),
            isActive: prismaData.isActive,
            isDefault: prismaData.isDefault,
            createdAt: prismaData.createdAt,
            createdBy: prismaData.createdBy,
            updatedAt: prismaData.updatedAt,
        };
    }
}
//# sourceMappingURL=membershipTierRepository.js.map