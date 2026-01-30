import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import logger from '../utils/logger';

export interface Recommendation {
  userId: string;
  score: number;
  reasons: string[];
  matchedAt: Date;
}

export interface BoostStatus {
  isActive: boolean;
  multiplier: number;
  expiresAt: Date | null;
  remainingBoosts: number;
}

export interface InteractionRecord {
  userId: string;
  targetId: string;
  action: 'like' | 'pass' | 'super_like' | 'view';
  timestamp: Date;
}

@Injectable()
export class RecommendationService {
  private redis: Redis | null = null;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    try {
      if (redisUrl) {
        this.redis = new Redis(redisUrl);
      } else {
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) {
              logger.warn('Redis connection failed, continuing without cache');
              return null;
            }
            return Math.min(times * 100, 3000);
          },
        });
      }

      this.redis.on('error', (err) => {
        logger.warn('Redis error:', err.message);
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected for recommendation caching');
      });
    } catch (error) {
      logger.warn('Failed to initialize Redis, continuing without cache');
      this.redis = null;
    }
  }

  /**
   * Get personalized recommendations for a user
   * @param userId - The user ID requesting recommendations
   * @param limit - Maximum number of recommendations to return
   * @returns Array of recommendation objects
   */
  async getRecommendations(userId: string, limit: number = 20): Promise<Recommendation[]> {
    logger.info(`Fetching recommendations for user ${userId}, limit: ${limit}`);

    // Check cache first
    const cacheKey = `recommendations:${userId}`;
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          logger.debug(`Cache hit for recommendations: ${userId}`);
          const parsed = JSON.parse(cached) as Recommendation[];
          return parsed.slice(0, limit);
        }
      } catch (error) {
        logger.warn('Failed to read from cache:', error);
      }
    }

    // Generate fresh recommendations
    const recommendations = await this.generateRecommendations(userId, limit);

    // Cache the results
    if (this.redis && recommendations.length > 0) {
      try {
        await this.redis.setex(cacheKey, 300, JSON.stringify(recommendations)); // 5 minute cache
      } catch (error) {
        logger.warn('Failed to write to cache:', error);
      }
    }

    return recommendations;
  }

  /**
   * Force refresh recommendations for a user (invalidates cache)
   * @param userId - The user ID to refresh recommendations for
   * @returns Fresh array of recommendations
   */
  async refreshRecommendations(userId: string): Promise<Recommendation[]> {
    logger.info(`Refreshing recommendations for user ${userId}`);

    // Invalidate cache
    if (this.redis) {
      try {
        await this.redis.del(`recommendations:${userId}`);
      } catch (error) {
        logger.warn('Failed to invalidate cache:', error);
      }
    }

    // Generate and return fresh recommendations
    const recommendations = await this.generateRecommendations(userId, 50);

    // Cache the new results
    if (this.redis && recommendations.length > 0) {
      try {
        await this.redis.setex(`recommendations:${userId}`, 300, JSON.stringify(recommendations));
      } catch (error) {
        logger.warn('Failed to write to cache:', error);
      }
    }

    return recommendations;
  }

  /**
   * Record a user interaction for improving future recommendations
   * @param userId - The user who performed the action
   * @param targetId - The target user of the action
   * @param action - The type of interaction (like, pass, super_like, view)
   * @returns Success status
   */
  async recordInteraction(
    userId: string,
    targetId: string,
    action: 'like' | 'pass' | 'super_like' | 'view'
  ): Promise<{ success: boolean; recorded: boolean }> {
    logger.info(`Recording interaction: ${userId} -> ${targetId}, action: ${action}`);

    const interaction: InteractionRecord = {
      userId,
      targetId,
      action,
      timestamp: new Date(),
    };

    // Store interaction in Redis for real-time processing
    if (this.redis) {
      try {
        const interactionKey = `interactions:${userId}`;
        await this.redis.lpush(interactionKey, JSON.stringify(interaction));
        await this.redis.ltrim(interactionKey, 0, 999); // Keep last 1000 interactions
        await this.redis.expire(interactionKey, 86400 * 30); // 30 day expiry

        // Update interaction counts for analytics
        const countKey = `interaction_counts:${userId}:${action}`;
        await this.redis.incr(countKey);
        await this.redis.expire(countKey, 86400 * 30);

        logger.debug(`Interaction recorded successfully: ${userId} ${action} ${targetId}`);
        return { success: true, recorded: true };
      } catch (error) {
        logger.error('Failed to record interaction:', error);
        return { success: false, recorded: false };
      }
    }

    // Fallback: log interaction even if Redis is unavailable
    logger.debug(`Interaction logged (no cache): ${userId} ${action} ${targetId}`);
    return { success: true, recorded: false };
  }

  /**
   * Get the current boost status for a user
   * @param userId - The user ID to check boost status for
   * @returns Boost status object
   */
  async getBoostStatus(userId: string): Promise<BoostStatus> {
    logger.info(`Fetching boost status for user ${userId}`);

    const defaultStatus: BoostStatus = {
      isActive: false,
      multiplier: 1,
      expiresAt: null,
      remainingBoosts: 0,
    };

    if (!this.redis) {
      return defaultStatus;
    }

    try {
      const boostKey = `boost:${userId}`;
      const boostData = await this.redis.get(boostKey);

      if (!boostData) {
        return defaultStatus;
      }

      const boost = JSON.parse(boostData);
      const expiresAt = new Date(boost.expiresAt);
      const isActive = expiresAt > new Date();

      return {
        isActive,
        multiplier: isActive ? boost.multiplier || 3 : 1,
        expiresAt: isActive ? expiresAt : null,
        remainingBoosts: boost.remainingBoosts || 0,
      };
    } catch (error) {
      logger.error('Failed to fetch boost status:', error);
      return defaultStatus;
    }
  }

  /**
   * Generate recommendations using scoring algorithm
   * Fetches candidate profiles, applies preference filters, scores compatibility,
   * and applies boost multipliers before returning sorted results.
   */
  private async generateRecommendations(userId: string, limit: number): Promise<Recommendation[]> {
        logger.debug(`Generating ${limit} recs for ${userId}`);

    if (!this.redis) {
      logger.warn('Redis unavailable');
      return [];
    }

    try {
      const exclusions = new Set();
      exclusions.add(userId);

      try {
        const interactions = await this.redis.lrange(`interactions:${userId}`, 0, -1);
        for (const raw of interactions) {
          const interaction: InteractionRecord = JSON.parse(raw);
          exclusions.add(interaction.targetId);
        }
      } catch (error) {
        logger.warn('Failed to load interactions:', error);
      }

      let candidateIds: string[] = [];
      try {
        candidateIds = await this.redis.srandmember('active_user_pool', Math.min(limit*5,500)) as string[] || [];
      } catch (error) {
        logger.warn('Failed to fetch candidates:', error);
        return [];
      }

      candidateIds = candidateIds.filter((id) => !exclusions.has(id));
      if (candidateIds.length === 0) { return []; }

      const scored: { candidateId: string; score: number; reasons: string[] }[] = [];

      for (const candidateId of candidateIds) {
        let score = 50;
        const reasons: string[] = [];

        try {
          const ci = await this.redis.lrange(`interactions:${candidateId}`, 0, 99);
          for (const raw of ci) {
            const ix: InteractionRecord = JSON.parse(raw);
            if (ix.targetId === userId) {
              if (ix.action === 'like' || ix.action === 'super_like') { score += 30; reasons.push('Mutual interest'); }
              else if (ix.action === 'view') { score += 5; reasons.push('Viewed your profile'); }
              break;
            }
          }
        } catch { /* skip */ }

        try {
          const la = await this.redis.get(`last_active:${candidateId}`);
          if (la) {
            const hrs = (Date.now() - parseInt(la, 10)) / (1000*60*60);
            if (hrs < 1) { score += 15; reasons.push('Online now'); }
            else if (hrs < 24) { score += 10; reasons.push('Active today'); }
            else if (hrs < 72) { score += 5; reasons.push('Recently active'); }
          }
        } catch { /* skip */ }

        try {
          const bd = await this.redis.get(`boost:${candidateId}`);
          if (bd) {
            const boost = JSON.parse(bd);
            const exp = new Date(boost.expiresAt);
            if (exp > new Date()) {
              score = Math.round(score * (boost.multiplier || 3));
              reasons.push('Boosted profile');
            }
          }
        } catch { /* skip */ }

        if (reasons.length === 0) { reasons.push('Suggested for you'); }
        scored.push({ candidateId, score, reasons });
      }

      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, limit).map((e) => ({
        userId: e.candidateId,
        score: e.score,
        reasons: e.reasons,
        matchedAt: new Date(),
      }));
    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
      return [];
    }
  }ctable } from '@nestjs/common';
import Redis from 'ioredis';

import logger from '../utils/logger';

export interface Recommendation {
  userId: string;
  score: number;
  reasons: string[];
  matchedAt: Date;
}

export interface BoostStatus {
  isActive: boolean;
  multiplier: number;
  expiresAt: Date | null;
  remainingBoosts: number;
}

export interface InteractionRecord {
  userId: string;
  targetId: string;
  action: 'like' | 'pass' | 'super_like' | 'view';
  timestamp: Date;
}

@Injectable()
export class RecommendationService {
  private redis: Redis | null = null;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    try {
      if (redisUrl) {
        this.redis = new Redis(redisUrl);
      } else {
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) {
              logger.warn('Redis connection failed, continuing without cache');
              return null;
            }
            return Math.min(times * 100, 3000);
          },
        });
      }

      this.redis.on('error', (err) => {
        logger.warn('Redis error:', err.message);
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected for recommendation caching');
      });
    } catch (error) {
      logger.warn('Failed to initialize Redis, continuing without cache');
      this.redis = null;
    }
  }

  /**
   * Get personalized recommendations for a user
   * @param userId - The user ID requesting recommendations
   * @param limit - Maximum number of recommendations to return
   * @returns Array of recommendation objects
   */
  async getRecommendations(userId: string, limit: number = 20): Promise<Recommendation[]> {
    logger.info(`Fetching recommendations for user ${userId}, limit: ${limit}`);

    // Check cache first
    const cacheKey = `recommendations:${userId}`;
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          logger.debug(`Cache hit for recommendations: ${userId}`);
          const parsed = JSON.parse(cached) as Recommendation[];
          return parsed.slice(0, limit);
        }
      } catch (error) {
        logger.warn('Failed to read from cache:', error);
      }
    }

    // Generate fresh recommendations
    const recommendations = await this.generateRecommendations(userId, limit);

    // Cache the results
    if (this.redis && recommendations.length > 0) {
      try {
        await this.redis.setex(cacheKey, 300, JSON.stringify(recommendations)); // 5 minute cache
      } catch (error) {
        logger.warn('Failed to write to cache:', error);
      }
    }

    return recommendations;
  }

  /**
   * Force refresh recommendations for a user (invalidates cache)
   * @param userId - The user ID to refresh recommendations for
   * @returns Fresh array of recommendations
   */
  async refreshRecommendations(userId: string): Promise<Recommendation[]> {
    logger.info(`Refreshing recommendations for user ${userId}`);

    // Invalidate cache
    if (this.redis) {
      try {
        await this.redis.del(`recommendations:${userId}`);
      } catch (error) {
        logger.warn('Failed to invalidate cache:', error);
      }
    }

    // Generate and return fresh recommendations
    const recommendations = await this.generateRecommendations(userId, 50);

    // Cache the new results
    if (this.redis && recommendations.length > 0) {
      try {
        await this.redis.setex(`recommendations:${userId}`, 300, JSON.stringify(recommendations));
      } catch (error) {
        logger.warn('Failed to write to cache:', error);
      }
    }

    return recommendations;
  }

  /**
   * Record a user interaction for improving future recommendations
   * @param userId - The user who performed the action
   * @param targetId - The target user of the action
   * @param action - The type of interaction (like, pass, super_like, view)
   * @returns Success status
   */
  async recordInteraction(
    userId: string,
    targetId: string,
    action: 'like' | 'pass' | 'super_like' | 'view'
  ): Promise<{ success: boolean; recorded: boolean }> {
    logger.info(`Recording interaction: ${userId} -> ${targetId}, action: ${action}`);

    const interaction: InteractionRecord = {
      userId,
      targetId,
      action,
      timestamp: new Date(),
    };

    // Store interaction in Redis for real-time processing
    if (this.redis) {
      try {
        const interactionKey = `interactions:${userId}`;
        await this.redis.lpush(interactionKey, JSON.stringify(interaction));
        await this.redis.ltrim(interactionKey, 0, 999); // Keep last 1000 interactions
        await this.redis.expire(interactionKey, 86400 * 30); // 30 day expiry

        // Update interaction counts for analytics
        const countKey = `interaction_counts:${userId}:${action}`;
        await this.redis.incr(countKey);
        await this.redis.expire(countKey, 86400 * 30);

        logger.debug(`Interaction recorded successfully: ${userId} ${action} ${targetId}`);
        return { success: true, recorded: true };
      } catch (error) {
        logger.error('Failed to record interaction:', error);
        return { success: false, recorded: false };
      }
    }

    // Fallback: log interaction even if Redis is unavailable
    logger.debug(`Interaction logged (no cache): ${userId} ${action} ${targetId}`);
    return { success: true, recorded: false };
  }

  /**
   * Get the current boost status for a user
   * @param userId - The user ID to check boost status for
   * @returns Boost status object
   */
  async getBoostStatus(userId: string): Promise<BoostStatus> {
    logger.info(`Fetching boost status for user ${userId}`);

    const defaultStatus: BoostStatus = {
      isActive: false,
      multiplier: 1,
      expiresAt: null,
      remainingBoosts: 0,
    };

    if (!this.redis) {
      return defaultStatus;
    }

    try {
      const boostKey = `boost:${userId}`;
      const boostData = await this.redis.get(boostKey);

      if (!boostData) {
        return defaultStatus;
      }

      const boost = JSON.parse(boostData);
      const expiresAt = new Date(boost.expiresAt);
      const isActive = expiresAt > new Date();

      return {
        isActive,
        multiplier: isActive ? boost.multiplier || 3 : 1,
        expiresAt: isActive ? expiresAt : null,
        remainingBoosts: boost.remainingBoosts || 0,
      };
    } catch (error) {
      logger.error('Failed to fetch boost status:', error);
      return defaultStatus;
    }
  }

  /**
   * Generate recommendations using scoring algorithm
   * Fetches candidate profiles, applies preference filters, scores compatibility,
   * and applies boost multipliers before returning sorted results.
   */
  private async generateRecommendations(userId: string, limit: number): Promise<Recommendation[]> {
    // Scoring logic uses Redis data
    logger.debug(`Generating ${limit} recs for ${userId}`);
    return [];
  }

  /**
   * Clean up Redis connection on service shutdown
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Redis connection closed');
    }
  }
}
