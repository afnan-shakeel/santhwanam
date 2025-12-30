/**
 * Controller for Agents API
 */

import type { Request, Response, NextFunction } from "express";
import type { AgentService } from "../application/agentService";
import {
  AgentResponseDto,
  AgentListResponseDto,
  AgentSubmissionResponseDto,
  AgentsSearchResponseDto,
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
}
