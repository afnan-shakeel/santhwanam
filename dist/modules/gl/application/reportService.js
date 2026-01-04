/**
 * Application service for GL reports
 */
import { AccountType } from '../domain/entities';
export class GLReportService {
    chartOfAccountRepo;
    journalEntryLineRepo;
    constructor(chartOfAccountRepo, journalEntryLineRepo) {
        this.chartOfAccountRepo = chartOfAccountRepo;
        this.journalEntryLineRepo = journalEntryLineRepo;
    }
    /**
     * Generate trial balance
     */
    async generateTrialBalance(asOfDate) {
        const accounts = await this.chartOfAccountRepo.findActive();
        const items = [];
        let totalDebit = 0;
        let totalCredit = 0;
        for (const account of accounts) {
            const balance = account.currentBalance;
            let debitBalance = 0;
            let creditBalance = 0;
            if (account.normalBalance === 'Debit') {
                debitBalance = balance >= 0 ? balance : 0;
                creditBalance = balance < 0 ? Math.abs(balance) : 0;
            }
            else {
                creditBalance = balance >= 0 ? balance : 0;
                debitBalance = balance < 0 ? Math.abs(balance) : 0;
            }
            if (debitBalance !== 0 || creditBalance !== 0) {
                items.push({
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    accountType: account.accountType,
                    debitBalance,
                    creditBalance,
                });
                totalDebit += debitBalance;
                totalCredit += creditBalance;
            }
        }
        return { items, totalDebit, totalCredit };
    }
    /**
     * Generate income statement
     */
    async generateIncomeStatement(startDate, endDate) {
        const revenueAccounts = await this.chartOfAccountRepo.findByType(AccountType.Revenue);
        const expenseAccounts = await this.chartOfAccountRepo.findByType(AccountType.Expense);
        const revenue = [];
        const expenses = [];
        let totalRevenue = 0;
        let totalExpenses = 0;
        for (const account of revenueAccounts) {
            const amount = account.currentBalance;
            if (amount !== 0) {
                revenue.push({
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    amount,
                });
                totalRevenue += amount;
            }
        }
        for (const account of expenseAccounts) {
            const amount = account.currentBalance;
            if (amount !== 0) {
                expenses.push({
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    amount,
                });
                totalExpenses += amount;
            }
        }
        const netIncome = totalRevenue - totalExpenses;
        return { revenue, expenses, totalRevenue, totalExpenses, netIncome };
    }
    /**
     * Generate balance sheet
     */
    async generateBalanceSheet(asOfDate) {
        const assetAccounts = await this.chartOfAccountRepo.findByType(AccountType.Asset);
        const liabilityAccounts = await this.chartOfAccountRepo.findByType(AccountType.Liability);
        const equityAccounts = await this.chartOfAccountRepo.findByType(AccountType.Equity);
        const assets = [];
        const liabilities = [];
        const equity = [];
        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;
        for (const account of assetAccounts) {
            const amount = account.currentBalance;
            if (amount !== 0) {
                assets.push({
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    amount,
                });
                totalAssets += amount;
            }
        }
        for (const account of liabilityAccounts) {
            const amount = account.currentBalance;
            if (amount !== 0) {
                liabilities.push({
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    amount,
                });
                totalLiabilities += amount;
            }
        }
        for (const account of equityAccounts) {
            const amount = account.currentBalance;
            if (amount !== 0) {
                equity.push({
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    amount,
                });
                totalEquity += amount;
            }
        }
        return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
    }
}
//# sourceMappingURL=reportService.js.map