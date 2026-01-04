import { randomUUID } from 'node:crypto';
import { asyncLocalStorage } from './AsyncLocalStorageManager';
/**
 * Extract user session from request
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
 * Should be registered early in the middleware chain
 */
export function contextMiddleware(req, res, next) {
    const context = {
        requestId: randomUUID(),
        userSession: extractUserSession(req),
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