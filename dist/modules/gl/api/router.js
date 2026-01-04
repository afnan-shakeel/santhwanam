/**
 * API router for GL module
 */
import { Router } from 'express';
import { GLController } from './controller';
import { ChartOfAccountService } from '../application/chartOfAccountService';
import { JournalEntryService } from '../application/journalEntryService';
import { FiscalPeriodService } from '../application/fiscalPeriodService';
import { GLReportService } from '../application/reportService';
import { PrismaChartOfAccountRepository } from '../infrastructure/prisma/chartOfAccountRepository';
import { PrismaJournalEntryRepository } from '../infrastructure/prisma/journalEntryRepository';
import { PrismaJournalEntryLineRepository } from '../infrastructure/prisma/journalEntryLineRepository';
import { PrismaFiscalPeriodRepository } from '../infrastructure/prisma/fiscalPeriodRepository';
import { validateBody } from '@/shared/middleware/validateZod';
import * as validators from './validators';
import { searchValidationSchema } from '@/shared/validators/searchValidator';
// Initialize repositories
const chartOfAccountRepo = new PrismaChartOfAccountRepository();
const journalEntryRepo = new PrismaJournalEntryRepository();
const journalEntryLineRepo = new PrismaJournalEntryLineRepository();
const fiscalPeriodRepo = new PrismaFiscalPeriodRepository();
// Initialize services
const chartOfAccountService = new ChartOfAccountService(chartOfAccountRepo);
const journalEntryService = new JournalEntryService(journalEntryRepo, journalEntryLineRepo, chartOfAccountRepo);
const fiscalPeriodService = new FiscalPeriodService(fiscalPeriodRepo);
const reportService = new GLReportService(chartOfAccountRepo, journalEntryLineRepo);
// Initialize controller
const glController = new GLController(chartOfAccountService, journalEntryService, fiscalPeriodService, reportService);
const router = Router();
// ===========================
// Chart of Accounts Routes
// ===========================
router.post('/accounts', validateBody(validators.createAccountSchema), glController.createAccount);
router.patch('/accounts/:accountId', validateBody(validators.updateAccountSchema), glController.updateAccount);
router.delete('/accounts/:accountId', validateBody(validators.accountIdSchema), glController.deactivateAccount);
router.get('/accounts/:accountId', validateBody(validators.accountIdSchema), glController.getAccountById);
router.get('/accounts/code/:accountCode', validateBody(validators.accountCodeSchema), glController.getAccountByCode);
router.get('/accounts', glController.getAllAccounts);
router.get('/accounts/type/:accountType', validateBody(validators.accountTypeSchema), glController.getAccountsByType);
router.get('/accounts/active/list', glController.getActiveAccounts);
router.post('/accounts/search', validateBody(searchValidationSchema), glController.searchAccounts);
// ===========================
// Journal Entries Routes
// ===========================
router.post('/entries', validateBody(validators.createJournalEntrySchema), glController.createJournalEntry);
router.post('/entries/:entryId/post', validateBody(validators.postJournalEntrySchema), glController.postJournalEntry);
router.post('/entries/:entryId/reverse', validateBody(validators.reverseJournalEntrySchema), glController.reverseJournalEntry);
router.get('/entries/:entryId', validateBody(validators.entryIdSchema), glController.getJournalEntryById);
router.get('/entries', validateBody(validators.dateRangeSchema), glController.getJournalEntriesByDateRange);
router.post('/entries/search', validateBody(searchValidationSchema), glController.searchJournalEntries);
// ===========================
// Fiscal Periods Routes
// ===========================
router.post('/periods', validateBody(validators.createFiscalPeriodSchema), glController.createFiscalPeriod);
router.post('/periods/:periodId/close', validateBody(validators.closePeriodSchema), glController.closeFiscalPeriod);
router.get('/periods/:periodId', validateBody(validators.periodIdSchema), glController.getFiscalPeriodById);
router.get('/periods', glController.getAllFiscalPeriods);
router.get('/periods/year/:fiscalYear', validateBody(validators.fiscalYearSchema), glController.getFiscalPeriodsByYear);
router.get('/periods/current/active', glController.getCurrentFiscalPeriod);
// ===========================
// Reports Routes
// ===========================
router.get('/reports/trial-balance', validateBody(validators.trialBalanceSchema), glController.getTrialBalance);
router.get('/reports/income-statement', validateBody(validators.incomeStatementSchema), glController.getIncomeStatement);
router.get('/reports/balance-sheet', validateBody(validators.balanceSheetSchema), glController.getBalanceSheet);
export default router;
//# sourceMappingURL=router.js.map