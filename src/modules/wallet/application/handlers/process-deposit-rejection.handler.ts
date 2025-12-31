// Event Handler: Process wallet deposit rejection

import { IEventHandler } from "@/shared/domain/events/event-handler.interface";
import { DomainEvent } from "@/shared/domain/events/domain-event.base";
import { DepositRequestService } from "../depositRequestService";
import { logger } from "@/shared/utils/logger";

interface ApprovalRequestRejectedPayload {
  requestId: string;
  workflowCode: string;
  entityType: string;
  entityId: string;
  rejectedBy: string;
  rejectedAt: Date;
  rejectionReason: string | null;
}

export class ProcessWalletDepositRejectionHandler
  implements IEventHandler<DomainEvent>
{
  constructor(private readonly depositRequestService: DepositRequestService) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as unknown as ApprovalRequestRejectedPayload;

    // Only handle wallet deposit rejections
    if (
      payload.workflowCode !== "wallet_deposit" ||
      payload.entityType !== "WalletDepositRequest"
    ) {
      return;
    }

    const depositRequestId = payload.entityId;
    const rejectionReason = payload.rejectionReason;

    logger.info("Processing wallet deposit rejection", {
      depositRequestId,
      rejectionReason,
      eventId: event.eventId,
    });

    try {
      await this.depositRequestService.processRejection(
        depositRequestId,
        rejectionReason
      );

      logger.info("Wallet deposit rejected successfully", {
        depositRequestId,
        rejectionReason,
      });
    } catch (error) {
      logger.error("Failed to process wallet deposit rejection", {
        depositRequestId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}
