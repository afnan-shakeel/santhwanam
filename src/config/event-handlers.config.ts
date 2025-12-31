import { eventBus } from '@/shared/domain/events/event-bus';
import { logger } from '@/shared/utils/logger';

// Agent module
import { agentService, agentRepo } from '@/modules/agents';
import { ActivateAgentOnApprovalHandler, RejectAgentOnApprovalHandler } from '@/modules/agents/application/event-handlers';

// Members module
import { memberRepo, registrationPaymentRepo, memberDocumentRepo } from '@/modules/members';
import { ActivateMemberOnApprovalHandler } from '@/modules/members/application/event-handlers/activate-member-on-approval.handler';
import { RejectMemberOnApprovalHandler } from '@/modules/members/application/event-handlers/reject-member-on-approval.handler';

// Wallet module
import { depositRequestService } from '@/modules/wallet';
import { ProcessWalletDepositApprovalHandler } from '@/modules/wallet/application/handlers/process-deposit-approval.handler';
import { ProcessWalletDepositRejectionHandler } from '@/modules/wallet/application/handlers/process-deposit-rejection.handler';

// Agent repository
import { PrismaAgentRepository } from '@/modules/agents/infrastructure/prisma/agentRepository';

// GL services for member activation
import { JournalEntryService } from '@/modules/gl/application/journalEntryService';
import { PrismaJournalEntryRepository } from '@/modules/gl/infrastructure/prisma/journalEntryRepository';
import { PrismaJournalEntryLineRepository } from '@/modules/gl/infrastructure/prisma/journalEntryLineRepository';
import { PrismaChartOfAccountRepository } from '@/modules/gl/infrastructure/prisma/chartOfAccountRepository';

// IAM module  
import { PrismaUserRepository } from '@/modules/iam/infrastructure/prisma/userRepository';
import { PrismaRoleRepository } from '@/modules/iam/infrastructure/prisma/roleRepository';
import { PrismaUserRoleRepository } from '@/modules/iam/infrastructure/prisma/userRoleRepository';

/**
 * Register all event handlers for the application
 * This is where you subscribe handlers to specific events
 */
export function registerEventHandlers(): void {
  logger.info('Registering event handlers...');

  // Initialize IAM repositories for agent activation
  const userRepo = new PrismaUserRepository();
  const roleRepo = new PrismaRoleRepository();
  const userRoleRepo = new PrismaUserRoleRepository();

  // Initialize agent repository
  const agentRepo = new PrismaAgentRepository();

  // Initialize GL service for member activation
  const journalEntryRepo = new PrismaJournalEntryRepository();
  const journalEntryLineRepo = new PrismaJournalEntryLineRepository();
  const chartOfAccountRepo = new PrismaChartOfAccountRepository();
  const journalEntryService = new JournalEntryService(
    journalEntryRepo,
    journalEntryLineRepo,
    chartOfAccountRepo
  );

  // Agent approval handlers
  const activateAgentHandler = new ActivateAgentOnApprovalHandler(
    agentRepo,
    userRepo,
    roleRepo,
    userRoleRepo
  );

  const rejectAgentHandler = new RejectAgentOnApprovalHandler(agentService);

  // Member approval handlers
  const activateMemberHandler = new ActivateMemberOnApprovalHandler(
    memberRepo,
    memberDocumentRepo,
    registrationPaymentRepo,
    agentRepo,
    journalEntryService
  );

  const rejectMemberHandler = new RejectMemberOnApprovalHandler(
    memberRepo,
    registrationPaymentRepo
  );

  // Subscribe to approval workflow events
  eventBus.subscribe(
    'approval.request.approved',
    activateAgentHandler
  );

  eventBus.subscribe(
    'approval.request.rejected',
    rejectAgentHandler
  );

  eventBus.subscribe(
    'approval.request.approved',
    activateMemberHandler
  );

  eventBus.subscribe(
    'approval.request.rejected',
    rejectMemberHandler
  );

  // Wallet deposit approval handlers
  const processDepositApprovalHandler = new ProcessWalletDepositApprovalHandler(
    depositRequestService
  );

  const processDepositRejectionHandler = new ProcessWalletDepositRejectionHandler(
    depositRequestService
  );

  eventBus.subscribe(
    'approval.request.approved',
    processDepositApprovalHandler
  );

  eventBus.subscribe(
    'approval.request.rejected',
    processDepositRejectionHandler
  );

  logger.info('Event handlers registered successfully');
}

