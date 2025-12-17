/**
 * Event Stream Service
 * Handles real-time event streaming using Redis Streams
 */

import { createClient, RedisClientType } from 'redis';
import config from '../../config';
import { logger } from '../monitoring/logger';

export interface StreamEvent {
  id?: string;
  eventType: string;
  eventName: string;
  userId?: string;
  sessionId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

export class EventStreamService {
  private client: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private initialized = false;
  private streamName = 'analytics:events';
  private consumerGroup = 'analytics-processors';
  private consumerName = `consumer-${process.pid}`;
  private isProcessing = false;

  /**
   * Initialize Redis connection for streaming
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing Event Stream Service...');

      // Create Redis clients
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });

      this.subscriber = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });

      // Error handlers
      this.client.on('error', (err) => logger.error('Redis Client Error:', err));
      this.subscriber.on('error', (err) => logger.error('Redis Subscriber Error:', err));

      // Connect
      await this.client.connect();
      await this.subscriber.connect();

      // Create consumer group if it doesn't exist
      try {
        await this.client.xGroupCreate(this.streamName, this.consumerGroup, '0', {
          MKSTREAM: true,
        });
        logger.info(`Consumer group "${this.consumerGroup}" created`);
      } catch (error: any) {
        if (error.message.includes('BUSYGROUP')) {
          logger.info(`Consumer group "${this.consumerGroup}" already exists`);
        } else {
          throw error;
        }
      }

      this.initialized = true;
      logger.info('Event Stream Service initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize Event Stream Service:', error);
      throw error;
    }
  }

  /**
   * Publish event to stream
   */
  async publishEvent(event: StreamEvent): Promise<string> {
    if (!this.client) {
      throw new Error('Event Stream Service not initialized');
    }

    try {
      const eventId = await this.client.xAdd(
        this.streamName,
        '*',
        {
          eventType: event.eventType,
          eventName: event.eventName,
          userId: event.userId || '',
          sessionId: event.sessionId || '',
          data: JSON.stringify(event.data),
          timestamp: event.timestamp.toISOString(),
        },
        {
          TRIM: {
            strategy: 'MAXLEN',
            strategyModifier: '~',
            threshold: 10000, // Keep last 10k events
          },
        }
      );

      logger.debug(`Event published to stream: ${eventId}`);
      return eventId;
    } catch (error: any) {
      logger.error('Failed to publish event to stream:', error);
      throw error;
    }
  }

  /**
   * Publish batch of events
   */
  async publishBatch(events: StreamEvent[]): Promise<string[]> {
    if (!this.client) {
      throw new Error('Event Stream Service not initialized');
    }

    try {
      const pipeline = this.client.multi();

      for (const event of events) {
        pipeline.xAdd(this.streamName, '*', {
          eventType: event.eventType,
          eventName: event.eventName,
          userId: event.userId || '',
          sessionId: event.sessionId || '',
          data: JSON.stringify(event.data),
          timestamp: event.timestamp.toISOString(),
        });
      }

      const results = await pipeline.exec();
      const eventIds = results.map((r: any) => r.toString());

      logger.debug(`Batch of ${events.length} events published to stream`);
      return eventIds;
    } catch (error: any) {
      logger.error('Failed to publish batch to stream:', error);
      throw error;
    }
  }

  /**
   * Start consuming events from stream
   */
  async startConsumer(
    handler: (event: StreamEvent) => Promise<void>,
    options: {
      batchSize?: number;
      blockTime?: number;
    } = {}
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Event Stream Service not initialized');
    }

    if (this.isProcessing) {
      logger.warn('Consumer is already processing events');
      return;
    }

    const batchSize = options.batchSize || 10;
    const blockTime = options.blockTime || 5000; // 5 seconds

    this.isProcessing = true;
    logger.info(`Starting event consumer: ${this.consumerName}`);

    while (this.isProcessing) {
      try {
        // Read events from stream
        const messages = await this.client.xReadGroup(
          this.consumerGroup,
          this.consumerName,
          [
            {
              key: this.streamName,
              id: '>',
            },
          ],
          {
            COUNT: batchSize,
            BLOCK: blockTime,
          }
        );

        if (!messages || messages.length === 0) {
          continue;
        }

        // Process each message
        for (const streamMessages of messages) {
          for (const message of streamMessages.messages) {
            try {
              const event: StreamEvent = {
                id: message.id,
                eventType: message.message.eventType as string,
                eventName: message.message.eventName as string,
                userId: message.message.userId || undefined,
                sessionId: message.message.sessionId || undefined,
                data: JSON.parse(message.message.data as string),
                timestamp: new Date(message.message.timestamp as string),
              };

              // Process event with handler
              await handler(event);

              // Acknowledge message
              await this.client.xAck(this.streamName, this.consumerGroup, message.id);

              logger.debug(`Event processed and acknowledged: ${message.id}`);
            } catch (error: any) {
              logger.error(`Failed to process event ${message.id}:`, error);
              // Could implement dead letter queue here
            }
          }
        }
      } catch (error: any) {
        logger.error('Error in consumer loop:', error);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait before retrying
      }
    }

    logger.info('Event consumer stopped');
  }

  /**
   * Stop consuming events
   */
  async stopConsumer(): Promise<void> {
    this.isProcessing = false;
    logger.info('Stopping event consumer...');
  }

  /**
   * Get stream info
   */
  async getStreamInfo(): Promise<{
    length: number;
    groups: number;
    firstEntryId: string | null;
    lastEntryId: string | null;
  }> {
    if (!this.client) {
      throw new Error('Event Stream Service not initialized');
    }

    try {
      const info: any = await this.client.xInfoStream(this.streamName);

      return {
        length: info.length,
        groups: info.groups,
        firstEntryId: info['first-entry'] ? info['first-entry'][0] : null,
        lastEntryId: info['last-entry'] ? info['last-entry'][0] : null,
      };
    } catch (error: any) {
      if (error.message.includes('no such key')) {
        return {
          length: 0,
          groups: 0,
          firstEntryId: null,
          lastEntryId: null,
        };
      }
      throw error;
    }
  }

  /**
   * Get pending events count
   */
  async getPendingCount(): Promise<number> {
    if (!this.client) {
      throw new Error('Event Stream Service not initialized');
    }

    try {
      const pending: any = await this.client.xPending(this.streamName, this.consumerGroup);
      return pending.pending || 0;
    } catch (error: any) {
      logger.error('Failed to get pending count:', error);
      return 0;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    this.isProcessing = false;

    if (this.client) {
      await this.client.quit();
      this.client = null;
    }

    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    this.initialized = false;
    logger.info('Event Stream Service closed');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const eventStreamService = new EventStreamService();
export default eventStreamService;
