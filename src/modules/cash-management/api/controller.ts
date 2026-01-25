// API: Cash Management Controller
// Handles HTTP requests for cash management endpoints

import { Request, Response, NextFunction } from 'express';
import { CashCustodyService } from '../application/cashCustodyService';
import { CashHandoverService } from '../application/cashHandoverService';
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';
import { NotFoundError } from '@/shared/utils/error-handling/httpErrors';
import {
  CashCustodyUserRole,
  CashCustodyStatus,
  CashHandoverStatus,
  CashHandoverType,
  GL_ACCOUNT_NAMES,
} from '../domain/entities';
import {
  MyCustodyResponseDto,
  MyCustodyActivityResponseDto,
  CashCustodyResponseDto,
  CashCustodyListResponseDto,
  CashCustodySummaryResponseDto,
  CashHandoverResponseDto,
  CashHandoverDetailDto,
  CashHandoverCreatedResponseDto,
  CashHandoverListResponseDto,
  PendingHandoversResponseDto,
  PendingHandoversListResponseDto,
  ValidReceiversResponseDto,
  HandoverHistoryResponseDto,
  AdminDashboardResponseDto,
  CustodyByLevelResponseDto,
  CustodyReportResponseDto,
  OverdueResponseDto,
  ReconciliationResponseDto,
  PendingTransfersResponseDto,
  ApproveHandoverResponseDto,
} from './dtos/responseDtos';

export class CashManagementController {
  constructor(
    private readonly custodyService: CashCustodyService,
    private readonly handoverService: CashHandoverService
  ) {}

  // ==================== CUSTODY ENDPOINTS ====================

  /**
   * GET /cash-management/custody/me
   * Get current user's cash custody with pending handovers
   */
  getMyCustody = async (req: Request, res: Response, next: NextFunction) => {
    const userId = asyncLocalStorage.getUserId();
    
    // Get custody and pending handovers in parallel
    const [custody, pendingData] = await Promise.all([
      this.custodyService.getCustodyByUserId(userId),
      this.handoverService.getPendingHandoversForUser(userId),
    ]);

    // Build response matching API spec
    const responseData = {
      custody: custody ? {
        ...custody,
        glAccountName: GL_ACCOUNT_NAMES[custody.glAccountCode] || custody.glAccountCode,
      } : null,
      pendingOutgoing: pendingData.outgoing.map(h => ({
        handoverId: h.handoverId,
        handoverNumber: h.handoverNumber,
        toUserId: h.toUserId,
        toUserName: h.toUser ? `${h.toUser.firstName || ''} ${h.toUser.lastName || ''}`.trim() : null,
        toUserRole: h.toUserRole,
        amount: h.amount,
        status: h.status,
        requiresApproval: h.requiresApproval,
        initiatedAt: h.initiatedAt,
      })),
      pendingIncoming: pendingData.incoming.map(h => ({
        handoverId: h.handoverId,
        handoverNumber: h.handoverNumber,
        fromUserId: h.fromUserId,
        fromUserName: h.fromUser ? `${h.fromUser.firstName || ''} ${h.fromUser.lastName || ''}`.trim() : null,
        fromUserRole: h.fromUserRole,
        amount: h.amount,
        status: h.status,
        initiatedAt: h.initiatedAt,
      })),
    };

    return next({ responseSchema: MyCustodyResponseDto, data: responseData, status: 200 });
  };

  /**
   * GET /cash-management/custody/:custodyId
   * Get custody by ID
   */
  getCustodyById = async (req: Request, res: Response, next: NextFunction) => {
    const { custodyId } = req.params;
    const custody = await this.custodyService.getCustodyById(custodyId);

    if (!custody) {
      throw new NotFoundError('Cash custody not found');
    }

    return next({ responseSchema: CashCustodyResponseDto, data: custody, status: 200 });
  };

  /**
   * GET /cash-management/custody/user/:userId
   * Get custody by user ID
   */
  getCustodyByUserId = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const custody = await this.custodyService.getCustodyByUserId(userId);

    if (!custody) {
      throw new NotFoundError('No cash custody record found for user');
    }

    return next({ responseSchema: CashCustodyResponseDto, data: custody, status: 200 });
  };

  /**
   * GET /cash-management/custodies
   * List all custodies with filters
   */
  listCustodies = async (req: Request, res: Response, next: NextFunction) => {
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

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const result = await this.custodyService.getCustodies({
      userId: userId as string,
      userRole: userRole as CashCustodyUserRole,
      status: status as CashCustodyStatus,
      forumId: forumId as string,
      areaId: areaId as string,
      unitId: unitId as string,
      page: pageNum,
      limit: limitNum,
    });

    return next({
      responseSchema: CashCustodyListResponseDto,
      data: {
        items: result.custodies,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      },
      status: 200,
    });
  };

  /**
   * GET /cash-management/custody/summary/:glAccountCode
   * Get custody summary by GL account
   */
  getCustodySummary = async (req: Request, res: Response, next: NextFunction) => {
    const { glAccountCode } = req.params;
    const summary = await this.custodyService.getCustodySummaryByGlAccount(glAccountCode);

    return next({ responseSchema: CashCustodySummaryResponseDto, data: summary, status: 200 });
  };

  // ==================== HANDOVER ENDPOINTS ====================

  /**
   * POST /cash-management/handovers
   * Initiate a new cash handover
   */
  initiateHandover = async (req: Request, res: Response, next: NextFunction) => {
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

    return next({
      responseSchema: CashHandoverCreatedResponseDto,
      data: {
        handover,
        message: 'Cash handover initiated successfully',
      },
      status: 201,
    });
  };

  /**
   * POST /cash-management/handovers/:handoverId/acknowledge
   * Acknowledge a cash handover
   */
  acknowledgeHandover = async (req: Request, res: Response, next: NextFunction) => {
    const userId = asyncLocalStorage.getUserId();
    const { handoverId } = req.params;
    const { receiverNotes } = req.body;

    const handover = await this.handoverService.acknowledgeHandover(
      handoverId,
      userId,
      receiverNotes
    );

    return next({
      responseSchema: CashHandoverCreatedResponseDto,
      data: {
        handover,
        message: 'Cash handover acknowledged successfully',
      },
      status: 200,
    });
  };

  /**
   * POST /cash-management/handovers/:handoverId/reject
   * Reject a cash handover
   */
  rejectHandover = async (req: Request, res: Response, next: NextFunction) => {
    const userId = asyncLocalStorage.getUserId();
    const { handoverId } = req.params;
    const { rejectionReason } = req.body;

    const handover = await this.handoverService.rejectHandover(
      handoverId,
      userId,
      rejectionReason
    );

    return next({
      responseSchema: CashHandoverCreatedResponseDto,
      data: {
        handover,
        message: 'Cash handover rejected',
      },
      status: 200,
    });
  };

  /**
   * POST /cash-management/handovers/:handoverId/cancel
   * Cancel a cash handover (by initiator)
   */
  cancelHandover = async (req: Request, res: Response, next: NextFunction) => {
    const userId = asyncLocalStorage.getUserId();
    const { handoverId } = req.params;

    const handover = await this.handoverService.cancelHandover(handoverId, userId);

    return next({
      responseSchema: CashHandoverCreatedResponseDto,
      data: {
        handover,
        message: 'Cash handover cancelled',
      },
      status: 200,
    });
  };

  /**
   * GET /cash-management/handovers/:handoverId
   * Get handover by ID with rich details
   */
  getHandoverById = async (req: Request, res: Response, next: NextFunction) => {
    const { handoverId } = req.params;
    const handover = await this.handoverService.getHandoverById(handoverId);

    if (!handover) {
      throw new NotFoundError('Cash handover not found');
    }

    // Build timeline from handover events
    const timeline: Array<{
      action: string;
      timestamp: Date;
      userId: string;
      userName: string | null;
      notes: string | null;
    }> = [];

    // Add initiated event
    timeline.push({
      action: 'Initiated',
      timestamp: handover.initiatedAt,
      userId: handover.fromUserId,
      userName: handover.fromUser 
        ? `${handover.fromUser.firstName || ''} ${handover.fromUser.lastName || ''}`.trim() 
        : null,
      notes: handover.initiatorNotes ?? null,
    });

    // Add acknowledged event if present
    if (handover.acknowledgedAt) {
      timeline.push({
        action: 'Acknowledged',
        timestamp: handover.acknowledgedAt,
        userId: handover.toUserId,
        userName: handover.toUser 
          ? `${handover.toUser.firstName || ''} ${handover.toUser.lastName || ''}`.trim() 
          : null,
        notes: handover.receiverNotes ?? null,
      });
    }

    // Add rejected event if present
    if (handover.rejectedAt) {
      timeline.push({
        action: 'Rejected',
        timestamp: handover.rejectedAt,
        userId: handover.toUserId,
        userName: handover.toUser 
          ? `${handover.toUser.firstName || ''} ${handover.toUser.lastName || ''}`.trim() 
          : null,
        notes: handover.rejectionReason ?? null,
      });
    }

    // Add cancelled event if present
    if (handover.cancelledAt) {
      timeline.push({
        action: 'Cancelled',
        timestamp: handover.cancelledAt,
        userId: handover.fromUserId,
        userName: handover.fromUser 
          ? `${handover.fromUser.firstName || ''} ${handover.fromUser.lastName || ''}`.trim() 
          : null,
        notes: null,
      });
    }

    // Build rich response
    const detailResponse = {
      handoverId: handover.handoverId,
      handoverNumber: handover.handoverNumber,
      fromUser: {
        userId: handover.fromUserId,
        fullName: handover.fromUser 
          ? `${handover.fromUser.firstName || ''} ${handover.fromUser.lastName || ''}`.trim() 
          : null,
        role: handover.fromUserRole,
        unit: handover.fromCustody?.unitId || null, // Could be enhanced to include unit name
      },
      toUser: {
        userId: handover.toUserId,
        fullName: handover.toUser 
          ? `${handover.toUser.firstName || ''} ${handover.toUser.lastName || ''}`.trim() 
          : null,
        role: handover.toUserRole,
        unit: handover.toCustody?.unitId || null,
      },
      amount: handover.amount,
      status: handover.status,
      handoverType: handover.handoverType,
      requiresApproval: handover.requiresApproval,
      approvalRequestId: handover.approvalRequestId,
      journalEntryId: handover.journalEntryId,
      timeline,
      initiatedAt: handover.initiatedAt,
      acknowledgedAt: handover.acknowledgedAt,
      rejectedAt: handover.rejectedAt,
      cancelledAt: handover.cancelledAt,
      initiatorNotes: handover.initiatorNotes,
      receiverNotes: handover.receiverNotes,
      rejectionReason: handover.rejectionReason,
    };

    return next({ responseSchema: CashHandoverDetailDto, data: detailResponse, status: 200 });
  };

  /**
   * GET /cash-management/handovers
   * List all handovers with filters
   */
  listHandovers = async (req: Request, res: Response, next: NextFunction) => {
    const { fromUserId, toUserId, status, forumId, requiresApproval, page, limit } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const result = await this.handoverService.getHandovers({
      fromUserId: fromUserId as string,
      toUserId: toUserId as string,
      status: status as CashHandoverStatus,
      forumId: forumId as string,
      requiresApproval: requiresApproval === 'true' ? true : requiresApproval === 'false' ? false : undefined,
      page: pageNum,
      limit: limitNum,
    });

    return next({
      responseSchema: CashHandoverListResponseDto,
      data: {
        items: result.handovers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      },
      status: 200,
    });
  };

  /**
   * GET /cash-management/handovers/pending/me
   * Get pending handovers for current user (both incoming and outgoing)
   */
  getMyPendingHandovers = async (req: Request, res: Response, next: NextFunction) => {
    const userId = asyncLocalStorage.getUserId();
    const pendingData = await this.handoverService.getPendingHandoversForUser(userId);

    // Calculate age in hours for each handover
    const now = new Date();
    const addAgeHours = (handovers: typeof pendingData.incoming) => {
      return handovers.map(h => ({
        ...h,
        ageHours: Math.round((now.getTime() - h.initiatedAt.getTime()) / (1000 * 60 * 60) * 10) / 10,
      }));
    };

    return next({
      responseSchema: PendingHandoversResponseDto,
      data: {
        incoming: addAgeHours(pendingData.incoming),
        outgoing: addAgeHours(pendingData.outgoing),
        summary: pendingData.summary,
      },
      status: 200,
    });
  };

  /**
   * GET /cash-management/handovers/pending/super-admin
   * Get pending handovers for SuperAdmin (bank deposits)
   */
  getPendingBankDeposits = async (req: Request, res: Response, next: NextFunction) => {
    const handovers = await this.handoverService.getPendingHandoversForSuperAdmin();

    // Calculate age in hours for each handover
    const now = new Date();
    const handoversWithAge = handovers.map(h => ({
      ...h,
      ageHours: Math.round((now.getTime() - h.initiatedAt.getTime()) / (1000 * 60 * 60) * 10) / 10,
    }));

    return next({
      responseSchema: PendingHandoversListResponseDto,
      data: {
        items: handoversWithAge,
        total: handovers.length,
      },
      status: 200,
    });
  };

  /**
   * GET /cash-management/handovers/receivers
   * Get valid receivers for current user
   */
  getValidReceivers = async (req: Request, res: Response, next: NextFunction) => {
    const userId = asyncLocalStorage.getUserId();
    const receivers = await this.handoverService.getValidReceivers(userId);

    return next({
      responseSchema: ValidReceiversResponseDto,
      data: {
        recipients: receivers,
      },
      status: 200,
    });
  };

  /**
   * GET /cash-management/handovers/my-initiated
   * Get handovers initiated by current user
   */
  getMyInitiatedHandovers = async (req: Request, res: Response, next: NextFunction) => {
    const userId = asyncLocalStorage.getUserId();
    const { status, page, limit } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const result = await this.handoverService.getHandovers({
      fromUserId: userId,
      status: status as CashHandoverStatus,
      page: pageNum,
      limit: limitNum,
    });

    return next({
      responseSchema: CashHandoverListResponseDto,
      data: {
        items: result.handovers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      },
      status: 200,
    });
  };

  // ==================== NEW ENDPOINTS ====================

  /**
   * GET /cash-management/custody/me/activity
   * Get current user's custody activity (stub - returns empty)
   */
  getMyCustodyActivity = async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    // Stub response - empty activities for now
    return next({
      responseSchema: MyCustodyActivityResponseDto,
      data: {
        activities: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
        },
      },
      status: 200,
    });
  };

  /**
   * GET /cash-management/handovers/history
   * Get handover history for current user
   */
  getHandoverHistory = async (req: Request, res: Response, next: NextFunction) => {
    const userId = asyncLocalStorage.getUserId();
    const { direction, status, fromDate, toDate, page, limit } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const result = await this.handoverService.getHandoverHistory(userId, {
      direction: direction as 'sent' | 'received' | 'all',
      status: status as CashHandoverStatus,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      page: pageNum,
      limit: limitNum,
    });

    return next({
      responseSchema: HandoverHistoryResponseDto,
      data: {
        handovers: result.handovers,
        summary: result.summary,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      },
      status: 200,
    });
  };

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * GET /cash-management/admin/dashboard
   * Get admin dashboard statistics
   */
  getAdminDashboard = async (req: Request, res: Response, next: NextFunction) => {
    const { forumId, areaId } = req.query;

    // Get custody by level data
    const custodyByLevel = await this.custodyService.getCustodyByLevel({
      forumId: forumId as string,
      areaId: areaId as string,
    });

    // Get pending transfers summary
    const pendingTransfers = await this.handoverService.getAllPendingTransfers({
      forumId: forumId as string,
      areaId: areaId as string,
      page: 1,
      limit: 5,
    });

    // Get overdue users
    const overdueData = await this.custodyService.getOverdueUsers({
      thresholdDays: 7,
      forumId: forumId as string,
      areaId: areaId as string,
    });

    // Build by level record
    const byLevel: Record<string, { count: number; totalBalance: number; glAccountCode: string }> = {};
    custodyByLevel.levels.forEach((l) => {
      byLevel[l.level] = {
        count: l.userCount,
        totalBalance: l.totalBalance,
        glAccountCode: l.glAccountCode,
      };
    });

    // Build recent activity from pending transfers
    const recentActivity = pendingTransfers.transfers.slice(0, 5).map((t) => ({
      type: t.toUserRole === 'SuperAdmin' ? 'bank_deposit' : 'handover',
      amount: t.amount,
      fromUserName: t.fromUserName,
      toUserName: t.toUserName,
      timestamp: t.initiatedAt,
    }));

    const responseData = {
      summary: {
        totalCash: custodyByLevel.totalCash,
        bankBalance: custodyByLevel.bankBalance,
        totalInCustody: custodyByLevel.totalInCustody,
        pendingHandovers: pendingTransfers.summary.total,
        pendingHandoverAmount: pendingTransfers.summary.totalAmount,
      },
      byLevel,
      alerts: {
        overdueCount: overdueData.summary.totalOverdueUsers,
        overdueAmount: overdueData.summary.totalOverdueAmount,
        overdueThresholdDays: 7,
        pendingOverdue: pendingTransfers.summary.overdue,
        pendingOverdueHours: 48,
        reconciled: true,
        lastReconciliationAt: new Date(),
      },
      recentActivity,
    };

    return next({ responseSchema: AdminDashboardResponseDto, data: responseData, status: 200 });
  };

  /**
   * GET /cash-management/admin/custody-by-level
   * Get custody aggregated by hierarchy level
   */
  getCustodyByLevel = async (req: Request, res: Response, next: NextFunction) => {
    const { forumId, areaId } = req.query;

    const result = await this.custodyService.getCustodyByLevel({
      forumId: forumId as string,
      areaId: areaId as string,
    });

    return next({ responseSchema: CustodyByLevelResponseDto, data: result, status: 200 });
  };

  /**
   * GET /cash-management/admin/custody-report
   * Get detailed custody report by user
   */
  getCustodyReport = async (req: Request, res: Response, next: NextFunction) => {
    const { forumId, areaId, unitId, level, minBalance, status, page, limit } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;

    const result = await this.custodyService.getCustodyReport({
      forumId: forumId as string,
      areaId: areaId as string,
      unitId: unitId as string,
      level: level as CashCustodyUserRole,
      minBalance: minBalance ? Number(minBalance) : undefined,
      status: status as CashCustodyStatus,
      page: pageNum,
      limit: limitNum,
    });

    return next({
      responseSchema: CustodyReportResponseDto,
      data: {
        custodies: result.custodies,
        summary: result.summary,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      },
      status: 200,
    });
  };

  /**
   * GET /cash-management/admin/overdue
   * Get users holding cash beyond threshold
   */
  getOverdueUsers = async (req: Request, res: Response, next: NextFunction) => {
    const { thresholdDays, forumId, areaId, level } = req.query;

    const result = await this.custodyService.getOverdueUsers({
      thresholdDays: Number(thresholdDays) || 7,
      forumId: forumId as string,
      areaId: areaId as string,
      level: level as CashCustodyUserRole,
    });

    return next({ responseSchema: OverdueResponseDto, data: result, status: 200 });
  };

  /**
   * GET /cash-management/admin/reconciliation
   * Get GL reconciliation report
   */
  getReconciliation = async (req: Request, res: Response, next: NextFunction) => {
    const { forumId } = req.query;

    const result = await this.custodyService.getReconciliationReport(forumId as string);

    return next({ responseSchema: ReconciliationResponseDto, data: result, status: 200 });
  };

  /**
   * GET /cash-management/admin/pending-transfers
   * Get all pending transfers across the organization
   */
  getPendingTransfers = async (req: Request, res: Response, next: NextFunction) => {
    const { forumId, areaId, fromRole, toRole, minAge, page, limit } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const result = await this.handoverService.getAllPendingTransfers({
      forumId: forumId as string,
      areaId: areaId as string,
      fromRole: fromRole as string,
      toRole: toRole as string,
      minAgeHours: minAge ? Number(minAge) : undefined,
      page: pageNum,
      limit: limitNum,
    });

    return next({
      responseSchema: PendingTransfersResponseDto,
      data: {
        transfers: result.transfers,
        summary: result.summary,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      },
      status: 200,
    });
  };

  /**
   * POST /cash-management/admin/handovers/:handoverId/approve
   * Approve bank deposit (SuperAdmin only)
   */
  approveHandover = async (req: Request, res: Response, next: NextFunction) => {
    const userId = asyncLocalStorage.getUserId();
    const { handoverId } = req.params;
    const { approverNotes } = req.body;

    const handover = await this.handoverService.approveBankDeposit(
      handoverId,
      userId,
      approverNotes
    );

    return next({
      responseSchema: ApproveHandoverResponseDto,
      data: {
        handoverId: handover.handoverId,
        handoverNumber: handover.handoverNumber,
        status: handover.status,
        approvalStatus: 'Approved',
        approvedAt: new Date(),
        approvedBy: userId,
        message: 'Bank deposit approved. Awaiting acknowledgment to complete deposit.',
      },
      status: 200,
    });
  };
}

