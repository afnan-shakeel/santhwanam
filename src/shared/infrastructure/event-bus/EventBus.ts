import { DomainEvent, EventHandler } from './types';
import { logger } from '@/shared/utils/logger';

/**
 * In-memory event bus for domain events
 * Provides event emission and listener registration with error isolation
 */
export class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();

  /**
   * Register an event handler for a specific event type
   * @param eventType - The type of event to listen for
   * @param handler - The handler function to execute
   */
  on(eventType: string, handler: EventHandler): void {
    const handlers = this.listeners.get(eventType) || [];
    handlers.push(handler);
    this.listeners.set(eventType, handlers);

    logger.info(`Event listener registered for: ${eventType}`);
  }

  /**
   * Emit an event to all registered listeners
   * Handlers are executed sequentially, errors are isolated
   * @param event - The domain event to emit
   */
  async emit<T = any>(event: DomainEvent<T>): Promise<void> {
    const { eventType } = event;
    const handlers = this.listeners.get(eventType) || [];

    if (handlers.length === 0) {
      logger.debug(`No listeners registered for event: ${eventType}`);
      return;
    }

    logger.info(`Emitting event: ${eventType}`, {
      aggregateId: event.aggregateId,
      handlerCount: handlers.length,
    });

    // Execute all handlers sequentially
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        // Isolate errors - one handler failing shouldn't break others
        logger.error(`Error in event handler for ${eventType}:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          aggregateId: event.aggregateId,
        });
      }
    }
  }

  /**
   * Remove all listeners for a specific event type
   * Useful for testing and cleanup
   * @param eventType - The event type to clear listeners for
   */
  clearListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      logger.debug(`Cleared listeners for: ${eventType}`);
    } else {
      this.listeners.clear();
      logger.debug('Cleared all event listeners');
    }
  }

  /**
   * Get the count of registered listeners for an event type
   * @param eventType - The event type to check
   */
  getListenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.length || 0;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }
}
