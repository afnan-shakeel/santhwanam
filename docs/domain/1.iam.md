
## Key Components
- **Roles**: Dynamic, can be created by admins
- **Permissions**: Granular actions (e.g., `member.create`)
- **RolePermission**: Maps which permissions each role has
- **UserRole**: Assigns roles to users with optional scope

## System Roles (Initial)
- **SuperAdmin** (global, all permissions)
- **ForumAdmin** (scoped to forum)
- **AreaAdmin** (scoped to area)
- **UnitAdmin** (scoped to unit)
- **Agent** (scoped to agent)

## User creation & role-assignment flow
- Create the external auth user (Supabase) first so we have an `externalAuthId` to persist locally.
- Create the local `User` record immediately in the same transaction and link via `externalAuthId`.
- Create any domain records (if only, e.g., `Agent`, `Member`) and `UserRole` assignments in the same transaction.
- Rely on Supabase to deliver invite emails; login flow uses standard JWT verification to map to the local user and roles.

### Scenario A — Invite a Forum Admin
1. Inviter (a current admin) requests invite with role assignment (e.g., `forum_admin` scoped to `forumId`).
2. Backend (single transaction):
   - Create user in Supabase (invite flow) → Supabase returns `externalAuthId`/invite link.
   - Create local `User` record with `externalAuthId` and basic metadata.
   - Create `UserRole` assignment linking the local `userId` to the `roleId` and `scopeEntityId`.
3. Supabase sends invitation email to the user.
4. User follows invite link, sets password, and completes onboarding in Supabase.
5. When the user logs in, backend verifies JWT, looks up local `User` by `externalAuthId`, and loads `UserRole`s and permissions.

Notes: no special "first login" logic is required since local user and roles exist before the user accepts the invite.

### Scenario B — Register an Agent (example)
1. Unit Admin creates an Agent.
2. Backend (single transaction):
   - Create user in Supabase (invite) → get `externalAuthId`.
   - Create local `User` record linked to `externalAuthId`.
   - Create `Agent` domain record linked to the local `userId`.
   - Create `UserRole` for the `agent` role scoped to the `agentId`.
3. Supabase sends invite email; Agent sets password and logs in.
4. Backend verifies JWT, fetches local `User`, `Agent` record, and role assignments.

This same pattern applies for other invite/registration flows (e.g., Members created by Agents): create auth + local user + domain record + scoped `UserRole` in one operation.


## Authentication & authorization middleware (WIP)

- Use a request-scoped context store (e.g., AsyncLocalStorage for Express) to hold `reqContext` accessible from deeper layers.
- Separate concerns into two composable middlewares:
  1. `authorize(permissionCode, contextExtractor?)` — verifies the user has a specific permission in an optional context (e.g., unitId).
  2. `applyRoleScope(scopeType, contextExtractor?)` — computes and stores the user's scope (e.g., `{ forumIds: [...] }`) into the request context for downstream filtering.

These can be combined into a single middleware `authorize(permissionCode, scopeType, contextExtractor?)` if desired.

### Request context (pattern)
- Middleware attaches a `requestContext` object to the AsyncLocalStorage store containing: `user`, `permissions` (optional cache), and `authScope` (computed by `applyRoleScope`).
- Data fetching code reads `requestContext.authScope` and applies filters automatically.
- Store shapes like: `{ forumIds: [1,2,3] }` or `{ forumId: 1 }`.
- Provide a helper `applyScopeToFilters(filters, authScope)` that merges the auth scope into ORM/query filters, returning the final conditions.

### Notes & considerations
- `applyRoleScope` should be fast and cacheable per request (compute once and reuse).
- `authorize` should accept a `contextExtractor(req)` function to supply entity IDs (unitId, forumId) for contextual permission checks.
- Keep permission evaluation logic in a single utility (e.g., `hasPermission(userId, permissionCode, context)`) used by `authorize` and other checks.

---

## Domain Model

### Entity: Role
```javascript
Role {
  roleId: UUID
  roleCode: string // Unique identifier (e.g., "super_admin", "forum_admin")
  roleName: string // Display name (e.g., "Super Administrator")
  description: string?
  
  // Scope type (determines what entities this role can be scoped to)
  scopeType: enum [None, Forum, Area, Unit, Agent]
  // None = Global role (like SuperAdmin)
  // Forum = Role is scoped to a forum
  // Area = Role is scoped to an area
  // Unit = Role is scoped to a unit
  // Agent = Role is scoped to an agent
  
  // Status
  isActive: boolean
  isSystemRole: boolean // True for built-in roles (cannot be deleted)
  
  // Metadata
  createdAt: timestamp
  createdBy: UUID
  updatedAt: timestamp
}
```
### Entity: User
```javascript
User {
  userId: UUID
  externalAuthId: string // Supabase user id
  email: string
  firstName: string?
  lastName: string?
  isActive: boolean

  // Optional metadata from auth provider
  userMetadata: JSON?

  // Metadata
  createdAt: timestamp
  lastSyncedAt: timestamp
}
```

Examples:
```javascript
{
  userId: 'user-123',
  externalAuthId: 'auth|uuid-abc',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'K',
  isActive: true,
  createdAt: '2025-12-01T00:00:00Z',
  lastSyncedAt: '2025-12-01T00:00:00Z'
}
```
Examples:
```javascript
// System roles (created during initial setup)
{
  roleCode: "super_admin",
  roleName: "Super Administrator",
  scopeType: "None",
  isSystemRole: true
}

{
  roleCode: "forum_admin",
  roleName: "Forum Administrator",
  scopeType: "Forum",
  isSystemRole: true
}

{
  roleCode: "area_admin",
  roleName: "Area Administrator",
  scopeType: "Area",
  isSystemRole: true
}

{
  roleCode: "unit_admin",
  roleName: "Unit Administrator",
  scopeType: "Unit",
  isSystemRole: true
}

{
  roleCode: "agent",
  roleName: "Agent",
  scopeType: "Agent",
  isSystemRole: true
}

// Custom role (created by admin later)
{
  roleCode: "finance_manager",
  roleName: "Finance Manager",
  scopeType: "Forum",
  isSystemRole: false
}
```
### Entity: Permission
```javascript
{
  permissionId: UUID
  permissionCode: string // Unique identifier (e.g., "member.create", "death_claim.approve")
  permissionName: string // Display name
  description: string?
  
  // Categorization
  module: string // e.g., "Membership", "Wallet", "Claims", "Organization"
  action: string // e.g., "create", "read", "update", "delete", "approve"
  
  // Status
  isActive: boolean
  
  // Metadata
  createdAt: timestamp
  createdBy: UUID
}
```
Examples:
```javascript
// Membership permissions
{ permissionCode: "member.create", module: "Membership", action: "create" }
{ permissionCode: "member.read", module: "Membership", action: "read" }
{ permissionCode: "member.update", module: "Membership", action: "update" }
{ permissionCode: "member.approve", module: "Membership", action: "approve" }

```
### Entity: RolePermission
```javascript
RolePermission {
  rolePermissionId: UUID
  roleId: UUID // References Role
  permissionId: UUID // References Permission
  
  // Optional: Permission constraints/conditions
  conditions: JSON? // For advanced use cases (e.g., "can approve only if amount < 1000")
  
  // Metadata
  assignedAt: timestamp
  assignedBy: UUID
}
```

### Entity: UserRole
```javascript
UserRole {
  userRoleId: UUID
  userId: UUID // References local User table
  roleId: UUID // References Role (no more enum!)
  
  // Scope (which entity this role applies to)
  // Only set if role.scopeType is not "None"
  scopeEntityType: enum [Forum, Area, Unit, Agent]?
  scopeEntityId: UUID? // ID of the forum/area/unit/agent
  
  // Status
  isActive: boolean
  
  // Metadata
  assignedAt: timestamp
  assignedBy: UUID
  revokedAt: timestamp?
  revokedBy: UUID?
}
```

Examples:
```javascript
// Super Admin (no scope)
{
  userId: "user-123",
  roleId: "role-super-admin",
  scopeEntityType: null,
  scopeEntityId: null
}

// Forum Admin for Forum 1
{
  userId: "user-456",
  roleId: "role-forum-admin",
  scopeEntityType: "Forum",
  scopeEntityId: "forum-1"
}

// Unit Admin for Unit 2
{
  userId: "user-789",
  roleId: "role-unit-admin",
  scopeEntityType: "Unit",
  scopeEntityId: "unit-2"
}

// Custom Finance Manager role for Forum 1
{
  userId: "user-999",
  roleId: "role-finance-manager",
  scopeEntityType: "Forum",
  scopeEntityId: "forum-1"
}
```
  
## Permission Checking Logic
Function: `getUserPermissions(userId, context?)`
```javascript
async function getUserPermissions(userId, context = {}) {
  // 1. Get all active roles for user
  const userRoles = await db.userRoles.findAll({
    where: { userId, isActive: true },
    include: ['role']
  });
  
  // 2. Filter roles based on context (if checking for specific entity)
  let applicableRoles = userRoles;
  
  if (context.forumId || context.areaId || context.unitId) {
    applicableRoles = userRoles.filter(userRole => {
      const role = userRole.role;
      
      // Global roles (scopeType = None) apply everywhere
      if (role.scopeType === 'None') return true;
      
      // Check if role scope matches context
      if (context.forumId && role.scopeType === 'Forum') {
        return userRole.scopeEntityId === context.forumId;
      }
      
      if (context.areaId && role.scopeType === 'Area') {
        return userRole.scopeEntityId === context.areaId;
      }
      
      if (context.unitId && role.scopeType === 'Unit') {
        return userRole.scopeEntityId === context.unitId;
      }
      
      // Also check parent hierarchy
      // E.g., Forum Admin can access all areas/units in their forum
      if (role.scopeType === 'Forum' && context.areaId) {
        const area = await db.areas.findByPk(context.areaId);
        return userRole.scopeEntityId === area.forumId;
      }
      
      if (role.scopeType === 'Forum' && context.unitId) {
        const unit = await db.units.findByPk(context.unitId);
        return userRole.scopeEntityId === unit.forumId;
      }
      
      if (role.scopeType === 'Area' && context.unitId) {
        const unit = await db.units.findByPk(context.unitId);
        return userRole.scopeEntityId === unit.areaId;
      }
      
      return false;
    });
  }
  
  // 3. Get all permissions for applicable roles
  const roleIds = applicableRoles.map(ur => ur.roleId);
  
  const permissions = await db.rolePermissions.findAll({
    where: { roleId: { in: roleIds } },
    include: ['permission']
  });
  
  // 4. Return unique permission codes
  return [...new Set(permissions.map(rp => rp.permission.permissionCode))];
}
```
Function: `hasPermission(userId, permissionCode, context?)`
```javascript
async function hasPermission(userId, permissionCode, context = {}) {
  const permissions = await getUserPermissions(userId, context);
  return permissions.includes(permissionCode);
}
```
Usage in API Endpoints
```javascript
// Example: Create Member endpoint
app.post('/api/members', authenticateRequest, async (req, res) => {
  const { unitId } = req.body;
  
  // Check if user has permission to create members in this unit
  const canCreate = await hasPermission(
    req.user.userId, 
    'member.create',
    { unitId }
  );
  
  if (!canCreate) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  // Proceed with member creation
  // ...
});
```
### Middleware: requirePermission(permissionCode)
```javascript
function requirePermission(permissionCode, contextExtractor) {
  return async (req, res, next) => {
    // Extract context from request (e.g., unitId from body or params)
    const context = contextExtractor ? contextExtractor(req) : {};
    
    const hasAccess = await hasPermission(
      req.user.userId,
      permissionCode,
      context
    );
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    next();
  };
}

// Usage
app.post('/api/members', 
  authenticateRequest,
  requirePermission('member.create', req => ({ unitId: req.body.unitId })),
  createMemberHandler
);
```

## Commands

### InviteUser

- **Triggered by:** Admin with `role.assign` permission
- **Input:**

```json
{
  "email": "string",
  "firstName": "string?",
  "lastName": "string?",
  "roleAssignments": [
    {
      "roleId": "uuid",
      "scopeEntityType": "Forum|Area|Unit|Agent?",
      "scopeEntityId": "uuid?"
    }
  ],
  "invitedBy": "uuid"
}
```

- **Preconditions:**
  - Inviter has `role.assign` permission scoped appropriately
  - Email not already registered

- **Outcome:**
  - Supabase user created (invite link generated)
  - Local `User` record created with `externalAuthId`
  - `UserRole` assignments created for specified roles
  - Event: `UserInvited`

---

### RegisterAgent (remove/move to agents separate documentation once created)

- **Triggered by:** Admin with `agent.create` permission
- **Input:**

```json
{
  "unitId": "uuid",
  "agentCode": "string",
  "email": "string",
  "personalDetails": { /* firstName, lastName, contact, etc. */ },
  "joinedDate": "date",
  "createdBy": "uuid"
}
```

- **Preconditions:**
  - Creator has `agent.create` for the unit/area/forum
  - Unit exists
  - Agent code is unique within unit

- **Outcome:**
  - Supabase user created (invite link generated)
  - Local `User` record created
  - `Agent` record created and linked to user
  - `UserRole` assigned for `agent` scoped to the agent entity
  - Event: `AgentRegistered`

---

### CreateRole

- **Triggered by:** Super Admin (or users with `role.create` permission)
- **Input:**

```json
{
  "roleCode": "string", // e.g., "finance_manager"
  "roleName": "string", // e.g., "Finance Manager"
  "description": "string?",
  "scopeType": "None|Forum|Area|Unit|Agent",
  "permissionIds": ["uuid[]"], // Permissions to assign to this role
  "createdBy": "uuid"
}
```

- **Preconditions:**
  - `roleCode` is unique
  - User has `role.create` permission
  - All `permissionIds` exist

- **Outcome:**
  - Role created with `isSystemRole = false`
  - `RolePermissions` created for each `permissionId`
  - Event: `RoleCreated`

---

### UpdateRole

- **Triggered by:** Super Admin
- **Input:**

```json
{
  "roleId": "uuid",
  "roleName": "string?",
  "description": "string?",
  "permissionIds": ["uuid[]"]?, // If provided, replace all permissions
  "updatedBy": "uuid"
}
```

- **Preconditions:**
  - Role exists
  - If `isSystemRole = true`, only allow updating permissions (not name/code)

- **Outcome:**
  - Role updated
  - `RolePermissions` replaced if `permissionIds` provided
  - Event: `RoleUpdated`

---

### DeleteRole

- **Triggered by:** Super Admin
- **Input:**

```json
{
  "roleId": "uuid",
  "deletedBy": "uuid"
}
```

- **Preconditions:**
  - Role exists
  - `isSystemRole = false` (cannot delete system roles)
  - No active `UserRoles` reference this role (or cascade deactivate them)

- **Outcome:**
  - `isActive → false` (soft delete)
  - All `UserRoles` with this `roleId` set `isActive → false`
  - Event: `RoleDeleted`

---

### CreatePermission

- **Triggered by:** Super Admin
- **Input:**

```json
{
  "permissionCode": "string", // e.g., "report.financial.view"
  "permissionName": "string",
  "description": "string?",
  "module": "string",
  "action": "string",
  "createdBy": "uuid"
}
```

- **Preconditions:**
  - `permissionCode` is unique

- **Outcome:**
  - Permission created
  - Event: `PermissionCreated`

---

### AssignRoleToUser

- **Triggered by:** Super Admin, or authorized admin
- **Input:**

```json
{
  "userId": "uuid",
  "roleId": "uuid",
  "scopeEntityType": "Forum|Area|Unit|Agent?",
  "scopeEntityId": "uuid?",
  "assignedBy": "uuid"
}
```

- **Preconditions:**
  - User exists
  - Role exists and is active
  - If `role.scopeType != "None"`, `scopeEntityType` and `scopeEntityId` must be provided
  - `scopeEntityType` must match `role.scopeType`
  - Assigner has permission to assign this role in this scope

- **Validations:**

```javascript
// Validate scope matches role
if (role.scopeType !== 'None') {
  if (!scopeEntityType || !scopeEntityId) {
    throw new Error('Scope required for this role');
  }
  if (scopeEntityType !== role.scopeType) {
    throw new Error('Scope type mismatch');
  }
}

// Validate assigner has authority
// E.g., Forum Admin can only assign roles scoped to their forum
if (!canAssignRole(assignedBy, roleId, scopeEntityId)) {
  throw new Error('Not authorized to assign this role');
}
```

- **Outcome:**
  - `UserRole` created with `isActive = true`
  - Event: `RoleAssignedToUser`

---

### RevokeRoleFromUser

- **Triggered by:** Super Admin, or authorized admin
- **Input:**

```json
{
  "userRoleId": "uuid",
  "revokedBy": "uuid"
}
```

- **Preconditions:**
  - `UserRole` exists and is active
  - Revoker has authority to revoke this role

- **Outcome:**
  - `UserRole isActive → false`
  - `revokedAt` and `revokedBy` set
  - Event: `RoleRevokedFromUser`



## Initial System Roles & Permissions Setup
* Seed Script: Create System Roles
```javascript
async function seedSystemRoles() {
  // 1. Create Permissions
  const permissions = await createPermissions([
    // Membership
    { code: 'member.create', name: 'Create Member', module: 'Membership', action: 'create' },
    { code: 'member.read', name: 'View Member', module: 'Membership', action: 'read' },
    { code: 'member.update', name: 'Update Member', module: 'Membership', action: 'update' },
    { code: 'member.approve', name: 'Approve Member Registration', module: 'Membership', action: 'approve' },
    { code: 'member.suspend', name: 'Suspend Member', module: 'Membership', action: 'suspend' },
    
    // Wallet
    { code: 'wallet.deposit.approve', name: 'Approve Wallet Deposit', module: 'Wallet', action: 'approve' },
    { code: 'wallet.balance.view', name: 'View Wallet Balance', module: 'Wallet', action: 'read' },
    
    // Death Claims
    { code: 'death_claim.report', name: 'Report Death', module: 'Claims', action: 'create' },
    { code: 'death_claim.verify', name: 'Verify Death Claim', module: 'Claims', action: 'approve' },
    { code: 'death_claim.settle', name: 'Settle Death Claim', module: 'Claims', action: 'settle' },
    
    // Organization
    { code: 'forum.create', name: 'Create Forum', module: 'Organization', action: 'create' },
    { code: 'forum.update', name: 'Update Forum', module: 'Organization', action: 'update' },
    { code: 'area.create', name: 'Create Area', module: 'Organization', action: 'create' },
    { code: 'area.update', name: 'Update Area', module: 'Organization', action: 'update' },
    { code: 'unit.create', name: 'Create Unit', module: 'Organization', action: 'create' },
    { code: 'unit.update', name: 'Update Unit', module: 'Organization', action: 'update' },
    { code: 'agent.create', name: 'Create Agent', module: 'Organization', action: 'create' },
    { code: 'agent.update', name: 'Update Agent', module: 'Organization', action: 'update' },
    
    // Security/RBAC
    { code: 'role.create', name: 'Create Role', module: 'Security', action: 'create' },
    { code: 'role.update', name: 'Update Role', module: 'Security', action: 'update' },
    { code: 'role.assign', name: 'Assign Role to User', module: 'Security', action: 'assign' },
    
    // ... more permissions
  ]);
  
  // 2. Create System Roles
  const superAdminRole = await createRole({
    roleCode: 'super_admin',
    roleName: 'Super Administrator',
    description: 'Full system access',
    scopeType: 'None',
    isSystemRole: true,
    permissions: permissions // ALL permissions
  });
  
  const forumAdminRole = await createRole({
    roleCode: 'forum_admin',
    roleName: 'Forum Administrator',
    description: 'Manages a forum and all its areas/units',
    scopeType: 'Forum',
    isSystemRole: true,
    permissions: [
      'member.create', 'member.read', 'member.update', 'member.approve', 'member.suspend',
      'wallet.deposit.approve', 'wallet.balance.view',
      'death_claim.report', 'death_claim.verify', 'death_claim.settle',
      'area.create', 'area.update',
      'unit.create', 'unit.update',
      'agent.create', 'agent.update',
      'role.assign' // Can assign roles within their forum
    ]
  });
  
  const areaAdminRole = await createRole({
    roleCode: 'area_admin',
    roleName: 'Area Administrator',
    description: 'Manages an area and its units',
    scopeType: 'Area',
    isSystemRole: true,
    permissions: [
      'member.create', 'member.read', 'member.update',
      'wallet.deposit.approve', 'wallet.balance.view',
      'death_claim.report',
      'unit.create', 'unit.update',
      'agent.create', 'agent.update'
    ]
  });
  
  const unitAdminRole = await createRole({
    roleCode: 'unit_admin',
    roleName: 'Unit Administrator',
    description: 'Manages a unit and its agents',
    scopeType: 'Unit',
    isSystemRole: true,
    permissions: [
      'member.create', 'member.read', 'member.update',
      'wallet.deposit.approve', 'wallet.balance.view',
      'death_claim.report',
      'agent.create', 'agent.update'
    ]
  });
  
  const agentRole = await createRole({
    roleCode: 'agent',
    roleName: 'Agent',
    description: 'Registers and manages members',
    scopeType: 'Agent',
    isSystemRole: true,
    permissions: [
      'member.create', 'member.read',
      'wallet.balance.view'
    ]
  });
}
```

## UI for Role Management
of Users
of Permissions

### Admin Panel - Roles Page

**Features:**

- List all roles (system + custom)
- Create new role (only non-system)
- Edit role permissions
- View users assigned to each role
- Cannot delete system roles

---

### UI Components

#### Role List Table

- **Role Name**
- **Scope Type**
- **# of Users**
- **# of Permissions**
- **Is System Role**
- **Actions** (Edit, Delete if custom)

#### Create/Edit Role Modal

- Role Code (input)
- Role Name (input)
- Description (textarea)
- Scope Type (dropdown: None, Forum, Area, Unit)
- Permissions (multi-select checkboxes grouped by module)

#### Assign Role to User Modal

- Select User (autocomplete)
- Select Role (dropdown)
- If role scoped: Select scope entity (dropdown of forums/areas/units)


## Database Schema (Tables Only - Full Schema Later)

### Roles Table
```sql
CREATE TABLE roles (
  role_id UUID PRIMARY KEY,
  role_code VARCHAR(100) UNIQUE NOT NULL,
  role_name VARCHAR(255) NOT NULL,
  description TEXT,
  scope_type VARCHAR(50) NOT NULL, -- None, Forum, Area, Unit, Agent
  is_active BOOLEAN DEFAULT TRUE,
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(user_id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Permissions Table
```sql
CREATE TABLE permissions (
  permission_id UUID PRIMARY KEY,
  permission_code VARCHAR(100) UNIQUE NOT NULL,
  permission_name VARCHAR(255) NOT NULL,
  description TEXT,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(user_id)
);
```

### Role-Permission Mapping Table
```sql
CREATE TABLE role_permissions (
  role_permission_id UUID PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES roles(role_id),
  permission_id UUID NOT NULL REFERENCES permissions(permission_id),
  conditions JSON, -- For future advanced conditions
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES users(user_id),
  UNIQUE(role_id, permission_id)
);
```

### User-Role Assignment Table
```sql
CREATE TABLE user_roles (
  user_role_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  role_id UUID NOT NULL REFERENCES roles(role_id),
  scope_entity_type VARCHAR(50), -- Forum, Area, Unit, Agent
  scope_entity_id UUID, -- ID of the forum/area/unit/agent
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES users(user_id),
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(user_id)
);
```

### Indexes
```sql
CREATE INDEX idx_roles_code ON roles(role_code);
CREATE INDEX idx_roles_active ON roles(is_active);
CREATE INDEX idx_permissions_code ON permissions(permission_code);
CREATE INDEX idx_permissions_module ON permissions(module);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_scope ON user_roles(scope_entity_type, scope_entity_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);
```

## (WIP) Use Webhooks as Safety Net
 // POST /webhooks/supabase/auth
Skip webhooks for Phase 1, add in Phase 2 


