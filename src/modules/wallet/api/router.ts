/**
 * Router for Wallet API
 */

import { Router } from "express";
import { WalletController } from "./controller";
import { validateBody, validateQuery, validateParams } from "@/shared/middleware/validateZod";
import {
  requestDepositSchema,
  adjustWalletSchema,
  walletListQuerySchema,
  lowBalanceQuerySchema,
  transactionHistoryQuerySchema,
  depositRequestsQuerySchema,
  pendingDepositsQuerySchema,
  debitRequestsQuerySchema,
  pendingAcknowledgmentQuerySchema,
  createDebitRequestSchema,
  memberIdParamSchema,
  walletIdParamSchema,
  depositRequestIdParamSchema,
  debitRequestIdParamSchema,
} from "./validators";

export function createWalletRouter(controller: WalletController): Router {
  const router = Router();

  // ===== MEMBER WALLET APIs =====

  /**
   * GET /api/members/:memberId/wallet
   * Get wallet summary for a member
   */
  router.get(
    "/members/:memberId/wallet",
    validateParams(memberIdParamSchema),
    controller.getWalletSummary
  );

  /**
   * GET /api/my-wallet
   * Get wallet summary for logged-in member
   */
  router.get("/my-wallet", controller.getMyWallet);

  /**
   * GET /api/members/:memberId/wallet/transactions
   * Get wallet transaction history
   */
  router.get(
    "/members/:memberId/wallet/transactions",
    validateParams(memberIdParamSchema),
    validateQuery(transactionHistoryQuerySchema),
    controller.getTransactionHistory
  );

  /**
   * POST /api/members/:memberId/wallet/deposit-requests
   * Request a wallet deposit
   */
  router.post(
    "/members/:memberId/wallet/deposit-requests",
    validateParams(memberIdParamSchema),
    validateBody(requestDepositSchema),
    controller.requestDeposit
  );

  /**
   * GET /api/members/:memberId/wallet/deposit-requests
   * Get member's deposit requests
   */
  router.get(
    "/members/:memberId/wallet/deposit-requests",
    validateParams(memberIdParamSchema),
    validateQuery(depositRequestsQuerySchema),
    controller.getMemberDepositRequests
  );

  /**
   * GET /api/members/:memberId/wallet/debit-requests
   * Get member's debit requests
   */
  router.get(
    "/members/:memberId/wallet/debit-requests",
    validateParams(memberIdParamSchema),
    validateQuery(debitRequestsQuerySchema),
    controller.getMemberDebitRequests
  );

  /**
   * POST /api/members/:memberId/wallet/debit-requests
   * Create a debit request for a member
   */
  router.post(
    "/members/:memberId/wallet/debit-requests",
    validateParams(memberIdParamSchema),
    validateBody(createDebitRequestSchema),
    controller.createDebitRequest
  );

  // ===== DEPOSIT REQUEST ACTIONS =====

  /**
   * POST /api/wallet/deposit-requests/:requestId/submit
   * Submit deposit request for approval
   */
  router.post(
    "/deposit-requests/:requestId/submit",
    validateParams(depositRequestIdParamSchema),
    controller.submitDepositForApproval
  );

  // ===== DEBIT REQUEST ACTIONS =====

  /**
   * GET /api/wallet/debit-requests/pending
   * Get pending acknowledgment requests
   */
  router.get(
    "/debit-requests/pending",
    validateQuery(pendingAcknowledgmentQuerySchema),
    controller.getPendingAcknowledgmentRequests
  );

  /**
   * POST /api/wallet/debit-requests/:debitRequestId/acknowledge
   * Acknowledge a debit request
   */
  router.post(
    "/debit-requests/:debitRequestId/acknowledge",
    validateParams(debitRequestIdParamSchema),
    controller.acknowledgeDebit
  );

  /**
   * POST /api/wallet/debit-requests/:debitRequestId/invalidate
   * Invalidate a debit request
   */
  router.post(
    "/debit-requests/:debitRequestId/invalidate",
    validateParams(debitRequestIdParamSchema),
    controller.invalidateDebitRequest
  );

  // ===== ADMIN WALLET MANAGEMENT APIs =====

  /**
   * GET /api/wallet/admin/deposits/pending
   * Get all pending deposit requests
   */
  router.get(
    "/admin/deposits/pending",
    validateQuery(pendingDepositsQuerySchema),
    controller.getPendingDepositRequests
  );

  /**
   * GET /api/wallet/admin/wallets
   * Get all wallets (admin)
   */
  router.get(
    "/admin/wallets",
    validateQuery(walletListQuerySchema),
    controller.listWallets
  );

  /**
   * GET /api/wallet/admin/wallets/statistics
   * Get wallet statistics
   */
  router.get("/admin/wallets/statistics", controller.getStatistics);

  /**
   * GET /api/wallet/admin/wallets/low-balance
   * Get low balance wallets
   */
  router.get(
    "/admin/wallets/low-balance",
    validateQuery(lowBalanceQuerySchema),
    controller.getLowBalanceWallets
  );

  /**
   * GET /api/wallet/admin/wallets/:walletId
   * Get wallet details by ID
   */
  router.get(
    "/admin/wallets/:walletId",
    validateParams(walletIdParamSchema),
    controller.getWalletById
  );

  /**
   * POST /api/wallet/admin/wallets/:walletId/adjust
   * Manual wallet adjustment
   */
  router.post(
    "/admin/wallets/:walletId/adjust",
    validateParams(walletIdParamSchema),
    validateBody(adjustWalletSchema),
    controller.adjustWallet
  );

  return router;
}
