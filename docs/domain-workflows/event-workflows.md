# Event-Driven Architecture - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Event Lifecycle](#event-lifecycle)
4. [Publishing Events](#publishing-events)
5. [Creating Event Handlers](#creating-event-handlers)
6. [Registering Handlers](#registering-handlers)
7. [Real-World Examples](#real-world-examples)
8. [Best Practices](#best-practices)
9. [Error Handling](#error-handling)

---

## Overview

The application uses an **event-driven architecture** to enable loose coupling between modules. When significant domain actions occur (like member activation, approval decisions, death claim approvals), events are published to an **EventBus**. Independent handlers subscribe to these events and perform side effects asynchronously.

**Key Benefits:**
- **Decoupling**: Modules don't need to know about each other
- **Extensibility**: Add new behaviors by adding handlers, without modifying existing code
- **Auditability**: All domain events are logged with metadata (eventId, timestamp, userId)
- **Async Processing**: Handlers run asynchronously without blocking the main flow

---

## Core Components

### 1. DomainEvent (Abstract Base Class)

All events extend `DomainEvent`. It provides:
- **eventId**: Unique UUID for each event
- **occurredAt**: Timestamp when the event was created
- **version**: Event schema version (for future compatibility)
- **eventType**: String identifier (e.g., `"member.activated"`)
- **aggregateId**: ID of the entity this event is about
- **aggregateType**: Type of entity (e.g., `"Member"`, `"ApprovalRequest"`)
- **payload**: Event-specific data
- **metadata**: Correlation tracking (userId, correlationId, causationId)

**Location:** `src/shared/domain/events/domain-event.base.ts`

```typescript
export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly version: number;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly payload: Record<string, unknown>;
  readonly metadata: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
  };

  constructor(
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    payload: Record<string, unknown>,
    metadata: { userId?: string; correlationId?: string; causationId?: string } = {}
  ) {
    this.eventId = uuidv4();
    this.occurredAt = new Date();
    this.version = 1;
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.payload = payload;
    this.metadata = metadata;
  }
}
```

### 2. IEventHandler Interface

All event handlers implement this interface.

**Location:** `src/shared/domain/events/event-handler.interface.ts`

```typescript
export interface IEventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}
```

### 3. EventBus (Singleton)

The central event dispatcher. Uses Node.js `EventEmitter` under the hood.

**Location:** `src/shared/domain/events/event-bus.ts`

**Key Methods:**
- `subscribe(eventType: string, handler: IEventHandler)`: Register a handler for an event type
- `publish(event: DomainEvent)`: Emit an event to all registered handlers

**Implementation Details:**
- Handlers are stored in a `Map<eventType, IEventHandler[]>`
- When an event is published, the EventBus emits it to the EventEmitter
- All handlers for that event type are invoked asynchronously
- Handlers run independently; if one fails, others continue
- Comprehensive logging for publish, handle start, success, and failures

```typescript
class EventBus {
  private handlers: Map<string, IEventHandler[]> = new Map();
  private emitter: EventEmitter = new EventEmitter();

  subscribe(eventType: string, handler: IEventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
      this.emitter.on(eventType, async (event: DomainEvent) => {
        const handlers = this.handlers.get(eventType) || [];
        for (const h of handlers) {
          try {
            logger.info(`Executing handler for event: ${eventType}`, {
              eventId: event.eventId,
              handler: h.constructor.name,
            });
            await h.handle(event);
            logger.info(`Handler executed successfully for event: ${eventType}`, {
              eventId: event.eventId,
              handler: h.constructor.name,
            });
          } catch (error) {
            logger.error(`Handler failed for event: ${eventType}`, {
              eventId: event.eventId,
              handler: h.constructor.name,
              error,
            });
          }
        }
      });
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async publish(event: DomainEvent): Promise<void> {
    logger.info(`Publishing event: ${event.eventType}`, {
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
    });
    this.emitter.emit(event.eventType, event);
  }
}

export const eventBus = new EventBus();
```

---

## Event Lifecycle

### Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     1. Domain Action Occurs                      │
│  (e.g., User approves a member registration in approval service) │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   2. Create Domain Event                         │
│  const event = new MemberRegistrationSubmittedEvent({...})       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   3. Publish to EventBus                         │
│             await eventBus.publish(event)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              4. EventBus Emits to EventEmitter                   │
│           (logged: "Publishing event: member.activated")         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          5. All Registered Handlers Execute Async                │
│  - ActivateMemberOnApprovalHandler                               │
│  - SyncToExternalSystemHandler (if registered)                   │
│  - SendNotificationHandler (if registered)                       │
│                  (runs in parallel, isolated)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               6. Side Effects Completed                          │
│  - Member activated in DB                                        │
│  - Wallet created                                                │
│  - User account created                                          │
│  - GL entries posted                                             │
│  - Agent stats updated                                           │
│  - MemberActivatedEvent published (cascade)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Timing & Execution

- **Synchronous Publishing**: `await eventBus.publish(event)` ensures the event is emitted
- **Asynchronous Handling**: Handlers execute asynchronously, don't block the publisher
- **Error Isolation**: If one handler fails, others still execute
- **No Return Values**: Handlers are fire-and-forget; use subsequent events to communicate results

---

## Publishing Events

### Step 1: Define Event Class

Create a new event class extending `DomainEvent`.

**Location:** `src/modules/<module>/domain/events/<event-name>.event.ts`

**Example:** `MemberRegistrationSubmittedEvent`

```typescript
import { DomainEvent } from "@/shared/domain/events/domain-event.base";

export interface MemberRegistrationSubmittedPayload {
  memberId: string;
  memberCode: string;
  approvalRequestId: string;
  unitId: string;
  areaId: string;
  forumId: string;
  agentId: string;
  submittedBy: string;
}

export class MemberRegistrationSubmittedEvent extends DomainEvent {
  static readonly EVENT_TYPE = "member.registration.submitted";

  constructor(
    payload: MemberRegistrationSubmittedPayload,
    userId?: string
  ) {
    super(
      MemberRegistrationSubmittedEvent.EVENT_TYPE,
      payload.memberId,
      "Member",
      payload as unknown as Record<string, unknown>,
      { userId }
    );
  }

  get data(): MemberRegistrationSubmittedPayload {
    return this.payload as unknown as MemberRegistrationSubmittedPayload;
  }
}
```

**Key Points:**
- Define a typed payload interface
- Set a static `EVENT_TYPE` constant (convention: `"domain.entity.action"`)
- Pass `aggregateId` (the entity this event is about) to `super()`
- Provide a typed `data` getter for convenience

### Step 2: Publish Event in Application Layer

In your service or command handler, create and publish the event.

**Location:** Application services or command handlers

**Example:** `submitMemberRegistrationCommand.ts`

```typescript
import { eventBus } from "@/shared/domain/events/event-bus";
import { MemberRegistrationSubmittedEvent } from "../../domain/events";

// Inside command handler after domain logic
await eventBus.publish(
  new MemberRegistrationSubmittedEvent(
    {
      memberId: member.memberId,
      memberCode: member.memberCode,
      approvalRequestId: approvalResult.request.requestId,
      unitId: member.unitId,
      areaId: member.areaId,
      forumId: member.forumId,
      agentId: member.agentId,
      submittedBy: actorId,
    },
    actorId  // userId for metadata
  )
);
```

**When to Publish:**
- **After successful domain operation**: Publish inside the same transaction if possible
- **Use userId from context**: Pass the acting user for audit trails
- **Include all relevant data**: Other modules may need this info

---

## Creating Event Handlers

### Step 1: Implement IEventHandler

Create a handler class implementing `IEventHandler<YourEvent>`.

**Location:** `src/modules/<module>/application/event-handlers/<handler-name>.handler.ts`

**Example:** `ActivateMemberOnApprovalHandler`

```typescript
import { IEventHandler } from "@/shared/domain/events/event-handler.interface";
import { DomainEvent } from "@/shared/domain/events/domain-event.base";
import { logger } from "@/shared/utils/logger";
import { eventBus } from "@/shared/domain/events/event-bus";
import { MemberActivatedEvent } from "../../domain/events";

interface ApprovalRequestApprovedPayload {
  requestId: string;
  workflowCode: string;
  entityType: string;
  entityId: string;
  approvedBy: string;
  approvedAt: Date;
}

export class ActivateMemberOnApprovalHandler implements IEventHandler<DomainEvent> {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly paymentRepository: RegistrationPaymentRepository,
    // ... other dependencies
    private readonly journalEntryService: JournalEntryService
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as unknown as ApprovalRequestApprovedPayload;

    // Filter: Only handle member registration approvals
    if (payload.workflowCode !== "member_registration" || payload.entityType !== "Member") {
      return;
    }

    const memberId = payload.entityId;
    const approvedBy = payload.approvedBy;

    logger.info("Activating member after approval", {
      memberId,
      approvedBy,
      eventId: event.eventId,
    });

    await prisma.$transaction(async (tx: any) => {
      // 1. Get member
      const member = await this.memberRepository.findById(memberId, tx);
      if (!member) {
        logger.error("Member not found for activation", { memberId });
        throw new Error("Member not found");
      }

      // 2. Get payment details
      const payment = await this.paymentRepository.findByMemberId(memberId, tx);
      if (!payment) {
        throw new Error("Payment not found");
      }

      // 3. Create member wallet
      const walletId = uuidv4();
      await tx.wallet.create({
        data: {
          walletId,
          memberId,
          balance: payment.advanceDeposit,
          status: "Active",
          createdAt: new Date(),
        },
      });

      // 4. Update member status
      await this.memberRepository.update(
        memberId,
        {
          registrationStatus: "Approved",
          memberStatus: "Active",
          walletId,
          approvedAt: new Date(),
          approvedBy,
        },
        tx
      );

      // 5. Create user account for member login
      // ... (create user, assign role, etc.)

      // 6. Post GL entries
      await this.journalEntryService.createAndPostEntry({
        description: `Member registration approved - ${member.memberCode}`,
        referenceType: "Member",
        referenceId: memberId,
        lines: [
          {
            accountCode: "1010", // Cash
            debitAmount: payment.totalAmount,
            creditAmount: 0,
            description: "Registration fee and advance deposit collected",
          },
          {
            accountCode: "4010", // Registration Fee Revenue
            debitAmount: 0,
            creditAmount: payment.registrationFee,
            description: "Registration fee revenue",
          },
          {
            accountCode: "2510", // Member Wallet Liability
            debitAmount: 0,
            creditAmount: payment.advanceDeposit,
            description: "Advance deposit for future contributions",
          },
        ],
        createdBy: approvedBy,
        autoPost: true,
      });

      // 7. Update agent statistics
      await tx.agent.update({
        where: { agentId: member.agentId },
        data: {
          totalActiveMembers: { increment: 1 },
          totalRegistrations: { increment: 1 },
        },
      });

      // 8. Publish MemberActivatedEvent (cascading event)
      await eventBus.publish(
        new MemberActivatedEvent(
          {
            memberId: member.memberId,
            memberCode: member.memberCode,
            agentId: member.agentId,
            unitId: member.unitId,
            areaId: member.areaId,
            forumId: member.forumId,
            approvedBy,
            walletInitialBalance: payment.advanceDeposit,
          },
          approvedBy
        )
      );

      logger.info("Member activated successfully", { memberId });
    });
  }
}
```

**Key Points:**
- **Use constructor injection** for dependencies (repositories, services)
- **Filter events**: Check if this event should be handled (workflowCode, entityType, etc.)
- **Use transactions**: Ensure atomicity of side effects
- **Log extensively**: Info for success, error for failures
- **Publish cascading events**: If your handler creates new domain events
- **Let errors bubble**: Don't catch exceptions; EventBus will log them

### Step 2: Handler Patterns

#### Pattern 1: Cross-Module Handler (Most Common)

Handler in one module reacts to events from another module.

**Example:** Members module handles `ApprovalRequestApprovedEvent` from approval-workflow module.

#### Pattern 2: Same-Module Handler

Handler in the same module reacts to its own events.

**Example:** Contributions module handles `DeathClaimApprovedEvent` (from death-claims module).

```typescript
// src/modules/contributions/index.ts
eventBus.subscribe(
  DeathClaimApprovedEvent.EVENT_TYPE,
  {
    handle: async (event: DeathClaimApprovedEvent) => {
      await contributionEventHandlers.handleDeathClaimApproved(event);
    }
  }
);
```

#### Pattern 3: Inline Handler (For Simple Cases)

For simple handlers, you can use an inline object instead of a class.

```typescript
eventBus.subscribe(
  "some.event.type",
  {
    handle: async (event: DomainEvent) => {
      const payload = event.payload as SomePayload;
      // Simple logic here
      await someService.doSomething(payload.entityId);
    }
  }
);
```

---

## Registering Handlers

### Centralized Registration (Recommended)

**Location:** `src/config/event-handlers.config.ts`

All event handlers are registered in one place, called at application startup.

```typescript
import { eventBus } from '@/shared/domain/events/event-bus';
import { logger } from '@/shared/utils/logger';

// Import handlers
import { ActivateMemberOnApprovalHandler } from '@/modules/members/application/event-handlers/activate-member-on-approval.handler';
import { RejectMemberOnApprovalHandler } from '@/modules/members/application/event-handlers/reject-member-on-approval.handler';
import { ActivateAgentOnApprovalHandler } from '@/modules/agents/application/event-handlers';

/**
 * Register all event handlers for the application
 */
export function registerEventHandlers(): void {
  logger.info('Registering event handlers...');

  // Initialize dependencies (repositories, services)
  const memberRepo = new PrismaMemberRepository();
  const registrationPaymentRepo = new PrismaRegistrationPaymentRepository();
  const journalEntryService = new JournalEntryService(/* ... */);
  // ... other dependencies

  // Create handler instances
  const activateMemberHandler = new ActivateMemberOnApprovalHandler(
    memberRepo,
    memberDocumentRepo,
    registrationPaymentRepo,
    agentRepo,
    userRepo,
    roleRepo,
    userRoleRepo,
    journalEntryService
  );

  const rejectMemberHandler = new RejectMemberOnApprovalHandler(
    memberRepo,
    registrationPaymentRepo
  );

  // Subscribe handlers to events
  eventBus.subscribe('approval.request.approved', activateMemberHandler);
  eventBus.subscribe('approval.request.rejected', rejectMemberHandler);

  logger.info('Event handlers registered successfully');
}
```

### Application Startup

**Location:** `src/app.ts`

```typescript
import { registerEventHandlers } from '@/config/event-handlers.config';

const app = express();

// ... middleware setup

// Register event handlers BEFORE routes
registerEventHandlers();
logger.info('Event system initialized');

// ... route registration
```

**Why centralized?**
- Single source of truth for all event subscriptions
- Easy to see all event flows in the application
- Prevents duplicate subscriptions
- Clear dependency initialization

### Decentralized Registration (Alternative)

Some modules register handlers in their `index.ts`.

**Example:** `src/modules/death-claims/index.ts`

```typescript
import { eventBus } from '@/shared/domain/events/event-bus';
import { ApprovalRequestApprovedEvent, ApprovalRequestRejectedEvent } from '@/modules/approval-workflow/domain/events';

// Initialize handlers
const approvalApprovedHandler = new DeathClaimApprovalApprovedHandler(deathClaimService);
const approvalRejectedHandler = new DeathClaimApprovalRejectedHandler(deathClaimService);

// Subscribe
eventBus.subscribe(ApprovalRequestApprovedEvent.EVENT_TYPE, approvalApprovedHandler);
eventBus.subscribe(ApprovalRequestRejectedEvent.EVENT_TYPE, approvalRejectedHandler);
```

**When to use:**
- Module-specific events that no other module cares about
- Quick prototyping
- Module is fully isolated

---

## Real-World Examples

### Example 1: Member Registration Workflow

#### Scenario
A new member submits registration → Approval workflow approves → Member gets activated, wallet created, GL entries posted, user account created.

#### Events Published

**1. MemberRegistrationSubmittedEvent**

**When:** After member submits registration form

**Where:** `submitMemberRegistrationCommand.ts`

```typescript
await eventBus.publish(
  new MemberRegistrationSubmittedEvent(
    {
      memberId: member.memberId,
      memberCode: member.memberCode,
      approvalRequestId: approvalResult.request.requestId,
      unitId: member.unitId,
      areaId: member.areaId,
      forumId: member.forumId,
      agentId: member.agentId,
      submittedBy: actorId,
    },
    actorId
  )
);
```

**Handlers:** None currently (could add notification handlers)

---

**2. ApprovalRequestApprovedEvent**

**When:** Approval workflow completes successfully

**Where:** `approvalRequestService.ts`

```typescript
await eventBus.publish(
  new ApprovalRequestApprovedEvent({
    requestId: request.requestId,
    workflowCode: workflow?.workflowCode || '',
    entityType: request.entityType,
    entityId: request.entityId,
    approvedBy: data.reviewedBy,
    approvedAt: new Date(),
  })
);
```

**Handlers:**
- `ActivateMemberOnApprovalHandler` (members module)
- `ActivateAgentOnApprovalHandler` (agents module)
- `ProcessWalletDepositApprovalHandler` (wallet module)
- `DeathClaimApprovalApprovedHandler` (death-claims module)

---

**3. MemberActivatedEvent**

**When:** After member is successfully activated (published inside `ActivateMemberOnApprovalHandler`)

**Where:** `activate-member-on-approval.handler.ts`

```typescript
await eventBus.publish(
  new MemberActivatedEvent(
    {
      memberId: member.memberId,
      memberCode: member.memberCode,
      agentId: member.agentId,
      unitId: member.unitId,
      areaId: member.areaId,
      forumId: member.forumId,
      approvedBy,
      walletInitialBalance: payment.advanceDeposit,
    },
    approvedBy
  )
);
```

**Handlers:** None currently (could add welcome email, analytics tracking, etc.)

---

### Example 2: Death Claim Approval → Contribution Cycle

#### Scenario
A death claim is approved → Contribution cycle is created for all active members.

#### Events Published

**1. ApprovalRequestApprovedEvent**

**When:** Death claim approval workflow completes

**Where:** `approvalRequestService.ts`

```typescript
await eventBus.publish(
  new ApprovalRequestApprovedEvent({
    requestId: request.requestId,
    workflowCode: 'death_claim',  // <-- filters to death claims
    entityType: 'DeathClaim',
    entityId: deathClaim.deathClaimId,
    approvedBy: data.reviewedBy,
    approvedAt: new Date(),
  })
);
```

**Handlers:**
- `DeathClaimApprovalApprovedHandler` (death-claims module)

---

**2. DeathClaimApprovedEvent**

**When:** Death claim handler updates claim status to Approved

**Where:** `DeathClaimApprovalApprovedHandler` (inside death-claims module)

```typescript
// This is published inside the death claim handler after updating the claim
await eventBus.publish(
  new DeathClaimApprovedEvent({
    deathClaimId: claim.deathClaimId,
    memberId: claim.memberId,
    claimAmount: claim.claimAmount,
    approvedBy: payload.approvedBy,
    approvedAt: payload.approvedAt,
  })
);
```

**Handlers:**
- `ContributionEventHandlers.handleDeathClaimApproved` (contributions module)

**Handler Implementation:**

```typescript
// src/modules/contributions/index.ts
eventBus.subscribe(
  DeathClaimApprovedEvent.EVENT_TYPE,
  {
    handle: async (event: DeathClaimApprovedEvent) => {
      await contributionEventHandlers.handleDeathClaimApproved(event);
    }
  }
);

// Inside handler
async handleDeathClaimApproved(event: DeathClaimApprovedEvent) {
  const { deathClaimId, claimAmount } = event.data;

  logger.info("Creating contribution cycle for approved death claim", { deathClaimId });

  // Create contribution cycle
  await this.contributionService.createContributionCycle({
    deathClaimId,
    targetAmount: claimAmount,
    cycleType: "Death Claim",
    // ... other data
  });

  logger.info("Contribution cycle created", { deathClaimId });
}
```

---

### Example 3: Multiple Handlers for Same Event

#### Scenario
`ApprovalRequestApprovedEvent` is handled by multiple modules.

**Published By:** `approvalRequestService.ts`

**Handled By:**
1. **ActivateMemberOnApprovalHandler** (members module)
   - Filters: `workflowCode === "member_registration"`
   - Creates wallet, user account, posts GL entries

2. **ActivateAgentOnApprovalHandler** (agents module)
   - Filters: `workflowCode === "agent_registration"`
   - Creates user account, assigns role

3. **ProcessWalletDepositApprovalHandler** (wallet module)
   - Filters: `workflowCode === "wallet_deposit_request"`
   - Processes deposit, posts GL entries

4. **DeathClaimApprovalApprovedHandler** (death-claims module)
   - Filters: `workflowCode === "death_claim"`
   - Updates claim status, publishes `DeathClaimApprovedEvent`

**Key Point:** Each handler filters the event based on `workflowCode` and `entityType` to determine if it should process the event.

---

## Best Practices

### 1. Event Naming Conventions

Use the format: `<domain>.<entity>.<action>`

**Examples:**
- `member.activated`
- `member.registration.submitted`
- `approval.request.approved`
- `death.claim.approved`
- `wallet.deposit.requested`

### 2. Event Payload Design

**Include all relevant data:**
- Entity ID (always)
- Actor (who triggered the event)
- Timestamp (provided by DomainEvent)
- Workflow context (workflowCode, stageId, etc.)
- Related entity IDs (forumId, areaId, etc.)

**Don't include:**
- Full entity objects (send IDs, handlers can fetch if needed)
- Sensitive data unless necessary

### 3. Handler Design

**Do:**
- ✅ Filter events early (check workflowCode, entityType)
- ✅ Use transactions for atomicity
- ✅ Log extensively (info, error)
- ✅ Let errors bubble (EventBus will catch and log)
- ✅ Inject dependencies via constructor
- ✅ Publish cascading events if needed

**Don't:**
- ❌ Catch and swallow exceptions (they won't be logged)
- ❌ Perform blocking operations (keep handlers fast)
- ❌ Rely on handler execution order (handlers run independently)
- ❌ Directly call other handlers (publish events instead)

### 4. Transaction Boundaries

**Publish events AFTER domain logic:**

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Domain logic
  await memberRepo.update(memberId, { status: "Approved" }, tx);

  // 2. Publish event (still inside transaction)
  await eventBus.publish(new MemberActivatedEvent({ ... }));
});
```

**Why?** If domain logic fails, the event is never published. Consistency maintained.

### 5. Event Versioning

If you change event payload structure, increment the `version` field and handle both versions in handlers.

```typescript
async handle(event: DomainEvent): Promise<void> {
  if (event.version === 1) {
    // Handle v1 payload
  } else if (event.version === 2) {
    // Handle v2 payload
  }
}
```

### 6. Avoid Infinite Event Loops

**Problem:** Handler A publishes Event X → Handler B handles Event X and publishes Event Y → Handler A handles Event Y and publishes Event X → infinite loop

**Solution:**
- Use correlation IDs to detect loops
- Design event flows to be acyclic
- Use different event types for forward vs. backward flows

---

## Error Handling

### EventBus Error Isolation

The EventBus ensures that **one handler failure doesn't stop other handlers**.

**Implementation:**

```typescript
for (const h of handlers) {
  try {
    await h.handle(event);
    logger.info(`Handler executed successfully`, { handler: h.constructor.name });
  } catch (error) {
    logger.error(`Handler failed`, { handler: h.constructor.name, error });
    // Continue to next handler
  }
}
```

### Handler Error Patterns

**Let errors bubble:**

```typescript
async handle(event: DomainEvent): Promise<void> {
  // NO try/catch here
  const member = await this.memberRepo.findById(memberId);
  if (!member) {
    throw new Error("Member not found"); // EventBus will catch and log
  }

  await this.memberRepo.update(memberId, { status: "Active" });
}
```

**Use domain errors for clarity:**

```typescript
import { NotFoundError, ValidationError } from "@/shared/utils/error-handling";

async handle(event: DomainEvent): Promise<void> {
  const member = await this.memberRepo.findById(memberId);
  if (!member) {
    throw new NotFoundError("Member", memberId); // Clear, structured error
  }

  // Business rule validation
  if (member.status !== "PendingApproval") {
    throw new ValidationError("Member must be in PendingApproval status");
  }

  // Proceed with handler logic
}
```

### Retry & Dead Letter Queues (Future Enhancement)

Currently, failed events are logged but not retried. For production systems, consider:
- **Retry logic**: Retry handlers with exponential backoff
- **Dead letter queue**: Store failed events for manual review
- **Event sourcing**: Persist all events to event store

---

## Summary

### Key Takeaways

1. **DomainEvent** is the base class for all events (eventId, occurredAt, payload, metadata)
2. **EventBus** is a singleton that routes events to handlers (subscribe, publish)
3. **IEventHandler** is the interface all handlers implement (async handle method)
4. **Handlers run asynchronously** and independently; one failure doesn't affect others
5. **Register handlers centrally** in `event-handlers.config.ts` for clarity
6. **Publish events after domain logic** to ensure consistency
7. **Filter events in handlers** to avoid unnecessary processing (workflowCode, entityType)
8. **Log extensively** for debugging and audit trails
9. **Use transactions** in handlers to ensure atomicity
10. **Cascading events** are allowed (handlers can publish new events)

### Event Flow Checklist

When adding a new domain event:

- [ ] Define event class extending DomainEvent
- [ ] Set static EVENT_TYPE constant
- [ ] Create typed payload interface
- [ ] Publish event in application layer (after domain logic)
- [ ] Create handler class implementing IEventHandler
- [ ] Filter events in handler (workflowCode, entityType)
- [ ] Use transactions for atomicity
- [ ] Log info/error messages
- [ ] Register handler in `event-handlers.config.ts`

---

## Additional Resources

- **Core Event Infrastructure:** `src/shared/domain/events/`
- **Centralized Handler Registration:** `src/config/event-handlers.config.ts`
- **Member Events:** `src/modules/members/domain/events/`
- **Approval Events:** `src/modules/approval-workflow/domain/events.ts`
- **Example Handlers:** `src/modules/members/application/event-handlers/`
- **Example Publishing:** `src/modules/approval-workflow/application/approvalRequestService.ts`

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Maintained By:** Development Team
