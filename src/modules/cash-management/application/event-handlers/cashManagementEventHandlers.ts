// Cash Management Event Handlers
// Subscribes to events from other modules to manage cash custody

import { ContributionCollectedEvent } from '@/modules/contributions/domain/events';
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
}
