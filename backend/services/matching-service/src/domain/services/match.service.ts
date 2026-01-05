/**
 * Match Service
 * Handles match lifecycle including expiration logic
 */

import { createLogger } from '@flamoral/backend-shared';

import notificationServiceClient from '../../infrastructure/clients/notification-service.client';
import { Match } from '../entities/Match.entity';
import matchRepository from '../repositories/match.repository';

const logger = createLogger('match-service');

export class MatchService {
  /**
   * Extend match expiration (Premium feature)
   */
  async extendMatch(matchId: string, userId: string, isPremium: boolean): Promise<Match> {
    try {
      logger.info(`User ${userId} attempting to extend match ${matchId}`);

      // Check if user is premium
      if (!isPremium) {
        throw new Error('Match extension is a Premium feature');
      }

      const match = await matchRepository.findById(matchId);

      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is part of the match
      if (match.user1Id !== userId && match.user2Id !== userId) {
        throw new Error('Access denied');
      }

      // Check if match can be extended
      if (!match.canExtend()) {
        throw new Error('Match cannot be extended (already extended, expired, or message sent)');
      }

      const extendedMatch = await matchRepository.extendMatch(matchId);

      if (!extendedMatch) {
        throw new Error('Failed to extend match');
      }

      logger.info(`Match ${matchId} extended successfully by user ${userId}`);

      // Notify the other user
      const otherUserId = match.getOtherUserId(userId);
      await notificationServiceClient.sendNotification({
        userId: otherUserId,
        type: 'new_match',
        title: 'Match Extended!',
        body: 'Your match has been extended. You have 24 more hours to connect!',
        data: {
          matchId,
          action: 'view_match',
        },
        channel: 'push',
      });

      return extendedMatch;
    } catch (error) {
      logger.error('Failed to extend match', error);
      throw error;
    }
  }

  /**
   * Rematch with expired match (Premium feature)
   */
  async rematch(userId: string, targetUserId: string, isPremium: boolean): Promise<Match> {
    try {
      logger.info(`User ${userId} attempting to rematch with ${targetUserId}`);

      // Check if user is premium
      if (!isPremium) {
        throw new Error('Rematch is a Premium feature');
      }

      const match = await matchRepository.rematch(userId, targetUserId);

      if (!match) {
        throw new Error('Failed to rematch');
      }

      logger.info(`Rematch created: ${match.id}`);

      // Send notifications to both users
      await notificationServiceClient.sendNotification({
        userId: targetUserId,
        type: 'new_match',
        title: "It's a Match Again!",
        body: 'You have a second chance! Start chatting now.',
        data: {
          matchId: match.id,
          rematchedUserId: userId,
          action: 'view_match',
        },
        channel: 'push',
      });

      return match;
    } catch (error) {
      logger.error('Failed to rematch', error);
      throw error;
    }
  }

  /**
   * Mark first message sent on a match
   */
  async markFirstMessageSent(matchId: string): Promise<Match> {
    try {
      const match = await matchRepository.markFirstMessageSent(matchId);

      if (!match) {
        throw new Error('Match not found');
      }

      logger.info(`First message sent on match ${matchId} - expiration stopped`);

      return match;
    } catch (error) {
      logger.error('Failed to mark first message sent', error);
      throw error;
    }
  }

  /**
   * Process expired matches
   * Called by cron job
   */
  async processExpiredMatches(): Promise<void> {
    try {
      logger.info('Processing expired matches...');

      const matchesToExpire = await matchRepository.findMatchesToExpire();

      logger.info(`Found ${matchesToExpire.length} matches to expire`);

      for (const match of matchesToExpire) {
        await matchRepository.markAsExpired(match.id);

        // Send expiration notifications to both users
        await Promise.allSettled([
          notificationServiceClient.sendNotification({
            userId: match.user1Id,
            type: 'new_match',
            title: 'Match Expired',
            body: 'Your match has expired. Upgrade to Premium to rematch!',
            data: {
              matchId: match.id,
              otherUserId: match.user2Id,
              action: 'view_premium',
            },
            channel: 'push',
          }),
          notificationServiceClient.sendNotification({
            userId: match.user2Id,
            type: 'new_match',
            title: 'Match Expired',
            body: 'Your match has expired. Upgrade to Premium to rematch!',
            data: {
              matchId: match.id,
              otherUserId: match.user1Id,
              action: 'view_premium',
            },
            channel: 'push',
          }),
        ]);

        logger.info(`Match ${match.id} marked as expired and users notified`);
      }

      logger.info(`Processed ${matchesToExpire.length} expired matches`);
    } catch (error) {
      logger.error('Failed to process expired matches', error);
      throw error;
    }
  }

  /**
   * Send expiration warning notifications
   * Called by cron job at 6 hours and 1 hour thresholds
   */
  async sendExpirationWarnings(hours: number): Promise<void> {
    try {
      logger.info(`Sending ${hours}-hour expiration warnings...`);

      const matchesExpiringSoon = await matchRepository.findMatchesExpiringSoon(hours);

      logger.info(`Found ${matchesExpiringSoon.length} matches expiring in ${hours} hours`);

      for (const match of matchesExpiringSoon) {
        const warningMessage =
          hours === 6 ? 'Your match expires in 6 hours!' : 'Last chance! Match expires in 1 hour';

        // Send warnings to both users
        await Promise.allSettled([
          notificationServiceClient.sendNotification({
            userId: match.user1Id,
            type: 'new_match',
            title: 'Match Expiring Soon',
            body: warningMessage,
            data: {
              matchId: match.id,
              otherUserId: match.user2Id,
              action: 'view_match',
            },
            channel: 'push',
          }),
          notificationServiceClient.sendNotification({
            userId: match.user2Id,
            type: 'new_match',
            title: 'Match Expiring Soon',
            body: warningMessage,
            data: {
              matchId: match.id,
              otherUserId: match.user1Id,
              action: 'view_match',
            },
            channel: 'push',
          }),
        ]);

        logger.info(`Expiration warning sent for match ${match.id}`);
      }

      logger.info(`Sent ${matchesExpiringSoon.length} expiration warnings`);
    } catch (error) {
      logger.error('Failed to send expiration warnings', error);
      throw error;
    }
  }
}

export default new MatchService();
