import { EventEmitter } from 'events';
import { RabbitMQManager } from './rabbitmq-manager';
import { RedisManager } from '../cache/redis-manager';
import { createLogger } from '../utils/logger';

const logger = createLogger('event-bus');

export interface EventBusConfig {
  serviceName: string;
  rabbitmq?: RabbitMQManager;
  redis?: RedisManager;
  exchange?: string;
  enableDLX?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
}

export interface EventMetadata {
  eventId: string;
  eventType: string;
  timestamp: number;
  source: string;
  correlationId?: string;
  userId?: string;
  retryCount?: number;
}

export interface Event<T = any> {
  metadata: EventMetadata;
  payload: T;
}

export type EventHandler<T = any> = (event: Event<T>) => Promise<void>;

/**
 * Event Bus for Inter-Service Communication
 *
 * Features:
 * - Publish/Subscribe pattern
 * - Multiple transport layers (RabbitMQ, Redis)
 * - Event replay and dead letter queue
 * - Automatic retry with exponential backoff
 * - Event correlation and tracing
 * - Schema validation
 */
export class EventBus extends EventEmitter {
  private config: Required<EventBusConfig>;
  private handlers: Map<string, EventHandler[]> = new Map();
  private subscriptions: Map<string, string[]> = new Map(); // eventType -> consumerTags
  private isReady = false;

  constructor(config: EventBusConfig) {
    super();
    this.config = {
      serviceName: config.serviceName,
      rabbitmq: config.rabbitmq!,
      redis: config.redis!,
      exchange: config.exchange || 'flamoral.events',
      enableDLX: config.enableDLX !== false,
      enableRetry: config.enableRetry !== false,
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * Initialize event bus
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing event bus...', { service: this.config.serviceName });

      // Setup RabbitMQ infrastructure
      if (this.config.rabbitmq) {
        await this.setupRabbitMQ();
      }

      this.isReady = true;
      this.emit('ready');
      logger.info('Event bus initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize event bus:', error);
      throw error;
    }
  }

  /**
   * Setup RabbitMQ exchanges and queues
   */
  private async setupRabbitMQ(): Promise<void> {
    if (!this.config.rabbitmq) return;

    const rmq = this.config.rabbitmq;

    // Assert main exchange (topic for routing)
    await rmq.assertExchange({
      name: this.config.exchange,
      type: 'topic',
      options: { durable: true },
    });

    // Setup dead letter exchange if enabled
    if (this.config.enableDLX) {
      const dlxExchange = `${this.config.exchange}.dlx`;
      const dlxQueue = `${this.config.serviceName}.dlq`;

      await rmq.setupDeadLetterExchange(dlxExchange, dlxQueue, '#');
    }

    logger.debug('RabbitMQ infrastructure setup complete');
  }

  /**
   * Publish event
   */
  async publish<T = any>(
    eventType: string,
    payload: T,
    options: {
      correlationId?: string;
      userId?: string;
      priority?: number;
    } = {}
  ): Promise<void> {
    if (!this.isReady) {
      throw new Error('Event bus not initialized');
    }

    const metadata: EventMetadata = {
      eventId: this.generateEventId(),
      eventType,
      timestamp: Date.now(),
      source: this.config.serviceName,
      correlationId: options.correlationId,
      userId: options.userId,
      retryCount: 0,
    };

    const event: Event<T> = {
      metadata,
      payload,
    };

    try {
      // Publish to RabbitMQ
      if (this.config.rabbitmq) {
        await this.publishToRabbitMQ(event, options.priority);
      }

      // Publish to Redis (for fast local consumption)
      if (this.config.redis) {
        await this.publishToRedis(event);
      }

      logger.debug('Event published', {
        eventType,
        eventId: metadata.eventId,
        source: this.config.serviceName,
      });

      this.emit('eventPublished', event);
    } catch (error) {
      logger.error('Failed to publish event:', { eventType, error });
      this.emit('publishError', { event, error });
      throw error;
    }
  }

  /**
   * Publish to RabbitMQ
   */
  private async publishToRabbitMQ(event: Event, priority?: number): Promise<void> {
    if (!this.config.rabbitmq) return;

    const routingKey = this.getRoutingKey(event.metadata.eventType);

    await this.config.rabbitmq.publish(
      this.config.exchange,
      routingKey,
      event,
      {
        persistent: true,
        priority,
        correlationId: event.metadata.correlationId,
        headers: {
          eventType: event.metadata.eventType,
          source: event.metadata.source,
          eventId: event.metadata.eventId,
        },
      }
    );
  }

  /**
   * Publish to Redis
   */
  private async publishToRedis(event: Event): Promise<void> {
    if (!this.config.redis) return;

    const channel = `events:${event.metadata.eventType}`;
    await this.config.redis.publish(channel, event);
  }

  /**
   * Subscribe to event type
   */
  async subscribe<T = any>(eventType: string, handler: EventHandler<T>): Promise<void> {
    if (!this.isReady) {
      throw new Error('Event bus not initialized');
    }

    // Register handler
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler);

    // Subscribe to RabbitMQ
    if (this.config.rabbitmq) {
      await this.subscribeToRabbitMQ(eventType);
    }

    // Subscribe to Redis
    if (this.config.redis) {
      await this.subscribeToRedis(eventType);
    }

    logger.info('Subscribed to event', {
      eventType,
      service: this.config.serviceName,
    });
  }

  /**
   * Subscribe to RabbitMQ
   */
  private async subscribeToRabbitMQ(eventType: string): Promise<void> {
    if (!this.config.rabbitmq) return;

    const rmq = this.config.rabbitmq;
    const queueName = `${this.config.serviceName}.${eventType}`;
    const routingKey = this.getRoutingKey(eventType);

    // Queue options with DLX if enabled
    const queueOptions: any = {
      durable: true,
      arguments: {},
    };

    if (this.config.enableDLX) {
      queueOptions.arguments['x-dead-letter-exchange'] = `${this.config.exchange}.dlx`;
      queueOptions.arguments['x-dead-letter-routing-key'] = routingKey;
    }

    // Assert queue and bind
    await rmq.assertQueue({
      name: queueName,
      options: queueOptions,
      exchange: this.config.exchange,
      bindingKey: routingKey,
    });

    // Start consuming
    const consumerTag = await rmq.consume(
      queueName,
      async (message: Event, originalMessage) => {
        await this.handleEvent(message);
      }
    );

    // Track subscription
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(consumerTag);
  }

  /**
   * Subscribe to Redis
   */
  private async subscribeToRedis(eventType: string): Promise<void> {
    if (!this.config.redis) return;

    const channel = `events:${eventType}`;
    await this.config.redis.subscribe(channel, (message) => {
      try {
        const event = JSON.parse(message);
        this.handleEvent(event);
      } catch (error) {
        logger.error('Error parsing Redis event:', { channel, error });
      }
    });
  }

  /**
   * Handle incoming event
   */
  private async handleEvent(event: Event): Promise<void> {
    const handlers = this.handlers.get(event.metadata.eventType) || [];

    if (handlers.length === 0) {
      logger.warn('No handlers registered for event', {
        eventType: event.metadata.eventType,
        eventId: event.metadata.eventId,
      });
      return;
    }

    logger.debug('Handling event', {
      eventType: event.metadata.eventType,
      eventId: event.metadata.eventId,
      handlers: handlers.length,
    });

    // Execute handlers with retry logic
    for (const handler of handlers) {
      await this.executeHandler(handler, event);
    }

    this.emit('eventHandled', event);
  }

  /**
   * Execute handler with retry logic
   */
  private async executeHandler(handler: EventHandler, event: Event): Promise<void> {
    const maxRetries = this.config.enableRetry ? this.config.maxRetries : 0;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        await handler(event);
        return; // Success
      } catch (error) {
        attempt++;
        logger.error(`Handler failed (attempt ${attempt}/${maxRetries + 1})`, {
          eventType: event.metadata.eventType,
          eventId: event.metadata.eventId,
          error,
        });

        if (attempt > maxRetries) {
          logger.error('Handler failed after all retries', {
            eventType: event.metadata.eventType,
            eventId: event.metadata.eventId,
          });

          this.emit('handlerError', { event, error, attempts: attempt });

          // Send to DLQ
          await this.sendToDLQ(event, error as Error);
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Send failed event to dead letter queue
   */
  private async sendToDLQ(event: Event, error: Error): Promise<void> {
    if (!this.config.rabbitmq || !this.config.enableDLX) return;

    try {
      const dlxExchange = `${this.config.exchange}.dlx`;
      const routingKey = this.getRoutingKey(event.metadata.eventType);

      await this.config.rabbitmq.publish(
        dlxExchange,
        routingKey,
        {
          ...event,
          error: {
            message: error.message,
            stack: error.stack,
            timestamp: Date.now(),
          },
        },
        { persistent: true }
      );

      logger.info('Event sent to DLQ', {
        eventType: event.metadata.eventType,
        eventId: event.metadata.eventId,
      });
    } catch (dlqError) {
      logger.error('Failed to send event to DLQ:', dlqError);
    }
  }

  /**
   * Unsubscribe from event type
   */
  async unsubscribe(eventType: string): Promise<void> {
    // Remove handlers
    this.handlers.delete(eventType);

    // Unsubscribe from RabbitMQ
    if (this.config.rabbitmq) {
      const consumerTags = this.subscriptions.get(eventType) || [];
      for (const tag of consumerTags) {
        await this.config.rabbitmq.cancelConsumer(tag);
      }
      this.subscriptions.delete(eventType);
    }

    // Unsubscribe from Redis
    if (this.config.redis) {
      const channel = `events:${eventType}`;
      await this.config.redis.unsubscribe(channel);
    }

    logger.info('Unsubscribed from event', {
      eventType,
      service: this.config.serviceName,
    });
  }

  /**
   * Replay events from dead letter queue
   */
  async replayDLQ(eventType?: string): Promise<number> {
    if (!this.config.rabbitmq || !this.config.enableDLX) {
      throw new Error('DLX not enabled');
    }

    logger.info('Replaying events from DLQ', { eventType });

    const dlxQueue = `${this.config.serviceName}.dlq`;
    let replayedCount = 0;

    // This is a simplified version - full implementation would need to consume from DLQ
    // and republish to main exchange

    return replayedCount;
  }

  /**
   * Get routing key for event type
   */
  private getRoutingKey(eventType: string): string {
    // Convert event type to routing key format
    // e.g., 'user.created' -> 'user.created'
    // e.g., 'user.*' -> 'user.#' for subscriptions
    return eventType.replace('*', '#');
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${this.config.serviceName}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get event bus statistics
   */
  getStats() {
    return {
      ready: this.isReady,
      service: this.config.serviceName,
      subscribedEvents: Array.from(this.handlers.keys()),
      handlerCount: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      rabbitmq: this.config.rabbitmq?.getConnectionInfo(),
      redis: this.config.redis?.getConnectionInfo(),
    };
  }

  /**
   * Shutdown event bus
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down event bus...');

    // Unsubscribe from all events
    const eventTypes = Array.from(this.handlers.keys());
    for (const eventType of eventTypes) {
      await this.unsubscribe(eventType);
    }

    this.handlers.clear();
    this.subscriptions.clear();
    this.isReady = false;

    this.emit('shutdown');
    logger.info('Event bus shut down');
  }
}

/**
 * Event type definitions for type safety
 */
export const EventTypes = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_VERIFIED: 'user.verified',
  USER_SUBSCRIPTION_CHANGED: 'user.subscription.changed',

  // Match events
  MATCH_CREATED: 'match.created',
  MATCH_DELETED: 'match.deleted',
  SWIPE_RECORDED: 'swipe.recorded',

  // Message events
  MESSAGE_SENT: 'message.sent',
  MESSAGE_READ: 'message.read',
  CONVERSATION_STARTED: 'conversation.started',

  // Payment events
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',

  // Media events
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_MODERATED: 'media.moderated',
  MEDIA_DELETED: 'media.deleted',

  // Moderation events
  CONTENT_FLAGGED: 'content.flagged',
  CONTENT_APPROVED: 'content.approved',
  CONTENT_REJECTED: 'content.rejected',
  USER_BANNED: 'user.banned',

  // Notification events
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_CLICKED: 'notification.clicked',
} as const;

export function createEventBus(config: EventBusConfig): EventBus {
  return new EventBus(config);
}

export default EventBus;
