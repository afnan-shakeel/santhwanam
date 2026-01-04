/**
 * API controller for GL module
 */
import { ChartOfAccountResponseDto, ChartOfAccountListResponseDto, ChartOfAccountSearchResponseDto, JournalEntryResponseDto, JournalEntryWithLinesResponseDto, JournalEntrySearchResponseDto, JournalEntryListResponseDto, FiscalPeriodResponseDto, FiscalPeriodListResponseDto, TrialBalanceResponseDto, IncomeStatementResponseDto, BalanceSheetResponseDto, } from './dtos/responseDtos';
import { searchService } from '@/shared/infrastructure/search';
export class GLController {
    chartOfAccountService;
    journalEntryService;
    fiscalPeriodService;
    reportService;
    constructor(chartOfAccountService, journalEntryService, fiscalPeriodService, reportService) {
        this.chartOfAccountService = chartOfAccountService;
        this.journalEntryService = journalEntryService;
        this.fiscalPeriodService = fiscalPeriodService;
        this.reportService = reportService;
    }
    // ===========================
    // Chart of Accounts
    // ===========================
    createAccount = async (req, res) => {
        const userId = req.user?.userId || 'system';
        try {
            const account = await this.chartOfAccountService.createAccount({
                ...req.body,
                createdBy: userId,
            });
            return req.next({ responseSchema: ChartOfAccountResponseDto, data: account, status: 201 });
        }
        catch (err) {
            req.next(err);
        }
    };
    updateAccount = async (req, res) => {
        const userId = req.user?.userId || 'system';
        try {
            const account = await this.chartOfAccountService.updateAccount(req.params.accountId, {
                ...req.body,
                updatedBy: userId,
            });
            return req.next({ responseSchema: ChartOfAccountResponseDto, data: account, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    deactivateAccount = async (req, res) => {
        const userId = req.user?.userId || 'system';
        try {
            const account = await this.chartOfAccountService.deactivateAccount(req.params.accountId, userId);
            return req.next({ responseSchema: ChartOfAccountResponseDto, data: account, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getAccountById = async (req, res) => {
        try {
            const account = await this.chartOfAccountService.getAccountById(req.params.accountId);
            return req.next({ responseSchema: ChartOfAccountResponseDto, data: account, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getAccountByCode = async (req, res) => {
        try {
            const account = await this.chartOfAccountService.getAccountByCode(req.params.accountCode);
            return req.next({ responseSchema: ChartOfAccountResponseDto, data: account, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getAllAccounts = async (req, res) => {
        try {
            const accounts = await this.chartOfAccountService.getAllAccounts();
            return req.next({ responseSchema: ChartOfAccountListResponseDto, data: accounts, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getAccountsByType = async (req, res) => {
        try {
            const accounts = await this.chartOfAccountService.getAccountsByType(req.params.accountType);
            return req.next({ responseSchema: ChartOfAccountListResponseDto, data: accounts, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getActiveAccounts = async (req, res) => {
        try {
            const accounts = await this.chartOfAccountService.getActiveAccounts();
            return req.next({ responseSchema: ChartOfAccountListResponseDto, data: accounts, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    searchAccounts = async (req, res) => {
        try {
            const result = await searchService.execute({ ...req.body, model: 'ChartOfAccount' });
            return req.next({ responseSchema: ChartOfAccountSearchResponseDto, data: result, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    // ===========================
    // Journal Entries
    // ===========================
    createJournalEntry = async (req, res) => {
        const userId = req.user?.userId || 'system';
        try {
            const { entry, lines } = await this.journalEntryService.createJournalEntry({
                ...req.body,
                entryDate: new Date(req.body.entryDate),
                createdBy: userId,
            });
            return req.next({ responseSchema: JournalEntryWithLinesResponseDto, data: { entry, lines }, status: 201 });
        }
        catch (err) {
            req.next(err);
        }
    };
    postJournalEntry = async (req, res) => {
        const userId = req.user?.userId || 'system';
        try {
            const entry = await this.journalEntryService.postJournalEntry(req.params.entryId, userId);
            return req.next({ responseSchema: JournalEntryResponseDto, data: entry, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    reverseJournalEntry = async (req, res) => {
        const userId = req.user?.userId || 'system';
        try {
            const result = await this.journalEntryService.reverseJournalEntry(req.params.entryId, userId, req.body.reason);
            return req.next({ responseSchema: JournalEntryWithLinesResponseDto, data: result, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getJournalEntryById = async (req, res) => {
        try {
            const result = await this.journalEntryService.getJournalEntryById(req.params.entryId);
            return req.next({ responseSchema: JournalEntryWithLinesResponseDto, data: result, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getJournalEntriesByDateRange = async (req, res) => {
        try {
            const entries = await this.journalEntryService.getJournalEntriesByDateRange(new Date(req.query.startDate), new Date(req.query.endDate));
            return req.next({ responseSchema: JournalEntryListResponseDto, data: entries, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    searchJournalEntries = async (req, res) => {
        try {
            const result = await searchService.execute({ ...req.body, model: 'JournalEntry' });
            return req.next({ responseSchema: JournalEntrySearchResponseDto, data: result, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    // ===========================
    // Fiscal Periods
    // ===========================
    createFiscalPeriod = async (req, res) => {
        try {
            const period = await this.fiscalPeriodService.createFiscalPeriod({
                ...req.body,
                startDate: new Date(req.body.startDate),
                endDate: new Date(req.body.endDate),
            });
            return req.next({ responseSchema: FiscalPeriodResponseDto, data: period, status: 201 });
        }
        catch (err) {
            req.next(err);
        }
    };
    closeFiscalPeriod = async (req, res) => {
        const userId = req.user?.userId || 'system';
        try {
            const period = await this.fiscalPeriodService.closeFiscalPeriod(req.params.periodId, userId);
            return req.next({ responseSchema: FiscalPeriodResponseDto, data: period, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getFiscalPeriodById = async (req, res) => {
        try {
            const period = await this.fiscalPeriodService.getFiscalPeriodById(req.params.periodId);
            return req.next({ responseSchema: FiscalPeriodResponseDto, data: period, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getAllFiscalPeriods = async (req, res) => {
        try {
            const periods = await this.fiscalPeriodService.getAllFiscalPeriods();
            return req.next({ responseSchema: FiscalPeriodListResponseDto, data: periods, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getFiscalPeriodsByYear = async (req, res) => {
        try {
            const periods = await this.fiscalPeriodService.getFiscalPeriodsByYear(parseInt(req.params.fiscalYear));
            return req.next({ responseSchema: FiscalPeriodListResponseDto, data: periods, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getCurrentFiscalPeriod = async (req, res) => {
        try {
            const period = await this.fiscalPeriodService.getCurrentFiscalPeriod();
            return req.next({ responseSchema: FiscalPeriodResponseDto, data: period, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    // ===========================
    // Reports
    // ===========================
    getTrialBalance = async (req, res) => {
        const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate) : undefined;
        try {
            const report = await this.reportService.generateTrialBalance(asOfDate);
            return req.next({ responseSchema: TrialBalanceResponseDto, data: report, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getIncomeStatement = async (req, res) => {
        try {
            const report = await this.reportService.generateIncomeStatement(new Date(req.query.startDate), new Date(req.query.endDate));
            return req.next({ responseSchema: IncomeStatementResponseDto, data: report, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
    getBalanceSheet = async (req, res) => {
        const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate) : undefined;
        try {
            const report = await this.reportService.generateBalanceSheet(asOfDate);
            return req.next({ responseSchema: BalanceSheetResponseDto, data: report, status: 200 });
        }
        catch (err) {
            req.next(err);
        }
    };
}
//# sourceMappingURL=controller.js.map