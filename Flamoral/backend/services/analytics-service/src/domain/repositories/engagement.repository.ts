/**
 * Engagement Metrics Repository
 * Handles DAU, WAU, MAU, retention, and cohort analysis
 */

import { dbClient } from '../../infrastructure/database/db-client';

export interface EngagementMetrics {
  date: Date;
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  newUsers: number;
  returningUsers: number;
  churnedUsers: number;
}

export interface RetentionCohort {
  cohortDate: Date;
  cohortSize: number;
  day1Retention: number;
  day7Retention: number;
  day30Retention: number;
  day90Retention: number;
}

export interface UserActivitySummary {
  userId: string;
  lastActiveAt: Date;
  totalSessions: number;
  totalDaysActive: number;
  averageSessionDuration: number;
  totalSwipes: number;
  totalMatches: number;
  totalMessages: number;
  isActive: boolean;
}

export class EngagementRepository {
  /**
   * Get Daily Active Users (DAU)
   */
  async getDAU(date: Date): Promise<number> {
    const query = `
      SELECT COUNT(DISTINCT user_id) as dau
      FROM session_events
      WHERE DATE(start_time) = DATE($1)
      AND user_id IS NOT NULL
    `;

    const result = await dbClient.query(query, [date]);
    return parseInt(result.rows[0].dau, 10);
  }

  /**
   * Get Weekly Active Users (WAU)
   */
  async getWAU(endDate: Date): Promise<number> {
    const query = `
      SELECT COUNT(DISTINCT user_id) as wau
      FROM session_events
      WHERE start_time >= $1 - INTERVAL '7 days'
      AND start_time <= $1
      AND user_id IS NOT NULL
    `;

    const result = await dbClient.query(query, [endDate]);
    return parseInt(result.rows[0].wau, 10);
  }

  /**
   * Get Monthly Active Users (MAU)
   */
  async getMAU(endDate: Date): Promise<number> {
    const query = `
      SELECT COUNT(DISTINCT user_id) as mau
      FROM session_events
      WHERE start_time >= $1 - INTERVAL '30 days'
      AND start_time <= $1
      AND user_id IS NOT NULL
    `;

    const result = await dbClient.query(query, [endDate]);
    return parseInt(result.rows[0].mau, 10);
  }

  /**
   * Get engagement metrics for a date range
   */
  async getEngagementMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<EngagementMetrics[]> {
    const query = `
      WITH daily_users AS (
        SELECT
          DATE(start_time) as activity_date,
          user_id
        FROM session_events
        WHERE start_time >= $1 AND start_time <= $2
        AND user_id IS NOT NULL
        GROUP BY DATE(start_time), user_id
      ),
      user_first_seen AS (
        SELECT
          user_id,
          MIN(DATE(start_time)) as first_seen_date
        FROM session_events
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      )
      SELECT
        d.activity_date as date,
        COUNT(DISTINCT d.user_id) as dau,
        COUNT(DISTINCT ufs.user_id) FILTER (WHERE ufs.first_seen_date = d.activity_date) as new_users
      FROM daily_users d
      LEFT JOIN user_first_seen ufs ON d.user_id = ufs.user_id
      GROUP BY d.activity_date
      ORDER BY d.activity_date
    `;

    const result = await dbClient.query(query, [startDate, endDate]);

    return result.rows.map(row => ({
      date: row.date,
      dau: parseInt(row.dau, 10),
      wau: 0, // Will be calculated separately
      mau: 0, // Will be calculated separately
      newUsers: parseInt(row.new_users, 10),
      returningUsers: parseInt(row.dau, 10) - parseInt(row.new_users, 10),
      churnedUsers: 0, // Will be calculated separately
    }));
  }

  /**
   * Get retention cohorts
   */
  async getRetentionCohorts(
    startDate: Date,
    endDate: Date
  ): Promise<RetentionCohort[]> {
    const query = `
      WITH user_cohorts AS (
        SELECT
          user_id,
          DATE(MIN(start_time)) as cohort_date
        FROM session_events
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      ),
      user_activity AS (
        SELECT
          uc.user_id,
          uc.cohort_date,
          DATE(se.start_time) as activity_date,
          DATE(se.start_time) - uc.cohort_date as days_since_signup
        FROM user_cohorts uc
        JOIN session_events se ON uc.user_id = se.user_id
        WHERE uc.cohort_date >= $1 AND uc.cohort_date <= $2
      )
      SELECT
        cohort_date,
        COUNT(DISTINCT user_id) as cohort_size,
        COUNT(DISTINCT CASE WHEN days_since_signup = 1 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as day_1_retention,
        COUNT(DISTINCT CASE WHEN days_since_signup = 7 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as day_7_retention,
        COUNT(DISTINCT CASE WHEN days_since_signup = 30 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as day_30_retention,
        COUNT(DISTINCT CASE WHEN days_since_signup = 90 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as day_90_retention
      FROM user_activity
      GROUP BY cohort_date
      ORDER BY cohort_date DESC
    `;

    const result = await dbClient.query(query, [startDate, endDate]);

    return result.rows.map(row => ({
      cohortDate: row.cohort_date,
      cohortSize: parseInt(row.cohort_size, 10),
      day1Retention: parseFloat(row.day_1_retention || '0'),
      day7Retention: parseFloat(row.day_7_retention || '0'),
      day30Retention: parseFloat(row.day_30_retention || '0'),
      day90Retention: parseFloat(row.day_90_retention || '0'),
    }));
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: string): Promise<UserActivitySummary> {
    const query = `
      SELECT
        user_id,
        MAX(start_time) as last_active_at,
        COUNT(*) as total_sessions,
        COUNT(DISTINCT DATE(start_time)) as total_days_active,
        AVG(duration) as average_session_duration
      FROM session_events
      WHERE user_id = $1
      GROUP BY user_id
    `;

    const sessionResult = await dbClient.query(query, [userId]);

    if (sessionResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const sessionData = sessionResult.rows[0];

    // Get swipe count
    const swipeQuery = 'SELECT COUNT(*) as count FROM swipe_events WHERE user_id = $1';
    const swipeResult = await dbClient.query(swipeQuery, [userId]);

    // Get match count
    const matchQuery = `
      SELECT COUNT(*) as count FROM match_events
      WHERE user_id_1 = $1 OR user_id_2 = $1
    `;
    const matchResult = await dbClient.query(matchQuery, [userId]);

    // Get message count
    const messageQuery = `
      SELECT COUNT(*) as count FROM message_events
      WHERE sender_id = $1
    `;
    const messageResult = await dbClient.query(messageQuery, [userId]);

    const lastActive = new Date(sessionData.last_active_at);
    const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);

    return {
      userId,
      lastActiveAt: lastActive,
      totalSessions: parseInt(sessionData.total_sessions, 10),
      totalDaysActive: parseInt(sessionData.total_days_active, 10),
      averageSessionDuration: parseFloat(sessionData.average_session_duration || '0'),
      totalSwipes: parseInt(swipeResult.rows[0].count, 10),
      totalMatches: parseInt(matchResult.rows[0].count, 10),
      totalMessages: parseInt(messageResult.rows[0].count, 10),
      isActive: daysSinceActive <= 30,
    };
  }

  /**
   * Get stickiness ratio (DAU/MAU)
   */
  async getStickinessRatio(date: Date): Promise<number> {
    const dau = await this.getDAU(date);
    const mau = await this.getMAU(date);

    return mau > 0 ? (dau / mau) * 100 : 0;
  }

  /**
   * Get churn rate
   */
  async getChurnRate(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalUsersAtStart: number;
    churnedUsers: number;
    churnRate: number;
  }> {
    // Users active in the period before start date
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM session_events
      WHERE start_time >= $1 - INTERVAL '30 days'
      AND start_time < $1
      AND user_id IS NOT NULL
    `;
    const activeResult = await dbClient.query(activeUsersQuery, [startDate]);
    const totalUsersAtStart = parseInt(activeResult.rows[0].count, 10);

    // Users who were active before but not during the period
    const churnedQuery = `
      SELECT COUNT(DISTINCT se1.user_id) as count
      FROM session_events se1
      WHERE se1.start_time >= $1 - INTERVAL '30 days'
      AND se1.start_time < $1
      AND se1.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM session_events se2
        WHERE se2.user_id = se1.user_id
        AND se2.start_time >= $1
        AND se2.start_time <= $2
      )
    `;
    const churnedResult = await dbClient.query(churnedQuery, [startDate, endDate]);
    const churnedUsers = parseInt(churnedResult.rows[0].count, 10);

    return {
      totalUsersAtStart,
      churnedUsers,
      churnRate: totalUsersAtStart > 0 ? (churnedUsers / totalUsersAtStart) * 100 : 0,
    };
  }

  /**
   * Get power users (top percentile by activity)
   */
  async getPowerUsers(
    percentile: number = 10,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserActivitySummary[]> {
    let query = `
      WITH user_stats AS (
        SELECT
          user_id,
          MAX(start_time) as last_active_at,
          COUNT(*) as total_sessions,
          COUNT(DISTINCT DATE(start_time)) as total_days_active,
          AVG(duration) as average_session_duration,
          SUM(swipe_count) as total_swipes,
          SUM(message_count) as total_messages
        FROM session_events
        WHERE user_id IS NOT NULL
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND start_time >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND start_time <= $${params.length}`;
    }

    query += `
        GROUP BY user_id
      ),
      ranked_users AS (
        SELECT
          *,
          PERCENT_RANK() OVER (ORDER BY total_sessions DESC) as percentile_rank
        FROM user_stats
      )
      SELECT * FROM ranked_users
      WHERE percentile_rank <= $${params.length + 1} / 100.0
      ORDER BY total_sessions DESC
      LIMIT 100
    `;

    params.push(percentile);

    const result = await dbClient.query(query, params);

    return result.rows.map(row => ({
      userId: row.user_id,
      lastActiveAt: row.last_active_at,
      totalSessions: parseInt(row.total_sessions, 10),
      totalDaysActive: parseInt(row.total_days_active, 10),
      averageSessionDuration: parseFloat(row.average_session_duration || '0'),
      totalSwipes: parseInt(row.total_swipes || '0', 10),
      totalMatches: 0, // Would need separate query
      totalMessages: parseInt(row.total_messages || '0', 10),
      isActive: true,
    }));
  }

  /**
   * Get feature usage statistics
   */
  async getFeatureUsage(
    startDate: Date,
    endDate: Date
  ): Promise<{
    feature: string;
    totalUsers: number;
    totalEvents: number;
    averagePerUser: number;
  }[]> {
    const query = `
      SELECT
        event_name as feature,
        COUNT(DISTINCT user_id) as total_users,
        COUNT(*) as total_events,
        COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT user_id), 0) as average_per_user
      FROM tracking_events
      WHERE created_at >= $1 AND created_at <= $2
      AND user_id IS NOT NULL
      GROUP BY event_name
      ORDER BY total_events DESC
    `;

    const result = await dbClient.query(query, [startDate, endDate]);

    return result.rows.map(row => ({
      feature: row.feature,
      totalUsers: parseInt(row.total_users, 10),
      totalEvents: parseInt(row.total_events, 10),
      averagePerUser: parseFloat(row.average_per_user || '0'),
    }));
  }

  /**
   * Get time on app statistics
   */
  async getTimeOnAppStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    averageSessionDuration: number;
    medianSessionDuration: number;
    totalTimeSpent: number;
    averageTimePerUser: number;
  }> {
    const query = `
      SELECT
        AVG(duration) as avg_duration,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as median_duration,
        SUM(duration) as total_duration,
        SUM(duration)::DECIMAL / NULLIF(COUNT(DISTINCT user_id), 0) as avg_time_per_user
      FROM session_events
      WHERE start_time >= $1 AND start_time <= $2
      AND duration IS NOT NULL
    `;

    const result = await dbClient.query(query, [startDate, endDate]);
    const row = result.rows[0];

    return {
      averageSessionDuration: parseFloat(row.avg_duration || '0'),
      medianSessionDuration: parseFloat(row.median_duration || '0'),
      totalTimeSpent: parseFloat(row.total_duration || '0'),
      averageTimePerUser: parseFloat(row.avg_time_per_user || '0'),
    };
  }
}

export const engagementRepository = new EngagementRepository();
export default engagementRepository;
