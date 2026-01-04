// Infrastructure: Prisma implementation of MemberDocumentRepository
import prisma from "@/shared/infrastructure/prisma/prismaClient";
export class PrismaMemberDocumentRepository {
    async create(document, tx) {
        const db = tx || prisma;
        const created = await db.memberDocument.create({
            data: {
                documentId: document.documentId,
                memberId: document.memberId,
                nomineeId: document.nomineeId,
                documentType: document.documentType,
                documentCategory: document.documentCategory,
                documentName: document.documentName,
                fileUrl: document.fileUrl,
                fileSize: document.fileSize,
                mimeType: document.mimeType,
                uploadedBy: document.uploadedBy,
                uploadedAt: document.uploadedAt,
                verificationStatus: document.verificationStatus,
                verifiedBy: document.verifiedBy,
                verifiedAt: document.verifiedAt,
                rejectionReason: document.rejectionReason,
                expiryDate: document.expiryDate,
                isActive: document.isActive,
            },
        });
        return this.toDomain(created);
    }
    async findById(documentId, tx) {
        const db = tx || prisma;
        const document = await db.memberDocument.findUnique({
            where: { documentId },
        });
        return document ? this.toDomain(document) : null;
    }
    async findByMemberId(memberId, tx) {
        const db = tx || prisma;
        const documents = await db.memberDocument.findMany({
            where: { memberId },
        });
        return documents.map((d) => this.toDomain(d));
    }
    async findActiveByMemberId(memberId, tx) {
        const db = tx || prisma;
        const documents = await db.memberDocument.findMany({
            where: { memberId, isActive: true },
        });
        return documents.map((d) => this.toDomain(d));
    }
    async findByMemberAndCategory(memberId, category, tx) {
        const db = tx || prisma;
        const documents = await db.memberDocument.findMany({
            where: { memberId, documentCategory: category },
        });
        return documents.map((d) => this.toDomain(d));
    }
    async findActiveByMemberAndCategory(memberId, category, tx) {
        const db = tx || prisma;
        const documents = await db.memberDocument.findMany({
            where: {
                memberId,
                documentCategory: category,
                isActive: true,
            },
        });
        return documents.map((d) => this.toDomain(d));
    }
    async findByNomineeId(nomineeId, tx) {
        const db = tx || prisma;
        const documents = await db.memberDocument.findMany({
            where: { nomineeId },
        });
        return documents.map((d) => this.toDomain(d));
    }
    async update(documentId, data, tx) {
        const db = tx || prisma;
        const document = await db.memberDocument.update({
            where: { documentId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
        return this.toDomain(document);
    }
    async softDelete(documentId, tx) {
        const db = tx || prisma;
        await db.memberDocument.update({
            where: { documentId },
            data: { isActive: false, updatedAt: new Date() },
        });
    }
    async softDeleteByNomineeId(nomineeId, tx) {
        const db = tx || prisma;
        await db.memberDocument.updateMany({
            where: { nomineeId },
            data: { isActive: false, updatedAt: new Date() },
        });
    }
    toDomain(prismaData) {
        return {
            documentId: prismaData.documentId,
            memberId: prismaData.memberId,
            nomineeId: prismaData.nomineeId,
            documentType: prismaData.documentType,
            documentCategory: prismaData.documentCategory,
            documentName: prismaData.documentName,
            fileUrl: prismaData.fileUrl,
            fileSize: prismaData.fileSize,
            mimeType: prismaData.mimeType,
            uploadedBy: prismaData.uploadedBy,
            uploadedAt: prismaData.uploadedAt,
            verificationStatus: prismaData.verificationStatus,
            verifiedBy: prismaData.verifiedBy,
            verifiedAt: prismaData.verifiedAt,
            rejectionReason: prismaData.rejectionReason,
            expiryDate: prismaData.expiryDate,
            isActive: prismaData.isActive,
            createdAt: prismaData.createdAt,
            updatedAt: prismaData.updatedAt,
        };
    }
}
//# sourceMappingURL=memberDocumentRepository.js.map