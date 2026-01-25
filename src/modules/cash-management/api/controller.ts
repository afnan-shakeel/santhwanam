// API: Cash Management Controller
// Handles HTTP requests for cash management endpoints

import { Request, Response, NextFunction } from 'express';
import { CashCustodyService } from '../application/cashCustodyService';
import { CashHandoverService } from '../application/cashHandoverService';
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';
import {
  CashCustodyUserRole,
  CashCustodyStatus,
  CashHandoverStatus,
  CashHandoverType,
} from '../domain/entities';

export class CashManagementController {
  constructor(
    private readonly custodyService: CashCustodyService,
    private readonly handoverService: CashHandoverService
  ) {}

  // ==================== CUSTODY ENDPOINTS ====================

  /**
   * GET /cash-management/custody/me
   * Get current user's cash custody
   */
  getMyCustody = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = asyncLocalStorage.getUserId();
      const custody = await this.custodyService.getCustodyByUserId(userId);

      if (!custody) {
        return res.status(404).json({
          success: false,
          message: 'No cash custody record found for current user',
        });
      }

      return res.json({
        success: true,
        data: custody,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cash-management/custody/:custodyId
   * Get custody by ID
   */
  getCustodyById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { custodyId } = req.params;
      const custody = await this.custodyService.getCustodyById(custodyId);

      if (!custody) {
        return res.status(404).json({
          success: false,
          message: 'Cash custody not found',
        });
      }

      return res.json({
        success: true,
        data: custody,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cash-management/custody/user/:userId
   * Get custody by user ID
   */
  getCustodyByUserId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const custody = await this.custodyService.getCustodyByUserId(userId);

      if (!custody) {
        return res.status(404).json({
          success: false,
          message: 'No cash custody record found for user',
        });
      }

      return res.json({
        success: true,
        data: custody,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cash-management/custodies
   * List all custodies with filters
   */
  listCustodies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        userId,
        userRole,
        status,
        forumId,
        areaId,
        unitId,
        page,
        limit,
      } = req.query;

      const result = await this.custodyService.getCustodies({
        userId: userId as string,
        userRole: userRole as CashCustodyUserRole,
        status: status as CashCustodyStatus,
        forumId: forumId as string,
        areaId: areaId as string,
        unitId: unitId as string,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });

      return res.json({
        success: true,
        data: result.custodies,
        pagination: {
          page: Number(page) || 1,
          limit: Number(limit) || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (Number(limit) || 20)),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cash-management/custody/summary/:glAccountCode
   * Get custody summary by GL account
   */
  getCustodySummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { glAccountCode } = req.params;
      const summary = await this.custodyService.getCustodySummaryByGlAccount(glAccountCode);

      return res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== HANDOVER ENDPOINTS ====================

  /**
   * POST /cash-management/handovers
   * Initiate a new cash handover
   */
  initiateHandover = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = asyncLocalStorage.getUserId();
      const { toUserId, toUserRole, amount, initiatorNotes, handoverType, sourceHandoverId } =
        req.body;

      const handover = await this.handoverService.initiateHandover({
        fromUserId: userId,
        toUserId,
        toUserRole,
        amount,
        initiatorNotes,
        handoverType: handoverType as CashHandoverType,
        sourceHandoverId,
      });

      return res.status(201).json({
        success: true,
        message: 'Cash handover initiated successfully',
        data: handover,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /cash-management/handovers/:handoverId/acknowledge
   * Acknowledge a cash handover
   */
  acknowledgeHandover = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = asyncLocalStorage.getUserId();
      const { handoverId } = req.params;
      const { receiverNotes } = req.body;

      const handover = await this.handoverService.acknowledgeHandover(
        handoverId,
        userId,
        receiverNotes
      );

      return res.json({
        success: true,
        message: 'Cash handover acknowledged successfully',
        data: handover,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /cash-management/handovers/:handoverId/reject
   * Reject a cash handover
   */
  rejectHandover = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = asyncLocalStorage.getUserId();
      const { handoverId } = req.params;
      const { rejectionReason } = req.body;

      const handover = await this.handoverService.rejectHandover(
        handoverId,
        userId,
        rejectionReason
      );

      return res.json({
        success: true,
        message: 'Cash handover rejected',
        data: handover,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /cash-management/handovers/:handoverId/cancel
   * Cancel a cash handover (by initiator)
   */
  cancelHandover = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = asyncLocalStorage.getUserId();
      const { handoverId } = req.params;

      const handover = await this.handoverService.cancelHandover(handoverId, userId);

      return res.json({
        success: true,
        message: 'Cash handover cancelled',
        data: handover,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cash-management/handovers/:handoverId
   * Get handover by ID
   */
  getHandoverById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { handoverId } = req.params;
      const handover = await this.handoverService.getHandoverById(handoverId);

      if (!handover) {
        return res.status(404).json({
          success: false,
          message: 'Cash handover not found',
        });
      }

      return res.json({
        success: true,
        data: handover,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cash-management/handovers
   * List all handovers with filters
   */
  listHandovers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromUserId, toUserId, status, forumId, requiresApproval, page, limit } = req.query;

      const result = await this.handoverService.getHandovers({
        fromUserId: fromUserId as string,
        toUserId: toUserId as string,
        status: status as CashHandoverStatus,
        forumId: forumId as string,
        requiresApproval: requiresApproval === 'true' ? true : requiresApproval === 'false' ? false : undefined,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });

      return res.json({
        success: true,
        data: result.handovers,
        pagination: {
          page: Number(page) || 1,
          limit: Number(limit) || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (Number(limit) || 20)),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cash-management/handovers/pending/me
   * Get pending handovers for current user (as receiver)
   */
  getMyPendingHandovers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = asyncLocalStorage.getUserId();
      const handovers = await this.handoverService.getPendingHandoversForUser(userId);

      return res.json({
        success: true,
        data: handovers,
        total: handovers.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cash-management/handovers/pending/super-admin
   * Get pending handovers for SuperAdmin (bank deposits)
   */
  getPendingBankDeposits = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const handovers = await this.handoverService.getPendingHandoversForSuperAdmin();

      return res.json({
        success: true,
        data: handovers,
        total: handovers.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cash-management/handovers/receivers
   * Get valid receivers for current user
   */
  getValidReceivers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = asyncLocalStorage.getUserId();
      const receivers = await this.handoverService.getValidReceivers(userId);

      return res.json({
        success: true,
        data: receivers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cash-management/handovers/my-initiated
   * Get handovers initiated by current user
   */
  getMyInitiatedHandovers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = asyncLocalStorage.getUserId();
      const { status, page, limit } = req.query;

      const result = await this.handoverService.getHandovers({
        fromUserId: userId,
        status: status as CashHandoverStatus,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });

      return res.json({
        success: true,
        data: result.handovers,
        pagination: {
          page: Number(page) || 1,
          limit: Number(limit) || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (Number(limit) || 20)),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

