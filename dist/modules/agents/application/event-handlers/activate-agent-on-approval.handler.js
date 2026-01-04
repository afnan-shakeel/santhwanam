import { RegistrationStatus, AgentStatus } from '../../domain/entities';
import { logger } from '@/shared/utils/logger';
import { supabaseAdmin } from '@/shared/infrastructure/auth/client/supaBaseClient';
import { eventBus } from '@/shared/domain/events/event-bus';
import { AgentActivatedEvent } from '../../domain/events';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class ActivateAgentOnApprovalHandler {
    agentRepository;
    userRepository;
    roleRepository;
    userRoleRepository;
    constructor(agentRepository, userRepository, roleRepository, userRoleRepository) {
        this.agentRepository = agentRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
    }
    async handle(event) {
        const payload = event.payload;
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
        await prisma.$transaction(async (tx) => {
            // 1. Get agent
            const agent = await this.agentRepository.findById(agentId, tx);
            if (!agent) {
                logger.error('Agent not found for activation', { agentId });
                throw new Error('Agent not found');
            }
            // 2. Create user in Supabase
            logger.info('Creating Supabase user', { email: agent.email });
            const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
                email: agent.email,
                email_confirm: true,
                user_metadata: {
                    firstName: agent.firstName,
                    lastName: agent.lastName,
                    agentId: agent.agentId,
                }
            });
            if (supabaseError || !supabaseUser.user) {
                logger.error('Supabase user creation failed', {
                    error: supabaseError?.message,
                    email: agent.email
                });
                throw new Error(`Supabase user creation failed: ${supabaseError?.message}`);
            }
            // 3. Create local user
            logger.info('Creating local user', { externalAuthId: supabaseUser.user.id });
            const localUser = await this.userRepository.create({
                externalAuthId: supabaseUser.user.id,
                email: agent.email,
                firstName: agent.firstName,
                lastName: agent.lastName,
                isActive: true,
                userMetadata: null,
                lastSyncedAt: new Date(),
            }, tx);
            // 4. Update agent with userId and status
            logger.info('Updating agent status to Approved/Active', { agentId, userId: localUser.userId });
            await this.agentRepository.updateRegistrationStatus(agentId, RegistrationStatus.Approved, undefined, approvedBy, tx);
            await this.agentRepository.update(agentId, {
                userId: localUser.userId,
                agentStatus: AgentStatus.Active,
                updatedBy: approvedBy,
            }, tx);
            // 5. Get Agent role
            const agentRole = await this.roleRepository.findByCode('agent', tx);
            if (!agentRole) {
                logger.error('Agent role not found in system');
                throw new Error('Agent role not found');
            }
            // 6. Assign Agent role with Agent scope
            logger.info('Assigning Agent role', {
                userId: localUser.userId,
                roleId: agentRole.roleId,
                agentId
            });
            await this.userRoleRepository.create({
                userId: localUser.userId,
                roleId: agentRole.roleId,
                scopeEntityType: 'Agent',
                scopeEntityId: agentId,
                assignedBy: approvedBy,
            }, tx);
            // 7. Generate invitation link
            let invitationSent = false;
            try {
                const { data: inviteLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'invite',
                    email: agent.email,
                    options: {
                        redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/auth/set-password`
                    }
                });
                if (linkError) {
                    logger.error('Failed to generate invite link', { error: linkError.message });
                }
                else {
                    invitationSent = true;
                    logger.info('Invitation link generated', { email: agent.email });
                    // TODO: Send invitation email with the link
                }
            }
            catch (error) {
                logger.error('Error generating invitation', { error });
            }
            // 8. Publish AgentActivated event
            await eventBus.publish(new AgentActivatedEvent({
                agentId: agent.agentId,
                agentCode: agent.agentCode,
                userId: localUser.userId,
                unitId: agent.unitId,
                areaId: agent.areaId,
                forumId: agent.forumId,
                email: agent.email,
                approvedBy,
                invitationSent,
            }, approvedBy));
            logger.info('Agent activated successfully', {
                agentId,
                userId: localUser.userId,
                invitationSent
            });
        });
    }
}
//# sourceMappingURL=activate-agent-on-approval.handler.js.map