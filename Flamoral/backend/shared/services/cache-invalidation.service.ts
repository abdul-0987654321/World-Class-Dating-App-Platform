import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export enum CacheInvalidationEvent {
  PROFILE_UPDATED = 'profile:updated',
  MESSAGE_SENT = 'message:sent',
  MATCH_CREATED = 'match:created',
  MATCH_DELETED = 'match:deleted',
  USER_UPDATED = 'user:updated',
  MEDIA_UPLOADED = 'media:uploaded',
  MEDIA_DELETED = 'media:deleted',
  SUBSCRIPTION_UPDATED = 'subscription:updated',
  PREFERENCES_UPDATED = 'preferences:updated',
  BLOCK_CREATED = 'block:created',
  REPORT_CREATED = 'report:created',
}

export interface CacheInvalidationPayload {
  event: CacheInvalidationEvent;
  userId: string;
  data?: any;
  timestamp: number;
}

/**
 * Cache Invalidation Service
 * Handles distributed cache invalidation across all service instances
 * Uses Redis Pub/Sub for real-time cache invalidation
 */
@Injectable()
export class CacheInvalidationService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheInvalidationService.name);
  private readonly CHANNEL = 'cache:invalidate';
  private redis: Redis;
  private redisSub: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
    this.redisSub = redisClient.duplicate();
    this.setupSubscriptions();
  }

  /**
   * Publish cache invalidation event
   * @param event - Type of invalidation event
   * @param userId - User ID to invalidate cache for
   * @param data - Additional data for the event
   */
  async invalidate(
    event: CacheInvalidationEvent,
    userId: string,
    data?: any
  ): Promise<void> {
    const payload: CacheInvalidationPayload = {
      event,
      userId,
      data,
      timestamp: Date.now(),
    };

    try {
      const message = JSON.stringify(payload);
      await this.redis.publish(this.CHANNEL, message);
      this.logger.debug(
        `Published cache invalidation: ${event} for user ${userId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish cache invalidation: ${event}`,
        error
      );
    }
  }

  /**
   * Invalidate cache for multiple users
   */
  async invalidateMultiple(
    event: CacheInvalidationEvent,
    userIds: string[],
    data?: any
  ): Promise<void> {
    await Promise.all(
      userIds.map((userId) => this.invalidate(event, userId, data))
    );
  }

  /**
   * Invalidate all caches (use with caution)
   */
  async invalidateAll(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.warn('All caches invalidated (FLUSHDB)');
    } catch (error) {
      this.logger.error('Failed to invalidate all caches', error);
    }
  }

  /**
   * Subscribe to cache invalidation events
   */
  private setupSubscriptions(): void {
    this.redisSub.subscribe(this.CHANNEL, (err, count) => {
      if (err) {
        this.logger.error('Failed to subscribe to cache invalidation channel', err);
      } else {
        this.logger.log(`Subscribed to cache invalidation channel (${count} subscriptions)`);
      }
    });

    this.redisSub.on('message', async (channel, message) => {
      if (channel === this.CHANNEL) {
        try {
          const payload: CacheInvalidationPayload = JSON.parse(message);
          await this.handleInvalidation(payload);
        } catch (error) {
          this.logger.error('Failed to handle cache invalidation message', error);
        }
      }
    });

    this.redisSub.on('error', (error) => {
      this.logger.error('Redis subscription error:', error);
    });
  }

  /**
   * Handle cache invalidation event
   */
  private async handleInvalidation(payload: CacheInvalidationPayload): Promise<void> {
    const { event, userId, data } = payload;

    this.logger.debug(`Handling cache invalidation: ${event} for user ${userId}`);

    try {
      switch (event) {
        case CacheInvalidationEvent.PROFILE_UPDATED:
          await this.invalidateUserCache(userId);
          await this.invalidateMatchCache(userId);
          await this.invalidateDiscoveryCache(userId);
          break;

        case CacheInvalidationEvent.MESSAGE_SENT:
          if (data?.conversationId) {
            await this.invalidateConversationCache(userId, data.conversationId);
          }
          await this.invalidateMessagingCache(userId);
          break;

        case CacheInvalidationEvent.MATCH_CREATED:
          await this.invalidateMatchCache(userId);
          if (data?.matchedUserId) {
            await this.invalidateMatchCache(data.matchedUserId);
          }
          break;

        case CacheInvalidationEvent.MATCH_DELETED:
          await this.invalidateMatchCache(userId);
          if (data?.matchedUserId) {
            await this.invalidateMatchCache(data.matchedUserId);
          }
          break;

        case CacheInvalidationEvent.USER_UPDATED:
          await this.invalidateUserCache(userId);
          break;

        case CacheInvalidationEvent.MEDIA_UPLOADED:
        case CacheInvalidationEvent.MEDIA_DELETED:
          await this.invalidateUserCache(userId);
          await this.invalidateMediaCache(userId);
          break;

        case CacheInvalidationEvent.SUBSCRIPTION_UPDATED:
          await this.invalidateUserCache(userId);
          await this.invalidateSubscriptionCache(userId);
          break;

        case CacheInvalidationEvent.PREFERENCES_UPDATED:
          await this.invalidateUserCache(userId);
          await this.invalidatePreferencesCache(userId);
          await this.invalidateMatchCache(userId);
          break;

        case CacheInvalidationEvent.BLOCK_CREATED:
          await this.invalidateUserCache(userId);
          await this.invalidateMatchCache(userId);
          if (data?.blockedUserId) {
            await this.invalidateUserCache(data.blockedUserId);
          }
          break;

        case CacheInvalidationEvent.REPORT_CREATED:
          // Only invalidate reporting user's cache
          await this.invalidateUserCache(userId);
          break;

        default:
          this.logger.warn(`Unknown cache invalidation event: ${event}`);
      }

      this.logger.debug(`Cache invalidation completed: ${event} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for event ${event}:`, error);
    }
  }

  /**
   * Invalidate all user-related cache
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `cache:user-service:*:${userId}*`,
      `cache:profile:${userId}*`,
      `cache:user:${userId}*`,
      `user:${userId}:*`,
    ];

    await this.invalidatePatterns(patterns, 'user');
  }

  /**
   * Invalidate match-related cache
   */
  private async invalidateMatchCache(userId: string): Promise<void> {
    const patterns = [
      `cache:matching-service:*:${userId}*`,
      `cache:matches:${userId}*`,
      `matches:${userId}:*`,
    ];

    await this.invalidatePatterns(patterns, 'matches');
  }

  /**
   * Invalidate discovery cache
   */
  private async invalidateDiscoveryCache(userId: string): Promise<void> {
    const patterns = [
      `cache:discovery:${userId}*`,
      `discovery:${userId}:*`,
    ];

    await this.invalidatePatterns(patterns, 'discovery');
  }

  /**
   * Invalidate conversation cache
   */
  private async invalidateConversationCache(
    userId: string,
    conversationId: string
  ): Promise<void> {
    const patterns = [
      `cache:messaging-service:*:${conversationId}*`,
      `cache:conversation:${conversationId}*`,
      `conversation:${conversationId}:*`,
    ];

    await this.invalidatePatterns(patterns, 'conversation');
  }

  /**
   * Invalidate messaging cache
   */
  private async invalidateMessagingCache(userId: string): Promise<void> {
    const patterns = [
      `cache:messaging-service:*:${userId}*`,
      `cache:messages:${userId}*`,
      `messages:${userId}:*`,
    ];

    await this.invalidatePatterns(patterns, 'messaging');
  }

  /**
   * Invalidate media cache
   */
  private async invalidateMediaCache(userId: string): Promise<void> {
    const patterns = [
      `cache:media-service:*:${userId}*`,
      `cache:media:${userId}*`,
      `media:${userId}:*`,
    ];

    await this.invalidatePatterns(patterns, 'media');
  }

  /**
   * Invalidate subscription cache
   */
  private async invalidateSubscriptionCache(userId: string): Promise<void> {
    const patterns = [
      `cache:subscription:${userId}*`,
      `subscription:${userId}:*`,
    ];

    await this.invalidatePatterns(patterns, 'subscription');
  }

  /**
   * Invalidate preferences cache
   */
  private async invalidatePreferencesCache(userId: string): Promise<void> {
    const patterns = [
      `cache:preferences:${userId}*`,
      `preferences:${userId}:*`,
    ];

    await this.invalidatePatterns(patterns, 'preferences');
  }

  /**
   * Invalidate multiple patterns
   * Uses SCAN instead of KEYS to avoid blocking Redis
   */
  private async invalidatePatterns(
    patterns: string[],
    category: string
  ): Promise<void> {
    let totalDeleted = 0;

    for (const pattern of patterns) {
      try {
        const keys: string[] = [];
        let cursor = '0';

        // Use SCAN to avoid blocking Redis
        do {
          const [newCursor, foundKeys] = await this.redis.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100
          );
          cursor = newCursor;
          keys.push(...foundKeys);
        } while (cursor !== '0');

        if (keys.length > 0) {
          // Delete in batches to avoid blocking
          const batchSize = 100;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await this.redis.del(...batch);
            totalDeleted += batch.length;
          }

          this.logger.debug(
            `Invalidated ${keys.length} ${category} cache keys for pattern: ${pattern}`
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to invalidate pattern ${pattern}:`,
          error
        );
      }
    }

    if (totalDeleted > 0) {
      this.logger.debug(
        `Total ${category} cache keys invalidated: ${totalDeleted}`
      );
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: number;
    hitRate: number;
  }> {
    try {
      const info = await this.redis.info('stats');
      const dbsize = await this.redis.dbsize();

      // Parse Redis INFO output
      const matches = info.match(/keyspace_hits:(\d+)\r\nkeyspace_misses:(\d+)/);
      const hits = matches ? parseInt(matches[1], 10) : 0;
      const misses = matches ? parseInt(matches[2], 10) : 0;
      const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

      // Get memory usage
      const memoryInfo = await this.redis.info('memory');
      const memoryMatch = memoryInfo.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;

      return {
        totalKeys: dbsize,
        memoryUsage,
        hitRate,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    try {
      await this.redisSub.unsubscribe(this.CHANNEL);
      await this.redisSub.quit();
      this.logger.log('Cache invalidation service shut down');
    } catch (error) {
      this.logger.error('Error during cache invalidation service shutdown:', error);
    }
  }
}

export default CacheInvalidationService;
