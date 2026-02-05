// Cash Management Event Handlers
// Subscribes to events from other modules to manage cash custody

import { ContributionCollectedEvent } from '@/modules/contributions/domain/events';
import { WalletDepositRequestedEvent } from '@/modules/wallet/domain/events';
import { CashCustodyService } from '../cashCustodyService';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { logger } from '@/shared/utils/logger';
import { TRANSACTION_SOURCE, TRANSACTION_TYPE } from '@/modules/gl/constants/accountCodes';

export class CashManagementEventHandlers {
  constructor(private readonly cashCustodyService: CashCustodyService) {}

  /**
   * Handle ContributionCollectedEvent
   * When a contribution is collected via DirectCash, increase the agent's cash custody
   */
  async handleContributionCollected(event: ContributionCollectedEvent): Promise<void> {
    const { paymentMethod, amount, collectedBy, contributionId } = event.data;

    // Only process direct cash payments
    if (paymentMethod !== 'DirectCash') {
      return;
    }

    try {
      // Increase agent's cash custody
      await this.cashCustodyService.increaseCashCustody({
        userId: collectedBy,
        amount,
        sourceModule: TRANSACTION_SOURCE.CONTRIBUTION,
        sourceEntityId: contributionId,
        sourceTransactionType: TRANSACTION_TYPE.CONTRIBUTION_DIRECT_CASH,
      });

      logger.info(`Cash custody increased for agent ${collectedBy}, amount: ${amount}`);
    } catch (error) {
      logger.error('Failed to update cash custody for contribution collection', error);
      // Don't throw - we don't want to fail the contribution collection
    }
  }

  /**
   * Handle WalletDepositRequestedEvent
   * When an agent collects wallet deposit cash, increase the agent's cash custody
   */
  async handleWalletDepositRequested(event: WalletDepositRequestedEvent): Promise<void> {
    const { amount, collectedBy, depositRequestId } = event.data;

    try {
      // Increase agent's cash custody
      logger.info(`Handling wallet deposit requested event for depositRequestId: ${depositRequestId}, amount: ${amount}, collectedBy: ${collectedBy}`);
      await this.cashCustodyService.increaseCashCustody({
        userId: collectedBy,
        amount,
        sourceModule: TRANSACTION_SOURCE.WALLET,
        sourceEntityId: depositRequestId,
        sourceTransactionType: TRANSACTION_TYPE.WALLET_DEPOSIT_COLLECTION,
      });

      logger.info(`Cash custody increased for agent ${collectedBy} (wallet deposit), amount: ${amount}`);
    } catch (error) {
      logger.error('Failed to update cash custody for wallet deposit collection', error);
      // Don't throw - we don't want to fail the deposit request
    }
  }
}
