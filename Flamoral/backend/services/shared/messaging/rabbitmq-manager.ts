import amqp, { Connection, Channel, ConsumeMessage, Options } from 'amqplib';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';

const logger = createLogger('rabbitmq-manager');

export interface RabbitMQConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  vhost?: string;
  heartbeat?: number;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  prefetch?: number;
}

export interface ExchangeConfig {
  name: string;
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  options?: Options.AssertExchange;
}

export interface QueueConfig {
  name: string;
  options?: Options.AssertQueue;
  bindingKey?: string;
  exchange?: string;
}

export interface PublishOptions {
  persistent?: boolean;
  expiration?: string;
  priority?: number;
  headers?: Record<string, any>;
  correlationId?: string;
  replyTo?: string;
}

/**
 * RabbitMQ Connection Manager
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection pooling for channels
 * - Publisher confirms
 * - Consumer acknowledgment handling
 * - Dead letter exchange support
 * - Event-driven connection state management
 */
export class RabbitMQManager extends EventEmitter {
  private connection: Connection | null = null;
  private publishChannel: Channel | null = null;
  private consumeChannels: Map<string, Channel> = new Map();
  private config: Required<RabbitMQConfig>;
  private reconnectAttempts = 0;
  private isReconnecting = false;
  private isClosing = false;

  constructor(config: RabbitMQConfig) {
    super();
    this.config = {
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      vhost: config.vhost || '/',
      heartbeat: config.heartbeat || 60,
      reconnectDelay: config.reconnectDelay || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      prefetch: config.prefetch || 10,
    };
  }

  /**
   * Connect to RabbitMQ
   */
  async connect(): Promise<void> {
    try {
      const url = `amqp://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}${this.config.vhost}`;

      logger.info('Connecting to RabbitMQ...', {
        host: this.config.host,
        port: this.config.port,
        vhost: this.config.vhost,
      });

      this.connection = await amqp.connect(url, {
        heartbeat: this.config.heartbeat,
      });

      this.setupConnectionHandlers();
      this.reconnectAttempts = 0;

      // Create publisher channel with confirms
      this.publishChannel = await this.connection.createChannel();
      await this.publishChannel.confirmChannel();
      this.publishChannel.on('error', (err) => {
        logger.error('Publisher channel error:', err);
        this.handleChannelError('publish', err);
      });

      logger.info('RabbitMQ connection established successfully');
      this.emit('connected');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.emit('error', error);
      await this.handleReconnect();
    }
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
      this.emit('error', err);
    });

    this.connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      this.emit('disconnected');

      if (!this.isClosing) {
        this.handleReconnect();
      }
    });

    this.connection.on('blocked', (reason) => {
      logger.warn('RabbitMQ connection blocked:', reason);
      this.emit('blocked', reason);
    });

    this.connection.on('unblocked', () => {
      logger.info('RabbitMQ connection unblocked');
      this.emit('unblocked');
    });
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (this.isReconnecting || this.isClosing) return;

    this.isReconnecting = true;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached, giving up');
      this.emit('max_reconnect_reached');
      this.isReconnecting = false;
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    logger.info(`Attempting to reconnect to RabbitMQ (${this.reconnectAttempts}/${this.config.maxReconnectAttempts}) in ${delay}ms`);

    setTimeout(async () => {
      this.isReconnecting = false;
      await this.connect();
    }, delay);
  }

  /**
   * Handle channel errors
   */
  private async handleChannelError(channelType: string, error: Error): Promise<void> {
    logger.error(`${channelType} channel error:`, error);

    if (channelType === 'publish') {
      try {
        if (this.connection) {
          this.publishChannel = await this.connection.createChannel();
          await this.publishChannel.confirmChannel();
        }
      } catch (err) {
        logger.error('Failed to recreate publisher channel:', err);
      }
    }
  }

  /**
   * Assert exchange
   */
  async assertExchange(config: ExchangeConfig): Promise<void> {
    if (!this.publishChannel) {
      throw new Error('Not connected to RabbitMQ');
    }

    await this.publishChannel.assertExchange(config.name, config.type, {
      durable: true,
      ...config.options,
    });

    logger.debug(`Exchange asserted: ${config.name} (${config.type})`);
  }

  /**
   * Assert queue
   */
  async assertQueue(config: QueueConfig): Promise<void> {
    if (!this.publishChannel) {
      throw new Error('Not connected to RabbitMQ');
    }

    await this.publishChannel.assertQueue(config.name, {
      durable: true,
      ...config.options,
    });

    // Bind queue to exchange if specified
    if (config.exchange && config.bindingKey) {
      await this.publishChannel.bindQueue(config.name, config.exchange, config.bindingKey);
      logger.debug(`Queue bound: ${config.name} -> ${config.exchange} (${config.bindingKey})`);
    }

    logger.debug(`Queue asserted: ${config.name}`);
  }

  /**
   * Publish message to exchange
   */
  async publish(
    exchange: string,
    routingKey: string,
    content: any,
    options: PublishOptions = {}
  ): Promise<boolean> {
    if (!this.publishChannel) {
      throw new Error('Not connected to RabbitMQ');
    }

    const message = Buffer.from(JSON.stringify(content));
    const publishOptions: Options.Publish = {
      persistent: options.persistent !== false,
      expiration: options.expiration,
      priority: options.priority,
      headers: options.headers,
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      contentType: 'application/json',
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      this.publishChannel!.publish(
        exchange,
        routingKey,
        message,
        publishOptions,
        (err) => {
          if (err) {
            logger.error('Failed to publish message:', { exchange, routingKey, error: err });
            reject(err);
          } else {
            logger.debug('Message published:', { exchange, routingKey });
            resolve(true);
          }
        }
      );
    });
  }

  /**
   * Send message to queue
   */
  async sendToQueue(queue: string, content: any, options: PublishOptions = {}): Promise<boolean> {
    if (!this.publishChannel) {
      throw new Error('Not connected to RabbitMQ');
    }

    const message = Buffer.from(JSON.stringify(content));
    const publishOptions: Options.Publish = {
      persistent: options.persistent !== false,
      expiration: options.expiration,
      priority: options.priority,
      headers: options.headers,
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      contentType: 'application/json',
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      this.publishChannel!.sendToQueue(queue, message, publishOptions, (err) => {
        if (err) {
          logger.error('Failed to send message to queue:', { queue, error: err });
          reject(err);
        } else {
          logger.debug('Message sent to queue:', { queue });
          resolve(true);
        }
      });
    });
  }

  /**
   * Consume messages from queue
   */
  async consume(
    queue: string,
    handler: (message: any, originalMessage: ConsumeMessage) => Promise<void>,
    options: Options.Consume = {}
  ): Promise<string> {
    if (!this.connection) {
      throw new Error('Not connected to RabbitMQ');
    }

    // Create dedicated channel for this consumer
    const channel = await this.connection.createChannel();
    await channel.prefetch(this.config.prefetch);

    channel.on('error', (err) => {
      logger.error(`Consumer channel error for queue ${queue}:`, err);
      this.handleChannelError(`consume-${queue}`, err);
    });

    const consumerTag = await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content, msg);
          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing message:', { queue, error });

          // Reject and requeue or send to DLX
          const requeue = msg.fields.redelivered === false;
          channel.nack(msg, false, requeue);
        }
      },
      {
        noAck: false,
        ...options,
      }
    );

    this.consumeChannels.set(consumerTag.consumerTag, channel);
    logger.info(`Consumer started for queue: ${queue}`, { consumerTag: consumerTag.consumerTag });

    return consumerTag.consumerTag;
  }

  /**
   * Cancel consumer
   */
  async cancelConsumer(consumerTag: string): Promise<void> {
    const channel = this.consumeChannels.get(consumerTag);
    if (channel) {
      await channel.cancel(consumerTag);
      await channel.close();
      this.consumeChannels.delete(consumerTag);
      logger.info(`Consumer cancelled: ${consumerTag}`);
    }
  }

  /**
   * Setup dead letter exchange
   */
  async setupDeadLetterExchange(
    deadLetterExchange: string,
    deadLetterQueue: string,
    deadLetterRoutingKey: string
  ): Promise<void> {
    await this.assertExchange({
      name: deadLetterExchange,
      type: 'direct',
      options: { durable: true },
    });

    await this.assertQueue({
      name: deadLetterQueue,
      options: { durable: true },
      exchange: deadLetterExchange,
      bindingKey: deadLetterRoutingKey,
    });

    logger.info('Dead letter exchange setup complete', {
      exchange: deadLetterExchange,
      queue: deadLetterQueue,
    });
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connection !== null && this.publishChannel !== null;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): {
    connected: boolean;
    reconnectAttempts: number;
    host: string;
    port: number;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      host: this.config.host,
      port: this.config.port,
    };
  }

  /**
   * Close connection gracefully
   */
  async close(): Promise<void> {
    this.isClosing = true;

    logger.info('Closing RabbitMQ connection...');

    // Cancel all consumers
    for (const [consumerTag, channel] of this.consumeChannels) {
      try {
        await channel.cancel(consumerTag);
        await channel.close();
      } catch (error) {
        logger.error(`Error closing consumer channel ${consumerTag}:`, error);
      }
    }
    this.consumeChannels.clear();

    // Close publisher channel
    if (this.publishChannel) {
      try {
        await this.publishChannel.close();
      } catch (error) {
        logger.error('Error closing publisher channel:', error);
      }
    }

    // Close connection
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (error) {
        logger.error('Error closing connection:', error);
      }
    }

    this.connection = null;
    this.publishChannel = null;
    this.isClosing = false;

    logger.info('RabbitMQ connection closed');
    this.emit('closed');
  }
}

/**
 * Create RabbitMQ manager instance
 */
export function createRabbitMQManager(config: RabbitMQConfig): RabbitMQManager {
  return new RabbitMQManager(config);
}

export default RabbitMQManager;
