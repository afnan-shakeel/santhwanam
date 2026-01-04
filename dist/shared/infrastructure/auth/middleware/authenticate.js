import AppError from '@/shared/utils/error-handling/AppError';
import { verifyAccessToken } from '../jwtService';
/**
 * Simple path matcher supporting trailing '*' wildcard.
 * Example: '/api/public/*' matches '/api/public/foo'
 */
function pathMatches(pattern, path) {
    if (pattern.endsWith('*')) {
        const base = pattern.slice(0, -1);
        return path.startsWith(base);
    }
    return path === pattern;
}
/**
 * Dummy authentication middleware.
 * Currently does not perform any real authentication. It provides a skip-list
 * mechanism for public endpoints. When auth is implemented, replace the body
 * with real logic that sets `req.user`.
 */
export function createAuthMiddleware(options) {
    const skipPaths = options?.skipPaths || ['/health', '/api/docs', '/api/openapi.json',
        '/reset-password', '/reset-password/confirm', '/api/auth/reset-password', '/api/auth/reset-password/request', '/api/auth/login'
    ];
    const skipMethods = (options?.skipMethods || []).map((m) => m.toUpperCase());
    return function authenticate(req, res, next) {
        const path = req.path;
        const method = req.method.toUpperCase();
        // If skipMethods provided and method not listed, don't skip
        const methodAllowedToSkip = skipMethods.length === 0 || skipMethods.includes(method);
        const shouldSkip = methodAllowedToSkip && skipPaths.some((p) => pathMatches(p, path));
        if (shouldSkip) {
            // Explicitly do not set req.user for skipped routes
            return next();
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Missing auth or invalid token', 401);
        }
        const token = authHeader.substring(7);
        const result = verifyAccessToken(token);
        if (!result.valid) {
            throw new AppError('Unauthorized', 401);
        }
        const payload = result.payload;
        // Attach a normalized user object expected by context middleware
        req.user = {
            userId: payload.sub || payload.userId || payload.id,
            email: payload.email,
            roles: payload.roles || [],
        };
        return next();
    };
}
// Default middleware instance
export const authenticate = createAuthMiddleware();
//# sourceMappingURL=authenticate.js.map