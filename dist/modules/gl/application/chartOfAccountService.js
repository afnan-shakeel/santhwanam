/**
 * Application service for Chart of Accounts management
 */
import { STANDARD_CHART_OF_ACCOUNTS } from '../domain/entities';
import { AppError } from '@/shared/utils/error-handling/AppError';
export class ChartOfAccountService {
    chartOfAccountRepo;
    constructor(chartOfAccountRepo) {
        this.chartOfAccountRepo = chartOfAccountRepo;
    }
    /**
     * Create a new chart of account
     */
    async createAccount(data) {
        // Check if account code already exists
        const existing = await this.chartOfAccountRepo.findByCode(data.accountCode);
        if (existing) {
            throw new AppError('Account code already exists', 400);
        }
        // Determine account level based on parent
        let accountLevel = 1;
        if (data.parentAccountId) {
            const parent = await this.chartOfAccountRepo.findById(data.parentAccountId);
            if (!parent) {
                throw new AppError('Parent account not found', 404);
            }
            accountLevel = parent.accountLevel + 1;
        }
        return await this.chartOfAccountRepo.create({
            accountCode: data.accountCode,
            accountName: data.accountName,
            accountType: data.accountType,
            accountCategory: data.accountCategory || null,
            parentAccountId: data.parentAccountId || null,
            accountLevel,
            normalBalance: data.normalBalance,
            isActive: true,
            isSystemAccount: data.isSystemAccount || false,
            createdBy: data.createdBy,
            updatedBy: null,
        });
    }
    /**
     * Update an existing account
     */
    async updateAccount(accountId, data) {
        const account = await this.chartOfAccountRepo.findById(accountId);
        if (!account) {
            throw new AppError('Account not found', 404);
        }
        if (account.isSystemAccount) {
            throw new AppError('Cannot update system accounts', 403);
        }
        return await this.chartOfAccountRepo.update(accountId, {
            accountName: data.accountName,
            accountCategory: data.accountCategory,
            updatedBy: data.updatedBy,
        });
    }
    /**
     * Deactivate an account
     */
    async deactivateAccount(accountId, userId) {
        const account = await this.chartOfAccountRepo.findById(accountId);
        if (!account) {
            throw new AppError('Account not found', 404);
        }
        if (account.isSystemAccount) {
            throw new AppError('Cannot deactivate system accounts', 403);
        }
        // Check if account has child accounts
        const children = await this.chartOfAccountRepo.findByParent(accountId);
        if (children.length > 0) {
            throw new AppError('Cannot deactivate account with child accounts', 400);
        }
        // Check if account has non-zero balance
        const balance = await this.chartOfAccountRepo.getBalance(accountId);
        if (Math.abs(balance) > 0.01) {
            throw new AppError('Cannot deactivate account with non-zero balance', 400);
        }
        return await this.chartOfAccountRepo.deactivate(accountId, userId);
    }
    /**
     * Get account by ID
     */
    async getAccountById(accountId) {
        const account = await this.chartOfAccountRepo.findById(accountId);
        if (!account) {
            throw new AppError('Account not found', 404);
        }
        return account;
    }
    /**
     * Get account by code
     */
    async getAccountByCode(accountCode) {
        const account = await this.chartOfAccountRepo.findByCode(accountCode);
        if (!account) {
            throw new AppError('Account not found', 404);
        }
        return account;
    }
    /**
     * Get all accounts
     */
    async getAllAccounts() {
        return await this.chartOfAccountRepo.findAll();
    }
    /**
     * Get accounts by type
     */
    async getAccountsByType(accountType) {
        return await this.chartOfAccountRepo.findByType(accountType);
    }
    /**
     * Get active accounts
     */
    async getActiveAccounts() {
        return await this.chartOfAccountRepo.findActive();
    }
    /**
     * Get system accounts
     */
    async getSystemAccounts() {
        return await this.chartOfAccountRepo.findSystemAccounts();
    }
    /**
     * Get child accounts
     */
    async getChildAccounts(parentAccountId) {
        return await this.chartOfAccountRepo.findByParent(parentAccountId);
    }
    /**
     * Get account balance
     */
    async getAccountBalance(accountId) {
        const account = await this.chartOfAccountRepo.findById(accountId);
        if (!account) {
            throw new AppError('Account not found', 404);
        }
        return account.currentBalance;
    }
    /**
     * Seed standard chart of accounts
     */
    async seedStandardAccounts(createdBy) {
        const accounts = [];
        for (const accountData of STANDARD_CHART_OF_ACCOUNTS) {
            // Check if account already exists
            const existing = await this.chartOfAccountRepo.findByCode(accountData.accountCode);
            if (existing) {
                accounts.push(existing);
                continue;
            }
            const account = await this.chartOfAccountRepo.create({
                accountCode: accountData.accountCode,
                accountName: accountData.accountName,
                accountType: accountData.accountType,
                accountCategory: accountData.accountCategory,
                parentAccountId: null,
                accountLevel: 1,
                normalBalance: accountData.normalBalance,
                isActive: true,
                isSystemAccount: accountData.isSystemAccount,
                createdBy,
                updatedBy: null,
            });
            accounts.push(account);
        }
        return accounts;
    }
}
//# sourceMappingURL=chartOfAccountService.js.map