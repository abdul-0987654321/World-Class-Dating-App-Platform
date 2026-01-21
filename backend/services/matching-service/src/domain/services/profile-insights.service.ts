/**
 * Profile Insights Service
 * Tracks and provides insights about profile views, likes received, and engagement
 * Premium feature for profile analytics
 */

import { createLogger } from '@flamoral/backend-shared';
import { Knex } from 'knex';

import userServiceClient from '../../infrastructure/clients/user-service.client';
import db from '../../infrastructure/database/connection';

const logger = createLogger('profile-insights-service');

export interface ProfileView {
  id: string;
  viewerId: string;
  viewedUserId: string;
  viewedAt: Date;
  source: 'discovery' | 'search' | 'match_list' | 'top_picks' | 'likes_you';
  duration?: number; // seconds spent viewing
}

export interface ProfileInsights {
  userId: string;
  period: 'today' | 'week' | 'month' | 'all_time';
  stats: {
    totalViews: number;
    uniqueViewers: number;
    viewsFromDiscovery: number;
    viewsFromSearch: number;
    likesReceived: number;
    superLikesReceived: number;
    matches: number;
    conversionRate: number; // views to likes
    matchRate: number; // likes to matches
  };
  topViewers: Array<{
    userId: string;
    viewCount: number;
    lastViewedAt: Date;
    hasLiked: boolean;
    hasMatched: boolean;
  }>;
  viewTrends: Array<{
    date: string;
    views: number;
    uniqueViewers: number;
  }>;
  peakHours: Array<{
    hour: number;
    viewCount: number;
  }>;
}

export interface WhoLikedYou {
  userId: string;
  likedAt: Date;
  isSuperLike: boolean;
  hasMessage: boolean;
  messagePreview?: string;
  compatibilityScore?: number;
  commonInterests: string[];
  distance?: number;
}

export class ProfileInsightsService {
  private db: Knex;

  // Configuration
  private readonly MAX_TOP_VIEWERS = 10;
  private readonly VIEW_TRACKING_ENABLED = true;

  constructor(database: Knex = db) {
    this.db = database;
  }

  /**
   * Track a profile view
   */
  async trackProfileView(data: {
    viewerId: string;
    viewedUserId: string;
    source: string;
    duration?: number;
  }): Promise<void> {
    try {
      if (!this.VIEW_TRACKING_ENABLED) {
        return;
      }

      // Don't track self-views
      if (data.viewerId === data.viewedUserId) {
        return;
      }

      // Check if already viewed recently (within 1 hour)
      const recentView = await this.db('profile_views')
        .where({
          viewer_id: data.viewerId,
          viewed_user_id: data.viewedUserId,
        })
        .where('viewed_at', '>', new Date(Date.now() - 3600000))
        .first();

      if (recentView) {
        // Update duration if provided
        if (data.duration) {
          await this.db('profile_views')
            .where('id', recentView.id)
            .update({
              duration: this.db.raw('COALESCE(duration, 0) + ?', [data.duration]),
            });
        }
        return;
      }

      // Create new view record
      await this.db('profile_views').insert({
        viewer_id: data.viewerId,
        viewed_user_id: data.viewedUserId,
        source: data.source,
        duration: data.duration || 0,
      });

      logger.debug(`Profile view tracked: ${data.viewerId} viewed ${data.viewedUserId}`);
    } catch (error) {
      logger.error('Failed to track profile view', error);
      // Don't throw - tracking failures shouldn't break the app
    }
  }

  /**
   * Get profile insights for a user
   */
  async getProfileInsights(
    userId: string,
    period: 'today' | 'week' | 'month' | 'all_time' = 'week'
  ): Promise<ProfileInsights> {
    try {
      const dateFilter = this.getDateFilter(period);

      // Get view stats
      const viewStats = await this.getViewStats(userId, dateFilter);

      // Get engagement stats
      const engagementStats = await this.getEngagementStats(userId, dateFilter);

      // Get top viewers
      const topViewers = await this.getTopViewers(userId, dateFilter);

      // Get view trends
      const viewTrends = await this.getViewTrends(userId, dateFilter);

      // Get peak hours
      const peakHours = await this.getPeakHours(userId, dateFilter);

      // Calculate conversion rates
      const conversionRate =
        viewStats.totalViews > 0 ? (engagementStats.likesReceived / viewStats.totalViews) * 100 : 0;

      const matchRate =
        engagementStats.likesReceived > 0
          ? (engagementStats.matches / engagementStats.likesReceived) * 100
          : 0;

      return {
        userId,
        period,
        stats: {
          totalViews: viewStats.totalViews,
          uniqueViewers: viewStats.uniqueViewers,
          viewsFromDiscovery: viewStats.viewsFromDiscovery,
          viewsFromSearch: viewStats.viewsFromSearch,
          likesReceived: engagementStats.likesReceived,
          superLikesReceived: engagementStats.superLikesReceived,
          matches: engagementStats.matches,
          conversionRate: Math.round(conversionRate * 10) / 10,
          matchRate: Math.round(matchRate * 10) / 10,
        },
        topViewers,
        viewTrends,
        peakHours,
      };
    } catch (error) {
      logger.error('Failed to get profile insights', error);
      throw error;
    }
  }

  /**
   * Get users who viewed your profile
   */
  async getWhoViewedMe(
    userId: string,
    options?: { limit?: number; offset?: number; period?: string }
  ): Promise<ProfileView[]> {
    try {
      const { limit = 20, offset = 0, period = 'week' } = options || {};
      const dateFilter = this.getDateFilter(period as any);

      let query = this.db('profile_views').where('viewed_user_id', userId);

      if (dateFilter) {
        query = query.where('viewed_at', '>=', dateFilter);
      }

      const views = await query.orderBy('viewed_at', 'desc').limit(limit).offset(offset);

      return views.map(this.mapToProfileView);
    } catch (error) {
      logger.error('Failed to get who viewed me', error);
      throw error;
    }
  }

  /**
   * Get users who liked you (premium feature)
   */
  async getWhoLikedYou(
    userId: string,
    options?: { limit?: number; offset?: number; unmatchedOnly?: boolean }
  ): Promise<WhoLikedYou[]> {
    try {
      const { limit = 20, offset = 0, unmatchedOnly = false } = options || {};

      // Get likes from swipes table
      let query = this.db('swipes')
        .where('target_user_id', userId)
        .whereIn('action', ['like', 'super_like']);

      if (unmatchedOnly) {
        // Exclude users who are already matched
        const matchedUserIds = await this.db('matches')
          .where(function () {
            this.where('user1_id', userId).orWhere('user2_id', userId);
          })
          .where('status', 'matched')
          .select('user1_id', 'user2_id');

        const excludeIds = matchedUserIds.flatMap((m: any) =>
          [m.user1_id, m.user2_id].filter((id) => id !== userId)
        );

        if (excludeIds.length > 0) {
          query = query.whereNotIn('user_id', excludeIds);
        }
      }

      const likes = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

      // Enrich with user profiles and additional data
      const enrichedLikes = await Promise.all(
        likes.map(async (like: any) => {
          const isSuperLike = like.action === 'super_like';

          // Get Super Like message if exists
          let hasMessage = false;
          let messagePreview;

          if (isSuperLike) {
            const message = await this.db('super_like_messages')
              .where({
                user_id: like.user_id,
                target_user_id: userId,
              })
              .first();

            if (message) {
              hasMessage = true;
              messagePreview = message.message.substring(0, 100);
            }
          }

          // Get compatibility score (placeholder - would calculate from matching service)
          const compatibilityScore = 75;

          // Get common interests (placeholder)
          const commonInterests: string[] = [];

          return {
            userId: like.user_id,
            likedAt: new Date(like.created_at),
            isSuperLike,
            hasMessage,
            messagePreview,
            compatibilityScore,
            commonInterests,
            distance: undefined, // Would calculate from location
          };
        })
      );

      return enrichedLikes;
    } catch (error) {
      logger.error('Failed to get who liked you', error);
      throw error;
    }
  }

  /**
   * Get count of users who liked you
   */
  async getWhoLikedYouCount(userId: string): Promise<number> {
    try {
      // Count likes that haven't matched yet
      const matchedUserIds = await this.db('matches')
        .where(function () {
          this.where('user1_id', userId).orWhere('user2_id', userId);
        })
        .where('status', 'matched')
        .select('user1_id', 'user2_id');

      const excludeIds = matchedUserIds.flatMap((m: any) =>
        [m.user1_id, m.user2_id].filter((id) => id !== userId)
      );

      let query = this.db('swipes')
        .where('target_user_id', userId)
        .whereIn('action', ['like', 'super_like']);

      if (excludeIds.length > 0) {
        query = query.whereNotIn('user_id', excludeIds);
      }

      const result = await query.count('* as count').first();

      return parseInt((result?.count as string) || '0', 10);
    } catch (error) {
      logger.error('Failed to get who liked you count', error);
      throw error;
    }
  }

  /**
   * Get view stats
   */
  private async getViewStats(
    userId: string,
    dateFilter: Date | null
  ): Promise<{
    totalViews: number;
    uniqueViewers: number;
    viewsFromDiscovery: number;
    viewsFromSearch: number;
  }> {
    let query = this.db('profile_views').where('viewed_user_id', userId);

    if (dateFilter) {
      query = query.where('viewed_at', '>=', dateFilter);
    }

    const [totalResult, uniqueResult, discoveryResult, searchResult] = await Promise.all([
      query.clone().count('* as count').first(),
      query.clone().countDistinct('viewer_id as count').first(),
      query.clone().where('source', 'discovery').count('* as count').first(),
      query.clone().where('source', 'search').count('* as count').first(),
    ]);

    return {
      totalViews: parseInt((totalResult?.count as string) || '0', 10),
      uniqueViewers: parseInt((uniqueResult?.count as string) || '0', 10),
      viewsFromDiscovery: parseInt((discoveryResult?.count as string) || '0', 10),
      viewsFromSearch: parseInt((searchResult?.count as string) || '0', 10),
    };
  }

  /**
   * Get engagement stats
   */
  private async getEngagementStats(
    userId: string,
    dateFilter: Date | null
  ): Promise<{
    likesReceived: number;
    superLikesReceived: number;
    matches: number;
  }> {
    let swipeQuery = this.db('swipes').where('target_user_id', userId);
    let matchQuery = this.db('matches').where(function () {
      this.where('user1_id', userId).orWhere('user2_id', userId);
    });

    if (dateFilter) {
      swipeQuery = swipeQuery.where('created_at', '>=', dateFilter);
      matchQuery = matchQuery.where('matched_at', '>=', dateFilter);
    }

    const [likesResult, superLikesResult, matchesResult] = await Promise.all([
      swipeQuery.clone().where('action', 'like').count('* as count').first(),
      swipeQuery.clone().where('action', 'super_like').count('* as count').first(),
      matchQuery.where('status', 'matched').count('* as count').first(),
    ]);

    return {
      likesReceived: parseInt((likesResult?.count as string) || '0', 10),
      superLikesReceived: parseInt((superLikesResult?.count as string) || '0', 10),
      matches: parseInt((matchesResult?.count as string) || '0', 10),
    };
  }

  /**
   * Get top viewers
   */
  private async getTopViewers(userId: string, dateFilter: Date | null): Promise<any[]> {
    let query = this.db('profile_views')
      .where('viewed_user_id', userId)
      .groupBy('viewer_id')
      .select('viewer_id')
      .count('* as view_count')
      .max('viewed_at as last_viewed_at')
      .orderBy('view_count', 'desc')
      .limit(this.MAX_TOP_VIEWERS);

    if (dateFilter) {
      query = query.where('viewed_at', '>=', dateFilter);
    }

    const topViewers = await query;

    // Enrich with like/match status
    return Promise.all(
      topViewers.map(async (viewer: any) => {
        const [hasLiked, hasMatched] = await Promise.all([
          this.db('swipes')
            .where({
              user_id: viewer.viewer_id,
              target_user_id: userId,
            })
            .whereIn('action', ['like', 'super_like'])
            .first()
            .then((result) => !!result),
          this.db('matches')
            .where(function () {
              this.where({
                user1_id: userId,
                user2_id: viewer.viewer_id,
              }).orWhere({
                user1_id: viewer.viewer_id,
                user2_id: userId,
              });
            })
            .where('status', 'matched')
            .first()
            .then((result) => !!result),
        ]);

        return {
          userId: viewer.viewer_id,
          viewCount: parseInt(viewer.view_count, 10),
          lastViewedAt: new Date(viewer.last_viewed_at),
          hasLiked,
          hasMatched,
        };
      })
    );
  }

  /**
   * Get view trends over time
   */
  private async getViewTrends(userId: string, dateFilter: Date | null): Promise<any[]> {
    if (!dateFilter) {
      // For all_time, return last 30 days
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const trends = await this.db('profile_views')
      .where('viewed_user_id', userId)
      .where('viewed_at', '>=', dateFilter)
      .select(this.db.raw('DATE(viewed_at) as date'))
      .count('* as views')
      .countDistinct('viewer_id as unique_viewers')
      .groupBy(this.db.raw('DATE(viewed_at)'))
      .orderBy('date', 'asc');

    return trends.map((trend: any) => ({
      date: trend.date,
      views: parseInt(trend.views, 10),
      uniqueViewers: parseInt(trend.unique_viewers, 10),
    }));
  }

  /**
   * Get peak hours for profile views
   */
  private async getPeakHours(userId: string, dateFilter: Date | null): Promise<any[]> {
    let query = this.db('profile_views')
      .where('viewed_user_id', userId)
      .select(this.db.raw('EXTRACT(HOUR FROM viewed_at) as hour'))
      .count('* as view_count')
      .groupBy(this.db.raw('EXTRACT(HOUR FROM viewed_at)'))
      .orderBy('view_count', 'desc');

    if (dateFilter) {
      query = query.where('viewed_at', '>=', dateFilter);
    }

    const hours = await query;

    return hours.map((h: any) => ({
      hour: parseInt(h.hour, 10),
      viewCount: parseInt(h.view_count, 10),
    }));
  }

  /**
   * Get date filter based on period
   */
  private getDateFilter(period: 'today' | 'week' | 'month' | 'all_time'): Date | null {
    const now = new Date();

    switch (period) {
      case 'today': {
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return today;
      }
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'all_time':
        return null;
      default:
        return null;
    }
  }

  /**
   * Map database record to ProfileView
   */
  private mapToProfileView(record: any): ProfileView {
    return {
      id: record.id,
      viewerId: record.viewer_id,
      viewedUserId: record.viewed_user_id,
      viewedAt: new Date(record.viewed_at),
      source: record.source,
      duration: record.duration,
    };
  }
}

export default new ProfileInsightsService();
