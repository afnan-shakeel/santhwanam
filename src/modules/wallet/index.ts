// Module: Wallet
// Main entry point for wallet module

import { WalletService } from "./application/walletService";
import { DepositRequestService } from "./application/depositRequestService";
import { DebitRequestService } from "./application/debitRequestService";
import { WalletController } from "./api/controller";
import { createWalletRouter } from "./api/router";

// Repositories
import { PrismaWalletRepository } from "./infrastructure/prisma/walletRepository";
import { PrismaWalletTransactionRepository } from "./infrastructure/prisma/walletTransactionRepository";
import { PrismaWalletDepositRequestRepository } from "./infrastructure/prisma/depositRequestRepository";
import { PrismaWalletDebitRequestRepository } from "./infrastructure/prisma/debitRequestRepository";

// Member repository
import { PrismaMemberRepository } from "@/modules/members/infrastructure/prisma/memberRepository";

// Approval workflow dependency
import { ApprovalRequestService } from "@/modules/approval-workflow/application/approvalRequestService";
import { PrismaApprovalWorkflowRepository } from "@/modules/approval-workflow/infrastructure/prisma/approvalWorkflowRepository";
import { PrismaApprovalRequestRepository } from "@/modules/approval-workflow/infrastructure/prisma/approvalRequestRepository";
import { PrismaApprovalStageRepository } from "@/modules/approval-workflow/infrastructure/prisma/approvalStageRepository";
import { PrismaApprovalStageExecutionRepository } from "@/modules/approval-workflow/infrastructure/prisma/approvalStageExecutionRepository";
import { PrismaForumRepository } from "@/modules/organization-bodies/infrastructure/prisma/forumRepository";
import { PrismaAreaRepository } from "@/modules/organization-bodies/infrastructure/prisma/areaRepository";
import { PrismaUnitRepository } from "@/modules/organization-bodies/infrastructure/prisma/unitRepository";

// GL services
import { JournalEntryService } from "@/modules/gl/application/journalEntryService";
import { PrismaJournalEntryRepository } from "@/modules/gl/infrastructure/prisma/journalEntryRepository";
import { PrismaJournalEntryLineRepository } from "@/modules/gl/infrastructure/prisma/journalEntryLineRepository";
import { PrismaChartOfAccountRepository } from "@/modules/gl/infrastructure/prisma/chartOfAccountRepository";
import { PrismaAgentRepository } from "../agents/infrastructure/prisma/agentRepository";

// Initialize repositories
const walletRepo = new PrismaWalletRepository();
const walletTransactionRepo = new PrismaWalletTransactionRepository();
const depositRequestRepo = new PrismaWalletDepositRequestRepository();
const debitRequestRepo = new PrismaWalletDebitRequestRepository();
const memberRepo = new PrismaMemberRepository();
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

// Initialize services
const walletService = new WalletService(
  walletRepo,
  walletTransactionRepo,
  journalEntryService
);

const depositRequestService = new DepositRequestService(
  walletRepo,
  depositRequestRepo,
  walletTransactionRepo,
  memberRepo,
  agentRepo,
  approvalRequestService,
  journalEntryService
);

const debitRequestService = new DebitRequestService(
  walletRepo,
  debitRequestRepo,
  walletTransactionRepo,
  memberRepo,
  journalEntryService
);

// Initialize controller
const walletController = new WalletController(
  walletService,
  depositRequestService,
  debitRequestService
);

// Create router
const walletRouter = createWalletRouter(walletController);

// Exports
export {
  walletRouter,
  walletService,
  depositRequestService,
  debitRequestService,
  walletRepo,
  walletTransactionRepo,
  depositRequestRepo,
  debitRequestRepo,
};
