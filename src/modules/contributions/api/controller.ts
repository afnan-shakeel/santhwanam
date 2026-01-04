// API: Contribution Controller
// HTTP request handlers for contribution endpoints

import { Request, Response } from 'express';
import { ContributionService } from '../application/contributionService';
import { searchService } from '@/shared/infrastructure/search';
import { asyncLocalStorage } from '@/shared/middleware/async-local-storage';

export class ContributionController {
  constructor(private readonly contributionService: ContributionService) {}

  // ==================== Contribution Cycle Endpoints ====================

  /**
   * GET /api/contributions/cycles/:cycleId
   * Get contribution cycle by ID
   */
  getCycleById = async (req: Request, res: Response) => {
    try {
      const cycle = await this.contributionService.getCycleWithContributions(
        req.params.cycleId
      );
      return (req as any).next({ data: cycle, status: 200 });
    } catch (err) {
      (req as any).next(err);
    }
  };

  /**
   * POST /api/contributions/cycles/search
   * Search contribution cycles
   */
  searchCycles = async (req: Request, res: Response) => {
    try {
      const result = await searchService.execute({
        ...req.body,
        model: 'ContributionCycle',
      });
      return (req as any).next({ data: result, status: 200 });
    } catch (err) {
      (req as any).next(err);
    }
  };

  /**
   * POST /api/contributions/cycles/:cycleId/close
   * Close a contribution cycle
   */
  closeCycle = async (req: Request, res: Response) => {
    try {
      const context = asyncLocalStorage.getContext();
      const userId = context?.userSession?.userId || 'system';

      const cycle = await this.contributionService.closeContributionCycle(
        req.params.cycleId,
        userId
      );

      return (req as any).next({ data: cycle, status: 200 });
    } catch (err) {
      (req as any).next(err);
    }
  };

  // ==================== Member Contribution Endpoints ====================

  /**
   * GET /api/contributions/:contributionId
   * Get contribution by ID
   */
  getContributionById = async (req: Request, res: Response) => {
    try {
      const contribution = await this.contributionService.getContributionById(
        req.params.contributionId
      );
      return (req as any).next({ data: contribution, status: 200 });
    } catch (err) {
      (req as any).next(err);
    }
  };

  /**
   * POST /api/contributions/:contributionId/acknowledge
   * Acknowledge wallet debit for contribution
   */
  acknowledgeDebit = async (req: Request, res: Response) => {
    try {
      const context = asyncLocalStorage.getContext();
      const userId = context?.userSession?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const contribution = await this.contributionService.acknowledgeContributionDebit(
        req.params.contributionId,
        userId
      );

      return (req as any).next({ data: contribution, status: 200 });
    } catch (err) {
      (req as any).next(err);
    }
  };

  /**
   * POST /api/contributions/:contributionId/record-cash
   * Record direct cash contribution
   */
  recordCash = async (req: Request, res: Response) => {
    try {
      const context = asyncLocalStorage.getContext();
      const userId = context?.userSession?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const contribution = await this.contributionService.recordDirectCashContribution(
        req.params.contributionId,
        req.body.cashReceiptReference,
        userId
      );

      return (req as any).next({ data: contribution, status: 200 });
    } catch (err) {
      (req as any).next(err);
    }
  };

  /**
   * POST /api/contributions/:contributionId/mark-missed
   * Mark contribution as missed (admin only)
   */
  markMissed = async (req: Request, res: Response) => {
    try {
      const context = asyncLocalStorage.getContext();
      const userId = context?.userSession?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const contribution = await this.contributionService.markContributionAsMissed(
        req.params.contributionId,
        userId
      );

      return (req as any).next({ data: contribution, status: 200 });
    } catch (err) {
      (req as any).next(err);
    }
  };

  /**
   * POST /api/contributions/search
   * Search member contributions
   */
  searchContributions = async (req: Request, res: Response) => {
    try {
      const result = await searchService.execute({
        ...req.body,
        model: 'MemberContribution',
      });
      return (req as any).next({ data: result, status: 200 });
    } catch (err) {
      (req as any).next(err);
    }
  };

  /**
   * GET /api/contributions/member/:memberId/history
   * Get member's contribution history
   */
  getMemberHistory = async (req: Request, res: Response) => {
    try {
      const { status, page, limit } = req.query;

      const result = await this.contributionService.getMemberContributionHistory(
        req.params.memberId,
        {
          status: status as any,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        }
      );

      return (req as any).next({ data: result, status: 200 });
    } catch (err) {
      (req as any).next(err);
    }
  };
}
