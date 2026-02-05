import { randomUUID } from 'node:crypto';
import { asyncLocalStorage } from './AsyncLocalStorageManager';
import { buildAuthContext } from '@/shared/infrastructure/auth/helpers/buildAuthContext';
/**
 * Extract user session from request (legacy, for backward compatibility)
 * Assumes authentication middleware has set req.user
 */
function extractUserSession(req) {
    const user = req.user;
    if (!user) {
        return undefined;
    }
    return {
        userId: user.userId || user.id,
        authUserId: user.authUserId,
        email: user.email,
        roles: user.roles,
    };
}
/**
 * Extract client IP address from request
 */
function extractIpAddress(req) {
    return (req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.socket.remoteAddress);
}
/**
 * Express middleware to initialize AsyncLocalStorage context
 * Should be registered after authentication middleware
 * Builds full AuthContext for authenticated users
 */
export async function contextMiddleware(req, res, next) {
    const userSession = extractUserSession(req);
    let authContext;
    // If user is authenticated, build full AuthContext
    if (userSession?.userId) {
        try {
            const ctx = await buildAuthContext(userSession.userId);
            if (ctx) {
                authContext = ctx;
            }
        }
        catch (error) {
            // Log error but don't fail the request - continue without auth context
            console.error('Failed to build auth context:', error);
        }
    }
    const context = {
        requestId: randomUUID(),
        userSession,
        authContext,
        ipAddress: extractIpAddress(req),
        method: req.method,
        path: req.path,
        timestamp: new Date(),
    };
    // Run the rest of the request handling within this context
    asyncLocalStorage.run(context, () => {
        next();
    });
}
//# sourceMappingURL=middleware.js.map