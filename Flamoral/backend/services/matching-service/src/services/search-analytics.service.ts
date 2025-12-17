/**
 * Search Analytics Service
 * Tracks search patterns and performance for optimization
 */

import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import redisClient from '../infrastructure/cache/redis.client';

interface SearchEvent {
  userId: string;
  filters: any;
  resultCount: number;
  responseTime: number;
  timestamp: Date;
}

interface SearchPattern {
  commonFilters: Record<string, number>;
  avgResultCount: number;
  avgResponseTime: number;
  peakUsageTimes: string[];
}

export class SearchAnalyticsService {
  /**
   * Track a search event
   */
  async trackSearch(event: SearchEvent): Promise<void> {
    try {
      // Store in database for long-term analytics
      await db('search_analytics').insert({
        id: uuidv4(),
        user_id: event.userId,
        filters: JSON.stringify(event.filters),
        result_count: event.resultCount,
        response_time_ms: event.responseTime,
        timestamp: event.timestamp,
      });

      // Update Redis counters for real-time stats
      await this.updateRealtimeStats(event);

      logger.debug('Search event tracked', {
        userId: event.userId,
        resultCount: event.resultCount,
        responseTime: event.responseTime,
      });
    } catch (error: any) {
      logger.error('Failed to track search event', {
        error: error.message,
        userId: event.userId,
      });
      // Don't throw - analytics shouldn't break search functionality
    }
  }

  /**
   * Update real-time statistics in Redis
   */
  private async updateRealtimeStats(event: SearchEvent): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();

      // Increment daily search counter
      await redisClient.incr(`search:daily:${today}`);

      // Increment hourly counter
      await redisClient.incr(`search:hourly:${today}:${hour}`);

      // Track average response time (using sorted set)
      await redisClient.zAdd(`search:response_times:${today}`, {
        score: event.responseTime,
        value: event.userId + ':' + Date.now(),
      });

      // Track filter usage
      if (event.filters) {
        Object.keys(event.filters).forEach(async (filterKey) => {
          await redisClient.incr(`search:filter:${filterKey}:${today}`);
        });
      }

      // Set expiry for daily keys (30 days)
      await redisClient.expire(`search:daily:${today}`, 30 * 24 * 60 * 60);
      await redisClient.expire(`search:hourly:${today}:${hour}`, 7 * 24 * 60 * 60);
      await redisClient.expire(`search:response_times:${today}`, 7 * 24 * 60 * 60);
    } catch (error) {
      logger.warn('Failed to update real-time search stats', { error });
    }
  }

  /**
   * Get search patterns for a user
   */
  async getUserSearchPatterns(userId: string, days: number = 30): Promise<SearchPattern> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const searches = await db('search_analytics')
        .where({ user_id: userId })
        .where('timestamp', '>=', since)
        .select('filters', 'result_count', 'response_time_ms', 'timestamp');

      // Analyze filter usage
      const filterUsage: Record<string, number> = {};
      let totalResults = 0;
      let totalResponseTime = 0;
      const hourUsage: Record<number, number> = {};

      searches.forEach((search) => {
        const filters = JSON.parse(search.filters);
        Object.keys(filters).forEach((key) => {
          filterUsage[key] = (filterUsage[key] || 0) + 1;
        });

        totalResults += search.result_count;
        totalResponseTime += search.response_time_ms;

        const hour = new Date(search.timestamp).getHours();
        hourUsage[hour] = (hourUsage[hour] || 0) + 1;
      });

      // Get peak usage times
      const peakHours = Object.entries(hourUsage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => `${hour}:00-${hour}:59`);

      return {
        commonFilters: filterUsage,
        avgResultCount: searches.length > 0 ? Math.round(totalResults / searches.length) : 0,
        avgResponseTime: searches.length > 0 ? Math.round(totalResponseTime / searches.length) : 0,
        peakUsageTimes: peakHours,
      };
    } catch (error: any) {
      logger.error('Failed to get user search patterns', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get overall search statistics
   */
  async getOverallStats(days: number = 7): Promise<{
    totalSearches: number;
    avgResponseTime: number;
    avgResultCount: number;
    popularFilters: Record<string, number>;
    peakHours: number[];
  }> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const stats = await db('search_analytics')
        .where('timestamp', '>=', since)
        .select(
          db.raw('COUNT(*) as total_searches'),
          db.raw('AVG(response_time_ms) as avg_response_time'),
          db.raw('AVG(result_count) as avg_result_count')
        )
        .first();

      // Get filter popularity
      const searches = await db('search_analytics')
        .where('timestamp', '>=', since)
        .select('filters', 'timestamp');

      const filterUsage: Record<string, number> = {};
      const hourUsage: Record<number, number> = {};

      searches.forEach((search) => {
        try {
          const filters = JSON.parse(search.filters);
          Object.keys(filters).forEach((key) => {
            if (filters[key] !== undefined && filters[key] !== null) {
              filterUsage[key] = (filterUsage[key] || 0) + 1;
            }
          });

          const hour = new Date(search.timestamp).getHours();
          hourUsage[hour] = (hourUsage[hour] || 0) + 1;
        } catch (e) {
          // Skip invalid JSON
        }
      });

      // Get top 3 peak hours
      const peakHours = Object.entries(hourUsage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      return {
        totalSearches: parseInt(stats?.total_searches) || 0,
        avgResponseTime: Math.round(parseFloat(stats?.avg_response_time) || 0),
        avgResultCount: Math.round(parseFloat(stats?.avg_result_count) || 0),
        popularFilters: filterUsage,
        peakHours,
      };
    } catch (error: any) {
      logger.error('Failed to get overall search stats', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get search performance metrics
   */
  async getPerformanceMetrics(days: number = 7): Promise<{
    slowQueries: Array<{
      filters: any;
      responseTime: number;
      timestamp: Date;
    }>;
    avgResponseTimeByFilter: Record<string, number>;
    zeroResultQueries: number;
  }> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Get slow queries (> 1000ms)
      const slowQueries = await db('search_analytics')
        .where('timestamp', '>=', since)
        .where('response_time_ms', '>', 1000)
        .orderBy('response_time_ms', 'desc')
        .limit(10)
        .select('filters', 'response_time_ms', 'timestamp');

      // Get zero result queries
      const zeroResults = await db('search_analytics')
        .where('timestamp', '>=', since)
        .where('result_count', 0)
        .count('* as count')
        .first();

      // Calculate avg response time by filter type
      const searches = await db('search_analytics')
        .where('timestamp', '>=', since)
        .select('filters', 'response_time_ms');

      const filterResponseTimes: Record<string, number[]> = {};

      searches.forEach((search) => {
        try {
          const filters = JSON.parse(search.filters);
          Object.keys(filters).forEach((key) => {
            if (!filterResponseTimes[key]) {
              filterResponseTimes[key] = [];
            }
            filterResponseTimes[key].push(search.response_time_ms);
          });
        } catch (e) {
          // Skip invalid JSON
        }
      });

      const avgResponseTimeByFilter: Record<string, number> = {};
      Object.entries(filterResponseTimes).forEach(([filter, times]) => {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        avgResponseTimeByFilter[filter] = Math.round(avg);
      });

      return {
        slowQueries: slowQueries.map((q) => ({
          filters: JSON.parse(q.filters),
          responseTime: q.response_time_ms,
          timestamp: q.timestamp,
        })),
        avgResponseTimeByFilter,
        zeroResultQueries: parseInt(zeroResults?.count as string) || 0,
      };
    } catch (error: any) {
      logger.error('Failed to get performance metrics', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Track no-results searches for improving recommendations
   */
  async trackNoResults(userId: string, filters: any): Promise<void> {
    try {
      await db('search_no_results').insert({
        id: uuidv4(),
        user_id: userId,
        filters: JSON.stringify(filters),
        timestamp: new Date(),
      });

      logger.debug('No-results search tracked', { userId });
    } catch (error: any) {
      logger.error('Failed to track no-results search', {
        error: error.message,
      });
    }
  }

  /**
   * Get suggestions for users with no results
   */
  async getSuggestionsForNoResults(userId: string): Promise<{
    relaxedFilters: any;
    suggestions: string[];
  }> {
    try {
      // Get recent no-results searches
      const recentNoResults = await db('search_no_results')
        .where({ user_id: userId })
        .orderBy('timestamp', 'desc')
        .limit(5)
        .select('filters');

      if (recentNoResults.length === 0) {
        return {
          relaxedFilters: {},
          suggestions: [],
        };
      }

      // Analyze which filters to relax
      const filters = JSON.parse(recentNoResults[0].filters);
      const relaxedFilters: any = { ...filters };
      const suggestions: string[] = [];

      // Relax age range
      if (filters.minAge || filters.maxAge) {
        if (filters.minAge) relaxedFilters.minAge = Math.max(18, filters.minAge - 3);
        if (filters.maxAge) relaxedFilters.maxAge = Math.min(100, filters.maxAge + 3);
        suggestions.push('Try expanding your age range');
      }

      // Relax distance
      if (filters.maxDistance) {
        relaxedFilters.maxDistance = Math.min(500, filters.maxDistance * 1.5);
        suggestions.push('Try increasing your search radius');
      }

      // Remove or relax specific filters
      if (filters.verifiedOnly) {
        suggestions.push('Try including unverified profiles');
      }

      if (filters.education && filters.education.length > 0) {
        suggestions.push('Try broadening your education preferences');
      }

      return {
        relaxedFilters,
        suggestions,
      };
    } catch (error: any) {
      logger.error('Failed to get no-results suggestions', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }
}

export const searchAnalyticsService = new SearchAnalyticsService();
export default searchAnalyticsService;
