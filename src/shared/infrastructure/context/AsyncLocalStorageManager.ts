import { AsyncLocalStorage } from 'node:async_hooks';
import { RequestContext, UserSession } from './types';
import { AuthContext, AuthScope, AuthHierarchy } from '@/shared/types/auth.types';

/**
 * AsyncLocalStorage manager for request context
 * Provides access to request-scoped data throughout the application
 */
class AsyncLocalStorageManager {
  private readonly als: AsyncLocalStorage<RequestContext>;

  constructor() {
    this.als = new AsyncLocalStorage<RequestContext>();
  }

  /**
   * Run a function within a new context
   * @param context - The request context to store
   * @param callback - The function to run within this context
   */
  run<T>(context: RequestContext, callback: () => T): T {
    return this.als.run(context, callback);
  }

  /**
   * Get the current request context
   * Returns undefined if called outside of a context
   */
  getContext(): RequestContext | undefined {
    return this.als.getStore();
  }

  /**
   * Set or update properties in the current context
   * @param updates - Partial context to merge with existing
   */
  updateContext(updates: Partial<RequestContext>): void {
    const current = this.getContext();
    if (current) {
      Object.assign(current, updates);
    }
  }

  /**
   * Get the current request context
   * @throws Error if called outside of a request context
   */
  getRequestContext(): RequestContext {
    const context = this.getContext();

    if (!context) {
      throw new Error('No request context available. Ensure contextMiddleware is registered.');
    }

    return context;
  }

  /**
   * Get the current request context (returns undefined if not available)
   * Use this when you want to handle the absence of context gracefully
   */
  tryGetRequestContext(): RequestContext | undefined {
    return this.getContext();
  }

  /**
   * Get the current user session from request context
   * @throws Error if no user session is available (user not authenticated)
   */
  getUserSession(): UserSession {
    const context = this.getRequestContext();
    if (!context.userSession) {
      throw new Error('No user session available. User is not authenticated.');
    }
    return context.userSession;
  }

  /**
   * Get the current user session (returns undefined if not authenticated)
   * Use this when you want to handle unauthenticated requests gracefully
   */
  tryGetUserSession(): UserSession | undefined {
    const context = this.tryGetRequestContext();
    return context?.userSession;
  }

  /**
   * Get the current user ID from session
   * @throws Error if no user session is available
   */
  getUserId(): string {
    return this.getUserSession().userId;
  }

  /**
   * Get the current user ID (returns undefined if not authenticated)
   */
  tryGetUserId(): string | undefined {
    return this.tryGetUserSession()?.userId;
  }

  /**
   * Get the client IP address from request context
   */
  getIpAddress(): string | undefined {
    const context = this.tryGetRequestContext();
    return context?.ipAddress;
  }

  /**
   * Get the request ID for tracking and logging
   */
  getRequestId(): string | undefined {
    const context = this.tryGetRequestContext();
    return context?.requestId;
  }

  /**
   * Update the current context with additional data
   */
  updateRequestContext(updates: Partial<RequestContext>): void {
    this.updateContext(updates);
  }

  // =====================
  // AuthContext Methods
  // =====================

  /**
   * Get the full authentication context
   * @throws Error if no auth context is available (user not authenticated)
   */
  getAuthContext(): AuthContext {
    const context = this.getRequestContext();
    if (!context.authContext) {
      throw new Error('No auth context available. User is not authenticated.');
    }
    return context.authContext;
  }

  /**
   * Get the auth context (returns undefined if not authenticated)
   */
  tryGetAuthContext(): AuthContext | undefined {
    const context = this.tryGetRequestContext();
    return context?.authContext;
  }

  /**
   * Get all permissions for the current user
   * @throws Error if not authenticated
   */
  getPermissions(): string[] {
    return this.getAuthContext().permissions;
  }

  /**
   * Check if current user has a specific permission
   */
  hasPermission(permission: string): boolean {
    const authContext = this.tryGetAuthContext();
    if (!authContext) return false;
    return authContext.permissions.includes(permission);
  }

  /**
   * Check if current user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const authContext = this.tryGetAuthContext();
    if (!authContext) return false;
    return permissions.some((p) => authContext.permissions.includes(p));
  }

  /**
   * Check if current user has all of the specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    const authContext = this.tryGetAuthContext();
    if (!authContext) return false;
    return permissions.every((p) => authContext.permissions.includes(p));
  }

  /**
   * Get the user's primary scope
   * @throws Error if not authenticated
   */
  getScope(): AuthScope {
    return this.getAuthContext().scope;
  }

  /**
   * Get the user's scope (returns undefined if not authenticated)
   */
  tryGetScope(): AuthScope | undefined {
    return this.tryGetAuthContext()?.scope;
  }

  /**
   * Get the user's hierarchy
   * @throws Error if not authenticated
   */
  getHierarchy(): AuthHierarchy {
    return this.getAuthContext().hierarchy;
  }

  /**
   * Get the user's hierarchy (returns undefined if not authenticated)
   */
  tryGetHierarchy(): AuthHierarchy | undefined {
    return this.tryGetAuthContext()?.hierarchy;
  }

  /**
   * Check if current user has a specific role
   */
  hasRole(roleCode: string): boolean {
    const authContext = this.tryGetAuthContext();
    if (!authContext) return false;
    return authContext.roles.some((r) => r.roleCode === roleCode);
  }
}

// Singleton instance
export const asyncLocalStorage = new AsyncLocalStorageManager();
