import { AsyncLocalStorage } from 'node:async_hooks';
import { RequestContext, UserSession } from './types';

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
}

// Singleton instance
export const asyncLocalStorage = new AsyncLocalStorageManager();
