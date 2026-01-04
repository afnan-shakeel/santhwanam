import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';
import AppError from '@/shared/utils/error-handling/AppError';
/**
 * Middleware factory to require a permission for the current user.
 * - `permissionCode`: the required permission code (e.g., 'user.invite')
 * - `contextExtractor`: optional fn (req) => context object used for scoped role checks
 */
export function requirePermission(permissionCode, contextExtractor) {
    return async function (req, res, next) {
        try {
            const userSession = asyncLocalStorage.tryGetUserSession();
            if (!userSession) {
                return next(new AppError('Authentication required', 401));
            }
            const userId = userSession.userId;
            const context = contextExtractor ? contextExtractor(req) : {};
            // Fetch active userRoles for the user and related rolePermissions and permissions
            const userRoles = await prisma.userRole.findMany({
                where: { userId, isActive: true },
                include: {
                    role: {
                        include: {
                            rolePermissions: { include: { permission: true } }
                        }
                    }
                }
            });
            // Collect permission codes from roles that apply in this context
            const allowed = userRoles.some((ur) => {
                const role = ur.role;
                // If role is global, it applies
                if (role.scopeType === 'None') {
                    return role.rolePermissions.some((rp) => rp.permission.permissionCode === permissionCode);
                }
                // For scoped roles, ensure the userRole scope matches the requested context
                if (role.scopeType === 'Forum' && context.forumId) {
                    if (ur.scopeEntityId !== context.forumId)
                        return false;
                }
                if (role.scopeType === 'Area' && context.areaId) {
                    if (ur.scopeEntityId !== context.areaId)
                        return false;
                }
                if (role.scopeType === 'Unit' && context.unitId) {
                    if (ur.scopeEntityId !== context.unitId)
                        return false;
                }
                if (role.scopeType === 'Agent' && context.agentId) {
                    if (ur.scopeEntityId !== context.agentId)
                        return false;
                }
                // If no matching context provided, scoped role does not apply
                // (This is conservative; callers should provide contextExtractor when needed)
                // if (role.scopeType !== 'None' && !ur.scopeEntityId) return false
                return role.rolePermissions.some((rp) => rp.permission.permissionCode === permissionCode);
            });
            if (!allowed)
                return next(new AppError('Permission denied', 403));
            return next();
        }
        catch (err) {
            return next(err);
        }
    };
}
export default requirePermission;
//# sourceMappingURL=requirePermission.js.map