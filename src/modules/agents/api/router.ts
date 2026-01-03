/**
 * Router for Agents API
 */

import { Router } from "express";
import type { AgentsController } from "./controller";
import { validateBody, validateQuery, validateParams } from "@/shared/middleware/validateZod";
import {
  startAgentRegistrationSchema,
  updateAgentDraftSchema,
  updateAgentSchema,
  terminateAgentSchema,
  updateAgentProfileSchema,
  agentStatsQuerySchema,
  agentMembersQuerySchema,
  agentMembersExportQuerySchema,
  agentPerformanceQuerySchema,
  agentIdParamSchema,
} from "./validators";
import { searchValidationSchema } from "@/shared/validators/searchValidator";

export function createAgentsRouter(controller: AgentsController): Router {
  const router = Router();

  // Search
  router.post("/search", validateBody(searchValidationSchema), controller.searchAgents);

  // ===== AGENT PROFILE APIs =====
  
  // My profile (for logged-in agent) - must be before :agentId routes
  router.get("/my-profile", controller.getMyProfile);

  // Agent profile
  router.get(
    "/:agentId/profile",
    validateParams(agentIdParamSchema),
    controller.getAgentProfile
  );

  router.put(
    "/:agentId/profile",
    validateParams(agentIdParamSchema),
    validateBody(updateAgentProfileSchema),
    controller.updateAgentProfile
  );

  // Agent stats
  router.get(
    "/:agentId/stats",
    validateParams(agentIdParamSchema),
    validateQuery(agentStatsQuerySchema),
    controller.getAgentStats
  );

  // Agent members
  router.get(
    "/:agentId/members",
    validateParams(agentIdParamSchema),
    validateQuery(agentMembersQuerySchema),
    controller.getAgentMembers
  );

  router.get(
    "/:agentId/members/export",
    validateParams(agentIdParamSchema),
    validateQuery(agentMembersExportQuerySchema),
    controller.exportAgentMembers
  );

  // Agent performance
  router.get(
    "/:agentId/performance",
    validateParams(agentIdParamSchema),
    validateQuery(agentPerformanceQuerySchema),
    controller.getAgentPerformance
  );

  // Agent hierarchy
  router.get(
    "/:agentId/hierarchy",
    validateParams(agentIdParamSchema),
    controller.getAgentHierarchy
  );

  // ===== AGENT REGISTRATION WORKFLOW =====
  
  router.post(
    "/register",
    validateBody(startAgentRegistrationSchema),
    controller.startRegistration
  );

  router.patch(
    "/:agentId/draft",
    validateParams(agentIdParamSchema),
    validateBody(updateAgentDraftSchema),
    controller.updateDraft
  );

  router.post(
    "/:agentId/submit",
    validateParams(agentIdParamSchema),
    controller.submitRegistration
  );

  // ===== AGENT MANAGEMENT =====
  
  router.get(
    "/:agentId",
    validateParams(agentIdParamSchema),
    controller.getAgentById
  );

  router.patch(
    "/:agentId",
    validateParams(agentIdParamSchema),
    validateBody(updateAgentSchema),
    controller.updateAgent
  );

  router.post(
    "/:agentId/terminate",
    validateParams(agentIdParamSchema),
    validateBody(terminateAgentSchema),
    controller.terminateAgent
  );

  // List agents by hierarchy
  router.get("/unit/:unitId", controller.listByUnit);
  router.get("/area/:areaId", controller.listByArea);
  router.get("/forum/:forumId", controller.listByForum);

  return router;
}
