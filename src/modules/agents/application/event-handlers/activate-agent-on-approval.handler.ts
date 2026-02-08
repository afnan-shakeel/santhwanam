import { IEventHandler } from '@/shared/domain/events/event-handler.interface';
import { DomainEvent } from '@/shared/domain/events/domain-event.base';
import { AgentRepository } from '../../domain/repositories';
import { UserRepository } from '@/modules/iam/domain/repositories';
import { RoleRepository } from '@/modules/iam/domain/repositories';
import { UserRoleRepository } from '@/modules/iam/domain/repositories';
import { RegistrationStatus, AgentStatus } from '../../domain/entities';
import { logger } from '@/shared/utils/logger';
import { supabaseAdmin } from '@/shared/infrastructure/auth/client/supaBaseClient';
import { eventBus } from '@/shared/domain/events/event-bus';
import { AgentActivatedEvent } from '../../domain/events';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * Approval workflow emits generic approval events
 * This handler listens for approvals and activates agents
 */
interface ApprovalRequestApprovedPayload {
  requestId: string;
  workflowCode: string;
  entityType: string;
  entityId: string;
  approvedBy: string;
  approvedAt: Date;
}

export class ActivateAgentOnApprovalHandler implements IEventHandler<DomainEvent> {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly userRoleRepository: UserRoleRepository
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as unknown as ApprovalRequestApprovedPayload;

    console.log('ActivateAgentOnApprovalHandler received event:', event.eventType, 'with payload:', payload);
    // Only handle agent registration approvals
    if (payload.workflowCode !== 'agent_registration' || payload.entityType !== 'Agent') {
      return;
    }

    const agentId = payload.entityId;
    const approvedBy = payload.approvedBy;

    logger.info('Activating agent after approval', {
      agentId,
      approvedBy,
      eventId: event.eventId
    });

    await prisma.$transaction(async (tx: any) => {
      // 1. Get agent
      const agent = await this.agentRepository.findById(agentId, tx);
      if (!agent) {
        logger.error('Agent not found for activation', { agentId });
        throw new Error('Agent not found');
      }

      // 2. Resolve or create user account
      let localUser: any;
      let invitationSent = false;

      const existingUser = await this.userRepository.findByEmail(agent.email, tx);

      if (existingUser) {
        // User already exists (e.g., already registered as a member) — reuse the account
        logger.info('Existing user found for agent email, reusing account', {
          email: agent.email,
          existingUserId: existingUser.userId,
          agentId,
        });
        localUser = existingUser;
      } else {
        // No existing user — create Supabase auth user + local user
        logger.info('Creating Supabase user for agent', { email: agent.email });
        const { data: supabaseUser, error: supabaseError } =
          await supabaseAdmin.auth.admin.createUser({
            email: agent.email,
            email_confirm: true,
            user_metadata: {
              firstName: agent.firstName,
              lastName: agent.lastName,
              agentId: agent.agentId,
            },
          });

        if (supabaseError || !supabaseUser.user) {
          logger.error('Supabase user creation failed', {
            error: supabaseError?.message,
            email: agent.email,
          });
          throw new Error(`Supabase user creation failed: ${supabaseError?.message}`);
        }

        logger.info('Creating local user', { externalAuthId: supabaseUser.user.id });
        localUser = await this.userRepository.create(
          {
            externalAuthId: supabaseUser.user.id,
            email: agent.email,
            firstName: agent.firstName,
            lastName: agent.lastName,
            isActive: true,
            userMetadata: null,
            lastSyncedAt: new Date(),
          },
          tx
        );

        // Generate invitation link only for new users
        try {
          const { data: inviteLink, error: linkError } =
            await supabaseAdmin.auth.admin.generateLink({
              type: 'invite',
              email: agent.email,
              options: {
                redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/auth/set-password`,
              },
            });

          if (linkError) {
            logger.error('Failed to generate invite link', { error: linkError.message });
          } else {
            invitationSent = true;
            logger.info('Invitation link generated', { email: agent.email });
            // TODO: Send invitation email with the link
          }
        } catch (error) {
          logger.error('Error generating invitation', { error });
        }
      }

      // 3. Update agent with userId and status
      logger.info('Updating agent status to Approved/Active', { agentId, userId: localUser.userId });
      await this.agentRepository.updateRegistrationStatus(
        agentId,
        RegistrationStatus.Approved,
        undefined,
        approvedBy,
        tx
      );

      await this.agentRepository.update(
        agentId,
        {
          userId: localUser.userId,
          agentStatus: AgentStatus.Active,
          updatedBy: approvedBy,
        },
        tx
      );

      // 4. Assign Agent role (only if not already assigned)
      const agentRole = await this.roleRepository.findByCode('agent', tx);
      if (!agentRole) {
        logger.error('Agent role not found in system');
        throw new Error('Agent role not found');
      }

      const existingAgentRole = await this.userRoleRepository.findByUserAndRole(
        localUser.userId,
        agentRole.roleId,
        agentId,
        tx
      );

      if (!existingAgentRole) {
        logger.info('Assigning Agent role', {
          userId: localUser.userId,
          roleId: agentRole.roleId,
          agentId,
        });
        await this.userRoleRepository.create(
          {
            userId: localUser.userId,
            roleId: agentRole.roleId,
            scopeEntityType: 'Agent',
            scopeEntityId: agentId,
            assignedBy: approvedBy,
          },
          tx
        );
      } else {
        logger.info('Agent role already assigned, skipping', {
          userId: localUser.userId,
          agentId,
        });
      }

      // 5. Publish AgentActivated event
      await eventBus.publish(
        new AgentActivatedEvent(
          {
            agentId: agent.agentId,
            agentCode: agent.agentCode,
            userId: localUser.userId,
            unitId: agent.unitId,
            areaId: agent.areaId,
            forumId: agent.forumId,
            email: agent.email,
            approvedBy,
            invitationSent,
          },
          approvedBy
        )
      );

      logger.info('Agent activated successfully', {
        agentId,
        userId: localUser.userId,
        invitationSent,
        reusedExistingUser: !!existingUser,
      });
    });
  }
}
