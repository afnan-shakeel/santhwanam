/**
 * Prisma implementation of DeathClaimDocumentRepository
 */

import { DeathClaimDocumentRepository } from '../../domain/repositories';
import { DeathClaimDocument } from '../../domain/entities';
import prisma from '@/shared/infrastructure/prisma/prismaClient';

export class PrismaDeathClaimDocumentRepository implements DeathClaimDocumentRepository {
  async create(data: Omit<DeathClaimDocument, 'uploadedAt'>, tx?: any): Promise<DeathClaimDocument> {
    const db = tx || prisma;

    const document = await db.deathClaimDocument.create({
      data: {
        documentId: data.documentId,
        claimId: data.claimId,
        documentType: data.documentType,
        documentName: data.documentName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedBy: data.uploadedBy,
        verificationStatus: data.verificationStatus,
        verifiedBy: data.verifiedBy,
        verifiedAt: data.verifiedAt,
        rejectionReason: data.rejectionReason,
      },
    });

    return this.mapToDomain(document);
  }

  async findById(documentId: string, tx?: any): Promise<DeathClaimDocument | null> {
    const db = tx || prisma;

    const document = await db.deathClaimDocument.findUnique({
      where: { documentId },
    });

    return document ? this.mapToDomain(document) : null;
  }

  async findByClaimId(claimId: string, tx?: any): Promise<DeathClaimDocument[]> {
    const db = tx || prisma;

    const documents = await db.deathClaimDocument.findMany({
      where: { claimId },
      orderBy: { uploadedAt: 'asc' },
    });

    return documents.map((d: any) => this.mapToDomain(d));
  }

  async findByClaimIdAndType(claimId: string, documentType: string, tx?: any): Promise<DeathClaimDocument | null> {
    const db = tx || prisma;

    const document = await db.deathClaimDocument.findFirst({
      where: {
        claimId,
        documentType,
      },
    });

    return document ? this.mapToDomain(document) : null;
  }

  async update(documentId: string, data: Partial<DeathClaimDocument>, tx?: any): Promise<DeathClaimDocument> {
    const db = tx || prisma;

    const document = await db.deathClaimDocument.update({
      where: { documentId },
      data,
    });

    return this.mapToDomain(document);
  }

  async delete(documentId: string, tx?: any): Promise<void> {
    const db = tx || prisma;

    await db.deathClaimDocument.delete({
      where: { documentId },
    });
  }

  private mapToDomain(prismaData: any): DeathClaimDocument {
    return {
      documentId: prismaData.documentId,
      claimId: prismaData.claimId,
      documentType: prismaData.documentType,
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
    };
  }
}
