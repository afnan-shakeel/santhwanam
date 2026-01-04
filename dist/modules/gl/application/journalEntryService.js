/**
 * Application service for Journal Entry management
 */
import { EntryStatus } from '../domain/entities';
import { AppError } from '@/shared/utils/error-handling/AppError';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class JournalEntryService {
    journalEntryRepo;
    journalEntryLineRepo;
    chartOfAccountRepo;
    constructor(journalEntryRepo, journalEntryLineRepo, chartOfAccountRepo) {
        this.journalEntryRepo = journalEntryRepo;
        this.journalEntryLineRepo = journalEntryLineRepo;
        this.chartOfAccountRepo = chartOfAccountRepo;
    }
    /**
     * Create a new journal entry with lines
     */
    async createJournalEntry(data) {
        // Validate lines
        if (!data.lines || data.lines.length < 2) {
            throw new AppError('Journal entry must have at least 2 lines', 400);
        }
        // Calculate totals
        let totalDebit = 0;
        let totalCredit = 0;
        for (const line of data.lines) {
            totalDebit += line.debitAmount;
            totalCredit += line.creditAmount;
            if (line.debitAmount < 0 || line.creditAmount < 0) {
                throw new AppError('Debit and credit amounts must be non-negative', 400);
            }
            if (line.debitAmount > 0 && line.creditAmount > 0) {
                throw new AppError('A line cannot have both debit and credit amounts', 400);
            }
            if (line.debitAmount === 0 && line.creditAmount === 0) {
                throw new AppError('A line must have either debit or credit amount', 400);
            }
        }
        // Validate balance (debits = credits)
        if (Math.abs(totalDebit - totalCredit) >= 0.01) {
            throw new AppError(`Journal entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`, 400);
        }
        return await prisma.$transaction(async (tx) => {
            // Validate accounts exist and get account details
            const lineDataWithAccounts = [];
            for (const line of data.lines) {
                const account = await this.chartOfAccountRepo.findByCode(line.accountCode, tx);
                if (!account) {
                    throw new AppError(`Account ${line.accountCode} not found`, 404);
                }
                if (!account.isActive) {
                    throw new AppError(`Account ${line.accountCode} is inactive`, 400);
                }
                lineDataWithAccounts.push({
                    accountId: account.accountId,
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    debitAmount: line.debitAmount,
                    creditAmount: line.creditAmount,
                    description: line.description,
                });
            }
            // Create journal entry
            const entry = await this.journalEntryRepo.create({
                entryDate: data.entryDate,
                postingDate: null,
                description: data.description,
                reference: data.reference || null,
                sourceModule: data.sourceModule,
                sourceEntityId: data.sourceEntityId || null,
                sourceTransactionType: data.sourceTransactionType,
                entryStatus: EntryStatus.Draft,
                reversedEntryId: null,
                reversalReason: null,
                reversedAt: null,
                reversedBy: null,
                totalDebit,
                totalCredit,
                createdBy: data.createdBy,
                postedAt: null,
                postedBy: null,
            }, tx);
            // Create journal entry lines
            const lines = await this.journalEntryLineRepo.createMany(lineDataWithAccounts.map((lineData, index) => ({
                entryId: entry.entryId,
                lineNumber: index + 1,
                ...lineData,
            })), tx);
            // Auto-post if requested
            if (data.autoPost) {
                await this.postJournalEntry(entry.entryId, data.createdBy, tx);
                // Update account balances
                for (const line of lines) {
                    const account = await this.chartOfAccountRepo.findById(line.accountId, tx);
                    if (!account)
                        continue;
                    const netAmount = account.normalBalance === 'Debit'
                        ? line.debitAmount - line.creditAmount
                        : line.creditAmount - line.debitAmount;
                    await this.chartOfAccountRepo.updateBalance(line.accountId, netAmount, tx);
                }
            }
            return { entry, lines };
        });
    }
    /**
     * Post a journal entry
     */
    async postJournalEntry(entryId, userId, tx) {
        const db = tx || prisma;
        const entry = await this.journalEntryRepo.findById(entryId, tx);
        if (!entry) {
            throw new AppError('Journal entry not found', 404);
        }
        if (entry.entryStatus !== EntryStatus.Draft) {
            throw new AppError('Only draft entries can be posted', 400);
        }
        if (!entry.isBalanced) {
            throw new AppError('Cannot post unbalanced entry', 400);
        }
        // Post the entry
        const postedEntry = await this.journalEntryRepo.post(entryId, userId, tx);
        // Update account balances if not in transaction (transaction handles it)
        if (!tx) {
            const lines = await this.journalEntryLineRepo.findByEntry(entryId);
            for (const line of lines) {
                const account = await this.chartOfAccountRepo.findById(line.accountId);
                if (!account)
                    continue;
                const netAmount = account.normalBalance === 'Debit'
                    ? line.debitAmount - line.creditAmount
                    : line.creditAmount - line.debitAmount;
                await this.chartOfAccountRepo.updateBalance(line.accountId, netAmount);
            }
        }
        return postedEntry;
    }
    /**
     * Reverse a journal entry
     */
    async reverseJournalEntry(entryId, userId, reason) {
        return await prisma.$transaction(async (tx) => {
            const entry = await this.journalEntryRepo.findById(entryId, tx);
            if (!entry) {
                throw new AppError('Journal entry not found', 404);
            }
            if (entry.entryStatus !== EntryStatus.Posted) {
                throw new AppError('Only posted entries can be reversed', 400);
            }
            // Get original lines
            const originalLines = await this.journalEntryLineRepo.findByEntry(entryId, tx);
            // Create reversal entry with swapped debits/credits
            const reversalLines = originalLines.map((line) => ({
                accountCode: line.accountCode,
                debitAmount: line.creditAmount, // Swap
                creditAmount: line.debitAmount, // Swap
                description: `Reversal: ${line.description}`,
            }));
            const reversalData = {
                entryDate: new Date(),
                description: `Reversal of ${entry.entryNumber}: ${entry.description}`,
                reference: entry.reference || undefined,
                sourceModule: entry.sourceModule,
                sourceEntityId: entry.sourceEntityId || undefined,
                sourceTransactionType: `Reversal_${entry.sourceTransactionType}`,
                lines: reversalLines,
                createdBy: userId,
                autoPost: true,
            };
            const { entry: reversalEntry } = await this.createJournalEntry(reversalData);
            // Mark original as reversed
            const reversedEntry = await this.journalEntryRepo.reverse(entryId, userId, reason, tx);
            // Link reversal to original
            await this.journalEntryRepo.update(reversalEntry.entryId, { reversedEntryId: entryId }, tx);
            return { original: reversedEntry, reversal: reversalEntry };
        });
    }
    /**
     * Get journal entry by ID
     */
    async getJournalEntryById(entryId) {
        const entry = await this.journalEntryRepo.findById(entryId);
        if (!entry) {
            throw new AppError('Journal entry not found', 404);
        }
        const lines = await this.journalEntryLineRepo.findByEntry(entryId);
        return { entry, lines };
    }
    /**
     * Get journal entries by date range
     */
    async getJournalEntriesByDateRange(startDate, endDate) {
        return await this.journalEntryRepo.findByDateRange(startDate, endDate);
    }
    /**
     * Get journal entries by account
     */
    async getJournalEntriesByAccount(accountId) {
        return await this.journalEntryRepo.findByAccount(accountId);
    }
    /**
     * Get journal entries by source
     */
    async getJournalEntriesBySource(sourceModule, sourceEntityId) {
        return await this.journalEntryRepo.findBySource(sourceModule, sourceEntityId);
    }
}
//# sourceMappingURL=journalEntryService.js.map