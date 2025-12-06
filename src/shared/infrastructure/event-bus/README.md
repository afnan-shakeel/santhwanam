# Event Bus

An in-memory event bus implementation for domain events with database persistence for audit trail.

## Features

- ✅ In-memory event bus for synchronous event handling
- ✅ Automatic event persistence to database for audit trail
- ✅ Error isolation (one handler failing doesn't break others)
- ✅ Type-safe event definitions
- ✅ Query historical events by type, aggregate, or time range
- ✅ Simple API for emitting and listening to events

## Architecture

```
EventBus (in-memory)
    ↓
    ├─→ EventRepository (persists to DB)
    └─→ Listeners (notify handlers)
```

## Usage

### 1. Import the Event Bus

```typescript
import { eventBus, MEMBERSHIP_EVENTS } from '@/shared/infrastructure/event-bus';
```

### 2. Emit Events

```typescript
// In your command handler or service
async function approveMemberRegistration(memberId: string, userId: string) {
  // Perform the state change
  await prisma.member.update({
    where: { memberId },
    data: { status: 'Active' }
  });

  // Emit the event
  await eventBus.emit({
    eventType: MEMBERSHIP_EVENTS.MEMBER_REGISTRATION_APPROVED,
    aggregateId: memberId,
    eventData: {
      memberId,
      agentId: member.agentId,
      unitId: member.unitId,
      tierId: member.tierId,
      advanceDeposit: payment.advanceDeposit,
      registrationFee: payment.registrationFee,
    },
    userId,
    ipAddress: req.ip,
  });
}
```

### 3. Register Event Listeners

Create listener files in your feature modules:

```typescript
// src/modules/membership/infrastructure/listeners/membershipListeners.ts
import { eventBus, MEMBERSHIP_EVENTS } from '@/shared/infrastructure/event-bus';

export function registerMembershipListeners() {
  // Create wallet when member is approved
  eventBus.on(MEMBERSHIP_EVENTS.MEMBER_REGISTRATION_APPROVED, async (event) => {
    const { memberId, advanceDeposit } = event.eventData;
    await createMemberWallet(memberId, advanceDeposit);
  });

  // Send welcome email
  eventBus.on(MEMBERSHIP_EVENTS.MEMBER_REGISTRATION_APPROVED, async (event) => {
    const { memberId } = event.eventData;
    await emailService.sendWelcomeEmail(memberId);
  });

  // Update agent statistics
  eventBus.on(MEMBERSHIP_EVENTS.MEMBER_REGISTRATION_APPROVED, async (event) => {
    const { agentId } = event.eventData;
    await updateAgentStatistics(agentId);
  });
}
```

### 4. Initialize Listeners at App Startup

```typescript
// src/app.ts
import { setupEventListeners } from '@/shared/infrastructure/event-bus';

// During app initialization
setupEventListeners();
```

Update `src/shared/infrastructure/event-bus/setup.ts`:

```typescript
import { registerMembershipListeners } from '@/modules/membership/infrastructure/listeners/membershipListeners';

export function setupEventListeners(): void {
  logger.info('Registering event listeners...');
  
  registerMembershipListeners();
  // registerWalletListeners();
  // registerFinanceListeners();
  
  logger.info('Event listeners registered successfully');
}
```

## Querying Historical Events

```typescript
import { eventBus } from '@/shared/infrastructure/event-bus';

const repository = eventBus.getRepository();

// Get all events for a member
const memberEvents = await repository.findByAggregateId(memberId);

// Get all approval events
const approvalEvents = await repository.findByType('MemberRegistrationApproved');

// Get events in a time range
const recentEvents = await repository.findByTimeRange(
  new Date('2025-01-01'),
  new Date('2025-12-31')
);
```

## Event Structure

```typescript
interface DomainEvent<T = any> {
  eventType: string;          // e.g., 'MemberRegistrationApproved'
  aggregateId?: string;       // e.g., memberId
  eventData: T;               // Event-specific data
  userId?: string;            // Who triggered it
  ipAddress?: string;         // Source IP
  timestamp?: Date;           // When it happened
}
```

## Adding New Event Types

1. Define event type constant in `eventTypes.ts`:

```typescript
export const MEMBERSHIP_EVENTS = {
  MEMBER_REGISTRATION_APPROVED: 'MemberRegistrationApproved',
  MEMBER_SUSPENDED: 'MemberSuspended',
  // Add new event type
  MEMBER_TIER_UPGRADED: 'MemberTierUpgraded',
} as const;
```

2. Emit the event in your command handler:

```typescript
await eventBus.emit({
  eventType: MEMBERSHIP_EVENTS.MEMBER_TIER_UPGRADED,
  aggregateId: memberId,
  eventData: { memberId, oldTierId, newTierId },
  userId,
});
```

3. Register listeners for the new event:

```typescript
eventBus.on(MEMBERSHIP_EVENTS.MEMBER_TIER_UPGRADED, async (event) => {
  // Handle tier upgrade
});
```

## Best Practices

1. **Event Names**: Use past tense (e.g., `MemberRegistered`, not `RegisterMember`)
2. **Event Data**: Include all necessary context in `eventData`
3. **Error Handling**: Listeners should not throw errors - they're logged and isolated
4. **Idempotency**: Make listeners idempotent (safe to run multiple times)
5. **Transaction Boundaries**: Emit events AFTER the command succeeds
6. **Aggregate ID**: Always include aggregateId for entity-specific events

## Testing

```typescript
import { eventBus } from '@/shared/infrastructure/event-bus';

describe('Member Registration', () => {
  afterEach(() => {
    // Clear listeners after each test
    eventBus.clearListeners();
  });

  it('should emit event when member is approved', async () => {
    const events: any[] = [];
    
    // Register test listener
    eventBus.on('MemberRegistrationApproved', async (event) => {
      events.push(event);
    });

    // Execute command
    await approveMemberRegistration(memberId, userId);

    // Assert event was emitted
    expect(events).toHaveLength(1);
    expect(events[0].eventData.memberId).toBe(memberId);
  });
});
```

## Database Schema

Events are persisted to the `Event` table:

```prisma
model Event {
  eventId       String   @id @default(uuid())
  eventType     String
  aggregateId   String?
  eventData     Json
  userId        String?
  ipAddress     String?
  timestamp     DateTime @default(now())

  @@index([eventType])
  @@index([aggregateId])
  @@index([timestamp])
}
```

## Future Enhancements

- [ ] Async/background processing with message queues (RabbitMQ, SQS)
- [ ] Event replay for event sourcing
- [ ] Dead letter queue for failed events
- [ ] Event versioning
- [ ] Saga pattern for distributed transactions
