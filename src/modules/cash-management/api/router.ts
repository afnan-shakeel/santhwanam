// API: Cash Management Router
// Express router for cash management endpoints

import { Router } from 'express';
import { CashManagementController } from './controller';
import { validateBody, validateParams, validateQuery } from '@/shared/middleware/validateZod';
import {
  initiateHandoverBodySchema,
  handoverIdParamsSchema,
  acknowledgeHandoverBodySchema,
  rejectHandoverBodySchema,
  listHandoversQuerySchema,
  userIdParamsSchema,
  custodyIdParamsSchema,
  glAccountCodeParamsSchema,
  listCustodiesQuerySchema,
  custodyActivityQuerySchema,
  handoverHistoryQuerySchema,
  adminDashboardQuerySchema,
  custodyByLevelQuerySchema,
  custodyReportQuerySchema,
  overdueQuerySchema,
  reconciliationQuerySchema,
  pendingTransfersQuerySchema,
  approveHandoverBodySchema,
} from './validations';

export function createCashManagementRouter(controller: CashManagementController): Router {
  const router = Router();

  // ==================== CUSTODY ROUTES ====================

  /**
   * @route GET /cash-management/custody/me
   * @desc Get current user's cash custody
   * @access Private
   */
  router.get('/custody/me', controller.getMyCustody);

  /**
   * @route GET /cash-management/custody/me/activity
   * @desc Get current user's custody activity (stub)
   * @access Private
   */
  router.get(
    '/custody/me/activity',
    validateQuery(custodyActivityQuerySchema),
    controller.getMyCustodyActivity
  );

  /**
   * @route GET /cash-management/custody/summary/:glAccountCode
   * @desc Get custody summary by GL account code
   * @access Private (Admin)
   */
  router.get(
    '/custody/summary/:glAccountCode',
    validateParams(glAccountCodeParamsSchema),
    controller.getCustodySummary
  );

  /**
   * @route GET /cash-management/custody/user/:userId
   * @desc Get custody by user ID
   * @access Private (Admin)
   */
  router.get(
    '/custody/user/:userId',
    validateParams(userIdParamsSchema),
    controller.getCustodyByUserId
  );

  /**
   * @route GET /cash-management/custody/:custodyId
   * @desc Get custody by ID
   * @access Private (Admin)
   */
  router.get(
    '/custody/:custodyId',
    validateParams(custodyIdParamsSchema),
    controller.getCustodyById
  );

  /**
   * @route GET /cash-management/custodies
   * @desc List all custodies with filters
   * @access Private (Admin)
   */
  router.get(
    '/custodies',
    validateQuery(listCustodiesQuerySchema),
    controller.listCustodies
  );

  // ==================== HANDOVER ROUTES ====================

  /**
   * @route GET /cash-management/handovers/pending/me
   * @desc Get pending handovers for current user (as receiver)
   * @access Private
   */
  router.get('/handovers/pending/me', controller.getMyPendingHandovers);

  /**
   * @route GET /cash-management/handovers/pending/super-admin
   * @desc Get pending handovers for SuperAdmin (bank deposits)
   * @access Private (SuperAdmin)
   */
  router.get('/handovers/pending/super-admin', controller.getPendingBankDeposits);

  /**
   * @route GET /cash-management/handovers/history
   * @desc Get handover history for current user
   * @access Private
   */
  router.get(
    '/handovers/history',
    validateQuery(handoverHistoryQuerySchema),
    controller.getHandoverHistory
  );

  /**
   * @route GET /cash-management/handovers/receivers
   * @desc Get valid receivers for current user
   * @access Private
   */
  router.get('/handovers/receivers', controller.getValidReceivers);

  /**
   * @route GET /cash-management/handovers/my-initiated
   * @desc Get handovers initiated by current user
   * @access Private
   */
  router.get('/handovers/my-initiated', controller.getMyInitiatedHandovers);

  /**
   * @route POST /cash-management/handovers
   * @desc Initiate a new cash handover
   * @access Private
   */
  router.post(
    '/handovers',
    validateBody(initiateHandoverBodySchema),
    controller.initiateHandover
  );

  /**
   * @route POST /cash-management/handovers/:handoverId/acknowledge
   * @desc Acknowledge a cash handover
   * @access Private
   */
  router.post(
    '/handovers/:handoverId/acknowledge',
    validateParams(handoverIdParamsSchema),
    validateBody(acknowledgeHandoverBodySchema),
    controller.acknowledgeHandover
  );

  /**
   * @route POST /cash-management/handovers/:handoverId/reject
   * @desc Reject a cash handover
   * @access Private
   */
  router.post(
    '/handovers/:handoverId/reject',
    validateParams(handoverIdParamsSchema),
    validateBody(rejectHandoverBodySchema),
    controller.rejectHandover
  );

  /**
   * @route POST /cash-management/handovers/:handoverId/cancel
   * @desc Cancel a cash handover (by initiator)
   * @access Private
   */
  router.post(
    '/handovers/:handoverId/cancel',
    validateParams(handoverIdParamsSchema),
    controller.cancelHandover
  );

  /**
   * @route GET /cash-management/handovers/:handoverId
   * @desc Get handover by ID
   * @access Private
   */
  router.get(
    '/handovers/:handoverId',
    validateParams(handoverIdParamsSchema),
    controller.getHandoverById
  );

  /**
   * @route GET /cash-management/handovers
   * @desc List all handovers with filters
   * @access Private (Admin)
   */
  router.get(
    '/handovers',
    validateQuery(listHandoversQuerySchema),
    controller.listHandovers
  );

  // ==================== ADMIN ROUTES ====================

  /**
   * @route GET /cash-management/admin/dashboard
   * @desc Get admin dashboard statistics
   * @access Private (Admin)
   */
  router.get(
    '/admin/dashboard',
    validateQuery(adminDashboardQuerySchema),
    controller.getAdminDashboard
  );

  /**
   * @route GET /cash-management/admin/custody-by-level
   * @desc Get custody aggregated by hierarchy level
   * @access Private (Admin)
   */
  router.get(
    '/admin/custody-by-level',
    validateQuery(custodyByLevelQuerySchema),
    controller.getCustodyByLevel
  );

  /**
   * @route GET /cash-management/admin/custody-report
   * @desc Get detailed custody report by user
   * @access Private (Admin)
   */
  router.get(
    '/admin/custody-report',
    validateQuery(custodyReportQuerySchema),
    controller.getCustodyReport
  );

  /**
   * @route GET /cash-management/admin/overdue
   * @desc Get users holding cash beyond threshold
   * @access Private (Admin)
   */
  router.get(
    '/admin/overdue',
    validateQuery(overdueQuerySchema),
    controller.getOverdueUsers
  );

  /**
   * @route GET /cash-management/admin/reconciliation
   * @desc Get GL reconciliation report
   * @access Private (Admin)
   */
  router.get(
    '/admin/reconciliation',
    validateQuery(reconciliationQuerySchema),
    controller.getReconciliation
  );

  /**
   * @route GET /cash-management/admin/pending-transfers
   * @desc Get all pending transfers across the organization
   * @access Private (Admin)
   */
  router.get(
    '/admin/pending-transfers',
    validateQuery(pendingTransfersQuerySchema),
    controller.getPendingTransfers
  );

  /**
   * @route POST /cash-management/admin/handovers/:handoverId/approve
   * @desc Approve bank deposit (SuperAdmin only)
   * @access Private (SuperAdmin)
   */
  router.post(
    '/admin/handovers/:handoverId/approve',
    validateParams(handoverIdParamsSchema),
    validateBody(approveHandoverBodySchema),
    controller.approveHandover
  );

  return router;
}
