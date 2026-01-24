/**
 * Controller for Wallet API
 */

import type { Request, Response, NextFunction } from "express";
import {
  WalletResponseDto,
  WalletListResponseDto,
  WalletSummaryResponseDto,
  TransactionHistoryResponseDto,
  WalletStatisticsResponseDto,
  DepositRequestResponseDto,
  DepositRequestListResponseDto,
  DebitRequestResponseDto,
  DebitRequestListResponseDto,
} from "./dtos/responseDtos";
import type { WalletService } from "../application/walletService";
import type { DepositRequestService } from "../application/depositRequestService";
import type { DebitRequestService } from "../application/debitRequestService";
import { asyncLocalStorage } from "@/shared/infrastructure/context";
import { memberService } from "@/modules/members";

export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly depositRequestService: DepositRequestService,
    private readonly debitRequestService: DebitRequestService,
  ) {}

  // ===== MEMBER WALLET APIs =====

  /**
   * GET /api/members/:memberId/wallet
   * Get wallet summary for a member
   */
  getWalletSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    try {
      const summary = await this.walletService.getWalletSummary(memberId);
      return next({
        responseSchema: WalletSummaryResponseDto,
        data: summary,
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/my-wallet
   * Get wallet summary for logged-in member
   */
  getMyWallet = async (req: Request, res: Response, next: NextFunction) => {
    const userId = asyncLocalStorage.getUserId();
    try {
      // TODO: Need to get memberId from userId
      const member = await memberService.getMemberByUserId(userId);
      if(!member) {
        throw new Error('Member not found for the logged-in user.');
      }
      const summary = await this.walletService.getWalletSummary(member.memberId);
      return next({
        responseSchema: WalletSummaryResponseDto,
        data: summary,
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/members/:memberId/wallet/transactions
   * Get wallet transaction history
   */
  getTransactionHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    const { page, limit, type, status, startDate, endDate } = req.query;
    try {
      const result = await this.walletService.getTransactionHistory(memberId, {
        transactionType: type as string | undefined,
        status: status as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      return next({
        responseSchema: TransactionHistoryResponseDto,
        data: {
          ...result,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        },
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/members/:memberId/wallet/deposit-requests
   * Request a wallet deposit
   */
  requestDeposit = async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;
    const ctx = asyncLocalStorage.getAuthContext()
    const userId = ctx.user.userId
    try {
      const depositRequest = await this.depositRequestService.requestDeposit({
        memberId,
        amount: req.body.amount,
        collectionDate: new Date(req.body.collectionDate),
        collectedBy: userId,
        notes: req.body.notes,
      });
      return next({
        responseSchema: DepositRequestResponseDto,
        data: depositRequest,
        status: 201,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/members/:memberId/wallet/deposit-requests
   * Get member's deposit requests
   */
  getMemberDepositRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    const { page, limit, status } = req.query;
    try {
      const result = await this.depositRequestService.getDepositRequestsByMember(
        memberId,
        {
          status: status as any,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        }
      );
      return next({
        responseSchema: DepositRequestListResponseDto,
        data: {
          ...result,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        },
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/wallet/deposit-requests/:requestId/submit
   * Submit deposit request for approval
   */
  submitDepositForApproval = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { requestId } = req.params;
    const userId = asyncLocalStorage.getAuthContext().user.userId;
    try {
      const depositRequest = await this.depositRequestService.submitForApproval(
        requestId,
        userId
      );
      return next({
        responseSchema: DepositRequestResponseDto,
        data: depositRequest,
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  // ===== ADMIN/AGENT WALLET MANAGEMENT APIs =====

  /**
   * GET /api/admin/wallet-deposits/pending
   * Get all pending deposit requests
   */
  getPendingDepositRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { page, limit, collectedBy } = req.query;
    try {
      const result = await this.depositRequestService.getPendingDepositRequests({
        collectedBy: collectedBy as string | undefined,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      return next({
        responseSchema: DepositRequestListResponseDto,
        data: {
          ...result,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        },
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/admin/wallets
   * Get all wallets (admin)
   */
  listWallets = async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, minBalance, maxBalance, search } = req.query;
    try {
      const result = await this.walletService.listWallets({
        minBalance: minBalance ? Number(minBalance) : undefined,
        maxBalance: maxBalance ? Number(maxBalance) : undefined,
        searchQuery: search as string | undefined,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      return next({
        responseSchema: WalletListResponseDto,
        data: {
          ...result,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        },
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/admin/wallets/low-balance
   * Get low balance wallets
   */
  getLowBalanceWallets = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { threshold, page, limit } = req.query;
    try {
      const result = await this.walletService.getLowBalanceWallets(
        Number(threshold) || 200,
        Number(page) || 1,
        Number(limit) || 20
      );
      console.log(result.wallets);
      return next({
        responseSchema: WalletListResponseDto,
        data: {
          ...result,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        },
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/admin/wallets/:walletId
   * Get wallet details by ID
   */
  getWalletById = async (req: Request, res: Response, next: NextFunction) => {
    const { walletId } = req.params;
    try {
      const wallet = await this.walletService.getWalletById(walletId);
      return next({
        responseSchema: WalletResponseDto,
        data: wallet,
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/admin/wallets/statistics
   * Get wallet statistics
   */
  getStatistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.walletService.getStatistics();
      return next({
        responseSchema: WalletStatisticsResponseDto,
        data: stats,
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/admin/wallets/:walletId/adjust
   * Manual wallet adjustment
   */
  adjustWallet = async (req: Request, res: Response, next: NextFunction) => {
    const { walletId } = req.params;
    const userId = (req as any).user?.userId;
    try {
      const wallet = await this.walletService.adjustWallet({
        walletId,
        amount: req.body.amount,
        adjustmentType: req.body.adjustmentType,
        reason: req.body.reason,
        adjustedBy: userId,
      });
      return next({
        responseSchema: WalletResponseDto,
        data: wallet,
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  // ===== DEBIT REQUEST APIs =====

  /**
   * POST /api/wallet/debit-requests
   * Create a debit request (system/admin use)
   */
  createDebitRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    try {
      const debitRequest = await this.debitRequestService.createDebitRequest({
        memberId,
        amount: req.body.amount,
        purpose: req.body.purpose,
        contributionCycleId: req.body.contributionCycleId,
        contributionId: req.body.contributionId,
      });

      if (!debitRequest) {
        return next({
          responseSchema: DebitRequestResponseDto,
          data: null,
          status: 200,
        });
      }

      return next({
        responseSchema: DebitRequestResponseDto,
        data: debitRequest,
        status: 201,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/wallet/debit-requests/:debitRequestId/acknowledge
   * Acknowledge a debit request
   */
  acknowledgeDebit = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { debitRequestId } = req.params;
    const userId = asyncLocalStorage.getAuthContext().user.userId;
    try {
      const debitRequest = await this.debitRequestService.acknowledgeDebit(
        debitRequestId,
        userId
      );
      return next({
        responseSchema: DebitRequestResponseDto,
        data: debitRequest,
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/wallet/debit-requests/:debitRequestId/invalidate
   * Invalidate a debit request
   */
  invalidateDebitRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { debitRequestId } = req.params;
    const userId = asyncLocalStorage.getAuthContext().user.userId;
    try {
      const debitRequest = await this.debitRequestService.invalidateDebitRequest(
        debitRequestId,
        userId
      );
      return next({
        responseSchema: DebitRequestResponseDto,
        data: debitRequest,
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/wallet/debit-requests/pending
   * Get pending acknowledgment requests
   */
  getPendingAcknowledgmentRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { page, limit, agentId } = req.query;
    try {
      const result = await this.debitRequestService.getPendingAcknowledgmentRequests(
        {
          agentId: agentId as string | undefined,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        }
      );
      return next({
        responseSchema: DebitRequestListResponseDto,
        data: {
          ...result,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        },
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/members/:memberId/wallet/debit-requests
   * Get member's debit requests
   */
  getMemberDebitRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { memberId } = req.params;
    const { page, limit, status } = req.query;
    try {
      const result = await this.debitRequestService.getDebitRequestsByMember(
        memberId,
        {
          status: status as any,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        }
      );
      return next({
        responseSchema: DebitRequestListResponseDto,
        data: {
          ...result,
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        },
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };
}
