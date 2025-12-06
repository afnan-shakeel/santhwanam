import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { asyncLocalStorage } from './AsyncLocalStorageManager';
import { RequestContext, UserSession } from './types';

/**
 * Extract user session from request
 * Assumes authentication middleware has set req.user
 */
function extractUserSession(req: Request): UserSession | undefined {
  const user = (req as any).user;
  
  if (!user) {
    return undefined;
  }

  return {
    userId: user.userId || user.id,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
  };
}

/**
 * Extract client IP address from request
 */
function extractIpAddress(req: Request): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress
  );
}

/**
 * Express middleware to initialize AsyncLocalStorage context
 * Should be registered early in the middleware chain
 */
export function contextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const context: RequestContext = {
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
