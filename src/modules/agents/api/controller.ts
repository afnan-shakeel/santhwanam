/**
 * Controller for Agents API
 */

import type { Request, Response, NextFunction } from "express";
import type { AgentService } from "../application/agentService";
import type { AgentProfileService } from "../application/agentProfileService";
import {
  AgentResponseDto,
  AgentListResponseDto,
  AgentSubmissionResponseDto,
  AgentsSearchResponseDto,
  AgentProfileResponseDto,
  AgentStatsResponseDto,
  AgentMembersResponseDto,
  AgentMembersExportResponseDto,
  AgentPerformanceResponseDto,
  AgentHierarchyResponseDto,
} from './dtos/responseDtos'
import {
  StartAgentRegistrationHandler,
  UpdateAgentDraftHandler,
  SubmitAgentRegistrationHandler,
  UpdateAgentHandler,
  TerminateAgentHandler,
} from "../application/commands/index";

export class AgentsController {
  constructor(
    private readonly agentService: AgentService,
    private readonly agentProfileService: AgentProfileService,
    private readonly startRegistrationCmd: StartAgentRegistrationHandler,
    private readonly updateDraftCmd: UpdateAgentDraftHandler,
    private readonly submitRegistrationCmd: SubmitAgentRegistrationHandler,
    private readonly updateAgentCmd: UpdateAgentHandler,
    private readonly terminateAgentCmd: TerminateAgentHandler
  ) {}

  /**
   * POST /api/agents/register
   * Start agent registration (creates in Draft status)
   */
  startRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const agent = await this.startRegistrationCmd.execute(req.body);
    next({ responseSchema: AgentResponseDto, data: agent, status: 201 });
  };

  /**
   * PATCH /api/agents/:agentId/draft
   * Update agent while in Draft status
   */
  updateDraft = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const agent = await this.updateDraftCmd.execute({
      agentId,
      ...req.body,
    });
    next({ responseSchema: AgentResponseDto, data: agent, status: 200 });
  };

  /**
   * POST /api/agents/:agentId/submit
   * Submit agent registration for approval
   */
  submitRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { agentId } = req.params;
    const result = await this.submitRegistrationCmd.execute({ agentId });
    next({ responseSchema: AgentSubmissionResponseDto, data: result, status: 200 });
  };

  /**
   * PATCH /api/agents/:agentId
   * Update approved agent details
   */
  updateAgent = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const agent = await this.updateAgentCmd.execute({
      agentId,
      ...req.body,
    });
    next({ responseSchema: AgentResponseDto, data: agent, status: 200 });
  };

  /**
   * POST /api/agents/:agentId/terminate
   * Terminate agent (requires 0 active members)
   */
  terminateAgent = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const agent = await this.terminateAgentCmd.execute({
      agentId,
      ...req.body,
    });
    next({ responseSchema: AgentResponseDto, data: agent, status: 200 });
  };

  /**
   * GET /api/agents/:agentId
   * Get agent by ID
   */
  getAgentById = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const agent = await this.agentService.getAgentById(agentId);
    next({ responseSchema: AgentResponseDto, data: agent, status: 200 });
  };

  /**
   * GET /api/agents/unit/:unitId
   * List agents by unit
   */
  listByUnit = async (req: Request, res: Response, next: NextFunction) => {
    const { unitId } = req.params;
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 20;
    const result = await this.agentService.listByUnit(unitId, skip, take);
    next({ responseSchema: AgentListResponseDto, data: result, status: 200 });
  };

  /**
   * GET /api/agents/area/:areaId
   * List agents by area
   */
  listByArea = async (req: Request, res: Response, next: NextFunction) => {
    const { areaId } = req.params;
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 20;
    const result = await this.agentService.listByArea(areaId, skip, take);
    next({ responseSchema: AgentListResponseDto, data: result, status: 200 });
  };

  /**
   * GET /api/agents/forum/:forumId
   * List agents by forum
   */
  listByForum = async (req: Request, res: Response, next: NextFunction) => {
    const { forumId } = req.params;
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 20;
    const result = await this.agentService.listByForum(forumId, skip, take);
    next({ responseSchema: AgentListResponseDto, data: result, status: 200 });
  };

  /**
   * POST /api/agents/search
   * Search agents with advanced filtering
   */
  searchAgents = async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.agentService.searchAgents(req.body);
    next({ responseSchema: AgentsSearchResponseDto, data: result, status: 200 });
  };

  // ===== AGENT PROFILE APIs =====

  /**
   * GET /api/agents/:agentId/profile
   * Get agent profile with hierarchy
   */
  getAgentProfile = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const profile = await this.agentProfileService.getAgentProfile(agentId);
    next({ responseSchema: AgentProfileResponseDto, data: profile, status: 200 });
  };

  /**
   * GET /api/agents/my-profile
   * Get logged-in agent's profile
   */
  getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return next({ status: 401, message: "Unauthorized" });
    }
    const profile = await this.agentProfileService.getAgentProfileByUserId(userId);
    next({ responseSchema: AgentProfileResponseDto, data: profile, status: 200 });
  };

  /**
   * PUT /api/agents/:agentId/profile
   * Update agent profile
   */
  updateAgentProfile = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const userId = (req as any).user?.userId;
    const profile = await this.agentProfileService.updateAgentProfile(agentId, {
      ...req.body,
      updatedBy: userId,
    });
    next({ responseSchema: AgentProfileResponseDto, data: profile, status: 200 });
  };

  /**
   * GET /api/agents/:agentId/stats
   * Get agent dashboard stats
   */
  getAgentStats = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const stats = await this.agentProfileService.getAgentStats(agentId);
    next({ responseSchema: AgentStatsResponseDto, data: stats, status: 200 });
  };

  /**
   * GET /api/agents/:agentId/members
   * Get agent's members with pagination and filtering
   */
  getAgentMembers = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const query = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as string | undefined,
      tier: req.query.tier as string | undefined,
      search: req.query.search as string | undefined,
    };
    const members = await this.agentProfileService.getAgentMembers(agentId, query);
    console.log(JSON.stringify(members, null, 2));
    next({ responseSchema: AgentMembersResponseDto, data: members, status: 200 });
  };

  /**
   * GET /api/agents/:agentId/members/export
   * Export agent's members as CSV/Excel
   */
  exportAgentMembers = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const format = (req.query.format as "csv" | "excel") || "csv";
    const members = await this.agentProfileService.exportAgentMembers(agentId, format);
    next({ responseSchema: AgentMembersExportResponseDto, data: { members }, status: 200 });
  };

  /**
   * GET /api/agents/:agentId/performance
   * Get agent performance metrics
   */
  getAgentPerformance = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const period = (req.query.period as string) || "thisMonth";
    const performance = await this.agentProfileService.getAgentPerformance(agentId, period);
    next({ responseSchema: AgentPerformanceResponseDto, data: performance, status: 200 });
  };

  /**
   * GET /api/agents/:agentId/hierarchy
   * Get agent's organization hierarchy
   */
  getAgentHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const hierarchy = await this.agentProfileService.getAgentHierarchy(agentId);
    next({ responseSchema: AgentHierarchyResponseDto, data: hierarchy, status: 200 });
  };
}
