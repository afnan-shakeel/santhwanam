// Module: Cash Management
// Main entry point for cash management module

import { CashCustodyService } from './application/cashCustodyService';
import { CashHandoverService } from './application/cashHandoverService';
import { CashManagementEventHandlers } from './application/event-handlers/cashManagementEventHandlers';
import { CashManagementController } from './api/controller';
import { createCashManagementRouter } from './api/router';

// Repositories
import { PrismaCashCustodyRepository } from './infrastructure/prisma/cashCustodyRepository';
import { PrismaCashHandoverRepository } from './infrastructure/prisma/cashHandoverRepository';

// GL service
import { JournalEntryService } from '@/modules/gl/application/journalEntryService';
import { PrismaJournalEntryRepository } from '@/modules/gl/infrastructure/prisma/journalEntryRepository';
import { PrismaJournalEntryLineRepository } from '@/modules/gl/infrastructure/prisma/journalEntryLineRepository';
import { PrismaChartOfAccountRepository } from '@/modules/gl/infrastructure/prisma/chartOfAccountRepository';

// Approval workflow service
import { ApprovalRequestService } from '@/modules/approval-workflow/application/approvalRequestService';
import { PrismaApprovalWorkflowRepository } from '@/modules/approval-workflow/infrastructure/prisma/approvalWorkflowRepository';
import { PrismaApprovalStageRepository } from '@/modules/approval-workflow/infrastructure/prisma/approvalStageRepository';
import { PrismaApprovalRequestRepository } from '@/modules/approval-workflow/infrastructure/prisma/approvalRequestRepository';
import { PrismaApprovalStageExecutionRepository } from '@/modules/approval-workflow/infrastructure/prisma/approvalStageExecutionRepository';
import { PrismaForumRepository } from '@/modules/organization-bodies/infrastructure/prisma/forumRepository';
import { PrismaAreaRepository } from '@/modules/organization-bodies/infrastructure/prisma/areaRepository';
import { PrismaUnitRepository } from '@/modules/organization-bodies/infrastructure/prisma/unitRepository';

// Event bus
import { eventBus } from '@/shared/domain/events/event-bus';
import { ContributionCollectedEvent } from '@/modules/contributions/domain/events';

// Initialize repositories
const cashCustodyRepo = new PrismaCashCustodyRepository();
const cashHandoverRepo = new PrismaCashHandoverRepository();

// Initialize GL service
const journalEntryRepo = new PrismaJournalEntryRepository();
const journalEntryLineRepo = new PrismaJournalEntryLineRepository();
const chartOfAccountRepo = new PrismaChartOfAccountRepository();
const journalEntryService = new JournalEntryService(
  journalEntryRepo,
  journalEntryLineRepo,
  chartOfAccountRepo
);

// Initialize approval workflow service
const workflowRepo = new PrismaApprovalWorkflowRepository();
const stageRepo = new PrismaApprovalStageRepository();
const requestRepo = new PrismaApprovalRequestRepository();
const executionRepo = new PrismaApprovalStageExecutionRepository();
const forumRepo = new PrismaForumRepository();
const areaRepo = new PrismaAreaRepository();
const unitRepo = new PrismaUnitRepository();
const approvalRequestService = new ApprovalRequestService(
  workflowRepo,
  stageRepo,
  requestRepo,
  executionRepo,
  forumRepo,
  areaRepo,
  unitRepo
);

// Initialize custody service
const cashCustodyService = new CashCustodyService(cashCustodyRepo);

// Initialize handover service
const cashHandoverService = new CashHandoverService(
  cashCustodyRepo,
  cashHandoverRepo,
  cashCustodyService,
  journalEntryService,
  approvalRequestService
);

// Initialize event handlers
const cashManagementEventHandlers = new CashManagementEventHandlers(cashCustodyService);

// Subscribe to ContributionCollectedEvent
eventBus.subscribe(
  ContributionCollectedEvent.EVENT_TYPE,
  {
    handle: async (event: ContributionCollectedEvent) => {
      await cashManagementEventHandlers.handleContributionCollected(event);
    }
  }
);

// Initialize controller
const cashManagementController = new CashManagementController(
  cashCustodyService,
  cashHandoverService
);

// Create router
const cashManagementRouter = createCashManagementRouter(cashManagementController);

// Export for use in other modules
export {
  // Services
  cashCustodyService,
  cashHandoverService,
  
  // Repositories
  cashCustodyRepo,
  cashHandoverRepo,
  
  // Router
  cashManagementRouter,
  
  // Controller
  cashManagementController,
};

// Export types and entities
export * from './domain/entities';
export * from './domain/repositories';
export * from './domain/events';
