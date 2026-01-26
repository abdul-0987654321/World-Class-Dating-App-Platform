/**
 * Rating Service
 * Handles user ratings and endorsements
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../infrastructure/database/db-client';
import { trustScoreService } from './trust-score.service';
import {
  UserRating,
  RatingCategory,
  Endorsement,
  EndorsementType,
  SubmitRatingRequest,
  GiveEndorsementRequest,
} from '../types/trust.types';

// ============================================================================
// Service
// ============================================================================

class RatingService {
  /**
   * Submit a rating for another user
   */
  async submitRating(fromUserId: string, request: SubmitRatingRequest): Promise<UserRating> {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Check for existing rating (one rating per conversation or per user pair)
    const existing = await db('user_ratings')
      .where({ from_user_id: fromUserId, to_user_id: request.toUserId })
      .where(function () {
        if (request.conversationId) {
          this.where({ conversation_id: request.conversationId });
        } else {
          this.whereNull('conversation_id');
        }
      })
      .first();

    if (existing) {
      // Update existing rating
      await db('user_ratings')
        .where({ id: existing.id })
        .update({
          rating: request.rating,
          categories: JSON.stringify(request.categories),
          comment: request.comment,
          is_anonymous: request.isAnonymous ?? true,
          updated_at: now,
        });

      return this.getRating(existing.id) as Promise<UserRating>;
    }

    // Create new rating
    const rating = {
      id,
      from_user_id: fromUserId,
      to_user_id: request.toUserId,
      conversation_id: request.conversationId,
      rating: request.rating,
      categories: JSON.stringify(request.categories),
      comment: request.comment,
      is_anonymous: request.isAnonymous ?? true,
      created_at: now,
    };

    await db('user_ratings').insert(rating);

    // Record trust signal based on rating
    const signalType =
      request.rating >= 4 ? 'positive_rating' : request.rating <= 2 ? 'negative_rating' : null;
    if (signalType) {
      await trustScoreService.recordSignal({
        userId: request.toUserId,
        type: signalType,
        source: 'rating',
        metadata: { rating: request.rating, categories: request.categories },
      });
    }

    return this.getRating(id) as Promise<UserRating>;
  }

  /**
   * Get a rating by ID
   */
  async getRating(ratingId: string): Promise<UserRating | null> {
    const row = await db('user_ratings').where({ id: ratingId }).first();

    if (!row) return null;

    return {
      id: row.id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      conversationId: row.conversation_id,
      rating: row.rating,
      categories: JSON.parse(row.categories || '[]'),
      comment: row.comment,
      isAnonymous: row.is_anonymous,
      createdAt: row.created_at,
    };
  }

  /**
   * Get ratings received by a user
   */
  async getRatingsReceived(userId: string): Promise<UserRating[]> {
    const rows = await db('user_ratings')
      .where({ to_user_id: userId })
      .orderBy('created_at', 'desc');

    return rows.map((row) => ({
      id: row.id,
      fromUserId: row.is_anonymous ? 'anonymous' : row.from_user_id,
      toUserId: row.to_user_id,
      conversationId: row.conversation_id,
      rating: row.rating,
      categories: JSON.parse(row.categories || '[]'),
      comment: row.is_anonymous ? undefined : row.comment,
      isAnonymous: row.is_anonymous,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get rating stats for a user
   */
  async getRatingStats(userId: string): Promise<{
    totalRatings: number;
    averageRating: number;
    distribution: Record<number, number>;
    topCategories: { category: RatingCategory; count: number }[];
  }> {
    const ratings = await this.getRatingsReceived(userId);

    if (ratings.length === 0) {
      return {
        totalRatings: 0,
        averageRating: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        topCategories: [],
      };
    }

    const totalRatings = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    // Count categories
    const categoryCounts: Record<string, number> = {};
    ratings.forEach((r) => {
      r.categories.forEach((cat) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category: category as RatingCategory, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      distribution,
      topCategories,
    };
  }

  /**
   * Give an endorsement to another user
   */
  async giveEndorsement(fromUserId: string, request: GiveEndorsementRequest): Promise<Endorsement> {
    // Check if already endorsed with this type
    const existing = await db('endorsements')
      .where({ from_user_id: fromUserId, to_user_id: request.toUserId, type: request.type })
      .first();

    if (existing) {
      throw new Error('Already endorsed this user with this type');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const endorsement = {
      id,
      from_user_id: fromUserId,
      to_user_id: request.toUserId,
      type: request.type,
      message: request.message,
      created_at: now,
    };

    await db('endorsements').insert(endorsement);

    // Record trust signal
    await trustScoreService.recordSignal({
      userId: request.toUserId,
      type: 'endorsement_received',
      source: 'endorsement',
      metadata: { type: request.type },
    });

    return {
      id,
      fromUserId,
      toUserId: request.toUserId,
      type: request.type,
      message: request.message,
      createdAt: now,
    };
  }

  /**
   * Get endorsements received by a user
   */
  async getEndorsementsReceived(userId: string): Promise<Endorsement[]> {
    const rows = await db('endorsements')
      .where({ to_user_id: userId })
      .orderBy('created_at', 'desc');

    return rows.map((row) => ({
      id: row.id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      type: row.type as EndorsementType,
      message: row.message,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get endorsement counts by type
   */
  async getEndorsementCounts(userId: string): Promise<Record<EndorsementType, number>> {
    const endorsements = await this.getEndorsementsReceived(userId);

    const counts: Record<EndorsementType, number> = {
      great_conversation: 0,
      genuine_person: 0,
      respectful: 0,
      fun_date: 0,
      recommended: 0,
    };

    endorsements.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });

    return counts;
  }

  /**
   * Check if user can rate another user
   */
  async canRate(fromUserId: string, toUserId: string, conversationId?: string): Promise<boolean> {
    // Cannot rate yourself
    if (fromUserId === toUserId) return false;

    // Check if they had a conversation
    if (conversationId) {
      // In a real implementation, verify both users were in this conversation
      return true;
    }

    // Without conversation ID, check if they ever matched/chatted
    // This would require integration with matching service
    return true;
  }
}

export const ratingService = new RatingService();
export default ratingService;
