/**
 * User session information extracted from authentication
 */
export interface UserSession {
  userId: string;
  email: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Request context available throughout the request lifecycle
 * Stored in AsyncLocalStorage
 */
export interface RequestContext {
  /** Unique identifier for this request */
  requestId: string;
  
  /** User session if authenticated */
  userSession?: UserSession;
  
  /** Client IP address */
  ipAddress?: string;
  
  /** HTTP method */
  method: string;
  
  /** Request path */
  path: string;
  
  /** Request timestamp */
  timestamp: Date;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}
