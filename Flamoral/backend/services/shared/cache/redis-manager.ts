import Redis, { RedisOptions, Cluster, ClusterNode, ClusterOptions } from 'ioredis';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';

const logger = createLogger('redis-manager');

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number | void;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
  connectTimeout?: number;
  lazyConnect?: boolean;
  tls?: any;
  sentinels?: Array<{ host: string; port: number }>;
  name?: string;
  cluster?: ClusterNode[];
  clusterOptions?: ClusterOptions;
}

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export interface LockOptions {
  ttl?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Redis Connection Manager
 *
 * Features:
 * - Connection pooling with automatic reconnection
 * - Cluster support for high availability
 * - Sentinel support for failover
 * - Distributed locking
 * - Pub/Sub support
 * - Cache abstraction with TTL
 * - Pipeline and transaction support
 */
export class RedisManager extends EventEmitter {
  private client: Redis | Cluster | null = null;
  private subscriber: Redis | null = null;
  private config: RedisConfig;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;

  constructor(config: RedisConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.isConnecting) {
      logger.warn('Connection attempt already in progress');
      return;
    }

    this.isConnecting = true;

    try {
      if (this.config.cluster && this.config.cluster.length > 0) {
        await this.connectCluster();
      } else if (this.config.sentinels && this.config.sentinels.length > 0) {
        await this.connectSentinel();
      } else {
        await this.connectStandalone();
      }

      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.emit('connected');
      logger.info('Redis connection established');
    } catch (error) {
      this.isConnecting = false;
      logger.error('Failed to connect to Redis:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Connect to standalone Redis
   */
  private async connectStandalone(): Promise<void> {
    const options: RedisOptions = {
      host: this.config.host || 'localhost',
      port: this.config.port || 6379,
      password: this.config.password,
      db: this.config.db || 0,
      keyPrefix: this.config.keyPrefix || '',
      retryStrategy: this.config.retryStrategy || this.defaultRetryStrategy.bind(this),
      maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
      enableReadyCheck: this.config.enableReadyCheck !== false,
      enableOfflineQueue: this.config.enableOfflineQueue !== false,
      connectTimeout: this.config.connectTimeout || 10000,
      lazyConnect: this.config.lazyConnect || false,
      tls: this.config.tls,
    };

    this.client = new Redis(options);
    this.setupEventHandlers(this.client);

    if (!this.config.lazyConnect) {
      await this.waitForReady(this.client);
    }
  }

  /**
   * Connect to Redis Sentinel
   */
  private async connectSentinel(): Promise<void> {
    const options: RedisOptions = {
      sentinels: this.config.sentinels,
      name: this.config.name || 'mymaster',
      password: this.config.password,
      db: this.config.db || 0,
      keyPrefix: this.config.keyPrefix || '',
      retryStrategy: this.config.retryStrategy || this.defaultRetryStrategy.bind(this),
      maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
      enableReadyCheck: this.config.enableReadyCheck !== false,
      enableOfflineQueue: this.config.enableOfflineQueue !== false,
      connectTimeout: this.config.connectTimeout || 10000,
    };

    this.client = new Redis(options);
    this.setupEventHandlers(this.client);
    await this.waitForReady(this.client);
  }

  /**
   * Connect to Redis Cluster
   */
  private async connectCluster(): Promise<void> {
    const clusterOptions: ClusterOptions = {
      redisOptions: {
        password: this.config.password,
        keyPrefix: this.config.keyPrefix || '',
      },
      ...this.config.clusterOptions,
    };

    this.client = new Redis.Cluster(this.config.cluster!, clusterOptions);
    this.setupEventHandlers(this.client);
    await this.waitForReady(this.client);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(client: Redis | Cluster): void {
    client.on('connect', () => {
      logger.info('Redis client connected');
      this.emit('connect');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
      this.emit('ready');
    });

    client.on('error', (error) => {
      logger.error('Redis client error:', error);
      this.emit('error', error);
    });

    client.on('close', () => {
      logger.warn('Redis connection closed');
      this.emit('close');
    });

    client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
      this.emit('reconnecting');
    });

    client.on('end', () => {
      logger.info('Redis connection ended');
      this.emit('end');
    });
  }

  /**
   * Default retry strategy
   */
  private defaultRetryStrategy(times: number): number | void {
    if (times > this.MAX_RECONNECT_ATTEMPTS) {
      logger.error('Max reconnection attempts reached');
      return undefined;
    }

    this.reconnectAttempts = times;
    const delay = Math.min(times * 1000, 10000);
    logger.info(`Reconnecting to Redis (attempt ${times}/${this.MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);
    return delay;
  }

  /**
   * Wait for client to be ready
   */
  private waitForReady(client: Redis | Cluster): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, this.config.connectTimeout || 10000);

      client.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) throw new Error('Redis client not connected');

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Error getting value from Redis:', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.client) throw new Error('Redis client not connected');

    try {
      const serialized = JSON.stringify(value);
      if (options.ttl) {
        await this.client.setex(key, options.ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Error setting value in Redis:', { key, error });
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string | string[]): Promise<number> {
    if (!this.client) throw new Error('Redis client not connected');

    try {
      const keys = Array.isArray(key) ? key : [key];
      return await this.client.del(...keys);
    } catch (error) {
      logger.error('Error deleting key from Redis:', { key, error });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) throw new Error('Redis client not connected');

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Error checking key existence in Redis:', { key, error });
      return false;
    }
  }

  /**
   * Set expiration time
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) throw new Error('Redis client not connected');

    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Error setting expiration in Redis:', { key, error });
      return false;
    }
  }

  /**
   * Get time to live
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis client not connected');

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Error getting TTL from Redis:', { key, error });
      return -2;
    }
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis client not connected');
    return await this.client.incr(key);
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis client not connected');
    return await this.client.decr(key);
  }

  /**
   * Acquire distributed lock
   */
  async acquireLock(
    lockKey: string,
    options: LockOptions = {}
  ): Promise<{ acquired: boolean; lockId: string | null }> {
    if (!this.client) throw new Error('Redis client not connected');

    const lockId = `lock-${Date.now()}-${Math.random()}`;
    const ttl = options.ttl || 30000; // 30 seconds default
    const retries = options.retries || 3;
    const retryDelay = options.retryDelay || 100;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await this.client.set(lockKey, lockId, 'PX', ttl, 'NX');
        if (result === 'OK') {
          logger.debug(`Lock acquired: ${lockKey}`, { lockId });
          return { acquired: true, lockId };
        }
      } catch (error) {
        logger.error('Error acquiring lock:', { lockKey, error });
      }

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    logger.debug(`Failed to acquire lock: ${lockKey}`);
    return { acquired: false, lockId: null };
  }

  /**
   * Release distributed lock
   */
  async releaseLock(lockKey: string, lockId: string): Promise<boolean> {
    if (!this.client) throw new Error('Redis client not connected');

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, 1, lockKey, lockId);
      const released = result === 1;

      if (released) {
        logger.debug(`Lock released: ${lockKey}`, { lockId });
      } else {
        logger.warn(`Lock not owned or expired: ${lockKey}`, { lockId });
      }

      return released;
    } catch (error) {
      logger.error('Error releasing lock:', { lockKey, lockId, error });
      return false;
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected');

    if (!this.subscriber) {
      this.subscriber = this.client.duplicate();
      await this.waitForReady(this.subscriber);
    }

    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });

    logger.info(`Subscribed to channel: ${channel}`);
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriber) return;

    await this.subscriber.unsubscribe(channel);
    logger.info(`Unsubscribed from channel: ${channel}`);
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: any): Promise<number> {
    if (!this.client) throw new Error('Redis client not connected');

    const serialized = typeof message === 'string' ? message : JSON.stringify(message);
    return await this.client.publish(channel, serialized);
  }

  /**
   * Create pipeline for batch operations
   */
  pipeline(): any {
    if (!this.client) throw new Error('Redis client not connected');
    return this.client.pipeline();
  }

  /**
   * Execute transaction
   */
  async multi(commands: Array<[string, ...any[]]>): Promise<any[]> {
    if (!this.client) throw new Error('Redis client not connected');

    const pipeline = this.client.multi();
    commands.forEach(([command, ...args]) => {
      (pipeline as any)[command](...args);
    });

    return await pipeline.exec();
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.client) throw new Error('Redis client not connected');
    return await this.client.keys(pattern);
  }

  /**
   * Flush all data
   */
  async flushAll(): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected');
    await this.client.flushall();
    logger.warn('Redis: All data flushed');
  }

  /**
   * Flush current database
   */
  async flushDb(): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected');
    await this.client.flushdb();
    logger.warn('Redis: Current database flushed');
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): {
    connected: boolean;
    reconnectAttempts: number;
    host?: string;
    port?: number;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      host: this.config.host,
      port: this.config.port,
    };
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis | Cluster | null {
    return this.client;
  }

  /**
   * Close connection
   */
  async disconnect(): Promise<void> {
    logger.info('Closing Redis connection...');

    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    if (this.client) {
      await this.client.quit();
      this.client = null;
    }

    logger.info('Redis connection closed');
    this.emit('disconnected');
  }
}

/**
 * Create Redis manager instance
 */
export function createRedisManager(config: RedisConfig): RedisManager {
  return new RedisManager(config);
}

export default RedisManager;
