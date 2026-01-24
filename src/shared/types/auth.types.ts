/**
 * Shared Auth Types for Access Management
 * These interfaces are used across authentication, authorization, and API responses.
 */

/**
 * Scope types representing organizational hierarchy levels
 */
export type ScopeType = 'None' | 'Forum' | 'Area' | 'Unit' | 'Agent' | 'Member';

/**
 * User's primary access scope
 */
export interface AuthScope {
  type: ScopeType;
  entityId: string | null;
}

/**
 * User's position in the organizational hierarchy
 */
export interface AuthHierarchy {
  forumId: string | null;
  areaId: string | null;
  unitId: string | null;
  agentId: string | null;
  memberId: string | null;
}

/**
 * Basic user information for auth context
 */
export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Role assignment with scope details
 */
export interface RoleAssignment {
  roleCode: string;
  roleName: string;
  scopeType: ScopeType;
  scopeEntityId: string | null;
  scopeEntityName: string | null;
}

/**
 * Complete authentication context
 * Returned by GET /api/auth/me and stored in request context
 */
export interface AuthContext {
  user: AuthUser;
  permissions: string[];
  scope: AuthScope;
  hierarchy: AuthHierarchy;
  roles: RoleAssignment[];
}

/**
 * Result of an access check operation
 */
export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Scope priority for determining primary scope
 * Lower number = higher priority (more access)
 */
export const SCOPE_PRIORITY: Record<ScopeType, number> = {
  None: 0,
  Forum: 1,
  Area: 2,
  Unit: 3,
  Agent: 4,
  Member: 5,
};
