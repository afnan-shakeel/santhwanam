// Event Handler: Process wallet deposit approval

import { IEventHandler } from "@/shared/domain/events/event-handler.interface";
import { DomainEvent } from "@/shared/domain/events/domain-event.base";
import { DepositRequestService } from "../depositRequestService";
import { logger } from "@/shared/utils/logger";

interface ApprovalRequestApprovedPayload {
  requestId: string;
  workflowCode: string;
  entityType: string;
  entityId: string;
  approvedBy: string;
  approvedAt: Date;
}

export class ProcessWalletDepositApprovalHandler
  implements IEventHandler<DomainEvent>
{
  constructor(private readonly depositRequestService: DepositRequestService) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as unknown as ApprovalRequestApprovedPayload;

    // Only handle wallet deposit approvals
    if (
      payload.workflowCode !== "wallet_deposit" ||
      payload.entityType !== "WalletDepositRequest"
    ) {
      return;
    }

    const depositRequestId = payload.entityId;
    const approvedBy = payload.approvedBy;

    logger.info("Processing wallet deposit approval", {
      depositRequestId,
      approvedBy,
      eventId: event.eventId,
    });

    try {
      await this.depositRequestService.processApproval(
        depositRequestId,
        approvedBy
      );

      logger.info("Wallet deposit approved successfully", {
        depositRequestId,
        approvedBy,
      });
    } catch (error) {
      logger.error("Failed to process wallet deposit approval", {
        depositRequestId,
        approvedBy,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}
