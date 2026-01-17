/**
 * Swipe Service
 * Handles swipe mechanics and match creation
 *
 * Concurrency Safety:
 * - Uses atomic swipe creation with conflict handling
 * - Prevents duplicate swipes and duplicate matches via database constraints
 * - Match creation is idempotent (returns existing match if already exists)
 */

import { createLogger } from '@flamoral/backend-shared';

import analyticsServiceClient from '../../infrastructure/clients/analytics-service.client';
import notificationServiceClient from '../../infrastructure/clients/notification-service.client';
import userServiceClient from '../../infrastructure/clients/user-service.client';
import db from '../../infrastructure/database/connection';
import { SwipeAction, SwipeRequest, MatchResponse } from '../../types';
import { Match } from '../entities/Match.entity';
import matchRepository from '../repositories/match.repository';
import swipeHistoryRepository from '../repositories/swipe-history.repository';
import swipeRepository from '../repositories/swipe.repository';

const logger = createLogger('swipe-service');

export class SwipeService {
  /**
   * Process a swipe action with race condition protection
   * Creates match if mutual like detected
   *
   * Race conditions handled:
   * 1. Duplicate swipe prevention via unique constraint + conflict handling
   * 2. Match creation race (both users swipe at same time) via atomic check-and-create
   */
  async processSwipe(request: SwipeRequest): Promise<MatchResponse> {
    const { userId, targetUserId, action } = request;

    logger.info(`User ${userId} swiped ${action} on ${targetUserId}`);

    // Use transaction for atomicity of swipe creation and match detection
    return db.transaction(async (trx) => {
      try {
        // Atomic check-and-create for swipe using conflict handling
        // This prevents race condition where check happens but insert fails due to concurrent insert
        let createdSwipe;
        try {
          createdSwipe = await swipeRepository.createWithTransaction(trx, {
            userId,
            targetUserId,
            action,
          });
        } catch (error: any) {
          // Handle duplicate key violation - swipe already exists
          if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
            logger.info(`Duplicate swipe detected for ${userId} -> ${targetUserId}`);
            return {
              matched: false,
              message: 'You have already swiped on this user',
            };
          }
          throw error;
        }

        // Record in swipe history for rewind feature (non-critical)
        let swipeHistory;
        try {
          swipeHistory = await swipeHistoryRepository.createWithTransaction(trx, {
            userId,
            targetUserId,
            action,
            originalSwipeId: createdSwipe.id,
          });
        } catch (historyError) {
          logger.warn('Failed to record swipe history', historyError);
        }

        // Check for mutual like only if current action is like or super_like
        if (action === SwipeAction.LIKE || action === SwipeAction.SUPER_LIKE) {
          // Atomic mutual like check within same transaction
          const isMutualLike = await swipeRepository.checkMutualLikeWithTransaction(
            trx,
            userId,
            targetUserId
          );

          if (isMutualLike) {
            // Create match with atomic insert (handles race condition via unique constraint)
            const match = await this.createMatchWithTransaction(trx, userId, targetUserId);

            logger.info(`Match created: ${match.id}`);

            // Update swipe history with match info
            if (swipeHistory) {
              try {
                await swipeHistoryRepository.updateWithMatchInfoWithTransaction(
                  trx,
                  userId,
                  targetUserId,
                  match.id
                );
              } catch (updateError) {
                logger.warn('Failed to update swipe history with match info', updateError);
              }
            }

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
    });
  }

  /**
   * Create match within a transaction for atomic operation
   * Handles race condition where both users swipe at same time
   */
  private async createMatchWithTransaction(
    trx: any,
    user1Id: string,
    user2Id: string
  ): Promise<Match> {
    // Sort user IDs for consistent ordering (prevents duplicate matches)
    const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

    // Try to find existing match first (within transaction)
    const existingMatch = await matchRepository.findByUsersWithTransaction(trx, sortedUser1, sortedUser2);
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

    // Try atomic insert with conflict handling
    let match;
    try {
      match = await matchRepository.createWithTransaction(trx, enhancedMatchData);
    } catch (error: any) {
      // If duplicate key error, another transaction created the match - fetch it
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        const existingMatch = await matchRepository.findByUsersWithTransaction(trx, sortedUser1, sortedUser2);
        if (existingMatch) {
          return existingMatch;
        }
      }
      throw error;
    }

    // Queue async operations outside transaction
    setImmediate(async () => {
      try {
        // Send notifications to both users
        await notificationServiceClient.notifyBothUsersOfMatch(user1Id, user2Id, match.id);

        // Track match analytics
        const user1MatchCount = await matchRepository.getUserMatchCount(user1Id);
        const user2MatchCount = await matchRepository.getUserMatchCount(user2Id);

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
      } catch (error) {
        logger.error('Failed to send match notifications/analytics', error);
      }
    });

    return match;
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

    logger.info(
      `Women-first messaging enabled for match between ${user1Id} and ${user2Id}, woman: ${womanUserId}`
    );

    return {
      requiresWomenFirst: true,
      womanUserId,
    };
  }

  /**
   * Undo last swipe (premium feature)
   * Uses transaction to ensure atomic deletion of swipe and related match
   */
  async undoLastSwipe(userId: string): Promise<boolean> {
    logger.info(`Undo swipe requested for user ${userId}`);

    return db.transaction(async (trx) => {
      try {
        // Get the most recent swipe within transaction
        const lastSwipe = await swipeRepository.getLastSwipeWithTransaction(trx, userId);

        if (!lastSwipe) {
          logger.warn(`No swipes found to undo for user ${userId}`);
          return false;
        }

        // Check if the swipe resulted in a match
        if (lastSwipe.isLike()) {
          const existingMatch = await matchRepository.findByUsersWithTransaction(
            trx,
            userId,
            lastSwipe.targetUserId
          );

          if (existingMatch) {
            // Delete match within same transaction (atomic with swipe deletion)
            await matchRepository.deleteWithTransaction(trx, existingMatch.id);
            logger.info(`Deleted match ${existingMatch.id} as part of undo operation`);
          }
        }

        // Delete the swipe
        const deleted = await swipeRepository.deleteByIdWithTransaction(trx, lastSwipe.id);

        if (deleted) {
          logger.info(
            `Successfully undid swipe ${lastSwipe.id} for user ${userId} on target ${lastSwipe.targetUserId}`
          );

          // Queue analytics tracking outside transaction
          setImmediate(async () => {
            try {
              await analyticsServiceClient.trackUndoSwipe({
                userId,
                targetUserId: lastSwipe.targetUserId,
                previousAction: lastSwipe.action,
              });
            } catch (error) {
              logger.error('Failed to track undo swipe analytics', error);
            }
          });

          return true;
        }

        return false;
      } catch (error) {
        logger.error('Failed to undo swipe', error);
        throw error;
      }
    });
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
