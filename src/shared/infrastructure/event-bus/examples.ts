/**
 * Example: How to use the Event Bus in your application
 * 
 * This file demonstrates the event bus usage patterns.
 * Remove this file or move to docs/ when no longer needed.
 */

import { eventBus, MEMBERSHIP_EVENTS, DomainEvent } from '@/shared/infrastructure/event-bus';
import prisma from '@/shared/infrastructure/prisma/prismaClient';

/**
 * Example 1: Emitting an event from a command handler
 */
async function approveMemberRegistration(
  memberId: string,
  userId: string,
  ipAddress?: string
): Promise<void> {
  // 1. Perform the state change
  const member = await prisma.member.update({
    where: { memberId },
    data: { status: 'Active' },
  });

  // 2. Emit the domain event
  await eventBus.emit({
    eventType: MEMBERSHIP_EVENTS.MEMBER_REGISTRATION_APPROVED,
    aggregateId: memberId,
    eventData: {
      memberId,
      agentId: member.agentId,
      unitId: member.unitId,
      tierId: member.tierId,
      status: member.status,
    },
    userId,
    ipAddress,
  });
}

/**
 * Example 2: Registering event listeners
 */
export function registerExampleListeners(): void {
  // Listener 1: Create wallet when member is approved
  eventBus.on(MEMBERSHIP_EVENTS.MEMBER_REGISTRATION_APPROVED, async (event) => {
    const { memberId, tierId } = event.eventData;
    
    console.log('Creating wallet for member:', memberId);
    
    // Create wallet logic here
    // await walletService.createWallet(memberId, tierId);
  });

  // Listener 2: Send welcome email
  eventBus.on(MEMBERSHIP_EVENTS.MEMBER_REGISTRATION_APPROVED, async (event) => {
    const { memberId } = event.eventData;
    
    console.log('Sending welcome email to member:', memberId);
    
    // Email service logic here
    // await emailService.sendWelcomeEmail(memberId);
  });

  // Listener 3: Update agent statistics
  eventBus.on(MEMBERSHIP_EVENTS.MEMBER_REGISTRATION_APPROVED, async (event) => {
    const { agentId } = event.eventData;
    
    console.log('Updating statistics for agent:', agentId);
    
    // Update statistics
    // await agentService.incrementActiveMembers(agentId);
  });
}

/**
 * Example 3: Querying historical events
 */
async function getMemberEventHistory(memberId: string): Promise<DomainEvent[]> {
  const repository = eventBus.getRepository();
  const events = await repository.findByAggregateId(memberId);
  
  console.log(`Found ${events.length} events for member ${memberId}`);
  return events;
}

/**
 * Example 4: Querying events by type
 */
async function getAllApprovalEvents(): Promise<DomainEvent[]> {
  const repository = eventBus.getRepository();
  const events = await repository.findByType(MEMBERSHIP_EVENTS.MEMBER_REGISTRATION_APPROVED);
  
  console.log(`Found ${events.length} approval events`);
  return events;
}

/**
 * Example 5: Querying events by time range
 */
async function getEventsInTimeRange(from: Date, to: Date): Promise<DomainEvent[]> {
  const repository = eventBus.getRepository();
  const events = await repository.findByTimeRange(from, to);
  
  console.log(`Found ${events.length} events between ${from} and ${to}`);
  return events;
}