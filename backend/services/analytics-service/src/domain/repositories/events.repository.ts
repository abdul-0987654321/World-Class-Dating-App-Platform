/**
 * Events Repository
 * Handles specialized event tracking for swipes, matches, messages, and sessions
 */

import { dbClient } from '../../infrastructure/database/db-client';

export interface SwipeEvent {
  id: string;
  userId: string;
  targetUserId: string;
  direction: 'left' | 'right' | 'super';
  sessionId?: string;
  timestamp: Date;
  location?: { latitude: number; longitude: number };
  metadata?: Record<string, any>;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  userId1: string;
  userId2: string;
  timestamp: Date;
  mutualSwipeTime: number; // Milliseconds between swipes
  sessionId?: string;
}

export interface MessageEvent {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  messageLength: number;
  hasMedia: boolean;
  timestamp: Date;
  responseTime?: number; // Time to respond in seconds
  sessionId?: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  screenViews: number;
  swipeCount: number;
  messageCount: number;
  profileViews: number;
  deviceType: string;
  appVersion?: string;
}

export class EventsRepository {
  /**
   * Track a swipe event
   */
  async trackSwipe(data: {
    userId: string;
    targetUserId: string;
    direction: 'left' | 'right' | 'super';
    sessionId?: string;
    location?: { latitude: number; longitude: number };
    metadata?: Record<string, any>;
  }): Promise<SwipeEvent> {
    const query = `
      INSERT INTO swipe_events (
        user_id, target_user_id, direction, session_id, location, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const values = [
      data.userId,
      data.targetUserId,
      data.direction,
      data.sessionId || null,
      data.location ? JSON.stringify(data.location) : null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ];

    const result = await dbClient.query(query, values);
    return this.mapRowToSwipeEvent(result.rows[0]);
  }

  /**
   * Track a match event
   */
  async trackMatch(data: {
    matchId: string;
    userId1: string;
    userId2: string;
    mutualSwipeTime: number;
    sessionId?: string;
  }): Promise<MatchEvent> {
    const query = `
      INSERT INTO match_events (
        match_id, user_id_1, user_id_2, mutual_swipe_time, session_id, timestamp
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;

    const values = [
      data.matchId,
      data.userId1,
      data.userId2,
      data.mutualSwipeTime,
      data.sessionId || null,
    ];

    const result = await dbClient.query(query, values);
    return this.mapRowToMatchEvent(result.rows[0]);
  }

  /**
   * Track a message event
   */
  async trackMessage(data: {
    conversationId: string;
    senderId: string;
    receiverId: string;
    messageLength: number;
    hasMedia: boolean;
    responseTime?: number;
    sessionId?: string;
  }): Promise<MessageEvent> {
    const query = `
      INSERT INTO message_events (
        conversation_id, sender_id, receiver_id, message_length, has_media,
        response_time, session_id, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    const values = [
      data.conversationId,
      data.senderId,
      data.receiverId,
      data.messageLength,
      data.hasMedia,
      data.responseTime || null,
      data.sessionId || null,
    ];

    const result = await dbClient.query(query, values);
    return this.mapRowToMessageEvent(result.rows[0]);
  }

  /**
   * Create or update a session
   */
  async trackSession(data: {
    sessionId: string;
    userId?: string;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    screenViews?: number;
    swipeCount?: number;
    messageCount?: number;
    profileViews?: number;
    deviceType?: string;
    appVersion?: string;
  }): Promise<SessionEvent> {
    // Check if session exists
    const existingQuery = 'SELECT * FROM session_events WHERE session_id = $1';
    const existing = await dbClient.query(existingQuery, [data.sessionId]);

    if (existing.rows.length > 0) {
      // Update existing session
      const updateQuery = `
        UPDATE session_events
        SET
          end_time = COALESCE($2, end_time),
          duration = COALESCE($3, duration),
          screen_views = COALESCE($4, screen_views),
          swipe_count = COALESCE($5, swipe_count),
          message_count = COALESCE($6, message_count),
          profile_views = COALESCE($7, profile_views),
          updated_at = NOW()
        WHERE session_id = $1
        RETURNING *
      `;

      const values = [
        data.sessionId,
        data.endTime || null,
        data.duration || null,
        data.screenViews || null,
        data.swipeCount || null,
        data.messageCount || null,
        data.profileViews || null,
      ];

      const result = await dbClient.query(updateQuery, values);
      return this.mapRowToSessionEvent(result.rows[0]);
    } else {
      // Create new session
      const insertQuery = `
        INSERT INTO session_events (
          session_id, user_id, start_time, end_time, duration,
          screen_views, swipe_count, message_count, profile_views,
          device_type, app_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        data.sessionId,
        data.userId || null,
        data.startTime || new Date(),
        data.endTime || null,
        data.duration || null,
        data.screenViews || 0,
        data.swipeCount || 0,
        data.messageCount || 0,
        data.profileViews || 0,
        data.deviceType || 'unknown',
        data.appVersion || null,
      ];

      const result = await dbClient.query(insertQuery, values);
      return this.mapRowToSessionEvent(result.rows[0]);
    }
  }

  /**
   * Get swipe statistics for a user
   */
  async getUserSwipeStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSwipes: number;
    rightSwipes: number;
    leftSwipes: number;
    superLikes: number;
    swipeRate: number;
  }> {
    let query = `
      SELECT
        COUNT(*) as total_swipes,
        COUNT(CASE WHEN direction = 'right' THEN 1 END) as right_swipes,
        COUNT(CASE WHEN direction = 'left' THEN 1 END) as left_swipes,
        COUNT(CASE WHEN direction = 'super' THEN 1 END) as super_likes
      FROM swipe_events
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    const result = await dbClient.query(query, params);
    const row = result.rows[0];

    const totalSwipes = parseInt(row.total_swipes, 10);
    const rightSwipes = parseInt(row.right_swipes, 10);

    return {
      totalSwipes,
      rightSwipes,
      leftSwipes: parseInt(row.left_swipes, 10),
      superLikes: parseInt(row.super_likes, 10),
      swipeRate: totalSwipes > 0 ? (rightSwipes / totalSwipes) * 100 : 0,
    };
  }

  /**
   * Get match success rate for a user
   */
  async getUserMatchSuccessRate(userId: string): Promise<{
    totalMatches: number;
    conversationStarted: number;
    conversationRate: number;
    averageResponseTime: number;
  }> {
    // Get total matches
    const matchQuery = `
      SELECT COUNT(*) as total_matches
      FROM match_events
      WHERE user_id_1 = $1 OR user_id_2 = $1
    `;

    const matchResult = await dbClient.query(matchQuery, [userId]);
    const totalMatches = parseInt(matchResult.rows[0].total_matches, 10);

    // Get conversations started
    const convQuery = `
      SELECT COUNT(DISTINCT conversation_id) as conversations_started
      FROM message_events
      WHERE sender_id = $1 OR receiver_id = $1
    `;

    const convResult = await dbClient.query(convQuery, [userId]);
    const conversationStarted = parseInt(convResult.rows[0].conversations_started, 10);

    // Get average response time
    const responseQuery = `
      SELECT AVG(response_time) as avg_response_time
      FROM message_events
      WHERE receiver_id = $1 AND response_time IS NOT NULL
    `;

    const responseResult = await dbClient.query(responseQuery, [userId]);
    const averageResponseTime = parseFloat(responseResult.rows[0].avg_response_time || '0');

    return {
      totalMatches,
      conversationStarted,
      conversationRate: totalMatches > 0 ? (conversationStarted / totalMatches) * 100 : 0,
      averageResponseTime,
    };
  }

  /**
   * Get session statistics
   */
  async getSessionStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSessions: number;
    averageDuration: number;
    averageSwipesPerSession: number;
    averageMessagesPerSession: number;
  }> {
    let query = `
      SELECT
        COUNT(*) as total_sessions,
        AVG(duration) as avg_duration,
        AVG(swipe_count) as avg_swipes,
        AVG(message_count) as avg_messages
      FROM session_events
      WHERE 1=1
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

    const result = await dbClient.query(query, params);
    const row = result.rows[0];

    return {
      totalSessions: parseInt(row.total_sessions, 10),
      averageDuration: parseFloat(row.avg_duration || '0'),
      averageSwipesPerSession: parseFloat(row.avg_swipes || '0'),
      averageMessagesPerSession: parseFloat(row.avg_messages || '0'),
    };
  }

  /**
   * Get swipe events by time range
   */
  async getSwipesByTimeRange(
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' | 'week' = 'day'
  ): Promise<Array<{ period: string; count: number; direction: string }>> {
    const truncFunc = groupBy === 'hour' ? 'hour' : groupBy === 'week' ? 'week' : 'day';

    const query = `
      SELECT
        DATE_TRUNC('${truncFunc}', timestamp) as period,
        direction,
        COUNT(*) as count
      FROM swipe_events
      WHERE timestamp >= $1 AND timestamp <= $2
      GROUP BY period, direction
      ORDER BY period DESC
    `;

    const result = await dbClient.query(query, [startDate, endDate]);
    return result.rows.map(row => ({
      period: row.period.toISOString(),
      count: parseInt(row.count, 10),
      direction: row.direction,
    }));
  }

  // Mapper functions
  private mapRowToSwipeEvent(row: any): SwipeEvent {
    return {
      id: row.id,
      userId: row.user_id,
      targetUserId: row.target_user_id,
      direction: row.direction,
      sessionId: row.session_id,
      timestamp: row.timestamp,
      location: row.location,
      metadata: row.metadata,
    };
  }

  private mapRowToMatchEvent(row: any): MatchEvent {
    return {
      id: row.id,
      matchId: row.match_id,
      userId1: row.user_id_1,
      userId2: row.user_id_2,
      timestamp: row.timestamp,
      mutualSwipeTime: row.mutual_swipe_time,
      sessionId: row.session_id,
    };
  }

  private mapRowToMessageEvent(row: any): MessageEvent {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      messageLength: row.message_length,
      hasMedia: row.has_media,
      timestamp: row.timestamp,
      responseTime: row.response_time,
      sessionId: row.session_id,
    };
  }

  private mapRowToSessionEvent(row: any): SessionEvent {
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      screenViews: row.screen_views,
      swipeCount: row.swipe_count,
      messageCount: row.message_count,
      profileViews: row.profile_views,
      deviceType: row.device_type,
      appVersion: row.app_version,
    };
  }
}

export const eventsRepository = new EventsRepository();
export default eventsRepository;
