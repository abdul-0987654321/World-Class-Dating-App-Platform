import { createClient, RedisClientType } from 'redis';
import { createLogger } from '../../utils/logger';
import config from '../../config';

const logger = createLogger('realtime-client');

/**
 * Event types that can be published to the realtime service
 */
export enum RealtimeEventType {
  // Message events
  NEW_MESSAGE = 'NEW_MESSAGE',
  MESSAGE_READ = 'MESSAGE_READ',
  MESSAGE_DELIVERED = 'MESSAGE_DELIVERED',
  MESSAGE_DELETED = 'MESSAGE_DELETED',

  // Typing indicators
  TYPING_START = 'TYPING_START',
  TYPING_STOP = 'TYPING_STOP',

  // Presence
  PRESENCE_UPDATE = 'PRESENCE_UPDATE',

  // Matches
  NEW_MATCH = 'NEW_MATCH',

  // Notifications
  NOTIFICATION = 'NOTIFICATION',
}

/**
 * Redis channel constants (must match realtime service)
 */
export enum RedisChannel {
  MESSAGES = 'heartly:messages',
  MATCHES = 'heartly:matches',
  NOTIFICATIONS = 'heartly:notifications',
  PRESENCE = 'heartly:presence',
  TYPING = 'heartly:typing',
}

/**
 * Structure of messages published to Redis
 */
export interface RealtimeMessage {
  type: RealtimeEventType;
  userId: string;
  targetIds?: string[];
  payload: any;
  timestamp: Date;
}

/**
 * Client for publishing events to the Realtime Service via Redis Pub/Sub
 */
export class RealtimeClient {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis client
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing Realtime Redis client...');

      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password || undefined,
      });

      // Error handler
      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      // Connection handler
      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      // Ready handler
      this.client.on('ready', () => {
        logger.info('Redis client connected and ready');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      // Reconnecting handler
      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      // End handler
      this.client.on('end', () => {
        logger.info('Redis client connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error: any) {
      logger.error('Failed to initialize Redis client:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Handle connection errors with exponential backoff
   */
  private handleConnectionError(): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      logger.info(`Retrying connection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.initialize();
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached. Giving up.');
    }
  }

  /**
   * Publish a message to a Redis channel
   */
  private async publish(channel: RedisChannel, message: RealtimeMessage): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.warn('Redis client not connected. Message will be dropped.');
      return false;
    }

    try {
      message.timestamp = new Date();
      const payload = JSON.stringify(message);

      await this.client.publish(channel, payload);
      logger.debug(`Published to ${channel}:`, message.type);

      return true;
    } catch (error: any) {
      logger.error(`Failed to publish to ${channel}:`, error);
      return false;
    }
  }

  /**
   * Publish a message to a specific user's channel
   */
  private async publishToUser(userId: string, message: RealtimeMessage): Promise<boolean> {
    const userChannel = `heartly:user:${userId}` as RedisChannel;
    return this.publish(userChannel, message);
  }

  /**
   * Publish a new message event
   */
  async publishNewMessage(targetUserId: string, messageData: any): Promise<boolean> {
    const message: RealtimeMessage = {
      type: RealtimeEventType.NEW_MESSAGE,
      userId: messageData.senderId,
      targetIds: [targetUserId],
      payload: messageData,
      timestamp: new Date(),
    };

    return this.publish(RedisChannel.MESSAGES, message);
  }

  /**
   * Publish a message read event
   */
  async publishMessageRead(
    conversationId: string,
    messageIds: string[],
    readBy: string,
    readAt: Date
  ): Promise<boolean> {
    const message: RealtimeMessage = {
      type: RealtimeEventType.MESSAGE_READ,
      userId: readBy,
      payload: {
        conversationId,
        messageIds,
        readBy,
        readAt,
      },
      timestamp: new Date(),
    };

    return this.publish(RedisChannel.MESSAGES, message);
  }

  /**
   * Publish a message delivered event
   */
  async publishMessageDelivered(
    messageId: string,
    conversationId: string,
    deliveredTo: string,
    deliveredAt: Date
  ): Promise<boolean> {
    const message: RealtimeMessage = {
      type: RealtimeEventType.MESSAGE_DELIVERED,
      userId: deliveredTo,
      payload: {
        messageId,
        conversationId,
        deliveredTo,
        deliveredAt,
      },
      timestamp: new Date(),
    };

    return this.publish(RedisChannel.MESSAGES, message);
  }

  /**
   * Publish a message deleted event
   */
  async publishMessageDeleted(
    messageId: string,
    conversationId: string,
    deletedBy: string
  ): Promise<boolean> {
    const message: RealtimeMessage = {
      type: RealtimeEventType.MESSAGE_DELETED,
      userId: deletedBy,
      payload: {
        messageId,
        conversationId,
        deletedBy,
      },
      timestamp: new Date(),
    };

    return this.publish(RedisChannel.MESSAGES, message);
  }

  /**
   * Publish typing start event
   */
  async publishTypingStart(
    conversationId: string,
    userId: string,
    targetUserId: string
  ): Promise<boolean> {
    const message: RealtimeMessage = {
      type: RealtimeEventType.TYPING_START,
      userId,
      targetIds: [targetUserId],
      payload: {
        conversationId,
        userId,
        isTyping: true,
      },
      timestamp: new Date(),
    };

    return this.publish(RedisChannel.TYPING, message);
  }

  /**
   * Publish typing stop event
   */
  async publishTypingStop(
    conversationId: string,
    userId: string,
    targetUserId: string
  ): Promise<boolean> {
    const message: RealtimeMessage = {
      type: RealtimeEventType.TYPING_STOP,
      userId,
      targetIds: [targetUserId],
      payload: {
        conversationId,
        userId,
        isTyping: false,
      },
      timestamp: new Date(),
    };

    return this.publish(RedisChannel.TYPING, message);
  }

  /**
   * Publish a new match event
   */
  async publishNewMatch(userId: string, matchData: any): Promise<boolean> {
    const message: RealtimeMessage = {
      type: RealtimeEventType.NEW_MATCH,
      userId,
      payload: matchData,
      timestamp: new Date(),
    };

    return this.publish(RedisChannel.MATCHES, message);
  }

  /**
   * Publish a notification event
   */
  async publishNotification(userId: string, notificationData: any): Promise<boolean> {
    const message: RealtimeMessage = {
      type: RealtimeEventType.NOTIFICATION,
      userId,
      payload: notificationData,
      timestamp: new Date(),
    };

    return this.publish(RedisChannel.NOTIFICATIONS, message);
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Close the Redis client
   */
  async close(): Promise<void> {
    if (this.client) {
      logger.info('Closing Redis client...');
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis client closed');
    }
  }
}

// Export singleton instance
export const realtimeClient = new RealtimeClient();
export default realtimeClient;
