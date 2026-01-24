import { AuthContext } from '@/shared/types/auth.types';

/**
 * User session information extracted from authentication
 * @deprecated Use AuthContext for full access management. This is kept for backward compatibility.
 */
export interface UserSession {
  userId: string;
  authUserId?: string;
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
  
  /** User session if authenticated (legacy, prefer authContext) */
  userSession?: UserSession;

  /** Full authentication context with permissions, scope, and hierarchy */
  authContext?: AuthContext;
  
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
