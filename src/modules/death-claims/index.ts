// Module: Death Claims
// Main entry point for death claims module

import { DeathClaimService } from './application/deathClaimService';
import { DeathClaimsController } from './api/controller';
import { createDeathClaimsRouter } from './api/router';

// Event handlers
import {
  DeathClaimApprovalApprovedHandler,
  DeathClaimApprovalRejectedHandler,
} from './application/event-handlers/approvalEventHandlers';

// Repositories
import { PrismaDeathClaimRepository } from './infrastructure/prisma/deathClaimRepository';
import { PrismaDeathClaimDocumentRepository } from './infrastructure/prisma/deathClaimDocumentRepository';

// Member module dependencies
import { PrismaMemberRepository } from '@/modules/members/infrastructure/prisma/memberRepository';
import { PrismaNomineeRepository } from '@/modules/members/infrastructure/prisma/nomineeRepository';
import { PrismaMembershipTierRepository } from '@/modules/members/infrastructure/prisma/membershipTierRepository';

// Approval workflow dependency
import { ApprovalRequestService } from '@/modules/approval-workflow/application/approvalRequestService';
import { PrismaApprovalWorkflowRepository } from '@/modules/approval-workflow/infrastructure/prisma/approvalWorkflowRepository';
import { PrismaApprovalRequestRepository } from '@/modules/approval-workflow/infrastructure/prisma/approvalRequestRepository';
import { PrismaApprovalStageRepository } from '@/modules/approval-workflow/infrastructure/prisma/approvalStageRepository';
import { PrismaApprovalStageExecutionRepository } from '@/modules/approval-workflow/infrastructure/prisma/approvalStageExecutionRepository';
import { PrismaForumRepository } from '@/modules/organization-bodies/infrastructure/prisma/forumRepository';
import { PrismaAreaRepository } from '@/modules/organization-bodies/infrastructure/prisma/areaRepository';
import { PrismaUnitRepository } from '@/modules/organization-bodies/infrastructure/prisma/unitRepository';

// GL service
import { JournalEntryService } from '@/modules/gl/application/journalEntryService';
import { PrismaJournalEntryRepository } from '@/modules/gl/infrastructure/prisma/journalEntryRepository';
import { PrismaJournalEntryLineRepository } from '@/modules/gl/infrastructure/prisma/journalEntryLineRepository';
import { PrismaChartOfAccountRepository } from '@/modules/gl/infrastructure/prisma/chartOfAccountRepository';

// File upload service
import { FileUploadService } from '@/shared/infrastructure/file-upload/fileUploadService';

// Event bus
import { eventBus } from '@/shared/domain/events/event-bus';
import {
  ApprovalRequestApprovedEvent,
  ApprovalRequestRejectedEvent,
} from '@/modules/approval-workflow/domain/events';

// ===== Initialize Repositories =====

const deathClaimRepo = new PrismaDeathClaimRepository();
const deathClaimDocumentRepo = new PrismaDeathClaimDocumentRepository();

// Member repositories
const memberRepo = new PrismaMemberRepository();
const nomineeRepo = new PrismaNomineeRepository();
const tierRepo = new PrismaMembershipTierRepository();

// GL repositories
const journalEntryRepo = new PrismaJournalEntryRepository();
const journalEntryLineRepo = new PrismaJournalEntryLineRepository();
const chartOfAccountRepo = new PrismaChartOfAccountRepository();

// Approval workflow repositories
const workflowRepo = new PrismaApprovalWorkflowRepository();
const approvalRequestRepo = new PrismaApprovalRequestRepository();
const approvalStageRepo = new PrismaApprovalStageRepository();
const approvalStageExecutionRepo = new PrismaApprovalStageExecutionRepository();
const forumRepo = new PrismaForumRepository();
const areaRepo = new PrismaAreaRepository();
const unitRepo = new PrismaUnitRepository();

// ===== Initialize Services =====

const journalEntryService = new JournalEntryService(
  journalEntryRepo,
  journalEntryLineRepo,
  chartOfAccountRepo
);

const approvalRequestService = new ApprovalRequestService(
  workflowRepo,
  approvalStageRepo,
  approvalRequestRepo,
  approvalStageExecutionRepo,
  forumRepo,
  areaRepo,
  unitRepo
);

const fileUploadService = new FileUploadService('uploads');

const deathClaimService = new DeathClaimService(
  deathClaimRepo,
  deathClaimDocumentRepo,
  memberRepo,
  nomineeRepo,
  tierRepo,
  approvalRequestService,
  journalEntryService,
  fileUploadService
);

// ===== Initialize Event Handlers =====

const approvalApprovedHandler = new DeathClaimApprovalApprovedHandler(deathClaimService);
const approvalRejectedHandler = new DeathClaimApprovalRejectedHandler(deathClaimService);

// Subscribe to approval workflow events
eventBus.subscribe(ApprovalRequestApprovedEvent.EVENT_TYPE, approvalApprovedHandler);
eventBus.subscribe(ApprovalRequestRejectedEvent.EVENT_TYPE, approvalRejectedHandler);

// ===== Initialize Controller & Router =====

const deathClaimsController = new DeathClaimsController(deathClaimService);
const deathClaimsRouter = createDeathClaimsRouter(deathClaimsController);

// ===== Exports =====

export { deathClaimsRouter, deathClaimService, DeathClaimService };
