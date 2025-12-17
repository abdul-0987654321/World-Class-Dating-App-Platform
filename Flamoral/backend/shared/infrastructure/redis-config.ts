import Redis, { RedisOptions, Cluster } from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  cluster?: boolean;
  clusterNodes?: string[];
  sentinels?: Array<{ host: string; port: number }>;
  sentinelName?: string;
}

/**
 * Redis Client Factory
 * Creates Redis clients with proper configuration for different use cases
 */
export class RedisClientFactory {
  /**
   * Create a standard Redis client
   */
  static createClient(config: RedisConfig): Redis | Cluster {
    const options: RedisOptions = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,

      // Connection settings
      connectTimeout: 10000,
      commandTimeout: 5000,
      keepAlive: 30000,
      family: 4, // IPv4

      // Retry strategy
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      retryStrategy: (times: number) => {
        if (times > 10) {
          console.error('[Redis] Max retries reached, giving up');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
        return delay;
      },

      // Reconnection strategy
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },

      // TLS configuration for production
      tls: config.tls
        ? {
            rejectUnauthorized: true,
            checkServerIdentity: () => undefined, // Azure Redis requires this
          }
        : undefined,

      // Connection pooling
      lazyConnect: false,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
    };

    // Redis Sentinel for high availability
    if (config.sentinels && config.sentinels.length > 0) {
      console.log('[Redis] Creating Sentinel client');
      return new Redis({
        ...options,
        sentinels: config.sentinels,
        name: config.sentinelName || 'mymaster',
        sentinelRetryStrategy: (times: number) => {
          return Math.min(times * 100, 3000);
        },
      });
    }

    // Redis Cluster for horizontal scaling
    if (config.cluster && config.clusterNodes && config.clusterNodes.length > 0) {
      console.log('[Redis] Creating Cluster client');
      const nodes = config.clusterNodes.map((node) => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port, 10) };
      });

      return new Redis.Cluster(nodes, {
        redisOptions: options,
        clusterRetryStrategy: (times: number) => {
          if (times > 10) {
            return null;
          }
          return Math.min(100 * times, 2000);
        },
        enableReadyCheck: true,
        maxRedirections: 16,
        retryDelayOnFailover: 100,
        retryDelayOnClusterDown: 300,
      });
    }

    // Standard single-instance Redis
    console.log('[Redis] Creating standard client');
    return new Redis(options);
  }

  /**
   * Create Redis client for caching (DB 1)
   */
  static createCacheClient(config: RedisConfig): Redis | Cluster {
    return this.createClient({
      ...config,
      db: config.db || 1, // Use DB 1 for cache
    });
  }

  /**
   * Create Redis client for sessions (DB 2)
   */
  static createSessionClient(config: RedisConfig): Redis | Cluster {
    return this.createClient({
      ...config,
      db: config.db || 2, // Use DB 2 for sessions
    });
  }

  /**
   * Create Redis client for rate limiting (DB 3)
   */
  static createRateLimitClient(config: RedisConfig): Redis | Cluster {
    return this.createClient({
      ...config,
      db: config.db || 3, // Use DB 3 for rate limiting
    });
  }

  /**
   * Create Redis client for pub/sub (DB 0)
   */
  static createPubSubClient(config: RedisConfig): Redis | Cluster {
    return this.createClient({
      ...config,
      db: 0, // Pub/sub always uses DB 0
    });
  }

  /**
   * Setup event listeners for Redis client
   */
  static setupEventListeners(client: Redis | Cluster, name: string): void {
    client.on('connect', () => {
      console.log(`[Redis:${name}] Connected`);
    });

    client.on('ready', () => {
      console.log(`[Redis:${name}] Ready`);
    });

    client.on('error', (error) => {
      console.error(`[Redis:${name}] Error:`, error.message);
    });

    client.on('close', () => {
      console.warn(`[Redis:${name}] Connection closed`);
    });

    client.on('reconnecting', (delay: number) => {
      console.log(`[Redis:${name}] Reconnecting in ${delay}ms`);
    });

    client.on('end', () => {
      console.warn(`[Redis:${name}] Connection ended`);
    });

    // Cluster-specific events
    if (client instanceof Redis.Cluster) {
      client.on('node error', (error, node) => {
        console.error(`[Redis:${name}] Node error (${node}):`, error.message);
      });
    }
  }

  /**
   * Test Redis connection
   */
  static async testConnection(client: Redis | Cluster): Promise<boolean> {
    try {
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('[Redis] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Gracefully close Redis connection
   */
  static async closeConnection(client: Redis | Cluster): Promise<void> {
    try {
      await client.quit();
      console.log('[Redis] Connection closed gracefully');
    } catch (error) {
      console.error('[Redis] Error closing connection:', error);
      // Force disconnect if graceful close fails
      client.disconnect();
    }
  }
}

/**
 * Redis configuration from environment variables
 */
export function getRedisConfigFromEnv(): RedisConfig {
  const isCluster = process.env.REDIS_CLUSTER === 'true';
  const isSentinel = process.env.REDIS_SENTINEL === 'true';
  const useTls = process.env.REDIS_TLS === 'true' || process.env.NODE_ENV === 'production';

  const config: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    tls: useTls,
  };

  // Cluster configuration
  if (isCluster && process.env.REDIS_CLUSTER_NODES) {
    config.cluster = true;
    config.clusterNodes = process.env.REDIS_CLUSTER_NODES.split(',');
  }

  // Sentinel configuration
  if (isSentinel && process.env.REDIS_SENTINELS) {
    config.sentinels = process.env.REDIS_SENTINELS.split(',').map((sentinel) => {
      const [host, port] = sentinel.split(':');
      return { host, port: parseInt(port, 10) };
    });
    config.sentinelName = process.env.REDIS_SENTINEL_NAME || 'mymaster';
  }

  return config;
}

export default RedisClientFactory;
