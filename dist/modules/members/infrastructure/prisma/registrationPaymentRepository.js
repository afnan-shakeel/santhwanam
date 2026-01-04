// Infrastructure: Prisma implementation of RegistrationPaymentRepository
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { Prisma } from "../../../../generated/prisma/client";
export class PrismaRegistrationPaymentRepository {
    async create(payment, tx) {
        const db = tx || prisma;
        const created = await db.registrationPayment.create({
            data: {
                paymentId: payment.paymentId,
                memberId: payment.memberId,
                registrationFee: new Prisma.Decimal(payment.registrationFee),
                advanceDeposit: new Prisma.Decimal(payment.advanceDeposit),
                totalAmount: new Prisma.Decimal(payment.totalAmount),
                collectedBy: payment.collectedBy,
                collectionDate: payment.collectionDate,
                collectionMode: payment.collectionMode,
                referenceNumber: payment.referenceNumber,
                approvalStatus: payment.approvalStatus,
                approvedBy: payment.approvedBy,
                approvedAt: payment.approvedAt,
                rejectionReason: payment.rejectionReason,
            },
        });
        return this.toDomain(created);
    }
    async findById(paymentId, tx) {
        const db = tx || prisma;
        const payment = await db.registrationPayment.findUnique({
            where: { paymentId },
        });
        return payment ? this.toDomain(payment) : null;
    }
    async findByMemberId(memberId, tx) {
        const db = tx || prisma;
        const payment = await db.registrationPayment.findUnique({
            where: { memberId },
        });
        return payment ? this.toDomain(payment) : null;
    }
    async update(paymentId, data, tx) {
        const db = tx || prisma;
        const updateData = {
            ...data,
            updatedAt: new Date(),
        };
        // Convert numbers to Decimal for Prisma
        if (data.registrationFee !== undefined) {
            updateData.registrationFee = new Prisma.Decimal(data.registrationFee);
        }
        if (data.advanceDeposit !== undefined) {
            updateData.advanceDeposit = new Prisma.Decimal(data.advanceDeposit);
        }
        if (data.totalAmount !== undefined) {
            updateData.totalAmount = new Prisma.Decimal(data.totalAmount);
        }
        const payment = await db.registrationPayment.update({
            where: { paymentId },
            data: updateData,
        });
        return this.toDomain(payment);
    }
    toDomain(prismaData) {
        return {
            paymentId: prismaData.paymentId,
            memberId: prismaData.memberId,
            registrationFee: Number(prismaData.registrationFee),
            advanceDeposit: Number(prismaData.advanceDeposit),
            totalAmount: Number(prismaData.totalAmount),
            collectedBy: prismaData.collectedBy,
            collectionDate: prismaData.collectionDate,
            collectionMode: prismaData.collectionMode,
            referenceNumber: prismaData.referenceNumber,
            approvalStatus: prismaData.approvalStatus,
            approvedBy: prismaData.approvedBy,
            approvedAt: prismaData.approvedAt,
            rejectionReason: prismaData.rejectionReason,
            createdAt: prismaData.createdAt,
            updatedAt: prismaData.updatedAt,
        };
    }
}
//# sourceMappingURL=registrationPaymentRepository.js.map