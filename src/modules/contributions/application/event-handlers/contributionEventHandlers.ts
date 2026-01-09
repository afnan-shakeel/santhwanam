// Application: Contribution Event Handlers
// Handles events that trigger contribution workflows

import { ContributionService } from './contributionService';
import { DeathClaimApprovedEvent } from '@/modules/death-claims/domain/events';
import { logger } from '@/shared/utils/logger';

export class ContributionEventHandlers {
  constructor(private readonly contributionService: ContributionService) {}

  /**
   * Handle DeathClaimApproved event
   * Automatically starts a contribution cycle
   */
  async handleDeathClaimApproved(event: DeathClaimApprovedEvent): Promise<void> {
    try {
      const data = event.data;
      logger.info(`Starting contribution cycle for death claim ${data.claimId}`);

      await this.contributionService.startContributionCycle({
        deathClaimId: data.claimId,
        claimNumber: data.claimNumber,
        deceasedMemberId: data.memberId,
        deceasedMemberName: data.memberName,
        benefitAmount: data.benefitAmount,
        forumId: data.forumId,
      });

      logger.info(`Contribution cycle started successfully for claim ${data.claimNumber}`);
    } catch (error) {
      logger.error('Failed to start contribution cycle', {
        error,
        claimId: event.data.claimId,
      });
      // Don't throw - event handler failures should be logged but not block
    }
  }
}
