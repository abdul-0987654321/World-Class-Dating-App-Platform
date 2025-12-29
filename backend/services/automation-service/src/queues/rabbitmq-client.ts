import amqp, { Channel, ConsumeMessage } from 'amqplib';
import { createLogger } from '@flamoral/backend-shared';
import config from '../config';

const logger = createLogger('automation-service:rabbitmq');

/**
 * RabbitMQ Client
 * Manages RabbitMQ connections, exchanges, and queues
 */
export class RabbitMQClient {
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: Channel | null = null;
  private exchange: string;

  constructor() {
    this.exchange = config.rabbitmq.exchange;
  }

  /**
   * Initialize RabbitMQ connection
   */
  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Declare exchange
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });

      logger.info('Connected successfully');

      // Handle connection events
      this.connection.on('error', (err) => {
        logger.error('Connection error', { error: err });
      });

      this.connection.on('close', () => {
        logger.info('Connection closed');
      });
    } catch (error: any) {
      logger.error('Connection failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Publish a message to the exchange
   */
  async publish(routingKey: string, message: any): Promise<boolean> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      const content = Buffer.from(JSON.stringify(message));
      return this.channel.publish(this.exchange, routingKey, content, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      });
    } catch (error: any) {
      logger.error('Publish failed', { error: error.message });
      return false;
    }
  }

  /**
   * Subscribe to a queue with a routing pattern
   */
  async subscribe(
    queueName: string,
    routingPatterns: string[],
    handler: (message: any) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      // Declare queue
      await this.channel.assertQueue(queueName, {
        durable: true,
      });

      // Bind queue to exchange with routing patterns
      for (const pattern of routingPatterns) {
        await this.channel.bindQueue(queueName, this.exchange, pattern);
      }

      // Consume messages
      await this.channel.consume(
        queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) {
            return;
          }

          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);

            // Acknowledge message
            this.channel?.ack(msg);
          } catch (error: any) {
            logger.error('Message handler error', { error: error.message });

            // Reject message and requeue
            this.channel?.nack(msg, false, true);
          }
        },
        { noAck: false }
      );

      logger.info(`Subscribed to queue: ${queueName}`);
    } catch (error: any) {
      logger.error('Subscribe failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Close RabbitMQ connection
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('Connection closed');
    } catch (error: any) {
      logger.error('Close error', { error: error.message });
    }
  }

  /**
   * Get channel for direct access
   */
  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    return this.channel;
  }
}

// Singleton instance
export const rabbitmqClient = new RabbitMQClient();
