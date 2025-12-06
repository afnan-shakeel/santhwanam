/**
 * Base interface for all domain events
 */
export interface DomainEvent<T = any> {
  eventType: string;
  aggregateId?: string;
  eventData: T;
  userId?: string;
  ipAddress?: string;
  timestamp?: Date;
}

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void>;

/**
 * Event listener registration
 */
export interface EventListener {
  eventType: string;
  handler: EventHandler;
}
