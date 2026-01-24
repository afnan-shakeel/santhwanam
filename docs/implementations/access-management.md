# Access Management Specification

**Version:** 1.0  
**Date:** January 2026  
**Technology Stack:** Express.js (TypeScript) + Angular 20+ + Prisma + Supabase

---

## Table of Contents

1. [Overview](#1-overview)
2. [Shared Types](#2-shared-types)
3. [Backend Implementation](#3-backend-implementation-expressjs)
4. [Frontend Implementation](#4-frontend-implementation-angular-20)
5. [Action Permissions Configuration](#5-action-permissions-configuration)
6. [Profile Page Access Rules](#6-profile-page-access-rules)
7. [Data Scoping Examples](#7-backend-data-scoping-examples)
8. [Complete Flow Example](#8-complete-flow-example)
9. [Future Considerations](#9-future-considerations)

---

## 1. Overview

This document specifies a comprehensive access management system for the Mutual Aid / Death Benefit platform. The system implements four distinct layers of access control.

### 1.1 Architecture Layers

| Layer | Purpose | Implementation |
|-------|---------|----------------|
| **Auth Context** | Store user permissions and scope on login | Angular Service with Signals |
| **UI Controls** | Hide or disable buttons/CTAs | Angular Structural Directive |
| **Route Guards** | Page access and ownership checks | Angular Functional Guards |
| **Backend Scope** | Auto-filter queries by user scope | Express.js Middleware |

### 1.2 Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  ACCESS MANAGEMENT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Login → Fetch user permissions + scope via /api/auth/me    │
│                    ↓                                            │
│  2. Store in Angular AuthService (Signals)                      │
│                    ↓                                            │
│  3. UI Components check:                                        │
│     - *appCan directive for buttons                             │
│     - ActionButton component with config                        │
│                    ↓                                            │
│  4. Route Guards validate:                                      │
│     - Permission-based access                                   │
│     - Resource ownership via API                                │
│                    ↓                                            │
│  5. API calls processed by middleware chain:                    │
│     authenticate() → authorize() → applyDataScope()             │
│                    ↓                                            │
│  6. Queries auto-filtered by user scope                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Shared Types

These TypeScript interfaces are shared between frontend and backend.

### 2.1 ScopeType

```typescript
type ScopeType = 'None' | 'Forum' | 'Area' | 'Unit' | 'Agent' | 'Member';
```

| Scope | Description |
|-------|-------------|
| `None` | Super Admin with global access |
| `Forum` | Forum-level administrator |
| `Area` | Area-level administrator |
| `Unit` | Unit-level administrator |
| `Agent` | Agent managing members |
| `Member` | Individual member |

### 2.2 Core Interfaces

```typescript
// src/shared/types/auth.types.ts

export interface AuthScope {
  type: ScopeType;
  entityId: string | null;
}

export interface AuthHierarchy {
  forumId: string | null;
  areaId: string | null;
  unitId: string | null;
  agentId: string | null;
  memberId: string | null;
}

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface RoleAssignment {
  roleCode: string;
  roleName: string;
  scopeType: ScopeType;
  scopeEntityId: string | null;
  scopeEntityName: string | null;
}

export interface AuthContext {
  user: AuthUser;
  permissions: string[];
  scope: AuthScope;
  hierarchy: AuthHierarchy;
  roles: RoleAssignment[];
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}
```

---

## 3. Backend Implementation (Express.js)

### 3.1 Project Structure

```
src/
├── modules/
│   └── iam/
│       ├── iam.routes.ts
│       ├── iam.controller.ts
│       ├── iam.service.ts
│       ├── middleware/
│       │   ├── authenticate.middleware.ts
│       │   ├── authorize.middleware.ts
│       │   └── apply-scope.middleware.ts
│       └── helpers/
│           ├── scope-builder.helper.ts
│           └── permission-checker.helper.ts
├── shared/
│   ├── context/
│   │   └── request-context.ts
│   └── types/
│       └── express.d.ts
```

### 3.2 Request Context (AsyncLocalStorage)

```typescript
// src/shared/context/request-context.ts
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  user: {
    userId: string;
    email: string;
    externalAuthId: string;
  };
  permissions: string[];
  scope: AuthScope;
  hierarchy: AuthHierarchy;
  scopeFilter: Record<string, any> | null;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContextData>();

export function getRequestContext(): RequestContextData {
  const ctx = requestContextStorage.getStore();
  if (!ctx) {
    throw new Error('Request context not initialized');
  }
  return ctx;
}

export function hasPermission(permission: string): boolean {
  const ctx = getRequestContext();
  return ctx.permissions.includes(permission);
}

export function getScopeFilter(): Record<string, any> | null {
  const ctx = getRequestContext();
  return ctx.scopeFilter;
}
```

### 3.3 Express Type Extensions

```typescript
// src/shared/types/express.d.ts
import { RequestContextData } from '../context/request-context';

declare global {
  namespace Express {
    interface Request {
      ctx: RequestContextData;
      scopeFilter: Record<string, any> | null;
    }
  }
}

export {};
```

### 3.4 Authentication Middleware

```typescript
// src/modules/iam/middleware/authenticate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/shared/prisma';
import { requestContextStorage, RequestContextData } from '@/shared/context/request-context';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }
    
    const token = authHeader.substring(7);
    
    // 2. Verify with Supabase
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !supabaseUser) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    
    // 3. Fetch local user with roles and permissions
    const localUser = await prisma.user.findUnique({
      where: { externalAuthId: supabaseUser.id },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true }
                }
              }
            }
          }
        },
        agent: true,
        member: true
      }
    });
    
    if (!localUser || !localUser.isActive) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }
    
    // 4. Build permissions list (flattened from all roles)
    const permissions = new Set<string>();
    localUser.userRoles.forEach(ur => {
      ur.role.rolePermissions.forEach(rp => {
        permissions.add(rp.permission.permissionCode);
      });
    });
    
    // 5. Determine primary scope (highest privilege role)
    const scope = determinePrimaryScope(localUser.userRoles);
    
    // 6. Build hierarchy
    const hierarchy = await buildUserHierarchy(localUser);
    
    // 7. Create request context
    const contextData: RequestContextData = {
      user: {
        userId: localUser.userId,
        email: localUser.email,
        externalAuthId: localUser.externalAuthId
      },
      permissions: Array.from(permissions),
      scope,
      hierarchy,
      scopeFilter: null
    };
    
    // 8. Run rest of request within AsyncLocalStorage context
    requestContextStorage.run(contextData, () => {
      req.ctx = contextData;
      next();
    });
    
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Helper: Determine primary scope based on role hierarchy
function determinePrimaryScope(userRoles: any[]): AuthScope {
  const scopePriority: Record<string, number> = {
    'None': 0,
    'Forum': 1,
    'Area': 2,
    'Unit': 3,
    'Agent': 4,
    'Member': 5
  };
  
  let primaryScope: AuthScope = { type: 'Member', entityId: null };
  let highestPriority = 999;
  
  for (const ur of userRoles) {
    const priority = scopePriority[ur.role.scopeType] ?? 999;
    if (priority < highestPriority) {
      highestPriority = priority;
      primaryScope = {
        type: ur.role.scopeType,
        entityId: ur.scopeEntityId
      };
    }
  }
  
  return primaryScope;
}

// Helper: Build user's hierarchy context
async function buildUserHierarchy(user: any): Promise<AuthHierarchy> {
  const hierarchy: AuthHierarchy = {
    forumId: null,
    areaId: null,
    unitId: null,
    agentId: null,
    memberId: null
  };
  
  if (user.agent) {
    hierarchy.agentId = user.agent.agentId;
    
    const unit = await prisma.unit.findUnique({
      where: { unitId: user.agent.unitId },
      include: { area: { include: { forum: true } } }
    });
    
    if (unit) {
      hierarchy.unitId = unit.unitId;
      hierarchy.areaId = unit.area.areaId;
      hierarchy.forumId = unit.area.forum.forumId;
    }
  }
  
  if (user.member) {
    hierarchy.memberId = user.member.memberId;
    
    const agent = await prisma.agent.findUnique({
      where: { agentId: user.member.agentId },
      include: { 
        unit: { 
          include: { area: { include: { forum: true } } } 
        } 
      }
    });
    
    if (agent) {
      hierarchy.agentId = agent.agentId;
      hierarchy.unitId = agent.unit.unitId;
      hierarchy.areaId = agent.unit.area.areaId;
      hierarchy.forumId = agent.unit.area.forum.forumId;
    }
  }
  
  return hierarchy;
}
```

### 3.5 Authorization Middleware

```typescript
// src/modules/iam/middleware/authorize.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { getRequestContext } from '@/shared/context/request-context';

type ContextExtractor = (req: Request) => Record<string, string>;

export function authorize(
  permission: string | string[],
  contextExtractor?: ContextExtractor
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getRequestContext();
      const permissions = Array.isArray(permission) ? permission : [permission];
      
      // Check if user has any of the required permissions
      const hasAnyPermission = permissions.some(p => ctx.permissions.includes(p));
      
      if (!hasAnyPermission) {
        res.status(403).json({ 
          error: 'Permission denied',
          required: permissions,
          message: `You need one of these permissions: ${permissions.join(', ')}`
        });
        return;
      }
      
      // If context extractor provided, validate contextual permission
      if (contextExtractor) {
        const resourceContext = contextExtractor(req);
        const hasContextualAccess = await checkContextualAccess(ctx, resourceContext);
        
        if (!hasContextualAccess) {
          res.status(403).json({ 
            error: 'Access denied',
            message: 'You do not have access to this resource'
          });
          return;
        }
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

async function checkContextualAccess(
  ctx: RequestContextData,
  resourceContext: Record<string, string>
): Promise<boolean> {
  const { scope } = ctx;
  
  // Super Admin has access to everything
  if (scope.type === 'None') {
    return true;
  }
  
  // Check based on scope type
  if (resourceContext.forumId && scope.type === 'Forum') {
    return scope.entityId === resourceContext.forumId;
  }
  
  if (resourceContext.areaId && scope.type === 'Area') {
    return scope.entityId === resourceContext.areaId;
  }
  
  if (resourceContext.unitId && scope.type === 'Unit') {
    return scope.entityId === resourceContext.unitId;
  }
  
  if (resourceContext.agentId && scope.type === 'Agent') {
    return scope.entityId === resourceContext.agentId;
  }
  
  return false;
}
```

### 3.6 Data Scope Middleware

```typescript
// src/modules/iam/middleware/apply-scope.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { getRequestContext } from '@/shared/context/request-context';
import { buildScopeFilter, EntityType } from '../helpers/scope-builder.helper';

export function applyDataScope(entityType: EntityType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getRequestContext();
      
      // Build the scope filter for Prisma queries
      const scopeFilter = await buildScopeFilter(entityType, ctx.scope, ctx.hierarchy);
      
      // Attach to request context
      ctx.scopeFilter = scopeFilter;
      req.scopeFilter = scopeFilter;
      
      next();
    } catch (error) {
      console.error('Scope application error:', error);
      res.status(500).json({ error: 'Failed to apply data scope' });
    }
  };
}
```

### 3.7 Scope Builder Helper

```typescript
// src/modules/iam/helpers/scope-builder.helper.ts
import { AuthScope, AuthHierarchy } from '@/shared/types/auth.types';

export type EntityType = 'member' | 'agent' | 'wallet' | 'contribution' | 'approvalRequest';

interface ScopeConfig {
  direct?: (entityId: string) => Record<string, any>;
  nested?: Record<string, (entityId: string) => Record<string, any>>;
}

const SCOPE_CONFIGS: Record<EntityType, Record<string, ScopeConfig>> = {
  member: {
    Agent: {
      direct: (entityId) => ({ agentId: entityId })
    },
    Unit: {
      nested: {
        agent: (entityId) => ({ unitId: entityId })
      }
    },
    Area: {
      nested: {
        agent: (entityId) => ({ 
          unit: { areaId: entityId } 
        })
      }
    },
    Forum: {
      nested: {
        agent: (entityId) => ({ 
          unit: { area: { forumId: entityId } } 
        })
      }
    }
  },
  
  agent: {
    Unit: {
      direct: (entityId) => ({ unitId: entityId })
    },
    Area: {
      nested: {
        unit: (entityId) => ({ areaId: entityId })
      }
    },
    Forum: {
      nested: {
        unit: (entityId) => ({ 
          area: { forumId: entityId } 
        })
      }
    }
  },
  
  wallet: {
    Agent: {
      nested: {
        member: (entityId) => ({ agentId: entityId })
      }
    },
    Unit: {
      nested: {
        member: (entityId) => ({ 
          agent: { unitId: entityId } 
        })
      }
    },
    Area: {
      nested: {
        member: (entityId) => ({ 
          agent: { unit: { areaId: entityId } } 
        })
      }
    },
    Forum: {
      nested: {
        member: (entityId) => ({ 
          agent: { unit: { area: { forumId: entityId } } } 
        })
      }
    }
  },
  
  contribution: {
    Agent: {
      nested: {
        member: (entityId) => ({ agentId: entityId })
      }
    }
  },
  
  approvalRequest: {}
};

export async function buildScopeFilter(
  entityType: EntityType,
  scope: AuthScope,
  hierarchy: AuthHierarchy
): Promise<Record<string, any>> {
  // Super Admin - no filter
  if (scope.type === 'None') {
    return {};
  }
  
  // Member scope - can only see their own data
  if (scope.type === 'Member' && hierarchy.memberId) {
    return buildMemberSelfScope(entityType, hierarchy.memberId);
  }
  
  const config = SCOPE_CONFIGS[entityType]?.[scope.type];
  
  if (!config || !scope.entityId) {
    console.warn(`No scope config for ${entityType}/${scope.type}`);
    return { id: 'none' }; // Restrictive filter
  }
  
  if (config.direct) {
    return config.direct(scope.entityId);
  }
  
  if (config.nested) {
    const filter: Record<string, any> = {};
    for (const [relation, builder] of Object.entries(config.nested)) {
      filter[relation] = builder(scope.entityId);
    }
    return filter;
  }
  
  return {};
}

function buildMemberSelfScope(entityType: EntityType, memberId: string): Record<string, any> {
  switch (entityType) {
    case 'member':
      return { memberId };
    case 'wallet':
      return { memberId };
    case 'contribution':
      return { memberId };
    default:
      return { id: 'none' };
  }
}

export function mergeScopeWithFilters(
  scopeFilter: Record<string, any>,
  userFilters: Record<string, any>
): Record<string, any> {
  return {
    AND: [scopeFilter, userFilters]
  };
}
```

### 3.8 Scope Configuration Reference

| Entity | Scope | Filter Pattern |
|--------|-------|----------------|
| member | Agent | `{ agentId: entityId }` |
| member | Unit | `{ agent: { unitId: entityId } }` |
| member | Area | `{ agent: { unit: { areaId: entityId } } }` |
| member | Forum | `{ agent: { unit: { area: { forumId: entityId } } } }` |
| agent | Unit | `{ unitId: entityId }` |
| agent | Area | `{ unit: { areaId: entityId } }` |
| wallet | Agent | `{ member: { agentId: entityId } }` |

### 3.9 API Endpoints

#### GET /api/auth/me

Returns the complete AuthContext for the authenticated user.

#### GET /api/auth/check-access

**Parameters:** `resource` (string), `resourceId` (string)  
**Returns:** `{ allowed: boolean, reason?: string }`

### 3.10 Route Usage Example

```typescript
// src/modules/members/members.routes.ts
import { Router } from 'express';
import { authenticate } from '@/modules/iam/middleware/authenticate.middleware';
import { authorize } from '@/modules/iam/middleware/authorize.middleware';
import { applyDataScope } from '@/modules/iam/middleware/apply-scope.middleware';

const router = Router();

// GET /api/members - List members (auto-scoped)
router.get('/',
  authenticate,
  authorize('member.read'),
  applyDataScope('member'),
  membersController.findAll
);

// GET /api/members/:memberId - Get single member
router.get('/:memberId',
  authenticate,
  authorize('member.read', (req) => ({ memberId: req.params.memberId })),
  membersController.findById
);

// POST /api/members - Create member
router.post('/',
  authenticate,
  authorize('member.create', (req) => ({ unitId: req.body.unitId })),
  membersController.create
);

// PUT /api/members/:memberId/suspend
router.put('/:memberId/suspend',
  authenticate,
  authorize('member.suspend'),
  membersController.suspend
);

export const memberRoutes = router;
```

---

## 4. Frontend Implementation (Angular 20+)

### 4.1 Project Structure

```
src/app/
├── core/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.models.ts
│   │   ├── auth.interceptor.ts
│   │   └── auth.guard.ts
│   └── access/
│       ├── access.service.ts
│       ├── can.directive.ts
│       ├── resource-access.guard.ts
│       └── action-permissions.config.ts
├── shared/
│   └── components/
│       └── action-button/
└── features/
```

### 4.2 Auth Service

```typescript
// src/app/core/auth/auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { AuthContext, AccessCheckResult } from './auth.models';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private supabase: SupabaseClient;
  
  // Auth state signals
  private _isAuthenticated = signal<boolean>(false);
  private _isLoading = signal<boolean>(true);
  private _authContext = signal<AuthContext | null>(null);
  
  // Public readonly signals
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly authContext = this._authContext.asReadonly();
  
  // Computed signals
  readonly user = computed(() => this._authContext()?.user ?? null);
  readonly permissions = computed(() => this._authContext()?.permissions ?? []);
  readonly scope = computed(() => this._authContext()?.scope ?? { type: 'None', entityId: null });
  readonly hierarchy = computed(() => this._authContext()?.hierarchy ?? {
    forumId: null, areaId: null, unitId: null, agentId: null, memberId: null
  });
  readonly roles = computed(() => this._authContext()?.roles ?? []);
  
  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.initializeAuth();
  }
  
  private async initializeAuth(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) await this.loadAuthContext();
      
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) await this.loadAuthContext();
        else if (event === 'SIGNED_OUT') this.clearAuth();
      });
    } finally {
      this._isLoading.set(false);
    }
  }
  
  private async loadAuthContext(): Promise<void> {
    try {
      const context = await firstValueFrom(this.http.get<AuthContext>('/api/auth/me'));
      this._authContext.set(context);
      this._isAuthenticated.set(true);
    } catch (error) {
      console.error('Failed to load auth context:', error);
      this.clearAuth();
    }
  }
  
  private clearAuth(): void {
    this._authContext.set(null);
    this._isAuthenticated.set(false);
  }
  
  // Permission checking methods
  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }
  
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.permissions().includes(p));
  }
  
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(p => this.permissions().includes(p));
  }
  
  hasRole(roleCode: string): boolean {
    return this.roles().some(r => r.roleCode === roleCode);
  }
  
  // Check resource access via API
  async checkResourceAccess(resource: string, resourceId: string): Promise<AccessCheckResult> {
    try {
      return await firstValueFrom(
        this.http.get<AccessCheckResult>('/api/auth/check-access', {
          params: { resource, resourceId }
        })
      );
    } catch {
      return { allowed: false, reason: 'Access check failed' };
    }
  }
  
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      await this.loadAuthContext();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.clearAuth();
    this.router.navigate(['/login']);
  }
  
  async getAccessToken(): Promise<string | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token ?? null;
  }
}
```

### 4.3 Access Service

```typescript
// src/app/core/access/access.service.ts
import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ACTION_PERMISSIONS, ActionConfig } from './action-permissions.config';

export type AccessMode = 'hide' | 'disable';
export type AccessLogic = 'or' | 'and';

@Injectable({ providedIn: 'root' })
export class AccessService {
  private authService = inject(AuthService);
  
  can(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
  
  canAny(permissions: string[]): boolean {
    return this.authService.hasAnyPermission(permissions);
  }
  
  canAll(permissions: string[]): boolean {
    return this.authService.hasAllPermissions(permissions);
  }
  
  checkPermissions(permissions: string[], logic: AccessLogic = 'or'): boolean {
    return logic === 'and' ? this.canAll(permissions) : this.canAny(permissions);
  }
  
  getActionConfig(entity: string, action: string): ActionConfig | null {
    const entityConfig = ACTION_PERMISSIONS[entity as keyof typeof ACTION_PERMISSIONS];
    if (!entityConfig) return null;
    return entityConfig[action as keyof typeof entityConfig] ?? null;
  }
  
  canPerformAction(entity: string, action: string): boolean {
    const config = this.getActionConfig(entity, action);
    if (!config) return false;
    return Array.isArray(config.permission)
      ? this.canAny(config.permission)
      : this.can(config.permission);
  }
  
  getActionMode(entity: string, action: string): AccessMode {
    const config = this.getActionConfig(entity, action);
    return config?.mode ?? 'hide';
  }
}
```

### 4.4 Can Directive (*appCan)

```typescript
// src/app/core/access/can.directive.ts
import { 
  Directive, Input, TemplateRef, ViewContainerRef, 
  inject, effect, OnDestroy
} from '@angular/core';
import { AccessService, AccessMode, AccessLogic } from './access.service';
import { AuthService } from '../auth/auth.service';

@Directive({
  selector: '[appCan]',
  standalone: true
})
export class CanDirective implements OnDestroy {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private accessService = inject(AccessService);
  private authService = inject(AuthService);
  
  private hasView = false;
  private permission: string | string[] = '';
  private mode: AccessMode = 'hide';
  private logic: AccessLogic = 'or';
  
  @Input() set appCan(permission: string | string[]) {
    this.permission = permission;
    this.updateView();
  }
  
  @Input() set appCanMode(mode: AccessMode) {
    this.mode = mode;
    this.updateView();
  }
  
  @Input() set appCanLogic(logic: AccessLogic) {
    this.logic = logic;
    this.updateView();
  }
  
  constructor() {
    effect(() => {
      this.authService.permissions();
      this.updateView();
    });
  }
  
  private updateView(): void {
    const hasPermission = this.checkPermission();
    
    if (this.mode === 'hide') {
      if (hasPermission && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!hasPermission && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    } else {
      if (!this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef, {
          $implicit: hasPermission,
          disabled: !hasPermission
        });
        this.hasView = true;
      }
    }
  }
  
  private checkPermission(): boolean {
    if (Array.isArray(this.permission)) {
      return this.logic === 'and'
        ? this.accessService.canAll(this.permission)
        : this.accessService.canAny(this.permission);
    }
    return this.accessService.can(this.permission);
  }
  
  ngOnDestroy(): void {
    this.viewContainer.clear();
  }
}
```

#### Usage Examples

```html
<!-- Hide mode (default) -->
<button *appCan="'member.create'">Add Member</button>

<!-- Disable mode -->
<button *appCan="'member.suspend'; mode: 'disable'">Suspend</button>

<!-- Multiple permissions (OR - default) -->
<button *appCan="['member.update', 'member.admin']; logic: 'or'">Edit</button>

<!-- Multiple permissions (AND) -->
<button *appCan="['member.view', 'wallet.view']; logic: 'and'">View Details</button>

<!-- Using context variable for disable mode -->
<ng-container *appCan="'member.delete'; mode: 'disable'; let canDelete">
  <button 
    [disabled]="!canDelete"
    [matTooltip]="canDelete ? '' : 'Permission required'"
  >
    Delete
  </button>
</ng-container>
```

### 4.5 Action Button Component

```typescript
// src/app/shared/components/action-button/action-button.component.ts
import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { AccessService } from '@core/access/access.service';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTooltipModule, MatIconModule],
  template: `
    @if (shouldShow()) {
      <button
        mat-button
        [color]="color"
        [disabled]="isDisabled()"
        [matTooltip]="tooltipText()"
        [matTooltipDisabled]="!isDisabled()"
        (click)="handleClick($event)"
      >
        @if (icon) { <mat-icon>{{ icon }}</mat-icon> }
        <ng-content></ng-content>
      </button>
    }
  `
})
export class ActionButtonComponent {
  private accessService = inject(AccessService);
  
  @Input({ required: true }) entity!: string;
  @Input({ required: true }) action!: string;
  @Input() color: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() icon?: string;
  @Input() customTooltip?: string;
  
  @Output() actionClick = new EventEmitter<void>();
  
  private config = computed(() => this.accessService.getActionConfig(this.entity, this.action));
  private hasPermission = computed(() => this.accessService.canPerformAction(this.entity, this.action));
  
  shouldShow = computed(() => {
    const cfg = this.config();
    if (!cfg) return false;
    if (cfg.mode === 'hide' && !this.hasPermission()) return false;
    return true;
  });
  
  isDisabled = computed(() => {
    const cfg = this.config();
    if (!cfg) return true;
    if (cfg.mode === 'disable' && !this.hasPermission()) return true;
    return false;
  });
  
  tooltipText = computed(() => {
    if (this.customTooltip) return this.customTooltip;
    return this.config()?.disabledTooltip ?? 'Permission required';
  });
  
  handleClick(event: Event): void {
    if (!this.isDisabled()) this.actionClick.emit();
    event.stopPropagation();
  }
}
```

### 4.6 Route Guards

```typescript
// src/app/core/auth/auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated()) return true;
  router.navigate(['/login']);
  return false;
};

export function permissionGuard(permission: string | string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }
    
    const hasPermission = Array.isArray(permission)
      ? authService.hasAnyPermission(permission)
      : authService.hasPermission(permission);
    
    if (!hasPermission) {
      router.navigate(['/forbidden']);
      return false;
    }
    
    return true;
  };
}
```

```typescript
// src/app/core/access/resource-access.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';

type ResourceType = 'member' | 'agent' | 'wallet';

export function resourceAccessGuard(resourceType: ResourceType, idParam: string = 'id'): CanActivateFn {
  return async (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }
    
    const resourceId = route.paramMap.get(idParam);
    if (!resourceId) {
      router.navigate(['/not-found']);
      return false;
    }
    
    const result = await authService.checkResourceAccess(resourceType, resourceId);
    
    if (!result.allowed) {
      router.navigate(['/forbidden']);
      return false;
    }
    
    return true;
  };
}

export const memberAccessGuard = (idParam = 'memberId') => resourceAccessGuard('member', idParam);
export const agentAccessGuard = (idParam = 'agentId') => resourceAccessGuard('agent', idParam);
```

### 4.7 Routes Configuration

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from '@core/auth/auth.guard';
import { memberAccessGuard, agentAccessGuard } from '@core/access/resource-access.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      {
        path: 'members',
        canActivate: [permissionGuard('member.read')],
        children: [
          { path: '', loadComponent: () => import('./features/members/member-list/member-list.component').then(m => m.MemberListComponent) },
          { path: ':memberId/profile', canActivate: [memberAccessGuard('memberId')], loadComponent: () => import('./features/members/member-profile/member-profile.component').then(m => m.MemberProfileComponent) }
        ]
      },
      {
        path: 'agents',
        canActivate: [permissionGuard('agent.read')],
        children: [
          { path: '', loadComponent: () => import('./features/agents/agent-list/agent-list.component').then(m => m.AgentListComponent) },
          { path: ':agentId/profile', canActivate: [agentAccessGuard('agentId')], loadComponent: () => import('./features/agents/agent-profile/agent-profile.component').then(m => m.AgentProfileComponent) }
        ]
      },
      { path: 'admin', canActivate: [permissionGuard(['admin.access', 'role.manage'])], loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES) }
    ]
  },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'forbidden', loadComponent: () => import('./shared/pages/forbidden/forbidden.component').then(m => m.ForbiddenComponent) },
  { path: '**', redirectTo: 'dashboard' }
];
```

---

## 5. Action Permissions Configuration

### 5.1 Configuration Interface

```typescript
export type AccessMode = 'hide' | 'disable';

export interface ActionConfig {
  permission: string | string[];
  mode: AccessMode;
  disabledTooltip?: string;
}
```

### 5.2 Member Actions

| Action | Permission | Mode | Tooltip |
|--------|------------|------|---------|
| create | `member.create` | hide | - |
| edit | `member.update` | hide | - |
| view | `member.read` | hide | - |
| suspend | `member.suspend` | disable | "You need member.suspend permission" |
| reactivate | `member.reactivate` | disable | "You need member.reactivate permission" |
| delete | `member.delete` | disable | "Only administrators can delete" |
| export | `member.export` | hide | - |
| viewWallet | `wallet.balance.view` | hide | - |

### 5.3 Agent Actions

| Action | Permission | Mode | Tooltip |
|--------|------------|------|---------|
| create | `agent.create` | hide | - |
| edit | `agent.update` | hide | - |
| view | `agent.read` | hide | - |
| deactivate | `agent.deactivate` | disable | "You need agent.deactivate permission" |

### 5.4 Wallet Actions

| Action | Permission | Mode | Tooltip |
|--------|------------|------|---------|
| view | `wallet.balance.view` | hide | - |
| requestDeposit | `wallet.deposit.request` | hide | - |
| approveDeposit | `wallet.deposit.approve` | disable | "You need approval permission" |

### 5.5 Death Claim Actions

| Action | Permission | Mode | Tooltip |
|--------|------------|------|---------|
| create | `death_claim.report` | hide | - |
| verify | `death_claim.verify` | disable | "You need verification permission" |
| approve | `death_claim.approve` | disable | "You need approval permission" |
| settle | `death_claim.settle` | disable | "You need settlement permission" |

### 5.6 Configuration Code

```typescript
export const ACTION_PERMISSIONS = {
  member: {
    create: { permission: 'member.create', mode: 'hide' as const },
    edit: { permission: 'member.update', mode: 'hide' as const },
    view: { permission: 'member.read', mode: 'hide' as const },
    suspend: { permission: 'member.suspend', mode: 'disable' as const, disabledTooltip: 'You need member.suspend permission' },
    reactivate: { permission: 'member.reactivate', mode: 'disable' as const, disabledTooltip: 'You need member.reactivate permission' },
    delete: { permission: 'member.delete', mode: 'disable' as const, disabledTooltip: 'Only administrators can delete members' },
    export: { permission: 'member.export', mode: 'hide' as const },
    viewWallet: { permission: 'wallet.balance.view', mode: 'hide' as const },
  },
  agent: {
    create: { permission: 'agent.create', mode: 'hide' as const },
    edit: { permission: 'agent.update', mode: 'hide' as const },
    view: { permission: 'agent.read', mode: 'hide' as const },
    deactivate: { permission: 'agent.deactivate', mode: 'disable' as const, disabledTooltip: 'You need agent.deactivate permission' },
  },
  wallet: {
    view: { permission: 'wallet.balance.view', mode: 'hide' as const },
    requestDeposit: { permission: 'wallet.deposit.request', mode: 'hide' as const },
    approveDeposit: { permission: 'wallet.deposit.approve', mode: 'disable' as const, disabledTooltip: 'You need deposit approval permission' },
  },
  approval: {
    view: { permission: 'approval.read', mode: 'hide' as const },
    execute: { permission: 'approval.execute', mode: 'disable' as const, disabledTooltip: 'You are not assigned to approve this' },
    reassign: { permission: 'approval.reassign', mode: 'hide' as const },
  },
  deathClaim: {
    create: { permission: 'death_claim.report', mode: 'hide' as const },
    verify: { permission: 'death_claim.verify', mode: 'disable' as const, disabledTooltip: 'You need verification permission' },
    approve: { permission: 'death_claim.approve', mode: 'disable' as const, disabledTooltip: 'You need approval permission' },
    settle: { permission: 'death_claim.settle', mode: 'disable' as const, disabledTooltip: 'You need settlement permission' },
  }
} as const;

export type EntityType = keyof typeof ACTION_PERMISSIONS;
```

---

## 6. Profile Page Access Rules

### 6.1 Member Profile Access

**Route:** `/members/:memberId/profile`

| Viewer | Allowed | Condition |
|--------|---------|-----------|
| Member (self) | ✅ Yes | `hierarchy.memberId === memberId` |
| Agent (own member) | ✅ Yes | `member.agentId === scope.entityId` |
| Agent (other) | ❌ No | - |
| Unit Admin | ✅ Yes | `member.agent.unitId === scope.entityId` |
| Area Admin | ✅ Yes | `member.agent.unit.areaId === scope.entityId` |
| Forum Admin | ✅ Yes | `member.agent.unit.area.forumId === scope.entityId` |
| Super Admin | ✅ Yes | Always (`scope.type === 'None'`) |

### 6.2 Agent Profile Access

**Route:** `/agents/:agentId/profile`

| Viewer | Allowed | Condition |
|--------|---------|-----------|
| Agent (self) | ✅ Yes | `hierarchy.agentId === agentId` |
| Member (own agent) | ✅ Yes | `hierarchy.agentId === agentId` |
| Agent (peer) | ❌ No | - |
| Unit Admin | ✅ Yes | `agent.unitId === scope.entityId` |
| Area Admin | ✅ Yes | `agent.unit.areaId === scope.entityId` |
| Forum Admin | ✅ Yes | `agent.unit.area.forumId === scope.entityId` |
| Super Admin | ✅ Yes | Always |

---

## 7. Backend Data Scoping Examples

### 7.1 Agent Viewing Members

**Scenario:** Agent John (`agentId: "agent-123"`) calls `GET /api/members`

- **Scope:** `{ type: "Agent", entityId: "agent-123" }`
- **Filter:** `{ agentId: "agent-123" }`
- **Result:** Returns only John's 45 members

### 7.2 Unit Admin Viewing Members

**Scenario:** Unit Admin Sarah (`unitId: "unit-1"`) calls `GET /api/members`

- **Scope:** `{ type: "Unit", entityId: "unit-1" }`
- **Filter:** `{ agent: { unitId: "unit-1" } }`
- **Result:** All members from all agents in Unit 1

### 7.3 Super Admin

**Scenario:** Super Admin calls any list endpoint

- **Scope:** `{ type: "None", entityId: null }`
- **Filter:** `{ }` (empty)
- **Result:** All records

---

## 8. Complete Flow Example

### Scenario: Agent Views Member List

1. **Login:** Agent John logs in, frontend calls `GET /api/auth/me`
2. **Context returned:** permissions, scope, hierarchy
3. **Navigate to /members:** `permissionGuard('member.read')` passes
4. **UI renders:** Buttons shown/hidden based on permissions
5. **Data fetched:** Backend applies scope filter automatically
6. **Profile click:** `resourceAccessGuard` verifies ownership via API

---

## 9. Future Considerations

### 9.1 Planned Enhancements

- "View As" capability for Super Admins
- Field-level permissions
- Time-based permissions
- Audit logging

### 9.2 Scalability Notes

- Consider Redis for permission caching
- Cache hierarchy lookups per request
- Complex queries may need explicit scoping

---

## Appendix: Summary Tables

### A.1 Middleware Chain

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `authenticate()` | Validate token, build context |
| 2 | `authorize(permission)` | Check permission |
| 3 | `applyDataScope(entity)` | Build query filter |

### A.2 Angular Components

| Component | Purpose |
|-----------|---------|
| `AuthService` | Central auth state with Signals |
| `AccessService` | Permission checking utilities |
| `CanDirective` | Conditional rendering (`*appCan`) |
| `ActionButtonComponent` | Pre-configured action buttons |
| `permissionGuard` | Route permission check |
| `resourceAccessGuard` | Route ownership check |

### A.3 API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/auth/me` | Get auth context |
| `GET /api/auth/check-access` | Check resource access |

---
