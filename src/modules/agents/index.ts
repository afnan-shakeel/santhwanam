/**
 * Agents Module
 * Wires up repositories, services, commands, and API
 */

import { PrismaAgentRepository } from "./infrastructure/prisma/agentRepository";
import { AgentService } from "./application/agentService";
import { AgentProfileService } from "./application/agentProfileService";
import {
  StartAgentRegistrationHandler,
  UpdateAgentDraftHandler,
  SubmitAgentRegistrationHandler,
  UpdateAgentHandler,
  TerminateAgentHandler,
} from "./application/commands/index";
import { AgentsController } from "./api/controller";
import { createAgentsRouter } from "./api/router";

// Import approval workflow service for submit command
import { requestService as approvalRequestService } from "@/modules/approval-workflow";
import { PrismaUnitRepository } from "../organization-bodies/infrastructure/prisma/unitRepository";

// Import contribution repository for agent profile service
import { PrismaMemberContributionRepository } from "@/modules/contributions/infrastructure/prisma/memberContributionRepository";

// Import organization bodies repo
// import { PrismaUnitRepository } from "@/modules/organization-bodies/infrastructure";

// Initialize repositories
const agentRepo = new PrismaAgentRepository();
const unitRepo = new PrismaUnitRepository();
const memberContributionRepo = new PrismaMemberContributionRepository();

// Initialize services
const agentService = new AgentService(agentRepo, unitRepo);
const agentProfileService = new AgentProfileService(agentRepo, memberContributionRepo);

// Initialize command handlers
const startRegistrationCmd = new StartAgentRegistrationHandler(agentService);
const updateDraftCmd = new UpdateAgentDraftHandler(agentService);
const submitRegistrationCmd = new SubmitAgentRegistrationHandler(
  agentService,
  approvalRequestService
);
const updateAgentCmd = new UpdateAgentHandler(agentService);
const terminateAgentCmd = new TerminateAgentHandler(agentService);

// Initialize controller
const controller = new AgentsController(
  agentService,
  agentProfileService,
  startRegistrationCmd,
  updateDraftCmd,
  submitRegistrationCmd,
  updateAgentCmd,
  terminateAgentCmd
);

// Export router
export const agentsRouter = createAgentsRouter(controller);

// Export service and repositories for use in other modules
export { agentService, agentProfileService, agentRepo };
