import { AsyncLocalStorage } from 'node:async_hooks';
/**
 * AsyncLocalStorage manager for request context
 * Provides access to request-scoped data throughout the application
 */
class AsyncLocalStorageManager {
    als;
    constructor() {
        this.als = new AsyncLocalStorage();
    }
    /**
     * Run a function within a new context
     * @param context - The request context to store
     * @param callback - The function to run within this context
     */
    run(context, callback) {
        return this.als.run(context, callback);
    }
    /**
     * Get the current request context
     * Returns undefined if called outside of a context
     */
    getContext() {
        return this.als.getStore();
    }
    /**
     * Set or update properties in the current context
     * @param updates - Partial context to merge with existing
     */
    updateContext(updates) {
        const current = this.getContext();
        if (current) {
            Object.assign(current, updates);
        }
    }
    /**
     * Get the current request context
     * @throws Error if called outside of a request context
     */
    getRequestContext() {
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
    tryGetRequestContext() {
        return this.getContext();
    }
    /**
     * Get the current user session from request context
     * @throws Error if no user session is available (user not authenticated)
     */
    getUserSession() {
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
    tryGetUserSession() {
        const context = this.tryGetRequestContext();
        return context?.userSession;
    }
    /**
     * Get the current user ID from session
     * @throws Error if no user session is available
     */
    getUserId() {
        return this.getUserSession().userId;
    }
    /**
     * Get the current user ID (returns undefined if not authenticated)
     */
    tryGetUserId() {
        return this.tryGetUserSession()?.userId;
    }
    /**
     * Get the client IP address from request context
     */
    getIpAddress() {
        const context = this.tryGetRequestContext();
        return context?.ipAddress;
    }
    /**
     * Get the request ID for tracking and logging
     */
    getRequestId() {
        const context = this.tryGetRequestContext();
        return context?.requestId;
    }
    /**
     * Update the current context with additional data
     */
    updateRequestContext(updates) {
        this.updateContext(updates);
    }
}
// Singleton instance
export const asyncLocalStorage = new AsyncLocalStorageManager();
//# sourceMappingURL=AsyncLocalStorageManager.js.map