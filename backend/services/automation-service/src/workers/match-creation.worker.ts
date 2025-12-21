/**
 * Match Creation Worker
 * Processes mutual likes into matches asynchronously
 * Creates conversations when matches are created
 * Sends notifications to both users
 */

import { Job } from 'bull';
import { createLogger } from '@flamoral/shared';
import axios from 'axios';
import {
  BaseWorker,
  WorkerQueueName,
  BaseJobData,
  JobResult,
  JobPriority,
} from './base-worker';

const logger = createLogger('match-creation-worker');

// Service URLs
const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3004';
const MESSAGING_SERVICE_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:3005';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

// Job data interfaces
export interface MatchCreationJobData extends BaseJobData {
  type: 'create_match' | 'check_mutual_like' | 'process_super_like';
  user1Id: string;
  user2Id: string;
  swipeType?: 'like' | 'super_like';
  superLikeMessage?: string;
  matchMode?: 'standard' | 'women_first' | 'friends';
  metadata?: Record<string, any>;
}

export interface MatchCreationResult {
  matchId?: string;
  conversationId?: string;
  notificationsSent: number;
  isMatch: boolean;
  matchMode?: string;
}

/**
 * Match Creation Worker
 */
export class MatchCreationWorker extends BaseWorker<MatchCreationJobData, MatchCreationResult> {
  constructor() {
    super(WorkerQueueName.MATCH_CREATION, 10); // Higher concurrency for matches
  }

  /**
   * Process match creation job
   */
  protected async processJob(job: Job<MatchCreationJobData>): Promise<JobResult<MatchCreationResult>> {
    const { type, user1Id, user2Id, swipeType, superLikeMessage, matchMode } = job.data;
    const startTime = Date.now();

    try {
      let result: MatchCreationResult;

      switch (type) {
        case 'check_mutual_like':
          result = await this.checkMutualLikeAndCreateMatch(
            user1Id,
            user2Id,
            swipeType || 'like',
            matchMode
          );
          break;

        case 'create_match':
          result = await this.createMatch(user1Id, user2Id, matchMode, superLikeMessage);
          break;

        case 'process_super_like':
          result = await this.processSuperLike(user1Id, user2Id, superLikeMessage);
          break;

        default:
          throw new Error(`Unknown match creation type: ${type}`);
      }

      await job.progress(100);

      logger.info(`Match creation completed`, {
        type,
        correlationId: job.data.correlationId,
        isMatch: result.isMatch,
        matchId: result.matchId,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      logger.error(`Match creation failed`, {
        type,
        correlationId: job.data.correlationId,
        user1Id,
        user2Id,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check for mutual like and create match if exists
   */
  private async checkMutualLikeAndCreateMatch(
    swiperId: string,
    swipedUserId: string,
    swipeType: 'like' | 'super_like',
    matchMode?: string
  ): Promise<MatchCreationResult> {
    try {
      // Check if there's a mutual like (other user already liked this user)
      const hasMutualLike = await this.checkMutualLike(swipedUserId, swiperId);

      if (!hasMutualLike) {
        logger.debug(`No mutual like found between ${swiperId} and ${swipedUserId}`);
        return {
          isMatch: false,
          notificationsSent: 0,
        };
      }

      logger.info(`Mutual like detected! Creating match between ${swiperId} and ${swipedUserId}`);

      // Create the match
      return await this.createMatch(swiperId, swipedUserId, matchMode);
    } catch (error: any) {
      logger.error('Failed to check mutual like:', error);
      throw error;
    }
  }

  /**
   * Check if user1 has already liked user2
   */
  private async checkMutualLike(user1Id: string, user2Id: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${MATCHING_SERVICE_URL}/api/v1/internal/swipes/check`,
        {
          params: {
            swiperId: user1Id,
            swipedUserId: user2Id,
            direction: 'right',
          },
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data.exists === true;
    } catch (error: any) {
      logger.error(`Failed to check mutual like: ${user1Id} -> ${user2Id}`, error);
      return false;
    }
  }

  /**
   * Create a match between two users
   */
  private async createMatch(
    user1Id: string,
    user2Id: string,
    matchMode?: string,
    superLikeMessage?: string
  ): Promise<MatchCreationResult> {
    try {
      // Step 1: Create the match in matching service
      const matchResponse = await axios.post(
        `${MATCHING_SERVICE_URL}/api/v1/internal/matches`,
        {
          user1Id,
          user2Id,
          matchMode: matchMode || 'standard',
          metadata: {
            createdByWorker: true,
            superLikeMessage,
          },
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 10000,
        }
      );

      const matchId = matchResponse.data.match?.id || matchResponse.data.id;

      if (!matchId) {
        throw new Error('Match creation returned no match ID');
      }

      logger.info(`Match created: ${matchId}`);

      // Step 2: Create a conversation for the match
      const conversationId = await this.createConversation(matchId, user1Id, user2Id);

      // Step 3: Send notifications to both users
      const notificationsSent = await this.sendMatchNotifications(
        matchId,
        user1Id,
        user2Id,
        superLikeMessage
      );

      // Step 4: Trigger discovery ranking refresh for both users
      await this.triggerRankingRefresh(user1Id, user2Id);

      return {
        matchId,
        conversationId,
        notificationsSent,
        isMatch: true,
        matchMode: matchMode || 'standard',
      };
    } catch (error: any) {
      logger.error(`Failed to create match between ${user1Id} and ${user2Id}:`, error);
      throw error;
    }
  }

  /**
   * Create a conversation for the match
   */
  private async createConversation(
    matchId: string,
    user1Id: string,
    user2Id: string
  ): Promise<string | undefined> {
    try {
      const response = await axios.post(
        `${MESSAGING_SERVICE_URL}/api/v1/internal/conversations`,
        {
          matchId,
          participants: [user1Id, user2Id],
          type: 'match',
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 10000,
        }
      );

      const conversationId = response.data.conversation?.id || response.data.id;
      logger.info(`Conversation created for match ${matchId}: ${conversationId}`);

      return conversationId;
    } catch (error: any) {
      logger.error(`Failed to create conversation for match ${matchId}:`, error);
      // Don't throw - conversation can be created later
      return undefined;
    }
  }

  /**
   * Send match notifications to both users
   */
  private async sendMatchNotifications(
    matchId: string,
    user1Id: string,
    user2Id: string,
    superLikeMessage?: string
  ): Promise<number> {
    let notificationsSent = 0;

    try {
      // Get user profiles for notification content
      const [user1Profile, user2Profile] = await Promise.all([
        this.getUserProfile(user1Id),
        this.getUserProfile(user2Id),
      ]);

      const user1Name = user1Profile?.firstName || 'Someone';
      const user2Name = user2Profile?.firstName || 'Someone';

      // Send notification to user1
      try {
        await this.sendNotification({
          userId: user1Id,
          type: 'new_match',
          title: "It's a Match!",
          body: superLikeMessage
            ? `${user2Name} super liked you! Start chatting now.`
            : `You and ${user2Name} liked each other!`,
          data: {
            matchId,
            matchedUserId: user2Id,
            action: 'view_match',
          },
          imageUrl: user2Profile?.profilePhotoUrl,
        });
        notificationsSent++;
      } catch (error: any) {
        logger.error(`Failed to send notification to user1: ${user1Id}`, error);
      }

      // Send notification to user2
      try {
        await this.sendNotification({
          userId: user2Id,
          type: 'new_match',
          title: "It's a Match!",
          body: `You and ${user1Name} liked each other!`,
          data: {
            matchId,
            matchedUserId: user1Id,
            action: 'view_match',
          },
          imageUrl: user1Profile?.profilePhotoUrl,
        });
        notificationsSent++;
      } catch (error: any) {
        logger.error(`Failed to send notification to user2: ${user2Id}`, error);
      }

      return notificationsSent;
    } catch (error: any) {
      logger.error(`Failed to send match notifications for match ${matchId}:`, error);
      return notificationsSent;
    }
  }

  /**
   * Process super like
   */
  private async processSuperLike(
    swiperId: string,
    swipedUserId: string,
    message?: string
  ): Promise<MatchCreationResult> {
    try {
      // First, check for mutual like
      const hasMutualLike = await this.checkMutualLike(swipedUserId, swiperId);

      if (hasMutualLike) {
        // Create match with super like context
        return await this.createMatch(swiperId, swipedUserId, 'standard', message);
      }

      // No mutual like yet - send super like notification to the other user
      const swiperProfile = await this.getUserProfile(swiperId);
      const swiperName = swiperProfile?.firstName || 'Someone';

      await this.sendNotification({
        userId: swipedUserId,
        type: 'super_like',
        title: 'You received a Super Like!',
        body: message
          ? `${swiperName} super liked you and said: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`
          : `${swiperName} super liked you! Check them out.`,
        data: {
          swiperId,
          action: 'view_profile',
          superLikeMessage: message,
        },
        imageUrl: swiperProfile?.profilePhotoUrl,
      });

      return {
        isMatch: false,
        notificationsSent: 1,
      };
    } catch (error: any) {
      logger.error('Failed to process super like:', error);
      throw error;
    }
  }

  /**
   * Get user profile
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
   * Send notification via notification service
   */
  private async sendNotification(notification: {
    userId: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, any>;
    imageUrl?: string;
  }): Promise<void> {
    await axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
      {
        ...notification,
        channels: ['push', 'in_app'],
        priority: 'high',
      },
      {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 10000,
      }
    );
  }

  /**
   * Trigger discovery ranking refresh for users
   */
  private async triggerRankingRefresh(user1Id: string, user2Id: string): Promise<void> {
    try {
      // Import locally to avoid circular dependencies
      const { discoveryRankingWorker } = await import('./discovery-ranking.worker');

      await Promise.all([
        discoveryRankingWorker.scheduleUserRanking(user1Id, JobPriority.NORMAL),
        discoveryRankingWorker.scheduleUserRanking(user2Id, JobPriority.NORMAL),
      ]);

      logger.debug(`Triggered ranking refresh for users: ${user1Id}, ${user2Id}`);
    } catch (error: any) {
      logger.error('Failed to trigger ranking refresh:', error);
      // Don't throw - this is a nice-to-have
    }
  }

  /**
   * Schedule a mutual like check (called when a user likes someone)
   */
  async scheduleMutualLikeCheck(
    swiperId: string,
    swipedUserId: string,
    swipeType: 'like' | 'super_like' = 'like',
    superLikeMessage?: string
  ): Promise<void> {
    await this.addJob(
      {
        type: swipeType === 'super_like' ? 'process_super_like' : 'check_mutual_like',
        user1Id: swiperId,
        user2Id: swipedUserId,
        swipeType,
        superLikeMessage,
      },
      {
        priority: swipeType === 'super_like' ? JobPriority.HIGH : JobPriority.NORMAL,
      }
    );
  }

  /**
   * Schedule direct match creation (for admin/testing)
   */
  async scheduleMatchCreation(
    user1Id: string,
    user2Id: string,
    matchMode: string = 'standard'
  ): Promise<void> {
    await this.addJob(
      {
        type: 'create_match',
        user1Id,
        user2Id,
        matchMode,
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }
}

// Export singleton instance
export const matchCreationWorker = new MatchCreationWorker();
export default matchCreationWorker;
