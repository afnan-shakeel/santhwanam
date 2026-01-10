// Module: Contributions
// Main entry point for contributions module

import { ContributionService } from './application/contributionService';
import { ContributionEventHandlers } from './application/event-handlers/contributionEventHandlers';
import { ContributionController } from './api/controller';
import { createContributionRouter } from './api/router';

// Repositories
import { PrismaContributionCycleRepository } from './infrastructure/prisma/contributionCycleRepository';
import { PrismaMemberContributionRepository } from './infrastructure/prisma/memberContributionRepository';

// Member repository
import { PrismaMemberRepository } from '@/modules/members/infrastructure/prisma/memberRepository';

// Wallet repositories and services
import {
  walletRepo,
  walletTransactionRepo,
  debitRequestService,
} from '@/modules/wallet';

// GL service
import { JournalEntryService } from '@/modules/gl/application/journalEntryService';
import { PrismaJournalEntryRepository } from '@/modules/gl/infrastructure/prisma/journalEntryRepository';
import { PrismaJournalEntryLineRepository } from '@/modules/gl/infrastructure/prisma/journalEntryLineRepository';
import { PrismaChartOfAccountRepository } from '@/modules/gl/infrastructure/prisma/chartOfAccountRepository';

// Event bus
import { eventBus } from '@/shared/domain/events/event-bus';
import { DeathClaimApprovedEvent } from '@/modules/death-claims/domain/events';

// Initialize repositories
const contributionCycleRepo = new PrismaContributionCycleRepository();
const memberContributionRepo = new PrismaMemberContributionRepository();
const memberRepo = new PrismaMemberRepository();

// Initialize GL service
const journalEntryRepo = new PrismaJournalEntryRepository();
const journalEntryLineRepo = new PrismaJournalEntryLineRepository();
const chartOfAccountRepo = new PrismaChartOfAccountRepository();
const journalEntryService = new JournalEntryService(
  journalEntryRepo,
  journalEntryLineRepo,
  chartOfAccountRepo
);

// Initialize contribution service
const contributionService = new ContributionService(
  contributionCycleRepo,
  memberContributionRepo,
  memberRepo,
  walletRepo,
  walletTransactionRepo,
  debitRequestService,
  journalEntryService
);

// Initialize event handlers
const contributionEventHandlers = new ContributionEventHandlers(
  contributionService
);

// Subscribe to DeathClaimApproved event to start contribution cycles
eventBus.subscribe(
  DeathClaimApprovedEvent.EVENT_TYPE,
  {
    handle: async (event: DeathClaimApprovedEvent) => {
      await contributionEventHandlers.handleDeathClaimApproved(event);
    }
  }
);

// Initialize controller
const contributionController = new ContributionController(
  contributionService,
  memberRepo
);

// Create router
const contributionsRouter = createContributionRouter(contributionController);

// Exports
export {
  contributionsRouter,
  contributionService,
  contributionCycleRepo,
  memberContributionRepo,
};
