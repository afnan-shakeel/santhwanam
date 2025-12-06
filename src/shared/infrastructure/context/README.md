# Request Context with AsyncLocalStorage

AsyncLocalStorage (ALS) provides request-scoped context that's accessible throughout the entire request lifecycle without explicitly passing it through function parameters.

## Features

- ✅ Request-scoped context using Node.js AsyncLocalStorage
- ✅ Automatic user session extraction from authenticated requests
- ✅ IP address tracking
- ✅ Request ID for tracing
- ✅ Type-safe helper functions
- ✅ Graceful handling of unauthenticated requests

## Architecture

```
Request → contextMiddleware
            ↓
        AsyncLocalStorage (stores RequestContext)
            ↓
        Available everywhere in request lifecycle
            ↓
        getUserSession(), getRequestContext(), etc.
```

## Usage

### 1. Context is Automatically Available

The `contextMiddleware` is registered in `app.ts`, so every request has context:

```typescript
// src/app.ts
import { contextMiddleware } from '@/shared/infrastructure/context';

app.use(contextMiddleware); // Registered early
```

### 2. Access User Session Anywhere

```typescript
import { getUserSession, tryGetUserSession } from '@/shared/infrastructure/context';

// In a service, repository, or handler
class MemberService {
  async createMember(data: CreateMemberDTO) {
    // Get current user (throws if not authenticated)
    const { userId, email } = getUserSession();
    
    // Create member
    const member = await this.memberRepository.create({
      ...data,
      createdBy: userId,
    });
    
    return member;
  }

  async getPublicData() {
    // Try to get user (returns undefined if not authenticated)
    const user = tryGetUserSession();
    
    if (user) {
      // Return personalized data
      return this.getPersonalizedData(user.userId);
    }
    
    // Return public data
    return this.getPublicData();
  }
}
```

### 3. Access Request Context

```typescript
import { getRequestContext, getIpAddress, getRequestId } from '@/shared/infrastructure/context';

// Get full context
const context = getRequestContext();
console.log(context.requestId, context.method, context.path);

// Get specific values
const ipAddress = getIpAddress();
const requestId = getRequestId();
```

### 4. Use in Event Emission

```typescript
import { eventBus, MEMBERSHIP_EVENTS } from '@/shared/infrastructure/event-bus';
import { getUserId, getIpAddress } from '@/shared/infrastructure/context';

async function approveMemberRegistration(memberId: string) {
  // Update member status
  await prisma.member.update({
    where: { memberId },
    data: { status: 'Active' }
  });

  // Emit event with automatic context
  await eventBus.emit({
    eventType: MEMBERSHIP_EVENTS.MEMBER_REGISTRATION_APPROVED,
    aggregateId: memberId,
    eventData: { memberId },
    userId: getUserId(),        // Automatically from context
    ipAddress: getIpAddress(),  // Automatically from context
  });
}
```

### 5. Helper Functions

```typescript
// Throws if not available
getUserSession()    // Get full user session
getUserId()         // Get just the user ID
getRequestContext() // Get full request context

// Returns undefined if not available
tryGetUserSession()    // Safe version
tryGetUserId()         // Safe version
tryGetRequestContext() // Safe version

// Other helpers
getIpAddress()   // Get client IP
getRequestId()   // Get request tracking ID
```

## Request Context Structure

```typescript
interface RequestContext {
  requestId: string;           // UUID for tracking
  userSession?: UserSession;   // If authenticated
  ipAddress?: string;          // Client IP
  method: string;              // HTTP method
  path: string;                // Request path
  timestamp: Date;             // Request timestamp
  metadata?: Record<string, any>; // Additional data
}

interface UserSession {
  userId: string;
  email: string;
  roles?: string[];
  permissions?: string[];
}
```

## Updating Context

```typescript
import { updateRequestContext } from '@/shared/infrastructure/context';

// Add custom metadata during request processing
updateRequestContext({
  metadata: {
    organizationId: 'org-123',
    feature: 'member-registration',
  }
});
```

## Authentication Integration

The middleware automatically extracts user information from `req.user` (set by your auth middleware):

```typescript
// Your auth middleware should set req.user
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    const user = await verifyToken(token);
    (req as any).user = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    };
  }
  
  next();
});

// contextMiddleware runs after and picks up req.user
```

## Benefits

### 1. No Parameter Drilling

**Before:**
```typescript
async function createMember(data, userId, ipAddress) {
  await memberService.create(data, userId, ipAddress);
}

async function create(data, userId, ipAddress) {
  await repository.save(data, userId, ipAddress);
}

async function save(data, userId, ipAddress) {
  // Finally use the values
}
```

**After:**
```typescript
async function createMember(data) {
  await memberService.create(data);
  // Context available everywhere
}

async function create(data) {
  const userId = getUserId(); // Available here
  await repository.save(data);
}

async function save(data) {
  const userId = getUserId(); // And here
}
```

### 2. Consistent Audit Trail

```typescript
// Automatically include user context in all operations
const member = await prisma.member.create({
  data: {
    ...memberData,
    createdBy: getUserId(),    // Automatic
    createdFrom: getIpAddress(), // Automatic
  }
});
```

### 3. Better Logging

```typescript
import { logger } from '@/shared/utils/logger';
import { getRequestId, tryGetUserId } from '@/shared/infrastructure/context';

logger.info('Processing member registration', {
  requestId: getRequestId(),
  userId: tryGetUserId(),
  // Automatically available for correlation
});
```

## Testing

```typescript
import { asyncLocalStorage } from '@/shared/infrastructure/context';
import { RequestContext } from '@/shared/infrastructure/context';

describe('Member Service', () => {
  it('should create member with user context', async () => {
    const context: RequestContext = {
      requestId: 'test-req-123',
      userSession: {
        userId: 'user-123',
        email: 'test@example.com',
      },
      ipAddress: '127.0.0.1',
      method: 'POST',
      path: '/api/members',
      timestamp: new Date(),
    };

    // Run test within context
    await asyncLocalStorage.run(context, async () => {
      const member = await memberService.create(memberData);
      expect(member.createdBy).toBe('user-123');
    });
  });
});
```

## Common Patterns

### Pattern 1: Audit Fields

```typescript
// Domain service
class MemberService {
  async create(data: CreateMemberDTO) {
    const member = await this.repository.create({
      ...data,
      createdBy: getUserId(),
      createdAt: new Date(),
    });
    return member;
  }

  async update(memberId: string, data: UpdateMemberDTO) {
    const member = await this.repository.update(memberId, {
      ...data,
      updatedBy: getUserId(),
      updatedAt: new Date(),
    });
    return member;
  }
}
```

### Pattern 2: Authorization

```typescript
class MemberService {
  async updateMember(memberId: string, data: UpdateMemberDTO) {
    const { userId, roles } = getUserSession();
    
    // Check if user can update this member
    const member = await this.repository.findById(memberId);
    
    if (member.agentId !== userId && !roles?.includes('admin')) {
      throw new UnauthorizedError('Cannot update this member');
    }
    
    return this.repository.update(memberId, data);
  }
}
```

### Pattern 3: Personalized Queries

```typescript
class DashboardService {
  async getDashboardData() {
    const user = tryGetUserSession();
    
    if (!user) {
      return this.getPublicDashboard();
    }
    
    // Get personalized dashboard based on user's role
    if (user.roles?.includes('agent')) {
      return this.getAgentDashboard(user.userId);
    }
    
    if (user.roles?.includes('admin')) {
      return this.getAdminDashboard();
    }
    
    return this.getMemberDashboard(user.userId);
  }
}
```

## Best Practices

1. **Use try* variants for optional auth**: Use `tryGetUserSession()` when authentication is optional
2. **Always use context for audit**: Always include `createdBy`, `updatedBy` from context
3. **Don't store in context**: Context is read-only from consumer perspective - don't abuse `updateContext`
4. **Middleware order matters**: Ensure `contextMiddleware` runs early, after auth middleware
5. **Testing**: Always wrap tests in `asyncLocalStorage.run()` when testing code that uses context

## Troubleshooting

**Error: "No request context available"**
- Ensure `contextMiddleware` is registered in `app.ts`
- Check that it's registered before the routes that need it

**Error: "No user session available"**
- User is not authenticated
- Use `tryGetUserSession()` if authentication is optional
- Ensure auth middleware runs before `contextMiddleware`

**Context is undefined in async operations**
- AsyncLocalStorage automatically propagates through async operations
- If using custom thread pools or workers, context won't propagate
