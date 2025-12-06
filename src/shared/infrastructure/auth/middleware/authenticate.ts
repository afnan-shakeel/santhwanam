import { Request, Response, NextFunction } from 'express';

/**
 * Simple path matcher supporting trailing '*' wildcard.
 * Example: '/api/public/*' matches '/api/public/foo'
 */
function pathMatches(pattern: string, path: string): boolean {
  if (pattern.endsWith('*')) {
    const base = pattern.slice(0, -1);
    return path.startsWith(base);
  }
  return path === pattern;
}

export interface AuthOptions {
  // List of paths to skip authentication. Supports trailing '*' wildcard.
  skipPaths?: string[];
  // Optional list of methods to apply for skipPaths. If omitted, all methods are skipped.
  skipMethods?: string[];
}

/**
 * Dummy authentication middleware.
 * Currently does not perform any real authentication. It provides a skip-list
 * mechanism for public endpoints. When auth is implemented, replace the body
 * with real logic that sets `req.user`.
 */
export function createAuthMiddleware(options?: AuthOptions) {
  const skipPaths = options?.skipPaths || ['/health', '/api/docs', '/api/openapi.json',
    '/reset-password-x', '/reset-password-x/confirm'
  ];
  const skipMethods = (options?.skipMethods || []).map((m) => m.toUpperCase());

  return function authenticate(req: Request, res: Response, next: NextFunction): void {
    const path = req.path;
    const method = req.method.toUpperCase();

    // If skipMethods provided and method not listed, don't skip
    const methodAllowedToSkip = skipMethods.length === 0 || skipMethods.includes(method);

    const shouldSkip = methodAllowedToSkip && skipPaths.some((p) => pathMatches(p, path));

    if (shouldSkip) {
      // Explicitly do not set req.user for skipped routes
      return next();
    }

    // No auth implemented yet — leave req.user undefined.
    // When real auth is added, set `(req as any).user = { ... }` here.
    return next();
  };
}

// Default middleware instance
export const authenticate = createAuthMiddleware();
