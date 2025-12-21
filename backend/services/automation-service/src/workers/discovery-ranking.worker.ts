/**
 * Discovery Ranking Worker
 * Computes discovery feed rankings for users periodically
 * Uses matching algorithm factors to refresh candidate scores
 */

import { Job } from 'bull';
import { createLogger } from '@flamoral/shared';
import {
  BaseWorker,
  WorkerQueueName,
  BaseJobData,
  JobResult,
  JobPriority,
} from './base-worker';
import axios from 'axios';

const logger = createLogger('discovery-ranking-worker');

// Service URLs
const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3004';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

// Job data interfaces
export interface DiscoveryRankingJobData extends BaseJobData {
  type: 'single_user' | 'batch_users' | 'global_refresh';
  userId?: string;
  userIds?: string[];
  priority?: JobPriority;
  forceRefresh?: boolean;
  maxCandidates?: number;
}

export interface RankedCandidate {
  userId: string;
  score: number;
  factors: {
    distance: number;
    interests: number;
    activity: number;
    preferences: number;
  };
  lastUpdated: Date;
}

export interface DiscoveryRankingResult {
  userId?: string;
  candidatesRanked: number;
  processingTimeMs: number;
  cacheUpdated: boolean;
  batchSize?: number;
  usersProcessed?: number;
}

/**
 * Discovery Ranking Worker
 */
export class DiscoveryRankingWorker extends BaseWorker<DiscoveryRankingJobData, DiscoveryRankingResult> {
  private readonly cacheKeyPrefix = 'discovery:rankings:';
  private readonly rankingCacheTTL = 3600; // 1 hour cache TTL
  private readonly maxCandidatesDefault = 100;

  constructor() {
    super(WorkerQueueName.DISCOVERY_RANKING, 5); // 5 concurrent jobs
  }

  /**
   * Process discovery ranking job
   */
  protected async processJob(job: Job<DiscoveryRankingJobData>): Promise<JobResult<DiscoveryRankingResult>> {
    const { type, userId, userIds, forceRefresh, maxCandidates } = job.data;
    const startTime = Date.now();

    try {
      let result: DiscoveryRankingResult;

      switch (type) {
        case 'single_user':
          if (!userId) {
            throw new Error('userId is required for single_user ranking');
          }
          result = await this.rankSingleUser(userId, forceRefresh, maxCandidates);
          break;

        case 'batch_users':
          if (!userIds || userIds.length === 0) {
            throw new Error('userIds is required for batch_users ranking');
          }
          result = await this.rankBatchUsers(userIds, forceRefresh, maxCandidates);
          break;

        case 'global_refresh':
          result = await this.globalRefresh(forceRefresh, maxCandidates);
          break;

        default:
          throw new Error(`Unknown ranking type: ${type}`);
      }

      await job.progress(100);

      logger.info(`Discovery ranking completed`, {
        type,
        correlationId: job.data.correlationId,
        candidatesRanked: result.candidatesRanked,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      logger.error(`Discovery ranking failed`, {
        type,
        correlationId: job.data.correlationId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Rank candidates for a single user
   */
  private async rankSingleUser(
    userId: string,
    forceRefresh = false,
    maxCandidates?: number
  ): Promise<DiscoveryRankingResult> {
    const startTime = Date.now();
    const limit = maxCandidates || this.maxCandidatesDefault;

    try {
      // Get user profile and preferences
      const [userProfile, userPreferences] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserPreferences(userId),
      ]);

      if (!userProfile) {
        throw new Error(`User profile not found: ${userId}`);
      }

      // Get potential candidates based on preferences
      const candidates = await this.getPotentialCandidates(userId, userPreferences, limit);

      if (candidates.length === 0) {
        logger.info(`No candidates found for user ${userId}`);
        return {
          userId,
          candidatesRanked: 0,
          processingTimeMs: Date.now() - startTime,
          cacheUpdated: false,
        };
      }

      // Calculate compatibility scores for all candidates
      const rankedCandidates = await this.calculateRankings(
        userProfile,
        userPreferences,
        candidates
      );

      // Cache the ranked results
      await this.cacheRankings(userId, rankedCandidates);

      return {
        userId,
        candidatesRanked: rankedCandidates.length,
        processingTimeMs: Date.now() - startTime,
        cacheUpdated: true,
      };
    } catch (error: any) {
      logger.error(`Failed to rank user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Rank candidates for multiple users
   */
  private async rankBatchUsers(
    userIds: string[],
    forceRefresh = false,
    maxCandidates?: number
  ): Promise<DiscoveryRankingResult> {
    const startTime = Date.now();
    let totalCandidatesRanked = 0;
    let usersProcessed = 0;

    for (const userId of userIds) {
      try {
        const result = await this.rankSingleUser(userId, forceRefresh, maxCandidates);
        totalCandidatesRanked += result.candidatesRanked;
        usersProcessed++;
      } catch (error: any) {
        logger.error(`Failed to rank user in batch: ${userId}`, error);
        // Continue with other users
      }
    }

    return {
      candidatesRanked: totalCandidatesRanked,
      processingTimeMs: Date.now() - startTime,
      cacheUpdated: true,
      batchSize: userIds.length,
      usersProcessed,
    };
  }

  /**
   * Global refresh of all active users
   */
  private async globalRefresh(
    forceRefresh = false,
    maxCandidates?: number
  ): Promise<DiscoveryRankingResult> {
    const startTime = Date.now();

    try {
      // Get all active users (users active in last 7 days)
      const activeUsers = await this.getActiveUsers();

      logger.info(`Starting global refresh for ${activeUsers.length} active users`);

      let totalCandidatesRanked = 0;
      let usersProcessed = 0;

      // Process in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (userId) => {
            try {
              const result = await this.rankSingleUser(userId, forceRefresh, maxCandidates);
              totalCandidatesRanked += result.candidatesRanked;
              usersProcessed++;
            } catch (error: any) {
              logger.error(`Failed to rank user in global refresh: ${userId}`, error);
            }
          })
        );

        logger.info(`Global refresh progress: ${usersProcessed}/${activeUsers.length}`);
      }

      return {
        candidatesRanked: totalCandidatesRanked,
        processingTimeMs: Date.now() - startTime,
        cacheUpdated: true,
        batchSize: activeUsers.length,
        usersProcessed,
      };
    } catch (error: any) {
      logger.error('Global refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get user profile from user service
   */
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/v1/users/${userId}/profile`, {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get user profile: ${userId}`, error);
      return null;
    }
  }

  /**
   * Get user preferences from matching service
   */
  private async getUserPreferences(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${MATCHING_SERVICE_URL}/api/v1/internal/preferences/${userId}`, {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get user preferences: ${userId}`, error);
      // Return default preferences
      return {
        ageMin: 18,
        ageMax: 99,
        maxDistance: 50,
        genderPreference: ['any'],
      };
    }
  }

  /**
   * Get potential candidates from matching service
   */
  private async getPotentialCandidates(
    userId: string,
    preferences: any,
    limit: number
  ): Promise<any[]> {
    try {
      const response = await axios.post(
        `${MATCHING_SERVICE_URL}/api/v1/internal/candidates`,
        {
          userId,
          preferences,
          limit: limit * 2, // Get more candidates to allow for filtering
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 10000,
        }
      );
      return response.data.candidates || [];
    } catch (error: any) {
      logger.error(`Failed to get candidates for user: ${userId}`, error);
      return [];
    }
  }

  /**
   * Get all active users
   */
  private async getActiveUsers(): Promise<string[]> {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/v1/internal/users/active`, {
        params: {
          daysAgo: 7,
        },
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 30000,
      });
      return response.data.userIds || [];
    } catch (error: any) {
      logger.error('Failed to get active users:', error);
      return [];
    }
  }

  /**
   * Calculate compatibility rankings
   */
  private async calculateRankings(
    userProfile: any,
    userPreferences: any,
    candidates: any[]
  ): Promise<RankedCandidate[]> {
    try {
      const response = await axios.post(
        `${MATCHING_SERVICE_URL}/api/v1/internal/calculate-scores`,
        {
          user: userProfile,
          candidates,
          preferences: userPreferences,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 30000,
        }
      );

      const scores = response.data.scores || [];

      // Sort by score and map to RankedCandidate format
      return scores
        .sort((a: any, b: any) => b.score - a.score)
        .map((score: any) => ({
          userId: score.userId,
          score: score.score,
          factors: score.factors || {
            distance: 0,
            interests: 0,
            activity: 0,
            preferences: 0,
          },
          lastUpdated: new Date(),
        }));
    } catch (error: any) {
      logger.error('Failed to calculate rankings:', error);
      // Fallback: return candidates with default scores
      return candidates.map((c) => ({
        userId: c.userId || c.id,
        score: 50,
        factors: {
          distance: 50,
          interests: 50,
          activity: 50,
          preferences: 50,
        },
        lastUpdated: new Date(),
      }));
    }
  }

  /**
   * Cache rankings in Redis
   */
  private async cacheRankings(userId: string, rankings: RankedCandidate[]): Promise<void> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      });

      const cacheKey = `${this.cacheKeyPrefix}${userId}`;
      const cacheData = JSON.stringify({
        rankings,
        updatedAt: new Date().toISOString(),
      });

      await redis.setex(cacheKey, this.rankingCacheTTL, cacheData);
      await redis.quit();

      logger.debug(`Cached ${rankings.length} rankings for user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to cache rankings for user ${userId}:`, error);
      // Don't throw - caching failure shouldn't fail the job
    }
  }

  /**
   * Schedule a ranking refresh for a user
   */
  async scheduleUserRanking(userId: string, priority: JobPriority = JobPriority.NORMAL): Promise<void> {
    await this.addJob(
      {
        type: 'single_user',
        userId,
        priority,
      },
      { priority }
    );
  }

  /**
   * Schedule a batch ranking refresh
   */
  async scheduleBatchRanking(userIds: string[], priority: JobPriority = JobPriority.LOW): Promise<void> {
    await this.addJob(
      {
        type: 'batch_users',
        userIds,
        priority,
      },
      { priority }
    );
  }

  /**
   * Schedule a global refresh (typically run periodically)
   */
  async scheduleGlobalRefresh(): Promise<void> {
    await this.addJob(
      {
        type: 'global_refresh',
        priority: JobPriority.LOW,
      },
      {
        priority: JobPriority.LOW,
        delay: 0,
      }
    );
  }
}

// Export singleton instance
export const discoveryRankingWorker = new DiscoveryRankingWorker();
export default discoveryRankingWorker;
