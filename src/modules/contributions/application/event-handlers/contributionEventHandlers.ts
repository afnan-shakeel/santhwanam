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
      logger.info(`Starting contribution cycle for death claim ${event.payload.claimId}`);

      await this.contributionService.startContributionCycle({
        deathClaimId: event.payload.claimId,
        claimNumber: event.payload.claimNumber,
        deceasedMemberId: event.payload.memberId,
        deceasedMemberName: event.payload.memberCode, // Assuming memberCode is name
        benefitAmount: event.payload.benefitAmount,
        forumId: event.payload.forumId,
      });

      logger.info(`Contribution cycle started successfully for claim ${event.payload.claimNumber}`);
    } catch (error) {
      logger.error('Failed to start contribution cycle', {
        error,
        claimId: event.payload.claimId,
      });
      // Don't throw - event handler failures should be logged but not block
    }
  }
}
