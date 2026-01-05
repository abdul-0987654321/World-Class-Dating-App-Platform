/**
 * Time-Series Data Aggregation Repository
 * Handles pre-aggregated analytics data for faster dashboard queries
 */

import { dbClient } from '../../infrastructure/database/db-client';

export interface DailyMetrics {
  date: Date;
  dau: number;
  newUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  totalSwipes: number;
  totalMatches: number;
  totalMessages: number;
  revenue: number;
  newSubscribers: number;
}

export interface HourlyMetrics {
  hour: Date;
  activeUsers: number;
  sessions: number;
  swipes: number;
  matches: number;
  messages: number;
}

export interface WeeklyMetrics {
  week: Date;
  wau: number;
  newUsers: number;
  totalRevenue: number;
  averageSessionsPerUser: number;
  retentionRate: number;
}

export interface MonthlyMetrics {
  month: Date;
  mau: number;
  newUsers: number;
  totalRevenue: number;
  mrr: number;
  churnRate: number;
}

export class TimeSeriesRepository {
  /**
   * Aggregate daily metrics
   * This should be run daily via a cron job
   */
  async aggregateDailyMetrics(date: Date): Promise<DailyMetrics> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get DAU
    const dauQuery = `
      SELECT COUNT(DISTINCT user_id) as dau
      FROM session_events
      WHERE start_time >= $1 AND start_time <= $2
      AND user_id IS NOT NULL
    `;
    const dauResult = await dbClient.query(dauQuery, [startOfDay, endOfDay]);
    const dau = parseInt(dauResult.rows[0].dau, 10);

    // Get new users
    const newUsersQuery = `
      SELECT COUNT(DISTINCT se.user_id) as count
      FROM session_events se
      WHERE se.start_time >= $1 AND se.start_time <= $2
      AND se.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM session_events se2
        WHERE se2.user_id = se.user_id
        AND se2.start_time < $1
      )
    `;
    const newUsersResult = await dbClient.query(newUsersQuery, [startOfDay, endOfDay]);
    const newUsers = parseInt(newUsersResult.rows[0].count, 10);

    // Get session metrics
    const sessionQuery = `
      SELECT
        COUNT(*) as total_sessions,
        AVG(duration) as avg_duration
      FROM session_events
      WHERE start_time >= $1 AND start_time <= $2
    `;
    const sessionResult = await dbClient.query(sessionQuery, [startOfDay, endOfDay]);
    const totalSessions = parseInt(sessionResult.rows[0].total_sessions, 10);
    const averageSessionDuration = parseFloat(sessionResult.rows[0].avg_duration || '0');

    // Get swipes
    const swipeQuery = `
      SELECT COUNT(*) as count
      FROM swipe_events
      WHERE timestamp >= $1 AND timestamp <= $2
    `;
    const swipeResult = await dbClient.query(swipeQuery, [startOfDay, endOfDay]);
    const totalSwipes = parseInt(swipeResult.rows[0].count, 10);

    // Get matches
    const matchQuery = `
      SELECT COUNT(*) as count
      FROM match_events
      WHERE timestamp >= $1 AND timestamp <= $2
    `;
    const matchResult = await dbClient.query(matchQuery, [startOfDay, endOfDay]);
    const totalMatches = parseInt(matchResult.rows[0].count, 10);

    // Get messages
    const messageQuery = `
      SELECT COUNT(*) as count
      FROM message_events
      WHERE timestamp >= $1 AND timestamp <= $2
    `;
    const messageResult = await dbClient.query(messageQuery, [startOfDay, endOfDay]);
    const totalMessages = parseInt(messageResult.rows[0].count, 10);

    // Get revenue
    const revenueQuery = `
      SELECT
        SUM(amount) as revenue,
        COUNT(DISTINCT CASE WHEN transaction_type = 'subscription' AND (metadata->>'is_renewal')::boolean = false THEN user_id END) as new_subscribers
      FROM revenue_transactions
      WHERE status = 'completed'
      AND timestamp >= $1 AND timestamp <= $2
    `;
    const revenueResult = await dbClient.query(revenueQuery, [startOfDay, endOfDay]);
    const revenue = parseFloat(revenueResult.rows[0].revenue || '0');
    const newSubscribers = parseInt(revenueResult.rows[0].new_subscribers || '0', 10);

    // Insert into aggregated table
    const insertQuery = `
      INSERT INTO daily_metrics (
        date, dau, new_users, total_sessions, average_session_duration,
        total_swipes, total_matches, total_messages, revenue, new_subscribers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (date) DO UPDATE SET
        dau = EXCLUDED.dau,
        new_users = EXCLUDED.new_users,
        total_sessions = EXCLUDED.total_sessions,
        average_session_duration = EXCLUDED.average_session_duration,
        total_swipes = EXCLUDED.total_swipes,
        total_matches = EXCLUDED.total_matches,
        total_messages = EXCLUDED.total_messages,
        revenue = EXCLUDED.revenue,
        new_subscribers = EXCLUDED.new_subscribers,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await dbClient.query(insertQuery, [
      startOfDay,
      dau,
      newUsers,
      totalSessions,
      averageSessionDuration,
      totalSwipes,
      totalMatches,
      totalMessages,
      revenue,
      newSubscribers,
    ]);

    return this.mapRowToDailyMetrics(result.rows[0]);
  }

  /**
   * Get daily metrics for a date range
   */
  async getDailyMetrics(startDate: Date, endDate: Date): Promise<DailyMetrics[]> {
    const query = `
      SELECT * FROM daily_metrics
      WHERE date >= $1 AND date <= $2
      ORDER BY date DESC
    `;

    const result = await dbClient.query(query, [startDate, endDate]);
    return result.rows.map(this.mapRowToDailyMetrics);
  }

  /**
   * Aggregate hourly metrics
   */
  async aggregateHourlyMetrics(hour: Date): Promise<HourlyMetrics> {
    const startOfHour = new Date(hour);
    startOfHour.setMinutes(0, 0, 0);

    const endOfHour = new Date(hour);
    endOfHour.setMinutes(59, 59, 999);

    // Get active users
    const userQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM session_events
      WHERE start_time >= $1 AND start_time <= $2
      AND user_id IS NOT NULL
    `;
    const userResult = await dbClient.query(userQuery, [startOfHour, endOfHour]);
    const activeUsers = parseInt(userResult.rows[0].count, 10);

    // Get sessions
    const sessionQuery = `
      SELECT COUNT(*) as count
      FROM session_events
      WHERE start_time >= $1 AND start_time <= $2
    `;
    const sessionResult = await dbClient.query(sessionQuery, [startOfHour, endOfHour]);
    const sessions = parseInt(sessionResult.rows[0].count, 10);

    // Get swipes
    const swipeQuery = `
      SELECT COUNT(*) as count
      FROM swipe_events
      WHERE timestamp >= $1 AND timestamp <= $2
    `;
    const swipeResult = await dbClient.query(swipeQuery, [startOfHour, endOfHour]);
    const swipes = parseInt(swipeResult.rows[0].count, 10);

    // Get matches
    const matchQuery = `
      SELECT COUNT(*) as count
      FROM match_events
      WHERE timestamp >= $1 AND timestamp <= $2
    `;
    const matchResult = await dbClient.query(matchQuery, [startOfHour, endOfHour]);
    const matches = parseInt(matchResult.rows[0].count, 10);

    // Get messages
    const messageQuery = `
      SELECT COUNT(*) as count
      FROM message_events
      WHERE timestamp >= $1 AND timestamp <= $2
    `;
    const messageResult = await dbClient.query(messageQuery, [startOfHour, endOfHour]);
    const messages = parseInt(messageResult.rows[0].count, 10);

    // Insert into aggregated table
    const insertQuery = `
      INSERT INTO hourly_metrics (
        hour, active_users, sessions, swipes, matches, messages
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (hour) DO UPDATE SET
        active_users = EXCLUDED.active_users,
        sessions = EXCLUDED.sessions,
        swipes = EXCLUDED.swipes,
        matches = EXCLUDED.matches,
        messages = EXCLUDED.messages,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await dbClient.query(insertQuery, [
      startOfHour,
      activeUsers,
      sessions,
      swipes,
      matches,
      messages,
    ]);

    return this.mapRowToHourlyMetrics(result.rows[0]);
  }

  /**
   * Get hourly metrics for a date range
   */
  async getHourlyMetrics(startDate: Date, endDate: Date): Promise<HourlyMetrics[]> {
    const query = `
      SELECT * FROM hourly_metrics
      WHERE hour >= $1 AND hour <= $2
      ORDER BY hour DESC
    `;

    const result = await dbClient.query(query, [startDate, endDate]);
    return result.rows.map(this.mapRowToHourlyMetrics);
  }

  /**
   * Get metrics grouped by time period
   */
  async getMetricsByPeriod(
    metricName: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{ period: string; value: number }>> {
    let query: string;

    if (groupBy === 'hour') {
      query = `
        SELECT hour as period, ${metricName} as value
        FROM hourly_metrics
        WHERE hour >= $1 AND hour <= $2
        ORDER BY hour DESC
      `;
    } else {
      // For day, week, month, use daily_metrics
      const truncFunc = groupBy === 'week' ? 'week' : groupBy === 'month' ? 'month' : 'day';

      query = `
        SELECT
          DATE_TRUNC('${truncFunc}', date) as period,
          SUM(${metricName}) as value
        FROM daily_metrics
        WHERE date >= $1 AND date <= $2
        GROUP BY period
        ORDER BY period DESC
      `;
    }

    const result = await dbClient.query(query, [startDate, endDate]);

    return result.rows.map((row) => ({
      period: row.period.toISOString(),
      value: parseFloat(row.value || '0'),
    }));
  }

  /**
   * Get comparison metrics (current period vs previous period)
   */
  async getComparisonMetrics(
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<{
    current: DailyMetrics;
    previous: DailyMetrics;
    percentageChange: {
      dau: number;
      revenue: number;
      sessions: number;
      matches: number;
    };
  }> {
    // Get current period aggregates
    const currentQuery = `
      SELECT
        SUM(dau) / COUNT(*) as avg_dau,
        SUM(new_users) as total_new_users,
        SUM(total_sessions) as total_sessions,
        AVG(average_session_duration) as avg_duration,
        SUM(total_swipes) as total_swipes,
        SUM(total_matches) as total_matches,
        SUM(total_messages) as total_messages,
        SUM(revenue) as total_revenue,
        SUM(new_subscribers) as total_new_subscribers
      FROM daily_metrics
      WHERE date >= $1 AND date <= $2
    `;

    const currentResult = await dbClient.query(currentQuery, [currentStart, currentEnd]);
    const current = currentResult.rows[0];

    // Get previous period aggregates
    const previousResult = await dbClient.query(currentQuery, [previousStart, previousEnd]);
    const previous = previousResult.rows[0];

    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const currentDau = parseFloat(current.avg_dau || '0');
    const previousDau = parseFloat(previous.avg_dau || '0');
    const currentRevenue = parseFloat(current.total_revenue || '0');
    const previousRevenue = parseFloat(previous.total_revenue || '0');
    const currentSessions = parseInt(current.total_sessions || '0', 10);
    const previousSessions = parseInt(previous.total_sessions || '0', 10);
    const currentMatches = parseInt(current.total_matches || '0', 10);
    const previousMatches = parseInt(previous.total_matches || '0', 10);

    return {
      current: {
        date: currentEnd,
        dau: currentDau,
        newUsers: parseInt(current.total_new_users || '0', 10),
        totalSessions: currentSessions,
        averageSessionDuration: parseFloat(current.avg_duration || '0'),
        totalSwipes: parseInt(current.total_swipes || '0', 10),
        totalMatches: currentMatches,
        totalMessages: parseInt(current.total_messages || '0', 10),
        revenue: currentRevenue,
        newSubscribers: parseInt(current.total_new_subscribers || '0', 10),
      },
      previous: {
        date: previousEnd,
        dau: previousDau,
        newUsers: parseInt(previous.total_new_users || '0', 10),
        totalSessions: previousSessions,
        averageSessionDuration: parseFloat(previous.avg_duration || '0'),
        totalSwipes: parseInt(previous.total_swipes || '0', 10),
        totalMatches: previousMatches,
        totalMessages: parseInt(previous.total_messages || '0', 10),
        revenue: previousRevenue,
        newSubscribers: parseInt(previous.total_new_subscribers || '0', 10),
      },
      percentageChange: {
        dau: calculateChange(currentDau, previousDau),
        revenue: calculateChange(currentRevenue, previousRevenue),
        sessions: calculateChange(currentSessions, previousSessions),
        matches: calculateChange(currentMatches, previousMatches),
      },
    };
  }

  /**
   * Get real-time metrics (last hour)
   */
  async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    sessionsStarted: number;
    swipesInLastHour: number;
    matchesInLastHour: number;
    messagesInLastHour: number;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const query = `
      SELECT
        (SELECT COUNT(DISTINCT user_id) FROM session_events WHERE start_time >= $1 AND user_id IS NOT NULL) as active_users,
        (SELECT COUNT(*) FROM session_events WHERE start_time >= $1) as sessions_started,
        (SELECT COUNT(*) FROM swipe_events WHERE timestamp >= $1) as swipes,
        (SELECT COUNT(*) FROM match_events WHERE timestamp >= $1) as matches,
        (SELECT COUNT(*) FROM message_events WHERE timestamp >= $1) as messages
    `;

    const result = await dbClient.query(query, [oneHourAgo]);
    const row = result.rows[0];

    return {
      activeUsers: parseInt(row.active_users || '0', 10),
      sessionsStarted: parseInt(row.sessions_started || '0', 10),
      swipesInLastHour: parseInt(row.swipes || '0', 10),
      matchesInLastHour: parseInt(row.matches || '0', 10),
      messagesInLastHour: parseInt(row.messages || '0', 10),
    };
  }

  /**
   * Backfill metrics for a date range
   * Useful for historical data aggregation
   */
  async backfillDailyMetrics(startDate: Date, endDate: Date): Promise<number> {
    let count = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      await this.aggregateDailyMetrics(new Date(currentDate));
      count++;

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  // Mapper functions
  private mapRowToDailyMetrics(row: any): DailyMetrics {
    return {
      date: row.date,
      dau: parseInt(row.dau, 10),
      newUsers: parseInt(row.new_users, 10),
      totalSessions: parseInt(row.total_sessions, 10),
      averageSessionDuration: parseFloat(row.average_session_duration || '0'),
      totalSwipes: parseInt(row.total_swipes, 10),
      totalMatches: parseInt(row.total_matches, 10),
      totalMessages: parseInt(row.total_messages, 10),
      revenue: parseFloat(row.revenue || '0'),
      newSubscribers: parseInt(row.new_subscribers, 10),
    };
  }

  private mapRowToHourlyMetrics(row: any): HourlyMetrics {
    return {
      hour: row.hour,
      activeUsers: parseInt(row.active_users, 10),
      sessions: parseInt(row.sessions, 10),
      swipes: parseInt(row.swipes, 10),
      matches: parseInt(row.matches, 10),
      messages: parseInt(row.messages, 10),
    };
  }
}

export const timeSeriesRepository = new TimeSeriesRepository();
export default timeSeriesRepository;
