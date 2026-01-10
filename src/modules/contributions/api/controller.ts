// API: Contribution Controller
// HTTP request handlers for contribution endpoints

import { Request, Response, NextFunction } from 'express';
import { ContributionService } from '../application/contributionService';
import { MemberRepository } from '@/modules/members/domain/repositories';
import { searchService } from '@/shared/infrastructure/search';
import { asyncLocalStorage } from "@/shared/infrastructure/context/AsyncLocalStorageManager";
import {
  ContributionCycleDetailsResponseDto,
  ContributionCycleResponseDto,
  MemberContributionResponseDto,
  MemberContributionHistoryResponseDto,
  ContributionCycleListResponseDto,
  MemberContributionListResponseDto,
  MemberContributionWithRelationsResponseDto,
  CycleContributionsListResponseDto,
  MyContributionsSummaryResponseDto,
  MyPendingContributionsResponseDto,
  ActiveCyclesSummaryResponseDto,
} from './dtos/responseDtos';

export class ContributionController {
  constructor(
    private readonly contributionService: ContributionService,
    private readonly memberRepo: MemberRepository
  ) {}

  // ==================== Contribution Cycle Endpoints ====================

  /**
   * GET /api/contributions/cycles/summary
   * Get active cycles summary for admin dashboard
   */
  getActiveCyclesSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await this.contributionService.getActiveCyclesSummary();
      return next({ responseSchema: ActiveCyclesSummaryResponseDto, data: summary, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/contributions/cycles/:cycleId
   * Get contribution cycle by ID
   */
  getCycleById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await this.contributionService.getCycleWithContributions(
        req.params.cycleId
      );
      return next({ responseSchema: ContributionCycleDetailsResponseDto, data: cycle, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/contributions/cycles/search
   * Search contribution cycles
   */
  searchCycles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await searchService.execute({
        ...req.body,
        model: 'ContributionCycle',
      });
      return next({ responseSchema: ContributionCycleListResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/contributions/cycles/:cycleId/close
   * Close a contribution cycle
   */
  closeCycle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = asyncLocalStorage.getContext();
      const userId = context?.userSession?.userId || 'system';

      const cycle = await this.contributionService.closeContributionCycle(
        req.params.cycleId,
        userId
      );

      return next({ responseSchema: ContributionCycleResponseDto, data: cycle, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  // ==================== Member Contribution Endpoints ====================

  /**
   * GET /api/contributions/:contributionId
   * Get contribution by ID with full relations
   */
  getContributionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contribution = await this.contributionService.getContributionByIdWithRelations(
        req.params.contributionId
      );
      return next({ responseSchema: MemberContributionWithRelationsResponseDto, data: contribution, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/contributions/:contributionId/acknowledge
   * Acknowledge wallet debit for contribution
   */
  acknowledgeDebit = async (req: Request, res: Response, next: NextFunction) => {
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

      return next({ responseSchema: MemberContributionResponseDto, data: contribution, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/contributions/:contributionId/record-cash
   * Record direct cash contribution
   */
  recordCash = async (req: Request, res: Response, next: NextFunction) => {
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

      return next({ responseSchema: MemberContributionResponseDto, data: contribution, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/contributions/:contributionId/mark-missed
   * Mark contribution as missed (admin only)
   */
  markMissed = async (req: Request, res: Response, next: NextFunction) => {
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

      return next({ responseSchema: MemberContributionResponseDto, data: contribution, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/contributions/search
   * Search member contributions
   */
  searchContributions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await searchService.execute({
        ...req.body,
        model: 'MemberContribution',
      });
      return next({ responseSchema: MemberContributionListResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/contributions/member/:memberId/history
   * Get member's contribution history
   */
  getMemberHistory = async (req: Request, res: Response, next: NextFunction) => {
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

      return next({ responseSchema: MemberContributionHistoryResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/contributions/cycles/:cycleId/contributions
   * Get contributions in a cycle with filters
   */
  getCycleContributions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, agentId, searchTerm, page, limit } = req.query;

      const result = await this.contributionService.getContributionsByCycle(
        req.params.cycleId,
        {
          status: status as any,
          agentId: agentId as string | undefined,
          searchTerm: searchTerm as string | undefined,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        }
      );

      return next({ responseSchema: CycleContributionsListResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  // ==================== My Contributions Endpoints ====================

  /**
   * Helper to get member ID from authenticated user
   */
  private async getMemberIdFromUser(): Promise<string | null> {
    const context = asyncLocalStorage.getContext();
    const userId = context?.userSession?.userId;

    if (!userId) {
      return null;
    }

    const member = await this.memberRepo.findByUserId(userId);
    return member?.memberId || null;
  }

  /**
   * GET /api/my-contributions/summary
   * Get authenticated member's contribution summary
   */
  myContributionsSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberId = await this.getMemberIdFromUser();

      if (!memberId) {
        // Return empty summary if user is not a member
        return next({
          responseSchema: MyContributionsSummaryResponseDto,
          data: {
            memberId: '',
            memberCode: '',
            totalContributed: 0,
            thisYear: 0,
            pendingCount: 0,
            averagePerMonth: 0,
            walletBalance: 0,
          },
          status: 200,
        });
      }

      const summary = await this.contributionService.getMemberContributionSummary(memberId);
      return next({ responseSchema: MyContributionsSummaryResponseDto, data: summary, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/my-contributions/pending
   * Get authenticated member's pending contributions
   */
  myPendingContributions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberId = await this.getMemberIdFromUser();

      if (!memberId) {
        // Return empty list if user is not a member
        return next({
          responseSchema: MyPendingContributionsResponseDto,
          data: { pendingContributions: [] },
          status: 200,
        });
      }

      const result = await this.contributionService.getMemberPendingContributions(memberId);
      return next({ responseSchema: MyPendingContributionsResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/my-contributions/history
   * Get authenticated member's contribution history
   */
  myContributionHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberId = await this.getMemberIdFromUser();

      if (!memberId) {
        // Return empty list if user is not a member
        // TODO: error here. error reponse struct is different from the main response 
        return next({
          responseSchema: MemberContributionHistoryResponseDto,
          data: { contributions: [], total: 0 },
          status: 200,
        });
      }

      const { status, page, limit } = req.query;

      const result = await this.contributionService.getMemberContributionHistory(
        memberId,
        {
          status: status as any,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        }
      );

      return next({ responseSchema: MemberContributionHistoryResponseDto, data: result, status: 200 });
    } catch (err) {
      next(err);
    }
  };
}
