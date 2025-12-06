import { PrismaClient } from '@/generated/prisma/client';
import { DomainEvent } from './types';

/**
 * Repository for persisting domain events to the database
 * Provides audit trail for all events in the system
 */
export class EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Save a domain event to the database for audit trail
   * @param event - The domain event to persist
   */
  async save<T = any>(event: DomainEvent<T>): Promise<void> {
    await this.prisma.event.create({
      data: {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        eventData: event.eventData as any,
        userId: event.userId,
        ipAddress: event.ipAddress,
        timestamp: event.timestamp || new Date(),
      },
    });
  }

  /**
   * Find events by event type
   * @param eventType - The type of events to retrieve
   */
  async findByType(eventType: string): Promise<DomainEvent[]> {
    const events = await this.prisma.event.findMany({
      where: { eventType },
      orderBy: { timestamp: 'desc' },
    });

    return events.map(this.toDomainEvent);
  }

  /**
   * Find events by aggregate ID
   * @param aggregateId - The aggregate ID to filter by
   */
  async findByAggregateId(aggregateId: string): Promise<DomainEvent[]> {
    const events = await this.prisma.event.findMany({
      where: { aggregateId },
      orderBy: { timestamp: 'asc' },
    });

    return events.map(this.toDomainEvent);
  }

  /**
   * Find events within a time range
   * @param from - Start timestamp
   * @param to - End timestamp
   */
  async findByTimeRange(from: Date, to: Date): Promise<DomainEvent[]> {
    const events = await this.prisma.event.findMany({
      where: {
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    return events.map(this.toDomainEvent);
  }

  /**
   * Map database event to domain event
   */
  private toDomainEvent(event: any): DomainEvent {
    return {
      eventType: event.eventType,
      aggregateId: event.aggregateId || undefined,
      eventData: event.eventData,
      userId: event.userId || undefined,
      ipAddress: event.ipAddress || undefined,
      timestamp: event.timestamp,
    };
  }
}
