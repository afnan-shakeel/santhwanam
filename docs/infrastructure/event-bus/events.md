# How events work with commands

## Commands (Imperative — "Do this")

- Request to perform an action
- Example: `RegisterAgent`, `CreateMember`, `ApproveWalletDeposit`
- Can succeed or fail
- Trigger immediate state changes in your system

## Events (Past tense — "This happened")

- Notification that something already occurred
- Example: `AgentRegistered`, `MemberCreated`, `WalletDepositApproved`
- Always succeed (they're facts)
- Emitted after a command completes successfully
- Other parts of the system can react to them

---

## Why Use Events?

### 1. Decoupling / Separation of Concerns

Without Events:

```js
async function approveMemberRegistration(memberId) {
  // Update member status
  await db.members.update({ status: 'Active' });

  // Create wallet
  await db.wallets.create({ memberId, balance: advanceDeposit });

  // Create GL entry
  await glService.createJournalEntry(...);

  // Send welcome email
  await emailService.sendWelcomeEmail(...);

  // Update agent statistics
  await db.agents.increment('totalActiveMembers');

  // Notify admins
  await notificationService.notifyAdmins(...);
}
```

Problem: Registration logic knows about wallets, GL, emails, notifications, stats — tightly coupled.

With Events:

```js
// Command Handler (only cares about member registration)
async function approveMemberRegistration(memberId) {
  await db.members.update({ status: 'Active' });

  // Emit event — "Hey, a member was approved!"
  await emitEvent('MemberRegistrationApproved', {
    memberId,
    advanceDeposit,
    tierId,
    ...
  });
}

// Separate Event Listeners (each handles one concern)
on('MemberRegistrationApproved', async (event) => {
  await createMemberWallet(event.memberId, event.advanceDeposit);
});

on('MemberRegistrationApproved', async (event) => {
  await glService.createJournalEntry(...);
});

on('MemberRegistrationApproved', async (event) => {
  await emailService.sendWelcomeEmail(event.memberId);
});

on('MemberRegistrationApproved', async (event) => {
  await updateAgentStatistics(event.agentId);
});
```

Benefit: Each component handles its own responsibility. Easy to add/remove features.

### 2. Audit Trail / Event Sourcing

Store all events in an events table:

```sql
CREATE TABLE events (
  event_id UUID PRIMARY KEY,
  event_type VARCHAR(100), -- 'MemberRegistrationApproved'
  aggregate_id UUID, -- memberId, agentId, etc.
  event_data JSON,
  user_id UUID, -- Who triggered it
  timestamp TIMESTAMP,
  ip_address VARCHAR(50)
);
```

Benefits:

- Complete history of what happened in your system
- Can replay events to rebuild state
- Debugging: "What happened to member X?"
- Compliance: "Who approved this claim and when?"

### 3. Asynchronous Processing

Some actions don't need to happen immediately:

```js
// Synchronous (must complete before returning)
async function approveMemberRegistration(memberId) {
  await db.members.update({ status: 'Active' });
  await createMemberWallet(memberId); // MUST succeed

  // Emit event for async tasks
  await emitEvent('MemberRegistrationApproved', { memberId });
}

// Asynchronous listeners (run in background)
on('MemberRegistrationApproved', async (event) => {
  // Send email (can retry if fails, doesn't block registration)
  await emailService.sendWelcomeEmail(event.memberId);
});

on('MemberRegistrationApproved', async (event) => {
  // Generate reports (not critical)
  await reportService.updateMembershipReport();
});
```

**Benefit:** User gets fast response. Non-critical tasks happen in background.

---

### 4. Cross-Context Communication

Your bounded contexts (Membership, Wallet, Claims, Finance) are separate. Events let them communicate without tight coupling:

```
Membership Context          Wallet Context
       |                         |
       |  MemberRegistered       |
       |------------------------>|
       |                         |
       |                    Create Wallet
```

Without events: Membership code would need to directly call Wallet code (coupling).
With events: Membership emits event. Wallet listens. They don't know about each other.

### 5. Statistics / Derived Data

Events update computed fields:

```js
// When member is approved
on('MemberRegistrationApproved', async (event) => {
  await db.agents.increment('totalActiveMembers', {
    where: { agentId: event.agentId }
  });
});

// When member is suspended
on('MemberSuspended', async (event) => {
  await db.agents.decrement('totalActiveMembers', {
    where: { agentId: event.agentId }
  });
});
```

Benefit: Statistics stay in sync automatically.

### 6. Notifications

```js
on('DeathClaimApproved', async (event) => {
  // Notify all agents to collect contributions
  const agents = await getActiveAgents();
  for (const agent of agents) {
    await notificationService.send(agent.email, {
      subject: 'New Contribution Required',
      body: `Death claim approved. Please collect contributions.`
    });
  }
});

on('MemberSuspended', async (event) => {
  // Notify unit admin
  const unitAdmin = await getUnitAdmin(event.unitId);
  await notificationService.send(unitAdmin.email, {
    subject: 'Member Suspended',
    body: `Member ${event.memberId} has been suspended.`
  });
});
```

---

## Practical Implementation

### Simple Event Bus (In-Memory)

```js
// eventBus.js
const listeners = {};

export function on(eventType, handler) {
  if (!listeners[eventType]) {
    listeners[eventType] = [];
  }
  listeners[eventType].push(handler);
}

export async function emitEvent(eventType, eventData) {
  // 1. Store event in DB (audit trail)
  await db.events.create({
    eventId: generateUUID(),
    eventType,
    eventData,
    timestamp: new Date()
  });

  // 2. Notify all listeners
  const handlers = listeners[eventType] || [];
  for (const handler of handlers) {
    try {
      await handler(eventData);
    } catch (error) {
      console.error(`Error in ${eventType} handler:`, error);
      // Don't throw - one handler failing shouldn't break others
    }
  }
}
```

### Register Listeners

```js
// listeners/memberListeners.js
import { on } from './eventBus';

on('MemberRegistrationApproved', async (event) => {
  await createMemberWallet(event.memberId, event.advanceDeposit);
});

on('MemberRegistrationApproved', async (event) => {
  await emailService.sendWelcomeEmail(event.email);
});

on('MemberSuspended', async (event) => {
  await updateAgentStatistics(event.agentId);
});
```

---

## For Your Project

Recommended approach:

- **Phase 1:** Simple in-memory event bus
  - Store events in DB for audit trail
  - Synchronous listeners (wait for all handlers to complete)


---

### Example: Member Registration Flow

**Command:**

```js
async function approveMemberRegistration(memberId) {
  return await db.transaction(async (trx) => {
    // 1. Update member status
    await db.members.update(
      { registrationStatus: 'Approved', memberStatus: 'Active' },
      { where: { memberId } },
      { transaction: trx }
    );

    // 2. Emit event
    await emitEvent('MemberRegistrationApproved', {
      memberId,
      agentId: member.agentId,
      unitId: member.unitId,
      tierId: member.tierId,
      advanceDeposit: payment.advanceDeposit,
      registrationFee: payment.registrationFee,
      approvedBy: userId
    });
  });
}
```

**Event Listeners:**

```js
// Wallet Context
on('MemberRegistrationApproved', async (event) => {
  await db.wallets.create({
    memberId: event.memberId,
    balance: event.advanceDeposit
  });
});

// Finance Context
on('MemberRegistrationApproved', async (event) => {
  await glService.createJournalEntry({
    entries: [
      { account: 'CASH', debit: event.advanceDeposit + event.registrationFee },
      { account: 'REGISTRATION_FEE_REVENUE', credit: event.registrationFee },
      { account: 'MEMBER_WALLET_LIABILITY', credit: event.advanceDeposit }
    ]
  });
});

// Statistics
on('MemberRegistrationApproved', async (event) => {
  await db.agents.increment('totalActiveMembers', {
    where: { agentId: event.agentId }
  });
});

// Notifications
on('MemberRegistrationApproved', async (event) => {
  const member = await db.members.findByPk(event.memberId);
  await emailService.sendWelcomeEmail(member.email);
});
```

---

## Do You Need Events Right Away?

For Phase 1: You can start simpler:

```js
async function approveMemberRegistration(memberId) {
  return await db.transaction(async (trx) => {
    // 1. Update member
    await db.members.update(...);

    // 2. Create wallet (synchronous)
    await createWallet(...);

    // 3. Create GL entry (synchronous)
    await glService.createJournalEntry(...);

    // 4. Update stats (synchronous)
    await updateAgentStats(...);
  });
}
```

Add events later when:

- You need audit trail
- You want to decouple contexts
- You add async features (notifications, reports)

**TL;DR:** Events = notifications that something happened. They let different parts of your system react independently without tight coupling. Optional for Phase 1, but very useful as your system grows.
