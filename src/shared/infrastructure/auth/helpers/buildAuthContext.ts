/**
 * Helper to build AuthContext from authenticated user
 * Queries database for roles, permissions, and hierarchy
 */
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import {
  AuthContext,
  AuthUser,
  AuthScope,
  AuthHierarchy,
  RoleAssignment,
  ScopeType,
  SCOPE_PRIORITY,
} from '@/shared/types/auth.types';

interface UserWithRelations {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  agents: Array<{
    agentId: string;
    unitId: string;
    areaId: string;
    forumId: string;
  }>;
  members: Array<{
    memberId: string;
    agentId: string;
    unitId: string;
    areaId: string;
    forumId: string;
  }>;
  userRoles: Array<{
    userRoleId: string;
    roleId: string;
    scopeEntityType: string | null;
    scopeEntityId: string | null;
    isActive: boolean;
    role: {
      roleCode: string;
      roleName: string;
      scopeType: string;
      rolePermissions: Array<{
        permission: {
          permissionCode: string;
          isActive: boolean;
        };
      }>;
    };
  }>;
}

/**
 * Build full AuthContext for an authenticated user
 * @param userId - The user's ID from JWT token
 * @returns AuthContext or null if user not found
 */
export async function buildAuthContext(userId: string): Promise<AuthContext | null> {
  // Fetch user with all related data in a single query
  const user = await prisma.user.findUnique({
    where: { userId },
    select: {
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      agents: {
        where: { agentStatus: 'Active' },
        select: {
          agentId: true,
          unitId: true,
          areaId: true,
          forumId: true,
        },
        take: 1, // User can be linked to one agent
      },
      members: {
        where: { memberStatus: 'Active' },
        select: {
          memberId: true,
          agentId: true,
          unitId: true,
          areaId: true,
          forumId: true,
        },
        take: 1, // User can be linked to one member
      },
      userRoles: {
        where: { isActive: true },
        select: {
          userRoleId: true,
          roleId: true,
          scopeEntityType: true,
          scopeEntityId: true,
          isActive: true,
          role: {
            select: {
              roleCode: true,
              roleName: true,
              scopeType: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      permissionCode: true,
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Build AuthUser
  const authUser: AuthUser = {
    userId: user.userId,
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
  };

  // Build permissions array (unique, active permissions from all roles)
  const permissionsSet = new Set<string>();
  for (const userRole of user.userRoles) {
    for (const rp of userRole.role.rolePermissions) {
      if (rp.permission.isActive) {
        permissionsSet.add(rp.permission.permissionCode);
      }
    }
  }
  const permissions = Array.from(permissionsSet);

  // Build role assignments with scope entity names
  const roles = await buildRoleAssignments(user.userRoles);

  // Determine primary scope based on role priority
  const scope = determinePrimaryScope(user.userRoles);

  // Build hierarchy from user's agent/member relations or role scopes
  const hierarchy = await buildHierarchy(user);

  return {
    user: authUser,
    permissions,
    scope,
    hierarchy,
    roles,
  };
}

/**
 * Determine the primary scope based on role hierarchy
 * Lower priority number = higher access level
 */
function determinePrimaryScope(
  userRoles: UserWithRelations['userRoles']
): AuthScope {
  let primaryScope: AuthScope = { type: 'Member', entityId: null };
  let highestPriority = 999;

  for (const ur of userRoles) {
    const scopeType = ur.role.scopeType as ScopeType;
    const priority = SCOPE_PRIORITY[scopeType] ?? 999;

    if (priority < highestPriority) {
      highestPriority = priority;
      primaryScope = {
        type: scopeType,
        entityId: ur.scopeEntityId,
      };
    }
  }

  return primaryScope;
}

/**
 * Build hierarchy based on user's agent, member relations, or role scope assignments
 */
async function buildHierarchy(user: UserWithRelations): Promise<AuthHierarchy> {
  const hierarchy: AuthHierarchy = {
    forumId: null,
    areaId: null,
    unitId: null,
    agentId: null,
    memberId: null,
  };

  // If user is an agent, use agent's hierarchy
  if (user.agents.length > 0) {
    const agent = user.agents[0];
    hierarchy.agentId = agent.agentId;
    hierarchy.unitId = agent.unitId;
    hierarchy.areaId = agent.areaId;
    hierarchy.forumId = agent.forumId;
  }

  // If user is a member, use member's hierarchy (may override/supplement agent data)
  if (user.members.length > 0) {
    const member = user.members[0];
    hierarchy.memberId = member.memberId;
    // Only set these if not already set from agent
    if (!hierarchy.agentId) hierarchy.agentId = member.agentId;
    if (!hierarchy.unitId) hierarchy.unitId = member.unitId;
    if (!hierarchy.areaId) hierarchy.areaId = member.areaId;
    if (!hierarchy.forumId) hierarchy.forumId = member.forumId;
  }

  // If hierarchy is still empty, try to derive from user's role scope assignments
  // This handles admin users who are not agents/members but have Forum/Area/Unit admin roles
  if (!hierarchy.forumId && !hierarchy.areaId && !hierarchy.unitId && !hierarchy.agentId) {
    await populateHierarchyFromRoles(user.userRoles, hierarchy);
  }

  return hierarchy;
}

/**
 * Populate hierarchy from user's role scope assignments
 * Uses the highest priority (most specific) scope that has an entity assigned
 */
async function populateHierarchyFromRoles(
  userRoles: UserWithRelations['userRoles'],
  hierarchy: AuthHierarchy
): Promise<void> {
  // Sort roles by priority (higher priority = more specific scope)
  // We want to use the most specific scope available
  const sortedRoles = [...userRoles].sort((a, b) => {
    const priorityA = SCOPE_PRIORITY[a.role.scopeType as ScopeType] ?? 999;
    const priorityB = SCOPE_PRIORITY[b.role.scopeType as ScopeType] ?? 999;
    return priorityB - priorityA; // Higher priority number = more specific
  });

  for (const role of sortedRoles) {
    if (!role.scopeEntityId || !role.scopeEntityType) continue;

    const scopeType = role.scopeEntityType as ScopeType;

    switch (scopeType) {
      case 'Forum': {
        if (!hierarchy.forumId) {
          hierarchy.forumId = role.scopeEntityId;
        }
        break;
      }
      case 'Area': {
        if (!hierarchy.areaId) {
          hierarchy.areaId = role.scopeEntityId;
          // Also fetch parent forum
          if (!hierarchy.forumId) {
            const area = await prisma.area.findUnique({
              where: { areaId: role.scopeEntityId },
              select: { forumId: true },
            });
            if (area) hierarchy.forumId = area.forumId;
          }
        }
        break;
      }
      case 'Unit': {
        if (!hierarchy.unitId) {
          hierarchy.unitId = role.scopeEntityId;
          // Also fetch parent area and forum
          if (!hierarchy.areaId || !hierarchy.forumId) {
            const unit = await prisma.unit.findUnique({
              where: { unitId: role.scopeEntityId },
              select: { areaId: true, forumId: true },
            });
            if (unit) {
              if (!hierarchy.areaId) hierarchy.areaId = unit.areaId;
              if (!hierarchy.forumId) hierarchy.forumId = unit.forumId;
            }
          }
        }
        break;
      }
      case 'Agent': {
        if (!hierarchy.agentId) {
          hierarchy.agentId = role.scopeEntityId;
          // Also fetch parent unit, area, forum
          const agent = await prisma.agent.findUnique({
            where: { agentId: role.scopeEntityId },
            select: { unitId: true, areaId: true, forumId: true },
          });
          if (agent) {
            if (!hierarchy.unitId) hierarchy.unitId = agent.unitId;
            if (!hierarchy.areaId) hierarchy.areaId = agent.areaId;
            if (!hierarchy.forumId) hierarchy.forumId = agent.forumId;
          }
        }
        break;
      }
      case 'Member': {
        if (!hierarchy.memberId) {
          hierarchy.memberId = role.scopeEntityId;
          // Also fetch parent agent, unit, area, forum
          const member = await prisma.member.findUnique({
            where: { memberId: role.scopeEntityId },
            select: { agentId: true, unitId: true, areaId: true, forumId: true },
          });
          if (member) {
            if (!hierarchy.agentId) hierarchy.agentId = member.agentId;
            if (!hierarchy.unitId) hierarchy.unitId = member.unitId;
            if (!hierarchy.areaId) hierarchy.areaId = member.areaId;
            if (!hierarchy.forumId) hierarchy.forumId = member.forumId;
          }
        }
        break;
      }
      // 'None' scope type doesn't have entity IDs, skip
    }
  }
}

/**
 * Build role assignments with scope entity names resolved
 */
async function buildRoleAssignments(
  userRoles: UserWithRelations['userRoles']
): Promise<RoleAssignment[]> {
  const roles: RoleAssignment[] = [];

  for (const ur of userRoles) {
    const scopeType = ur.role.scopeType as ScopeType;
    let scopeEntityName: string | null = null;

    // Resolve entity name based on scope type
    if (ur.scopeEntityId) {
      scopeEntityName = await resolveScopeEntityName(scopeType, ur.scopeEntityId);
    }

    roles.push({
      roleCode: ur.role.roleCode,
      roleName: ur.role.roleName,
      scopeType,
      scopeEntityId: ur.scopeEntityId,
      scopeEntityName,
    });
  }

  return roles;
}

/**
 * Resolve scope entity name from database
 */
async function resolveScopeEntityName(
  scopeType: ScopeType,
  entityId: string
): Promise<string | null> {
  try {
    switch (scopeType) {
      case 'Forum': {
        const forum = await prisma.forum.findUnique({
          where: { forumId: entityId },
          select: { forumName: true },
        });
        return forum?.forumName || null;
      }
      case 'Area': {
        const area = await prisma.area.findUnique({
          where: { areaId: entityId },
          select: { areaName: true },
        });
        return area?.areaName || null;
      }
      case 'Unit': {
        const unit = await prisma.unit.findUnique({
          where: { unitId: entityId },
          select: { unitName: true },
        });
        return unit?.unitName || null;
      }
      case 'Agent': {
        const agent = await prisma.agent.findUnique({
          where: { agentId: entityId },
          select: { firstName: true, lastName: true },
        });
        return agent ? `${agent.firstName} ${agent.lastName}`.trim() : null;
      }
      case 'Member': {
        const member = await prisma.member.findUnique({
          where: { memberId: entityId },
          select: { firstName: true, lastName: true },
        });
        return member ? `${member.firstName} ${member.lastName}`.trim() : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Helper to check if user has a specific permission
 */
export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}

/**
 * Helper to check if user has any of the specified permissions
 */
export function hasAnyPermission(permissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some((p) => permissions.includes(p));
}

/**
 * Helper to check if user has all of the specified permissions
 */
export function hasAllPermissions(permissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every((p) => permissions.includes(p));
}
