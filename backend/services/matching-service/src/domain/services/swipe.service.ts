/**
 * Swipe Service
 * Handles swipe mechanics and match creation
 */

import swipeRepository from '../repositories/swipe.repository';
import matchRepository from '../repositories/match.repository';
import { SwipeAction, SwipeRequest, MatchResponse } from '../../types';
import { Match } from '../entities/Match.entity';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('swipe-service');

export class SwipeService {
  /**
   * Process a swipe action
   * Creates match if mutual like detected
   */
  async processSwipe(request: SwipeRequest): Promise<MatchResponse> {
    try {
      const { userId, targetUserId, action } = request;

      logger.info(`User ${userId} swiped ${action} on ${targetUserId}`);

      // Check if user has already swiped on this person
      const existingSwipe = await swipeRepository.hasUserSwiped(userId, targetUserId);

      if (existingSwipe) {
        return {
          matched: false,
          message: 'You have already swiped on this user',
        };
      }

      // Create swipe record
      await swipeRepository.create({
        userId,
        targetUserId,
        action,
      });

      // Check for mutual like only if current action is like or super_like
      if (action === SwipeAction.LIKE || action === SwipeAction.SUPER_LIKE) {
        const isMutualLike = await swipeRepository.checkMutualLike(userId, targetUserId);

        if (isMutualLike) {
          // Create match
          const match = await this.createMatch(userId, targetUserId);

          logger.info(`Match created: ${match.id}`);

          return {
            matched: true,
            match,
            message: "It's a match!",
          };
        }
      }

      return {
        matched: false,
        message: 'Swipe recorded',
      };
    } catch (error) {
      logger.error('Failed to process swipe', error);
      throw error;
    }
  }

  /**
   * Create a match between two users
   */
  private async createMatch(user1Id: string, user2Id: string): Promise<Match> {
    try {
      // Check if match already exists
      const existingMatch = await matchRepository.findByUsers(user1Id, user2Id);

      if (existingMatch) {
        return existingMatch;
      }

      // Create new match with alphabetically sorted user IDs
      const matchData = Match.createNew(user1Id, user2Id);
      const match = await matchRepository.create(matchData);

      // TODO: Send notifications to both users
      // TODO: Trigger match event for analytics

      return match;
    } catch (error) {
      logger.error('Failed to create match', error);
      throw error;
    }
  }

  /**
   * Undo last swipe (premium feature)
   */
  async undoLastSwipe(userId: string): Promise<boolean> {
    try {
      // TODO: Implement undo functionality
      // This would require storing swipe history with timestamps
      // and allowing deletion of the most recent swipe

      logger.info(`Undo swipe requested for user ${userId}`);
      return false; // Not yet implemented
    } catch (error) {
      logger.error('Failed to undo swipe', error);
      throw error;
    }
  }

  /**
   * Get users who liked the current user
   */
  async getUsersWhoLikedMe(userId: string): Promise<string[]> {
    try {
      return await swipeRepository.getUsersWhoLiked(userId);
    } catch (error) {
      logger.error('Failed to get users who liked me', error);
      throw error;
    }
  }

  /**
   * Get swipe statistics for a user
   */
  async getSwipeStats(userId: string) {
    try {
      return await swipeRepository.getSwipeStats(userId);
    } catch (error) {
      logger.error('Failed to get swipe stats', error);
      throw error;
    }
  }

  /**
   * Check if user has swiped on target
   */
  async hasSwipedOn(userId: string, targetUserId: string): Promise<boolean> {
    try {
      return await swipeRepository.hasUserSwiped(userId, targetUserId);
    } catch (error) {
      logger.error('Failed to check if swiped', error);
      throw error;
    }
  }
}

export default new SwipeService();
