/**
 * Swipe Service
 * Handles swipe mechanics and match creation
 */

import swipeRepository from '../repositories/swipe.repository';
import matchRepository from '../repositories/match.repository';
import matchingCache from '../../infrastructure/cache/matching-cache.service';
import { SwipeAction, SwipeRequest, MatchResponse } from '../../types';
import { Match } from '../entities/Match.entity';
import { createLogger } from '@flamoral/shared';
import notificationServiceClient from '../../infrastructure/clients/notification-service.client';
import analyticsServiceClient from '../../infrastructure/clients/analytics-service.client';
import userServiceClient from '../../infrastructure/clients/user-service.client';

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

      // Invalidate cache after swipe
      await matchingCache.invalidateAfterSwipe(userId, targetUserId);

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

      // Get user profiles to determine genders and preferences
      const userProfiles = await userServiceClient.getUserProfiles([user1Id, user2Id]);
      const user1Profile = userProfiles.get(user1Id);
      const user2Profile = userProfiles.get(user2Id);

      // Determine if women-first messaging rule applies
      const { requiresWomenFirst, womanUserId } = this.determineWomenFirstRule(
        user1Id,
        user2Id,
        user1Profile?.gender,
        user2Profile?.gender
      );

      // Create new match with alphabetically sorted user IDs
      const matchData = Match.createNew(user1Id, user2Id);

      // Add women-first messaging fields
      const enhancedMatchData = {
        ...matchData,
        requiresWomenFirst,
        womanUserId,
        conversationInitiated: false,
        firstMessageSentBy: undefined,
      };

      const match = await matchRepository.create(enhancedMatchData);

      // Invalidate cache for both users after match
      await matchingCache.invalidateAfterMatch(user1Id, user2Id);

      // Send notifications to both users
      await notificationServiceClient.notifyBothUsersOfMatch(user1Id, user2Id, match.id);

      // Trigger match event for analytics
      // Check if this is the first match for either user to track in funnel
      const user1MatchCount = await matchRepository.getUserMatchCount(user1Id);
      const user2MatchCount = await matchRepository.getUserMatchCount(user2Id);

      // Track match analytics for both users
      await Promise.allSettled([
        analyticsServiceClient.trackMatch({
          userId: user1Id,
          matchedUserId: user2Id,
          matchId: match.id,
          isFirstMatch: user1MatchCount === 1,
        }),
        analyticsServiceClient.trackMatch({
          userId: user2Id,
          matchedUserId: user1Id,
          matchId: match.id,
          isFirstMatch: user2MatchCount === 1,
        }),
      ]);

      return match;
    } catch (error) {
      logger.error('Failed to create match', error);
      throw error;
    }
  }

  /**
   * Determine if women-first messaging rule applies to this match
   * Rule applies only for heterosexual matches (male-female)
   */
  private determineWomenFirstRule(
    user1Id: string,
    user2Id: string,
    user1Gender?: string,
    user2Gender?: string
  ): { requiresWomenFirst: boolean; womanUserId?: string } {
    // If we don't have gender info, default to no restriction
    if (!user1Gender || !user2Gender) {
      logger.warn('Missing gender information for match, defaulting to no women-first rule');
      return { requiresWomenFirst: false };
    }

    // Check if this is a heterosexual match (one male, one female)
    const isUser1Male = user1Gender === 'male';
    const isUser1Female = user1Gender === 'female';
    const isUser2Male = user2Gender === 'male';
    const isUser2Female = user2Gender === 'female';

    // Women-first rule applies only to heterosexual matches
    const isHeterosexualMatch = (isUser1Male && isUser2Female) || (isUser1Female && isUser2Male);

    if (!isHeterosexualMatch) {
      return { requiresWomenFirst: false };
    }

    // Identify which user is the woman
    const womanUserId = isUser1Female ? user1Id : user2Id;

    logger.info(`Women-first messaging enabled for match between ${user1Id} and ${user2Id}, woman: ${womanUserId}`);

    return {
      requiresWomenFirst: true,
      womanUserId,
    };
  }

  /**
   * Undo last swipe (premium feature)
   */
  async undoLastSwipe(userId: string): Promise<boolean> {
    try {
      logger.info(`Undo swipe requested for user ${userId}`);

      // Get the most recent swipe
      const lastSwipe = await swipeRepository.getLastSwipe(userId);

      if (!lastSwipe) {
        logger.warn(`No swipes found to undo for user ${userId}`);
        return false;
      }

      // Check if the swipe resulted in a match
      if (lastSwipe.isLike()) {
        const existingMatch = await matchRepository.findByUsers(userId, lastSwipe.targetUserId);

        if (existingMatch) {
          // If there's a match, we need to delete it
          await matchRepository.delete(existingMatch.id);
          logger.info(`Deleted match ${existingMatch.id} as part of undo operation`);
        }
      }

      // Delete the swipe
      const deleted = await swipeRepository.deleteById(lastSwipe.id);

      if (deleted) {
        logger.info(`Successfully undid swipe ${lastSwipe.id} for user ${userId} on target ${lastSwipe.targetUserId}`);

        // Track undo event in analytics
        await analyticsServiceClient.trackUndoSwipe({
          userId,
          targetUserId: lastSwipe.targetUserId,
          previousAction: lastSwipe.action,
        });

        return true;
      }

      return false;
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
