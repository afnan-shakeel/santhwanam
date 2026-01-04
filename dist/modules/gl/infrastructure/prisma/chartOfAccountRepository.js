/**
 * Prisma implementation of ChartOfAccountRepository
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaChartOfAccountRepository {
    async create(account, tx) {
        const db = tx || prisma;
        const created = await db.chartOfAccount.create({
            data: {
                accountCode: account.accountCode,
                accountName: account.accountName,
                accountType: account.accountType,
                accountCategory: account.accountCategory,
                parentAccountId: account.parentAccountId,
                accountLevel: account.accountLevel,
                normalBalance: account.normalBalance,
                isActive: account.isActive,
                isSystemAccount: account.isSystemAccount,
                createdBy: account.createdBy,
                updatedBy: account.updatedBy,
            },
        });
        return this.mapToDomain(created);
    }
    async update(accountId, data, tx) {
        const db = tx || prisma;
        const updated = await db.chartOfAccount.update({
            where: { accountId },
            data: {
                accountName: data.accountName,
                accountCategory: data.accountCategory,
                isActive: data.isActive,
                updatedAt: new Date(),
                updatedBy: data.updatedBy,
            },
        });
        return this.mapToDomain(updated);
    }
    async findById(accountId, tx) {
        const db = tx || prisma;
        const account = await db.chartOfAccount.findUnique({
            where: { accountId },
        });
        return account ? this.mapToDomain(account) : null;
    }
    async findByCode(accountCode, tx) {
        const db = tx || prisma;
        const account = await db.chartOfAccount.findUnique({
            where: { accountCode },
        });
        return account ? this.mapToDomain(account) : null;
    }
    async findAll(tx) {
        const db = tx || prisma;
        const accounts = await db.chartOfAccount.findMany({
            orderBy: { accountCode: 'asc' },
        });
        return accounts.map((account) => this.mapToDomain(account));
    }
    async findByType(accountType, tx) {
        const db = tx || prisma;
        const accounts = await db.chartOfAccount.findMany({
            where: { accountType },
            orderBy: { accountCode: 'asc' },
        });
        return accounts.map((account) => this.mapToDomain(account));
    }
    async findActive(tx) {
        const db = tx || prisma;
        const accounts = await db.chartOfAccount.findMany({
            where: { isActive: true },
            orderBy: { accountCode: 'asc' },
        });
        return accounts.map((account) => this.mapToDomain(account));
    }
    async findSystemAccounts(tx) {
        const db = tx || prisma;
        const accounts = await db.chartOfAccount.findMany({
            where: { isSystemAccount: true },
            orderBy: { accountCode: 'asc' },
        });
        return accounts.map((account) => this.mapToDomain(account));
    }
    async findByParent(parentAccountId, tx) {
        const db = tx || prisma;
        const accounts = await db.chartOfAccount.findMany({
            where: { parentAccountId },
            orderBy: { accountCode: 'asc' },
        });
        return accounts.map((account) => this.mapToDomain(account));
    }
    async updateBalance(accountId, amount, tx) {
        const db = tx || prisma;
        await db.chartOfAccount.update({
            where: { accountId },
            data: {
                currentBalance: { increment: amount },
            },
        });
    }
    async getBalance(accountId, tx) {
        const db = tx || prisma;
        const account = await db.chartOfAccount.findUnique({
            where: { accountId },
            select: { currentBalance: true },
        });
        return account ? Number(account.currentBalance) : 0;
    }
    async deactivate(accountId, userId, tx) {
        const db = tx || prisma;
        const updated = await db.chartOfAccount.update({
            where: { accountId },
            data: {
                isActive: false,
                updatedAt: new Date(),
                updatedBy: userId,
            },
        });
        return this.mapToDomain(updated);
    }
    mapToDomain(prismaAccount) {
        return {
            accountId: prismaAccount.accountId,
            accountCode: prismaAccount.accountCode,
            accountName: prismaAccount.accountName,
            accountType: prismaAccount.accountType,
            accountCategory: prismaAccount.accountCategory,
            parentAccountId: prismaAccount.parentAccountId,
            accountLevel: prismaAccount.accountLevel,
            normalBalance: prismaAccount.normalBalance,
            currentBalance: Number(prismaAccount.currentBalance),
            isActive: prismaAccount.isActive,
            isSystemAccount: prismaAccount.isSystemAccount,
            createdAt: prismaAccount.createdAt,
            createdBy: prismaAccount.createdBy,
            updatedAt: prismaAccount.updatedAt,
            updatedBy: prismaAccount.updatedBy,
        };
    }
}
//# sourceMappingURL=chartOfAccountRepository.js.map