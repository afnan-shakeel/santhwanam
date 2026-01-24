// Application: Wallet Service
// Handles wallet CRUD operations and balance queries

import { v4 as uuidv4 } from "uuid";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import {
  WalletRepository,
  WalletTransactionRepository,
} from "../domain/repositories";
import {
  Wallet,
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionStatus,
  WalletSummary,
  WalletStatistics,
} from "../domain/entities";
import { JournalEntryService } from "@/modules/gl/application/journalEntryService";
import {
  ACCOUNT_CODES,
  TRANSACTION_SOURCE,
  TRANSACTION_TYPE,
} from "@/modules/gl/constants/accountCodes";
import { AppError } from "@/shared/utils/error-handling/AppError";
import { eventBus } from "@/shared/domain/events/event-bus";
import {
  WalletCreatedEvent,
  WalletAdjustedEvent,
} from "../domain/events";

export class WalletService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly walletTransactionRepo: WalletTransactionRepository,
    private readonly journalEntryService: JournalEntryService
  ) {}

  /**
   * Create a new wallet for a member
   * Usually triggered by member activation event
   */
  async createWallet(data: {
    memberId: string;
    initialBalance: number;
    createdBy: string;
  }): Promise<Wallet> {
    return await prisma.$transaction(async (tx: any) => {
      // Check if wallet already exists (idempotent)
      const existing = await this.walletRepo.findByMemberId(data.memberId, tx);
      if (existing) {
        return existing;
      }

      const walletId = uuidv4();

      // Create wallet
      const wallet = await this.walletRepo.create(
        {
          walletId,
          memberId: data.memberId,
          currentBalance: data.initialBalance,
        },
        tx
      );

      // Create initial transaction record if there's an initial balance
      if (data.initialBalance > 0) {
        await this.walletTransactionRepo.create(
          {
            transactionId: uuidv4(),
            walletId,
            transactionType: WalletTransactionType.Deposit,
            amount: data.initialBalance,
            balanceAfter: data.initialBalance,
            sourceModule: "Membership",
            sourceEntityId: data.memberId,
            description: "Initial deposit from registration",
            journalEntryId: null,
            status: WalletTransactionStatus.Completed,
            createdBy: data.createdBy,
          },
          tx
        );
      }

      // Emit event
      eventBus.publish(
        new WalletCreatedEvent(
          {
            walletId,
            memberId: data.memberId,
            initialBalance: data.initialBalance,
          },
          data.createdBy
        )
      );

      return wallet;
    });
  }

  /**
   * Get wallet summary for a member
   */
  async getWalletSummary(memberId: string): Promise<WalletSummary> {
    const wallet = await this.walletRepo.findByMemberId(memberId);
    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    const recentTransactions = await this.walletTransactionRepo.findRecentByWalletId(
      wallet.walletId,
      5
    );

    return {
      walletId: wallet.walletId,
      memberId: wallet.memberId,
      currentBalance: wallet.currentBalance,
      recentTransactions,
    };
  }

  /**
   * Get wallet by ID
   */
  async getWalletById(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }
    return wallet;
  }

  /**
   * Get wallet by member ID
   */
  async getWalletByMemberId(memberId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findByMemberId(memberId);
    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }
    return wallet;
  }

  /**
   * Get wallet transaction history
   */
  async getTransactionHistory(
    memberId: string,
    filters: {
      transactionType?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page: number;
      limit: number;
    }
  ): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const wallet = await this.walletRepo.findByMemberId(memberId);
    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    return await this.walletTransactionRepo.findByWalletId(wallet.walletId, filters);
  }

  /**
   * List all wallets (admin)
   */
  async listWallets(filters: {
    minBalance?: number;
    maxBalance?: number;
    searchQuery?: string;
    page: number;
    limit: number;
  }): Promise<{ wallets: Wallet[]; total: number }> {
    return await this.walletRepo.findAll(filters);
  }

  /**
   * Get low balance wallets (admin)
   */
  async getLowBalanceWallets(
    threshold: number,
    page: number,
    limit: number
  ): Promise<{ wallets: Wallet[]; total: number }> {
    return await this.walletRepo.findLowBalanceWallets(threshold, page, limit);
  }

  /**
   * Get wallet statistics (admin)
   */
  async getStatistics(): Promise<WalletStatistics> {
    return await this.walletRepo.getStatistics();
  }

  /**
   * Manual wallet adjustment (admin only)
   */
  async adjustWallet(data: {
    walletId: string;
    amount: number;
    adjustmentType: "credit" | "debit";
    reason: string;
    adjustedBy: string;
  }): Promise<Wallet> {
    if (data.amount <= 0) {
      throw new AppError("Adjustment amount must be positive", 400);
    }

    return await prisma.$transaction(async (tx: any) => {
      const wallet = await this.walletRepo.findById(data.walletId, tx);
      if (!wallet) {
        throw new AppError("Wallet not found", 404);
      }

      // For debit, ensure sufficient balance
      if (data.adjustmentType === "debit" && wallet.currentBalance < data.amount) {
        throw new AppError("Insufficient wallet balance for debit adjustment", 400);
      }

      // Update balance
      let updatedWallet: Wallet;
      if (data.adjustmentType === "credit") {
        updatedWallet = await this.walletRepo.incrementBalance(
          data.walletId,
          data.amount,
          tx
        );
      } else {
        updatedWallet = await this.walletRepo.decrementBalance(
          data.walletId,
          data.amount,
          tx
        );
      }

      // Create GL entry
      // For credit adjustments (cash in): Dr Cash - Agent Custody, Cr Wallet Liability
      // For debit adjustments (cash out/refund): Dr Wallet Liability, Cr Cash
      const debitAccount =
        data.adjustmentType === "credit"
          ? ACCOUNT_CODES.CASH_AGENT_CUSTODY
          : ACCOUNT_CODES.MEMBER_WALLET_LIABILITY;
      const creditAccount =
        data.adjustmentType === "credit"
          ? ACCOUNT_CODES.MEMBER_WALLET_LIABILITY
          : ACCOUNT_CODES.CASH;

      const journalEntry = await this.journalEntryService.createJournalEntry({
        entryDate: new Date(),
        description: `Wallet Adjustment - ${data.reason}`,
        reference: `ADJ-${data.walletId.substring(0, 8)}`,
        sourceModule: TRANSACTION_SOURCE.WALLET,
        sourceEntityId: data.walletId,
        sourceTransactionType:
          data.adjustmentType === "credit"
            ? TRANSACTION_TYPE.WALLET_DEPOSIT
            : TRANSACTION_TYPE.WALLET_WITHDRAWAL,
        lines: [
          {
            accountCode: debitAccount,
            debitAmount: data.amount,
            creditAmount: 0,
            description: `Wallet ${data.adjustmentType} adjustment`,
          },
          {
            accountCode: creditAccount,
            debitAmount: 0,
            creditAmount: data.amount,
            description: `Wallet ${data.adjustmentType} adjustment`,
          },
        ],
        createdBy: data.adjustedBy,
        autoPost: true,
      });

      // Create transaction record
      await this.walletTransactionRepo.create(
        {
          transactionId: uuidv4(),
          walletId: data.walletId,
          transactionType: WalletTransactionType.Adjustment,
          amount: data.amount,
          balanceAfter: updatedWallet.currentBalance,
          sourceModule: TRANSACTION_SOURCE.MANUAL_ADJUSTMENT,
          sourceEntityId: null,
          description: `Manual ${data.adjustmentType} adjustment: ${data.reason}`,
          journalEntryId: journalEntry.entry.entryId,
          status: WalletTransactionStatus.Completed,
          createdBy: data.adjustedBy,
        },
        tx
      );

      // Emit event
      eventBus.publish(
        new WalletAdjustedEvent(
          {
            walletId: data.walletId,
            memberId: wallet.memberId,
            amount: data.amount,
            adjustmentType: data.adjustmentType,
            reason: data.reason,
            newBalance: updatedWallet.currentBalance,
            adjustedBy: data.adjustedBy,
          },
          data.adjustedBy
        )
      );

      return updatedWallet;
    });
  }
}
