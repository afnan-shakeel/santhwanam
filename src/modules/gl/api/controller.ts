/**
 * API controller for GL module
 */

import { Request, Response } from 'express';
import {
  ChartOfAccountResponseDto,
  ChartOfAccountListResponseDto,
  ChartOfAccountSearchResponseDto,
  JournalEntryResponseDto,
  JournalEntryWithLinesResponseDto,
  JournalEntrySearchResponseDto,
  JournalEntryListResponseDto,
  FiscalPeriodResponseDto,
  FiscalPeriodListResponseDto,
  TrialBalanceResponseDto,
  IncomeStatementResponseDto,
  BalanceSheetResponseDto,
} from './dtos/responseDtos'
import { ChartOfAccountService } from '../application/chartOfAccountService';
import { JournalEntryService } from '../application/journalEntryService';
import { FiscalPeriodService } from '../application/fiscalPeriodService';
import { GLReportService } from '../application/reportService';
import { searchService } from '@/shared/infrastructure/search';

export class GLController {
  constructor(
    private chartOfAccountService: ChartOfAccountService,
    private journalEntryService: JournalEntryService,
    private fiscalPeriodService: FiscalPeriodService,
    private reportService: GLReportService
  ) {}

  // ===========================
  // Chart of Accounts
  // ===========================

  createAccount = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 'system';
    try {
      const account = await this.chartOfAccountService.createAccount({
        ...req.body,
        createdBy: userId,
      });
      return (req as any).next({ responseSchema: ChartOfAccountResponseDto, data: account, status: 201 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  updateAccount = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 'system';
    try {
      const account = await this.chartOfAccountService.updateAccount(req.params.accountId, {
        ...req.body,
        updatedBy: userId,
      });
      return (req as any).next({ responseSchema: ChartOfAccountResponseDto, data: account, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  deactivateAccount = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 'system';
    try {
      const account = await this.chartOfAccountService.deactivateAccount(req.params.accountId, userId);
      return (req as any).next({ responseSchema: ChartOfAccountResponseDto, data: account, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getAccountById = async (req: Request, res: Response) => {
    try {
      const account = await this.chartOfAccountService.getAccountById(req.params.accountId);
      return (req as any).next({ responseSchema: ChartOfAccountResponseDto, data: account, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getAccountByCode = async (req: Request, res: Response) => {
    try {
      const account = await this.chartOfAccountService.getAccountByCode(req.params.accountCode);
      return (req as any).next({ responseSchema: ChartOfAccountResponseDto, data: account, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getAllAccounts = async (req: Request, res: Response) => {
    try {
      const accounts = await this.chartOfAccountService.getAllAccounts();
      return (req as any).next({ responseSchema: ChartOfAccountListResponseDto, data: accounts, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getAccountsByType = async (req: Request, res: Response) => {
    try {
      const accounts = await this.chartOfAccountService.getAccountsByType(req.params.accountType as any);
      return (req as any).next({ responseSchema: ChartOfAccountListResponseDto, data: accounts, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getActiveAccounts = async (req: Request, res: Response) => {
    try {
      const accounts = await this.chartOfAccountService.getActiveAccounts();
      return (req as any).next({ responseSchema: ChartOfAccountListResponseDto, data: accounts, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  searchAccounts = async (req: Request, res: Response) => {
    try {
      const result = await searchService.execute({ ...req.body, model: 'ChartOfAccount' });
      return (req as any).next({ responseSchema: ChartOfAccountSearchResponseDto, data: result, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  // ===========================
  // Journal Entries
  // ===========================

  createJournalEntry = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 'system';
    try {
      const { entry, lines } = await this.journalEntryService.createJournalEntry({
        ...req.body,
        entryDate: new Date(req.body.entryDate),
        createdBy: userId,
      });
      return (req as any).next({ responseSchema: JournalEntryWithLinesResponseDto, data: { entry, lines }, status: 201 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  postJournalEntry = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 'system';
    try {
      const entry = await this.journalEntryService.postJournalEntry(req.params.entryId, userId);
      return (req as any).next({ responseSchema: JournalEntryResponseDto, data: entry, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  reverseJournalEntry = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 'system';
    try {
      const result = await this.journalEntryService.reverseJournalEntry(
        req.params.entryId,
        userId,
        req.body.reason
      );
      return (req as any).next({ responseSchema: JournalEntryWithLinesResponseDto, data: result, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getJournalEntryById = async (req: Request, res: Response) => {
    try {
      const result = await this.journalEntryService.getJournalEntryById(req.params.entryId);
      return (req as any).next({ responseSchema: JournalEntryWithLinesResponseDto, data: result, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getJournalEntriesByDateRange = async (req: Request, res: Response) => {
    try {
      const entries = await this.journalEntryService.getJournalEntriesByDateRange(
        new Date(req.query.startDate as string),
        new Date(req.query.endDate as string)
      );
      return (req as any).next({ responseSchema: JournalEntryListResponseDto, data: entries, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  searchJournalEntries = async (req: Request, res: Response) => {
    try {
      const result = await searchService.execute({ ...req.body, model: 'JournalEntry' });
      return (req as any).next({ responseSchema: JournalEntrySearchResponseDto, data: result, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  // ===========================
  // Fiscal Periods
  // ===========================

  createFiscalPeriod = async (req: Request, res: Response) => {
    try {
      const period = await this.fiscalPeriodService.createFiscalPeriod({
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });
      return (req as any).next({ responseSchema: FiscalPeriodResponseDto, data: period, status: 201 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  closeFiscalPeriod = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 'system';
    try {
      const period = await this.fiscalPeriodService.closeFiscalPeriod(req.params.periodId, userId);
      return (req as any).next({ responseSchema: FiscalPeriodResponseDto, data: period, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getFiscalPeriodById = async (req: Request, res: Response) => {
    try {
      const period = await this.fiscalPeriodService.getFiscalPeriodById(req.params.periodId);
      return (req as any).next({ responseSchema: FiscalPeriodResponseDto, data: period, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getAllFiscalPeriods = async (req: Request, res: Response) => {
    try {
      const periods = await this.fiscalPeriodService.getAllFiscalPeriods();
      return (req as any).next({ responseSchema: FiscalPeriodListResponseDto, data: periods, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getFiscalPeriodsByYear = async (req: Request, res: Response) => {
    try {
      const periods = await this.fiscalPeriodService.getFiscalPeriodsByYear(
        parseInt(req.params.fiscalYear)
      );
      return (req as any).next({ responseSchema: FiscalPeriodListResponseDto, data: periods, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getCurrentFiscalPeriod = async (req: Request, res: Response) => {
    try {
      const period = await this.fiscalPeriodService.getCurrentFiscalPeriod();
      return (req as any).next({ responseSchema: FiscalPeriodResponseDto, data: period, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  // ===========================
  // Reports
  // ===========================

  getTrialBalance = async (req: Request, res: Response) => {
    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : undefined;
    try {
      const report = await this.reportService.generateTrialBalance(asOfDate);
      return (req as any).next({ responseSchema: TrialBalanceResponseDto, data: report, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getIncomeStatement = async (req: Request, res: Response) => {
    try {
      const report = await this.reportService.generateIncomeStatement(
        new Date(req.query.startDate as string),
        new Date(req.query.endDate as string)
      );
      return (req as any).next({ responseSchema: IncomeStatementResponseDto, data: report, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };

  getBalanceSheet = async (req: Request, res: Response) => {
    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : undefined;
    try {
      const report = await this.reportService.generateBalanceSheet(asOfDate);
      return (req as any).next({ responseSchema: BalanceSheetResponseDto, data: report, status: 200 });
    } catch (err) {
      (req as any).next(err)
    }
  };
}
