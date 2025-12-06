import { asyncLocalStorage } from '../context';
import { EventBus } from './EventBus';
import { EventRepository } from './EventRepository';
import { DomainEvent } from './types';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { logger } from '@/shared/utils/logger';

/**
 * Singleton event bus instance with database persistence
 */
class EventBusWithPersistence extends EventBus {
  private eventRepository: EventRepository;

  constructor() {
    super();
    this.eventRepository = new EventRepository(prisma);
  }

  /**
   * Emit an event and persist it to the database
   * Automatically enriches event with userId and ipAddress from request context
   * @param event - The domain event to emit
   */
  async emit<T = any>(event: DomainEvent<T>): Promise<void> {
    try {
        
      // Enrich event with context if not provided
      const enrichedEvent: DomainEvent<T> = {
        ...event,
        userId: event.userId ?? asyncLocalStorage.tryGetUserId(),
        ipAddress: event.ipAddress ?? asyncLocalStorage.getIpAddress(),
        timestamp: event.timestamp ?? new Date(),
      };

      // 1. Persist event to database for audit trail
      await this.eventRepository.save(enrichedEvent);

      // 2. Notify all listeners
      await super.emit(enrichedEvent);
    } catch (error) {
      logger.error('Failed to emit event:', {
        eventType: event.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the event repository for querying historical events
   */
  getRepository(): EventRepository {
    return this.eventRepository;
  }
}

// Singleton instance
export const eventBus = new EventBusWithPersistence();

// Re-export types for convenience
export { DomainEvent, EventHandler, EventListener } from './types';
export { EventRepository } from './EventRepository';
export * from './eventTypes';
export { setupEventListeners } from './setup';
