/**
 * RabbitMQ Queue Configuration
 * Message queue for async processing
 */

import amqp, { Channel, ChannelModel } from 'amqplib';
import { logger } from '../utils/logger';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export const QUEUES = {
  MATCHING: process.env.QUEUE_MATCHING || 'matching_queue',
  NOTIFICATIONS: process.env.QUEUE_NOTIFICATIONS || 'notification_queue',
  ANALYTICS: process.env.QUEUE_ANALYTICS || 'analytics_queue',
  MODERATION: process.env.QUEUE_MODERATION || 'moderation_queue',
};

export async function connectQueue(): Promise<Channel> {
  if (channel) {
    return channel;
  }

  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

    // Create connection
    connection = await amqp.connect(rabbitmqUrl);
    logger.info('RabbitMQ connection established');

    // Create channel
    channel = await connection.createChannel();
    logger.info('RabbitMQ channel created');

    // Declare queues
    await Promise.all(
      Object.values(QUEUES).map((queue) =>
        channel!.assertQueue(queue, {
          durable: true,
          arguments: {
            'x-message-ttl': 86400000, // 24 hours
          },
        })
      )
    );

    logger.info('All queues declared successfully');

    // Handle connection events
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      logger.info('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    return channel;
  } catch (error) {
    logger.error('RabbitMQ connection failed:', error);
    throw error;
  }
}

export function getQueueChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ not connected. Call connectQueue() first.');
  }
  return channel;
}

export async function disconnectQueue() {
  try {
    if (channel) {
      await channel.close();
      logger.info('RabbitMQ channel closed');
    }
    if (connection) {
      await connection.close();
      logger.info('RabbitMQ connection closed');
    }
  } catch (error) {
    logger.error('Error disconnecting RabbitMQ:', error);
  }
}

// Queue utility class
export class QueueService {
  private channel: Channel;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  async publish(queue: string, message: any): Promise<boolean> {
    try {
      const content = Buffer.from(JSON.stringify(message));
      return this.channel.sendToQueue(queue, content, {
        persistent: true,
      });
    } catch (error) {
      logger.error('Queue publish error:', error);
      return false;
    }
  }

  async consume(queue: string, handler: (message: any) => Promise<void>): Promise<void> {
    try {
      await this.channel.consume(
        queue,
        async (msg) => {
          if (msg) {
            try {
              const content = JSON.parse(msg.content.toString());
              await handler(content);
              this.channel.ack(msg);
            } catch (error) {
              logger.error('Queue message processing error:', error);
              this.channel.nack(msg, false, false); // Don't requeue
            }
          }
        },
        { noAck: false }
      );
      logger.info(`Consumer started for queue: ${queue}`);
    } catch (error) {
      logger.error('Queue consume error:', error);
    }
  }
}
