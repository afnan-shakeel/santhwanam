// Application: Agent Service
// Handles agent registration workflow and lifecycle

import { AgentRepository } from "../domain/repositories";
import { Agent, RegistrationStatus, AgentStatus, Gender } from "../domain/entities";
import { BadRequestError, NotFoundError } from "@/shared/utils/error-handling/httpErrors";
import prisma from "@/shared/infrastructure/prisma/prismaClient";
import { eventBus } from "@/shared/domain/events/event-bus";
import { searchService, SearchRequest } from "@/shared/infrastructure/search";
import {
  AgentRegistrationStartedEvent,
  AgentDraftUpdatedEvent,
  AgentRegistrationSubmittedEvent,
  AgentActivatedEvent,
  AgentRegistrationRejectedEvent,
  AgentUpdatedEvent,
  AgentTerminatedEvent,
} from "../domain/events";
import { UnitRepository } from "@/modules/organization-bodies/domain/repositories";

interface StartRegistrationInput {
  unitId: string;
  areaId: string;
  forumId: string;
  agentCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  contactNumber: string;
  alternateContactNumber?: string;
  email: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  joinedDate: Date;
  createdBy: string;
}

interface UpdateDraftInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  contactNumber?: string;
  alternateContactNumber?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  updatedBy: string;
}

interface UpdateAgentInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  contactNumber?: string;
  alternateContactNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  updatedBy: string;
}

export class AgentService {
  constructor(
    private agentRepository: AgentRepository,
    private unitRepository: UnitRepository,
  ) {}

  /**
   * Start agent registration in Draft status
   */
  async startRegistration(input: StartRegistrationInput): Promise<Agent> {
    return prisma.$transaction(async (tx: any) => {
      // Validate age >= 18
      const age = this.calculateAge(input.dateOfBirth);
      if (age < 18) {
        throw new BadRequestError("Agent must be at least 18 years old");
      }

      // Check agentCode uniqueness within unit
      const existingCode = await this.agentRepository.existsByCode(
        input.unitId,
        input.agentCode,
        tx
      );
      if (existingCode) {
        throw new BadRequestError(
          `Agent code ${input.agentCode} already exists in this unit`
        );
      }

      // Check email uniqueness
      const existingEmail = await this.agentRepository.existsByEmail(
        input.email,
        tx
      );
      if (existingEmail) {
        throw new BadRequestError(`Email ${input.email} is already in use`);
      }

      // Create agent in Draft status
      const agent = await this.agentRepository.create(
        {
          agentCode: input.agentCode,
          registrationStatus: RegistrationStatus.Draft,
          approvalRequestId: null,
          unitId: input.unitId,
          areaId: input.areaId,
          forumId: input.forumId,
          userId: null,
          firstName: input.firstName,
          middleName: input.middleName || null,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          contactNumber: input.contactNumber,
          alternateContactNumber: input.alternateContactNumber || null,
          email: input.email,
          addressLine1: input.addressLine1 || null,
          addressLine2: input.addressLine2 || null,
          city: input.city || null,
          state: input.state || null,
          postalCode: input.postalCode || null,
          country: input.country || null,
          agentStatus: AgentStatus.Active,
          totalActiveMembers: 0,
          totalRegistrations: 0,
          joinedDate: input.joinedDate,
          terminatedDate: null,
          terminationReason: null,
          createdBy: input.createdBy,
          updatedBy: null,
        },
        tx
      );

      // Publish event
      await eventBus.publish(
        new AgentRegistrationStartedEvent(
          {
            agentId: agent.agentId,
            agentCode: agent.agentCode,
            unitId: agent.unitId,
            areaId: agent.areaId,
            forumId: agent.forumId,
            email: agent.email,
            firstName: agent.firstName,
            lastName: agent.lastName,
            createdBy: agent.createdBy,
          },
          input.createdBy
        )
      );

      return agent;
    });
  }

  /**
   * Update agent while in Draft status
   */
  async updateDraft(
    agentId: string,
    input: UpdateDraftInput
  ): Promise<Agent> {
    return prisma.$transaction(async (tx: any) => {
      const agent = await this.agentRepository.findById(agentId, tx);
      if (!agent) {
        throw new NotFoundError("Agent not found");
      }

      if (agent.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError(
          "Can only update agents in Draft status"
        );
      }

      // Validate age if dateOfBirth is being updated
      if (input.dateOfBirth) {
        const age = this.calculateAge(input.dateOfBirth);
        if (age < 18) {
          throw new BadRequestError("Agent must be at least 18 years old");
        }
      }

      // Validate email uniqueness if being updated
      if (input.email && input.email !== agent.email) {
        const existingEmail = await this.agentRepository.existsByEmail(
          input.email,
          tx
        );
        if (existingEmail) {
          throw new BadRequestError(`Email ${input.email} is already in use`);
        }
      }

      const updated = await this.agentRepository.update(
        agentId,
        {
          ...input,
          updatedBy: input.updatedBy,
        },
        tx
      );

      // Publish event
      await eventBus.publish(
        new AgentDraftUpdatedEvent(
          {
            agentId: updated.agentId,
            agentCode: updated.agentCode,
            updatedBy: input.updatedBy,
            updatedFields: Object.keys(input).filter(k => k !== 'updatedBy'),
          },
          input.updatedBy
        )
      );

      return updated;
    });
  }

  /**
   * Submit agent registration for approval
   * Creates approval request and sets status to PendingApproval
   */
  async submitRegistration(
    agentId: string,
    submittedBy: string
  ): Promise<Agent> {
    return prisma.$transaction(async (tx: any) => {
      const agent = await this.agentRepository.findById(agentId, tx);
      if (!agent) {
        throw new NotFoundError("Agent not found");
      }

      if (agent.registrationStatus !== RegistrationStatus.Draft) {
        throw new BadRequestError(
          "Can only submit agents in Draft status"
        );
      }

      // Validate all required fields
      if (!agent.firstName || !agent.lastName) {
        throw new BadRequestError("First name and last name are required");
      }

      if (!agent.dateOfBirth) {
        throw new BadRequestError("Date of birth is required");
      }

      const age = this.calculateAge(agent.dateOfBirth);
      if (age < 18) {
        throw new BadRequestError("Agent must be at least 18 years old");
      }

      if (!agent.contactNumber) {
        throw new BadRequestError("Contact number is required");
      }

      if (!agent.email) {
        throw new BadRequestError("Email is required");
      }

      // Update to PendingApproval
      // Note: approvalRequestId will be set by SubmitAgentRegistrationCommand
      const updated = await this.agentRepository.updateRegistrationStatus(
        agentId,
        RegistrationStatus.PendingApproval,
        undefined,
        submittedBy,
        tx
      );

      return updated;
    });
  }

  /**
   * Update approved agent details (personal info, contact, address)
   */
  async updateAgent(
    agentId: string,
    input: UpdateAgentInput
  ): Promise<Agent> {
    return prisma.$transaction(async (tx: any) => {
      const agent = await this.agentRepository.findById(agentId, tx);
      if (!agent) {
        throw new NotFoundError("Agent not found");
      }

      if (agent.registrationStatus !== RegistrationStatus.Approved) {
        throw new BadRequestError("Can only update approved agents");
      }

      const updated = await this.agentRepository.update(
        agentId,
        {
          ...input,
          updatedBy: input.updatedBy,
        },
        tx
      );

      // Publish event
      await eventBus.publish(
        new AgentUpdatedEvent(
          {
            agentId: updated.agentId,
            agentCode: updated.agentCode,
            updatedBy: input.updatedBy,
            updatedFields: Object.keys(input).filter(k => k !== 'updatedBy'),
          },
          input.updatedBy
        )
      );

      return updated;
    });
  }

  /**
   * Terminate agent (only if totalActiveMembers = 0)
   */
  async terminateAgent(
    agentId: string,
    terminationReason: string,
    terminatedBy: string
  ): Promise<Agent> {
    return prisma.$transaction(async (tx: any) => {
      const agent = await this.agentRepository.findById(agentId, tx);
      if (!agent) {
        throw new NotFoundError("Agent not found");
      }

      if (agent.agentStatus === AgentStatus.Terminated) {
        throw new BadRequestError("Agent is already terminated");
      }

      if (agent.totalActiveMembers > 0) {
        throw new BadRequestError(
          `Cannot terminate agent with ${agent.totalActiveMembers} active members`
        );
      }

      const updated = await this.agentRepository.updateAgentStatus(
        agentId,
        AgentStatus.Terminated,
        terminatedBy,
        new Date(),
        terminationReason,
        tx
      );

      // Publish event
      await eventBus.publish(
        new AgentTerminatedEvent(
          {
            agentId: updated.agentId,
            agentCode: updated.agentCode,
            terminationReason,
            terminatedBy,
            terminatedDate: new Date(),
          },
          terminatedBy
        )
      );

      return updated;
    });
  }

  /**
   * Get agent by ID
   */
  async getAgentById(agentId: string): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundError("Agent not found");
    }
    return agent;
  }

  /**
   * List agents by unit
   */
  async listByUnit(
    unitId: string,
    skip: number = 0,
    take: number = 20
  ): Promise<{ agents: Agent[]; total: number }> {
    return this.agentRepository.listByUnit(unitId, skip, take);
  }

  /**
   * List agents by unit with summary and member counts
   */
  async listByUnitWithDetails(
    unitId: string,
    skip: number = 0,
    take: number = 20
  ): Promise<{
    summary: {
      totalAgents: number;
      activeAgents: number;
      totalMembers: number;
    };
    items: any[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    // Get summary counts
    const agentCounts = await prisma.agent.groupBy({
      by: ['agentStatus'],
      where: { unitId },
      _count: true,
    });

    const totalAgents = agentCounts.reduce((sum, g) => sum + g._count, 0);
    const activeAgents = agentCounts.find((g) => g.agentStatus === 'Active')?._count || 0;
    const totalMembers = await prisma.member.count({ where: { unitId } });

    // Get agents with pagination
    const agents = await prisma.agent.findMany({
      where: { unitId },
      skip,
      take,
      orderBy: { firstName: 'asc' },
    });

    // Get member counts per agent
    const agentIds = agents.map((a) => a.agentId);
    const memberCounts = await prisma.member.groupBy({
      by: ['agentId'],
      where: { agentId: { in: agentIds } },
      _count: true,
    });

    const memberCountMap = new Map(memberCounts.map((c) => [c.agentId, c._count]));

    const items = agents.map((agent) => ({
      agentId: agent.agentId,
      agentCode: agent.agentCode,
      fullName: `${agent.firstName} ${agent.lastName}`.trim(),
      email: agent.email,
      phone: agent.contactNumber,
      status: agent.agentStatus,
      memberCount: memberCountMap.get(agent.agentId) || 0,
    }));

    const page = Math.floor(skip / take) + 1;

    return {
      summary: {
        totalAgents,
        activeAgents,
        totalMembers,
      },
      items,
      pagination: {
        page,
        pageSize: take,
        totalItems: totalAgents,
        totalPages: Math.ceil(totalAgents / take),
      },
    };
  }

  /**
   * List agents by area
   */
  async listByArea(
    areaId: string,
    skip: number = 0,
    take: number = 20
  ): Promise<{ agents: Agent[]; total: number }> {
    return this.agentRepository.listByArea(areaId, skip, take);
  }

  /**
   * List agents by forum
   */
  async listByForum(
    forumId: string,
    skip: number = 0,
    take: number = 20
  ): Promise<{ agents: Agent[]; total: number }> {
    return this.agentRepository.listByForum(forumId, skip, take);
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  // Event handlers (to be implemented with event bus)

  /**
   * Handle approval approved event
   * Creates Supabase user, local user, and assigns Agent role
   */
  async handleApprovalApproved(
    agentId: string,
    approvedBy: string
  ): Promise<void> {
    // TODO: Implement with Supabase user creation and role assignment
    // This will be called by event listener when ApprovalRequestApproved fires
    console.log("TODO: handleApprovalApproved", agentId, approvedBy);
  }

  /**
   * Handle approval rejected event
   */
  async handleApprovalRejected(
    agentId: string,
    rejectedBy: string,
    rejectionReason?: string
  ): Promise<void> {
    return prisma.$transaction(async (tx: any) => {
      const agent = await this.agentRepository.findById(agentId, tx);
      if (!agent) {
        throw new NotFoundError("Agent not found");
      }

      await this.agentRepository.updateRegistrationStatus(
        agentId,
        RegistrationStatus.Rejected,
        undefined,
        rejectedBy,
        tx
      );

      // Publish event
      await eventBus.publish(
        new AgentRegistrationRejectedEvent(
          {
            agentId: agent.agentId,
            agentCode: agent.agentCode,
            rejectedBy,
            rejectionReason,
          },
          rejectedBy
        )
      );
    });
  }

  /**
   * Search agents with advanced filtering
   */
  async searchAgents(searchRequest: Omit<SearchRequest, 'model'>) {
    return searchService.execute({
      ...searchRequest,
      model: "Agent"
    });
  }
}
