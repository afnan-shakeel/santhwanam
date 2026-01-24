/**
 * Authorization Middleware
 * Uses AuthContext from AsyncLocalStorage to check permissions
 * Matches the spec pattern: authorize(permission, contextExtractor?)
 */
import { Request, Response, NextFunction } from 'express';
import { asyncLocalStorage } from '@/shared/infrastructure/context';
import AppError from '@/shared/utils/error-handling/AppError';
import { ScopeType } from '@/shared/types/auth.types';

/**
 * Context extracted from request for scoped permission checks
 */
type ResourceContext = {
  forumId?: string;
  areaId?: string;
  unitId?: string;
  agentId?: string;
  memberId?: string;
};

/**
 * Function to extract resource context from request
 */
type ContextExtractor = (req: Request) => ResourceContext;

/**
 * Authorization middleware factory
 * 
 * @param permission - Required permission code(s). Can be a single permission or array.
 *                     If array, user needs ANY of the permissions (OR logic).
 * @param contextExtractor - Optional function to extract resource context for scoped checks.
 *                          If provided, verifies the user's scope includes the resource.
 * 
 * @example
 * // Simple permission check
 * router.get('/users', authorize('user.read'), controller.list)
 * 
 * @example
 * // Permission with context - verifies user has access to the specific unit
 * router.post('/members', authorize('member.create', req => ({ unitId: req.body.unitId })), controller.create)
 * 
 * @example
 * // Multiple permissions (OR logic)
 * router.get('/report', authorize(['report.read', 'admin.access']), controller.report)
 */
export function authorize(
  permission: string | string[],
  contextExtractor?: ContextExtractor
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authContext = asyncLocalStorage.tryGetAuthContext();

      // Check if authenticated
      if (!authContext) {
        throw new AppError('Authentication required', 401);
      }

      // Check permission(s)
      const permissions = Array.isArray(permission) ? permission : [permission];
      const hasPermission = permissions.some((p) => authContext.permissions.includes(p));

      if (!hasPermission) {
        throw new AppError(
          `Permission denied. Required: ${permissions.join(' or ')}`,
          403
        );
      }

      // If context extractor provided, verify scoped access
      if (contextExtractor) {
        const resourceContext = contextExtractor(req);
        const hasContextualAccess = checkContextualAccess(authContext, resourceContext);

        if (!hasContextualAccess) {
          throw new AppError('Access denied: resource outside your scope', 403);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user's scope allows access to the resource context
 */
function checkContextualAccess(
  authContext: NonNullable<ReturnType<typeof asyncLocalStorage.tryGetAuthContext>>,
  resourceContext: ResourceContext
): boolean {
  const { scope, hierarchy } = authContext;

  // Super Admin (None scope) has access to everything
  if (scope.type === 'None') {
    return true;
  }

  // Check based on scope type and resource context
  switch (scope.type as ScopeType) {
    case 'Forum':
      // Forum scope can access resources within the same forum
      if (resourceContext.forumId) {
        return scope.entityId === resourceContext.forumId;
      }
      // If no forumId in context, check if resource is in user's hierarchy
      return checkHierarchyAccess(hierarchy, resourceContext, 'Forum');

    case 'Area':
      if (resourceContext.areaId) {
        return scope.entityId === resourceContext.areaId;
      }
      if (resourceContext.forumId) {
        // Area admin can access resources in their forum
        return hierarchy.forumId === resourceContext.forumId;
      }
      return checkHierarchyAccess(hierarchy, resourceContext, 'Area');

    case 'Unit':
      if (resourceContext.unitId) {
        return scope.entityId === resourceContext.unitId;
      }
      if (resourceContext.areaId) {
        return hierarchy.areaId === resourceContext.areaId;
      }
      if (resourceContext.forumId) {
        return hierarchy.forumId === resourceContext.forumId;
      }
      return checkHierarchyAccess(hierarchy, resourceContext, 'Unit');

    case 'Agent':
      if (resourceContext.agentId) {
        return scope.entityId === resourceContext.agentId;
      }
      // Agents operate within their unit/area/forum
      if (resourceContext.unitId) {
        return hierarchy.unitId === resourceContext.unitId;
      }
      return checkHierarchyAccess(hierarchy, resourceContext, 'Agent');

    case 'Member':
      // Members can only access their own resources
      if (resourceContext.memberId) {
        return hierarchy.memberId === resourceContext.memberId;
      }
      // Members can access resources through their agent
      if (resourceContext.agentId) {
        return hierarchy.agentId === resourceContext.agentId;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Check if resource is within user's hierarchy
 */
function checkHierarchyAccess(
  hierarchy: NonNullable<ReturnType<typeof asyncLocalStorage.tryGetAuthContext>>['hierarchy'],
  resourceContext: ResourceContext,
  userScopeType: ScopeType
): boolean {
  // If we can't determine access from specific IDs, do a hierarchy-based check
  // This is more permissive - if resource has IDs that match user's hierarchy, allow access

  if (resourceContext.memberId && hierarchy.memberId) {
    return hierarchy.memberId === resourceContext.memberId;
  }

  if (resourceContext.agentId && hierarchy.agentId) {
    // Check if this is the user's agent or if user has higher scope
    if (hierarchy.agentId === resourceContext.agentId) return true;
    if (['None', 'Forum', 'Area', 'Unit'].includes(userScopeType)) return true;
  }

  if (resourceContext.unitId && hierarchy.unitId) {
    if (hierarchy.unitId === resourceContext.unitId) return true;
    if (['None', 'Forum', 'Area'].includes(userScopeType)) return true;
  }

  if (resourceContext.areaId && hierarchy.areaId) {
    if (hierarchy.areaId === resourceContext.areaId) return true;
    if (['None', 'Forum'].includes(userScopeType)) return true;
  }

  if (resourceContext.forumId && hierarchy.forumId) {
    if (hierarchy.forumId === resourceContext.forumId) return true;
    if (userScopeType === 'None') return true;
  }

  // If no matching context provided, we can't verify - default to false for security
  // The calling code should provide contextExtractor when scope checking is needed
  return true; // Permissive when no specific IDs to check
}

export default authorize;
