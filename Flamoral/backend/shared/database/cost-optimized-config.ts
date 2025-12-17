import { Knex } from 'knex';
import { RedisClientType } from 'redis';

/**
 * Cost-Optimized Database Configuration for Flamoral
 *
 * This module provides cost-efficient database and caching configurations
 * to optimize per-usage costs while maintaining performance and reliability.
 *
 * Key Features:
 * - Optimized connection pooling with PgBouncer
 * - Read replica utilization for analytics and reporting
 * - Redis caching with TTL strategies
 * - Query result caching
 * - Auto-pause configuration for non-production databases
 */

/**
 * TTL Configuration Constants (in seconds)
 */
export const CacheTTL = {
  // Session & Authentication
  SESSION_DATA: 24 * 60 * 60,           // 24 hours
  AUTH_TOKEN: 30 * 60,                  // 30 minutes
  REFRESH_TOKEN: 7 * 24 * 60 * 60,      // 7 days
  VERIFICATION_TOKEN: 60 * 60,          // 1 hour

  // User Data
  USER_PROFILE: 60 * 60,                // 1 hour
  USER_PREFERENCES: 2 * 60 * 60,        // 2 hours
  USER_SETTINGS: 6 * 60 * 60,           // 6 hours

  // Matching & Discovery
  MATCH_RECOMMENDATIONS: 15 * 60,       // 15 minutes
  SEARCH_RESULTS: 10 * 60,              // 10 minutes
  NEARBY_USERS: 5 * 60,                 // 5 minutes

  // Rate Limiting
  RATE_LIMIT: 15 * 60,                  // 15 minutes
  API_QUOTA: 60 * 60,                   // 1 hour

  // Application Data
  APP_SETTINGS: 6 * 60 * 60,            // 6 hours
  FEATURE_FLAGS: 10 * 60,               // 10 minutes
  CONFIG_DATA: 30 * 60,                 // 30 minutes

  // Analytics & Metrics
  ANALYTICS_COUNTER: 5 * 60,            // 5 minutes
  METRICS_SNAPSHOT: 15 * 60,            // 15 minutes

  // Real-time Features
  CHAT_PRESENCE: 5 * 60,                // 5 minutes
  NOTIFICATION_QUEUE: 60 * 60,          // 1 hour
  TYPING_INDICATOR: 30,                 // 30 seconds

  // Media & Content
  MEDIA_METADATA: 4 * 60 * 60,          // 4 hours
  GEOLOCATION: 30 * 60,                 // 30 minutes

  // Temporary Data
  OTP_CODE: 5 * 60,                     // 5 minutes
  PASSWORD_RESET: 15 * 60,              // 15 minutes
} as const;

/**
 * Cache Key Patterns
 */
export const CacheKeys = {
  session: (sessionId: string) => `session:${sessionId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userPreferences: (userId: string) => `user:preferences:${userId}`,
  matchRecommendations: (userId: string) => `match:recommendations:${userId}`,
  searchResults: (query: string, filters: string) => `search:${query}:${filters}`,
  rateLimit: (identifier: string, action: string) => `ratelimit:${action}:${identifier}`,
  appSettings: (key: string) => `app:settings:${key}`,
  authToken: (token: string) => `auth:token:${token}`,
  refreshToken: (userId: string) => `refresh_token:${userId}`,
  verification: (token: string) => `verification:${token}`,
  presence: (userId: string) => `presence:${userId}`,
  geo: (userId: string) => `geo:${userId}`,
  mediaMetadata: (mediaId: string) => `media:metadata:${mediaId}`,
  analyticsCounter: (metric: string, period: string) => `analytics:counter:${metric}:${period}`,
} as const;

/**
 * PgBouncer Connection Configuration
 * Uses PgBouncer for connection pooling to reduce database connections
 */
export interface PgBouncerConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

/**
 * Get PgBouncer connection string
 */
export function getPgBouncerConfig(
  environment: 'development' | 'test' | 'staging' | 'production',
  useReplica: boolean = false
): PgBouncerConfig {
  const isProd = environment === 'production';
  const host = useReplica
    ? process.env.PGBOUNCER_REPLICA_HOST || 'pgbouncer-replica'
    : process.env.PGBOUNCER_HOST || 'pgbouncer';

  return {
    host,
    port: parseInt(process.env.PGBOUNCER_PORT || '5432'),
    database: process.env.DB_NAME || 'dating_app_production',
    user: process.env.DB_USER || 'datingappadmin',
    password: process.env.DB_PASSWORD || '',
    ssl: isProd ? { rejectUnauthorized: true } : false,
  };
}

/**
 * Cost-Optimized Knex Configuration using PgBouncer
 */
export function getCostOptimizedKnexConfig(
  environment: 'development' | 'test' | 'staging' | 'production',
  serviceType: 'high-traffic' | 'medium-traffic' | 'low-traffic' = 'medium-traffic',
  useReplica: boolean = false
): Knex.Config {
  const isProd = environment === 'production';
  const pgBouncerConfig = getPgBouncerConfig(environment, useReplica);

  // Reduced pool sizes since PgBouncer handles connection pooling
  const poolSizes = {
    'high-traffic': { min: 2, max: 10 },
    'medium-traffic': { min: 1, max: 6 },
    'low-traffic': { min: 1, max: 4 },
  };

  const poolSize = poolSizes[serviceType];

  return {
    client: 'postgresql',
    connection: {
      host: pgBouncerConfig.host,
      port: pgBouncerConfig.port,
      database: pgBouncerConfig.database,
      user: pgBouncerConfig.user,
      password: pgBouncerConfig.password,
      ssl: pgBouncerConfig.ssl,

      // Connection timeouts
      connectionTimeoutMillis: 10000,
      statement_timeout: isProd ? 30000 : 60000,
      query_timeout: isProd ? 30000 : 60000,
      idle_in_transaction_session_timeout: 60000,

      // Application name for monitoring
      application_name: `flamoral_${environment}_${serviceType}`,

      // Keep alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    },

    pool: {
      min: poolSize.min,
      max: poolSize.max,

      // Aggressive idle timeout since PgBouncer pools connections
      idleTimeoutMillis: 20000,  // 20 seconds
      reapIntervalMillis: 1000,

      // Connection acquisition
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,

      // Validation
      createRetryIntervalMillis: 200,
      propagateCreateError: false,
    },

    // Disable in production for performance
    asyncStackTraces: !isProd,
    debug: environment === 'development',

    log: {
      warn(message) {
        console.warn(`[Knex Warning] ${message}`);
      },
      error(message) {
        console.error(`[Knex Error] ${message}`);
      },
      deprecate(message) {
        if (!isProd) console.warn(`[Knex Deprecated] ${message}`);
      },
      debug(message) {
        if (environment === 'development') console.log(`[Knex Debug] ${message}`);
      },
    },
  };
}

/**
 * Query Result Cache Manager
 * Caches frequently accessed, rarely changing data in Redis
 */
export class QueryResultCache {
  constructor(
    private redis: RedisClientType,
    private defaultTTL: number = CacheTTL.APP_SETTINGS
  ) {}

  /**
   * Get cached query result or execute and cache
   */
  async getOrSet<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }

      // Execute query
      const result = await queryFn();

      // Cache result
      await this.redis.setEx(key, ttl, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('Query cache error:', error);
      // Fallback to query execution
      return queryFn();
    }
  }

  /**
   * Invalidate cached query
   */
  async invalidate(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Invalidate multiple keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } catch (error) {
      console.error('Cache pattern invalidation error:', error);
    }
  }
}

/**
 * Database Connection Manager with Cost Optimization
 */
export class CostOptimizedDatabaseManager {
  private primaryConnection: Knex | null = null;
  private replicaConnection: Knex | null = null;
  private queryCache: QueryResultCache | null = null;

  constructor(
    private environment: 'development' | 'test' | 'staging' | 'production',
    private serviceType: 'high-traffic' | 'medium-traffic' | 'low-traffic',
    private redis?: RedisClientType
  ) {
    if (redis) {
      this.queryCache = new QueryResultCache(redis);
    }
  }

  /**
   * Initialize database connections
   */
  async initialize(): Promise<void> {
    // Primary connection (for writes)
    const primaryConfig = getCostOptimizedKnexConfig(
      this.environment,
      this.serviceType,
      false
    );
    this.primaryConnection = require('knex')(primaryConfig);

    // Test primary connection
    await this.primaryConnection.raw('SELECT 1');
    console.log('Primary database connection established via PgBouncer');

    // Replica connection (for reads) - only in production
    if (this.environment === 'production' || this.environment === 'staging') {
      try {
        const replicaConfig = getCostOptimizedKnexConfig(
          this.environment,
          this.serviceType,
          true
        );
        this.replicaConnection = require('knex')(replicaConfig);
        await this.replicaConnection.raw('SELECT 1');
        console.log('Replica database connection established via PgBouncer');
      } catch (error) {
        console.warn('Failed to connect to replica, will use primary for reads:', error);
      }
    }
  }

  /**
   * Get connection for write operations (always primary)
   */
  getWriteConnection(): Knex {
    if (!this.primaryConnection) {
      throw new Error('Database not initialized');
    }
    return this.primaryConnection;
  }

  /**
   * Get connection for read operations (replica if available, otherwise primary)
   */
  getReadConnection(forcePrimary: boolean = false): Knex {
    if (!this.primaryConnection) {
      throw new Error('Database not initialized');
    }

    if (forcePrimary || !this.replicaConnection) {
      return this.primaryConnection;
    }

    return this.replicaConnection;
  }

  /**
   * Execute cached query
   */
  async cachedQuery<T>(
    cacheKey: string,
    queryFn: (knex: Knex) => Promise<T>,
    ttl?: number,
    forcePrimary: boolean = false
  ): Promise<T> {
    if (!this.queryCache) {
      // No cache available, execute directly
      return queryFn(this.getReadConnection(forcePrimary));
    }

    return this.queryCache.getOrSet(
      cacheKey,
      () => queryFn(this.getReadConnection(forcePrimary)),
      ttl
    );
  }

  /**
   * Invalidate query cache
   */
  async invalidateCache(key: string | string[]): Promise<void> {
    if (!this.queryCache) return;

    if (Array.isArray(key)) {
      await Promise.all(key.map(k => this.queryCache!.invalidate(k)));
    } else {
      await this.queryCache.invalidate(key);
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (this.primaryConnection) {
      await this.primaryConnection.destroy();
      console.log('Primary connection closed');
    }

    if (this.replicaConnection) {
      await this.replicaConnection.destroy();
      console.log('Replica connection closed');
    }
  }
}

/**
 * Service-Specific Database Configurations
 */
export const DatabaseConfigs = {
  // High-traffic services
  userService: (env: string) =>
    getCostOptimizedKnexConfig(env as any, 'high-traffic', false),

  matchingService: (env: string) =>
    getCostOptimizedKnexConfig(env as any, 'high-traffic', false),

  messagingService: (env: string) =>
    getCostOptimizedKnexConfig(env as any, 'high-traffic', false),

  // Medium-traffic services
  paymentService: (env: string) =>
    getCostOptimizedKnexConfig(env as any, 'medium-traffic', false),

  mediaService: (env: string) =>
    getCostOptimizedKnexConfig(env as any, 'medium-traffic', false),

  notificationService: (env: string) =>
    getCostOptimizedKnexConfig(env as any, 'medium-traffic', false),

  // Low-traffic services (use replica for reads when possible)
  analyticsService: (env: string) =>
    getCostOptimizedKnexConfig(env as any, 'low-traffic', true),

  reportingService: (env: string) =>
    getCostOptimizedKnexConfig(env as any, 'low-traffic', true),

  moderationService: (env: string) =>
    getCostOptimizedKnexConfig(env as any, 'low-traffic', false),
};

/**
 * Azure SQL Serverless Auto-Pause Configuration
 * For non-production databases to reduce costs
 */
export interface AutoPauseConfig {
  enabled: boolean;
  autoPauseDelayMinutes: number;
  minCapacity: number;
  maxCapacity: number;
}

export function getAutoPauseConfig(
  environment: 'development' | 'test' | 'staging' | 'production'
): AutoPauseConfig {
  // Only enable auto-pause for non-production environments
  const isNonProd = environment === 'development' || environment === 'test';

  return {
    enabled: isNonProd,
    autoPauseDelayMinutes: isNonProd ? 60 : -1, // 1 hour for non-prod, disabled for prod
    minCapacity: isNonProd ? 0.5 : 2,           // Serverless vCores
    maxCapacity: isNonProd ? 2 : 8,
  };
}

/**
 * Query Performance Monitoring
 */
export interface QueryMetrics {
  queryTime: number;
  cacheHit: boolean;
  connection: 'primary' | 'replica';
}

export class QueryPerformanceMonitor {
  private metrics: Map<string, QueryMetrics[]> = new Map();

  recordQuery(query: string, metrics: QueryMetrics): void {
    if (!this.metrics.has(query)) {
      this.metrics.set(query, []);
    }

    const queryMetrics = this.metrics.get(query)!;
    queryMetrics.push(metrics);

    // Keep only last 100 metrics per query
    if (queryMetrics.length > 100) {
      queryMetrics.shift();
    }
  }

  getAverageQueryTime(query: string): number {
    const metrics = this.metrics.get(query);
    if (!metrics || metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.queryTime, 0);
    return sum / metrics.length;
  }

  getCacheHitRate(query: string): number {
    const metrics = this.metrics.get(query);
    if (!metrics || metrics.length === 0) return 0;

    const hits = metrics.filter(m => m.cacheHit).length;
    return hits / metrics.length;
  }

  getMetricsSummary(): { [query: string]: { avgTime: number; cacheHitRate: number } } {
    const summary: any = {};

    for (const [query, _] of this.metrics.entries()) {
      summary[query] = {
        avgTime: this.getAverageQueryTime(query),
        cacheHitRate: this.getCacheHitRate(query),
      };
    }

    return summary;
  }
}

/**
 * Export utilities
 */
export default {
  CacheTTL,
  CacheKeys,
  getCostOptimizedKnexConfig,
  getPgBouncerConfig,
  CostOptimizedDatabaseManager,
  QueryResultCache,
  DatabaseConfigs,
  getAutoPauseConfig,
  QueryPerformanceMonitor,
};
