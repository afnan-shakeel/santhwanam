import { EventEmitter } from 'events';
import { logger } from '@/shared/utils/logger';
class EventBus {
    emitter;
    handlers;
    constructor() {
        this.emitter = new EventEmitter();
        this.handlers = new Map();
        this.emitter.setMaxListeners(100);
    }
    subscribe(eventType, handler) {
        const existing = this.handlers.get(eventType) || [];
        this.handlers.set(eventType, [...existing, handler]);
        this.emitter.on(eventType, async (event) => {
            try {
                logger.info(`Handling event: ${eventType}`, {
                    eventId: event.eventId,
                    handler: handler.constructor.name
                });
                await handler.handle(event);
                logger.info(`Event handled successfully: ${eventType}`, {
                    eventId: event.eventId,
                    handler: handler.constructor.name
                });
            }
            catch (error) {
                logger.error(`Event handler failed for ${eventType}`, {
                    eventId: event.eventId,
                    handler: handler.constructor.name,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                // Don't rethrow - other handlers should continue
            }
        });
        logger.info(`Subscribed handler for event: ${eventType}`, {
            handler: handler.constructor.name
        });
    }
    async publish(event) {
        logger.info(`Publishing event: ${event.eventType}`, {
            eventId: event.eventId,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType
        });
        // Emit synchronously (handlers run in background)
        this.emitter.emit(event.eventType, event);
    }
    getHandlerCount(eventType) {
        return this.handlers.get(eventType)?.length || 0;
    }
}
export const eventBus = new EventBus();
//# sourceMappingURL=event-bus.js.map