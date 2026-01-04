// Infrastructure: Prisma implementation of NomineeRepository
import prisma from "@/shared/infrastructure/prisma/prismaClient";
export class PrismaNomineeRepository {
    async create(nominee, tx) {
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
    async findById(nomineeId, tx) {
        const db = tx || prisma;
        const nominee = await db.nominee.findUnique({ where: { nomineeId } });
        return nominee ? this.toDomain(nominee) : null;
    }
    async findByMemberId(memberId, tx) {
        const db = tx || prisma;
        const nominees = await db.nominee.findMany({ where: { memberId } });
        return nominees.map((n) => this.toDomain(n));
    }
    async findActiveByMemberId(memberId, tx) {
        const db = tx || prisma;
        const nominees = await db.nominee.findMany({
            where: { memberId, isActive: true },
        });
        return nominees.map((n) => this.toDomain(n));
    }
    async update(nomineeId, data, tx) {
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
    async softDelete(nomineeId, tx) {
        const db = tx || prisma;
        await db.nominee.update({
            where: { nomineeId },
            data: { isActive: false, updatedAt: new Date() },
        });
    }
    async countActiveByMemberId(memberId, tx) {
        const db = tx || prisma;
        return await db.nominee.count({
            where: { memberId, isActive: true },
        });
    }
    toDomain(prismaData) {
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
//# sourceMappingURL=nomineeRepository.js.map