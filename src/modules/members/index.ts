// Module: Members
// Main entry point for members module

import { MemberService } from "./application/memberService";
import { SubmitMemberRegistrationHandler } from "./application/commands/submitMemberRegistrationCommand";
import { SuspendMemberCommand } from "./application/commands/suspendMemberCommand";
import { ReactivateMemberCommand } from "./application/commands/reactivateMemberCommand";
import { CloseMemberAccountCommand } from "./application/commands/closeMemberAccountCommand";
import { MembersController } from "./api/controller";
import { createMembersRouter } from "./api/router";

// Repositories
import { PrismaMemberRepository } from "./infrastructure/prisma/memberRepository";
import { PrismaNomineeRepository } from "./infrastructure/prisma/nomineeRepository";
import { PrismaMemberDocumentRepository } from "./infrastructure/prisma/memberDocumentRepository";
import { PrismaRegistrationPaymentRepository } from "./infrastructure/prisma/registrationPaymentRepository";
import { PrismaMembershipTierRepository } from "./infrastructure/prisma/membershipTierRepository";

// Approval workflow dependency
import { ApprovalRequestService } from "@/modules/approval-workflow/application/approvalRequestService";
import { PrismaApprovalWorkflowRepository } from "@/modules/approval-workflow/infrastructure/prisma/approvalWorkflowRepository";
import { PrismaApprovalRequestRepository } from "@/modules/approval-workflow/infrastructure/prisma/approvalRequestRepository";
import { PrismaApprovalStageRepository } from "@/modules/approval-workflow/infrastructure/prisma/approvalStageRepository";
import { PrismaApprovalStageExecutionRepository } from "@/modules/approval-workflow/infrastructure/prisma/approvalStageExecutionRepository";
import { PrismaForumRepository } from "@/modules/organization-bodies/infrastructure/prisma/forumRepository";
import { PrismaAreaRepository } from "@/modules/organization-bodies/infrastructure/prisma/areaRepository";
import { PrismaUnitRepository } from "@/modules/organization-bodies/infrastructure/prisma/unitRepository";

// Agent repository for statistics
import { PrismaAgentRepository } from "@/modules/agents/infrastructure/prisma/agentRepository";

// GL services
import { JournalEntryService } from "@/modules/gl/application/journalEntryService";
import { PrismaJournalEntryRepository } from "@/modules/gl/infrastructure/prisma/journalEntryRepository";
import { PrismaJournalEntryLineRepository } from "@/modules/gl/infrastructure/prisma/journalEntryLineRepository";
import { PrismaChartOfAccountRepository } from "@/modules/gl/infrastructure/prisma/chartOfAccountRepository";

// Initialize repositories
const memberRepo = new PrismaMemberRepository();
const nomineeRepo = new PrismaNomineeRepository();
const memberDocumentRepo = new PrismaMemberDocumentRepository();
const registrationPaymentRepo = new PrismaRegistrationPaymentRepository();
const membershipTierRepo = new PrismaMembershipTierRepository();
const agentRepo = new PrismaAgentRepository();

// Initialize GL repositories and service
const journalEntryRepo = new PrismaJournalEntryRepository();
const journalEntryLineRepo = new PrismaJournalEntryLineRepository();
const chartOfAccountRepo = new PrismaChartOfAccountRepository();
const journalEntryService = new JournalEntryService(
  journalEntryRepo,
  journalEntryLineRepo,
  chartOfAccountRepo
);

// Initialize approval workflow
const workflowRepo = new PrismaApprovalWorkflowRepository();
const approvalRequestRepo = new PrismaApprovalRequestRepository();
const approvalStageRepo = new PrismaApprovalStageRepository();
const approvalStageExecutionRepo = new PrismaApprovalStageExecutionRepository();
const forumRepo = new PrismaForumRepository();
const areaRepo = new PrismaAreaRepository();
const unitRepo = new PrismaUnitRepository();

const approvalRequestService = new ApprovalRequestService(
  workflowRepo,
  approvalStageRepo,
  approvalRequestRepo,
  approvalStageExecutionRepo,
  forumRepo,
  areaRepo,
  unitRepo
);

// Initialize service
const memberService = new MemberService(
  memberRepo,
  nomineeRepo,
  memberDocumentRepo,
  registrationPaymentRepo,
  membershipTierRepo,
  unitRepo,
  agentRepo
);

// Initialize commands
const submitRegistrationCmd = new SubmitMemberRegistrationHandler(
  memberService,
  approvalRequestService
);

const suspendMemberCmd = new SuspendMemberCommand(memberRepo, agentRepo);

const reactivateMemberCmd = new ReactivateMemberCommand(memberRepo, agentRepo);

const closeMemberAccountCmd = new CloseMemberAccountCommand(
  memberRepo,
  agentRepo,
  journalEntryService
);

// Initialize controller
const membersController = new MembersController(
  memberService,
  submitRegistrationCmd,
  suspendMemberCmd,
  reactivateMemberCmd,
  closeMemberAccountCmd
);

// Create router
const membersRouter = createMembersRouter(membersController);

// Exports
export {
  membersRouter,
  memberService,
  memberRepo,
  nomineeRepo,
  memberDocumentRepo,
  registrationPaymentRepo,
  membershipTierRepo,
};
