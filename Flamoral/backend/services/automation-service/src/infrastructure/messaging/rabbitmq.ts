import amqp, { Channel, ConsumeMessage } from 'amqplib';
import config from '../../config';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('automation-service:rabbitmq');

/**
 * RabbitMQ Connection Manager
 */
export class RabbitMQManager {
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: Channel | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;

  /**
   * Initialize RabbitMQ connection
   */
  async initialize(): Promise<void> {
    if (this.isConnecting) {
      logger.warn('Connection attempt already in progress');
      return;
    }

    this.isConnecting = true;

    try {
      logger.info('Connecting to RabbitMQ', { url: config.rabbitmq.url });

      // Create connection
      this.connection = await amqp.connect(config.rabbitmq.url);

      // Create channel
      this.channel = await this.connection.createChannel();

      // Set prefetch count for fair dispatch
      await this.channel.prefetch(1);

      // Assert exchange
      await this.channel.assertExchange(config.rabbitmq.exchange, 'topic', {
        durable: true,
      });

      // Assert queues
      await this.assertQueues();

      // Setup connection error handlers
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        this.handleDisconnection();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.handleDisconnection();
      });

      this.isConnecting = false;
      logger.info('RabbitMQ connection established successfully');
    } catch (error: any) {
      this.isConnecting = false;
      logger.error('Failed to connect to RabbitMQ', { error: error.message });
      this.handleDisconnection();
      throw error;
    }
  }

  /**
   * Assert all required queues
   */
  private async assertQueues(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    const queues = [
      config.rabbitmq.queues.match,
      config.rabbitmq.queues.message,
      config.rabbitmq.queues.user,
      'automation_scheduled_messages',
      'automation_icebreakers',
      'automation_smart_replies',
    ];

    for (const queue of queues) {
      await this.channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 hours
          'x-max-length': 10000,
        },
      });

      logger.info(`Queue asserted: ${queue}`);
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnection(): void {
    this.channel = null;
    this.connection = null;

    if (this.reconnectInterval) {
      return; // Already attempting to reconnect
    }

    logger.info('Attempting to reconnect in 5 seconds...');
    this.reconnectInterval = setTimeout(async () => {
      this.reconnectInterval = null;
      try {
        await this.initialize();
      } catch (error) {
        logger.error('Reconnection failed, will retry');
      }
    }, 5000);
  }

  /**
   * Publish message to exchange
   */
  async publish(
    routingKey: string,
    message: any,
    options?: amqp.Options.Publish
  ): Promise<boolean> {
    if (!this.channel) {
      logger.error('Cannot publish: Channel not initialized');
      return false;
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));

      const published = this.channel.publish(
        config.rabbitmq.exchange,
        routingKey,
        messageBuffer,
        {
          persistent: true,
          timestamp: Date.now(),
          contentType: 'application/json',
          ...options,
        }
      );

      if (published) {
        logger.debug('Message published', { routingKey });
      } else {
        logger.warn('Message publish buffer full', { routingKey });
      }

      return published;
    } catch (error: any) {
      logger.error('Failed to publish message', {
        routingKey,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Subscribe to queue
   */
  async subscribe(
    queue: string,
    handler: (message: any) => Promise<void>,
    options?: amqp.Options.Consume
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      await this.channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) {
            logger.warn('Received null message');
            return;
          }

          try {
            const content = JSON.parse(msg.content.toString());
            logger.debug('Processing message', { queue, messageId: msg.properties.messageId });

            await handler(content);

            // Acknowledge message
            this.channel!.ack(msg);
            logger.debug('Message processed successfully', { queue });
          } catch (error: any) {
            logger.error('Error processing message', {
              queue,
              error: error.message,
            });

            // Reject and requeue on error
            this.channel!.nack(msg, false, true);
          }
        },
        {
          noAck: false,
          ...options,
        }
      );

      logger.info(`Subscribed to queue: ${queue}`);
    } catch (error: any) {
      logger.error('Failed to subscribe to queue', {
        queue,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Bind queue to exchange with routing pattern
   */
  async bindQueue(queue: string, routingPattern: string): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      await this.channel.bindQueue(
        queue,
        config.rabbitmq.exchange,
        routingPattern
      );

      logger.info('Queue bound to exchange', { queue, routingPattern });
    } catch (error: any) {
      logger.error('Failed to bind queue', {
        queue,
        routingPattern,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send to queue directly
   */
  async sendToQueue(
    queue: string,
    message: any,
    options?: amqp.Options.Publish
  ): Promise<boolean> {
    if (!this.channel) {
      logger.error('Cannot send to queue: Channel not initialized');
      return false;
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));

      const sent = this.channel.sendToQueue(queue, messageBuffer, {
        persistent: true,
        timestamp: Date.now(),
        contentType: 'application/json',
        ...options,
      });

      if (sent) {
        logger.debug('Message sent to queue', { queue });
      } else {
        logger.warn('Queue send buffer full', { queue });
      }

      return sent;
    } catch (error: any) {
      logger.error('Failed to send to queue', {
        queue,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get channel
   */
  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }
    return this.channel;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      logger.info('RabbitMQ connection closed successfully');
    } catch (error: any) {
      logger.error('Error closing RabbitMQ connection', { error: error.message });
    }
  }
}

// Export singleton instance
export const rabbitMQ = new RabbitMQManager();
