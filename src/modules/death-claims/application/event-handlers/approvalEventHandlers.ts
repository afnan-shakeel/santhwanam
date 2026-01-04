/**
 * Event handler for approval workflow events related to death claims
 */

import { IEventHandler } from '@/shared/domain/events/event-handler.interface';
import {
  ApprovalRequestApprovedEvent,
  ApprovalRequestRejectedEvent,
} from '@/modules/approval-workflow/domain/events';
import { DeathClaimService } from '../deathClaimService';
import { logger } from '@/shared/utils/logger';

export class DeathClaimApprovalApprovedHandler implements IEventHandler<ApprovalRequestApprovedEvent> {
  constructor(private deathClaimService: DeathClaimService) {}

  async handle(event: ApprovalRequestApprovedEvent): Promise<void> {
    const { workflowCode, entityId, approvedBy } = event.data;

    // Only handle death claim approvals
    if (workflowCode !== 'death_claim_approval') {
      return;
    }

    try {
      logger.info('Processing death claim approval', {
        claimId: entityId,
        approvedBy,
      });

      await this.deathClaimService.approveDeathClaim(entityId, approvedBy);

      logger.info('Death claim approved successfully', {
        claimId: entityId,
      });
    } catch (error) {
      logger.error('Failed to approve death claim', {
        claimId: entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export class DeathClaimApprovalRejectedHandler implements IEventHandler<ApprovalRequestRejectedEvent> {
  constructor(private deathClaimService: DeathClaimService) {}

  async handle(event: ApprovalRequestRejectedEvent): Promise<void> {
    const { workflowCode, entityId, rejectedBy, rejectionReason } = event.data;

    // Only handle death claim rejections
    if (workflowCode !== 'death_claim_approval') {
      return;
    }

    try {
      logger.info('Processing death claim rejection', {
        claimId: entityId,
        rejectedBy,
      });

      await this.deathClaimService.rejectDeathClaim(entityId, rejectedBy, rejectionReason || null);

      logger.info('Death claim rejected successfully', {
        claimId: entityId,
      });
    } catch (error) {
      logger.error('Failed to reject death claim', {
        claimId: entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
