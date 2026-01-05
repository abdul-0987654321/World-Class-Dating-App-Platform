/**
 * Match Success Metrics Repository
 * Handles conversation rates, date arrangements, and match quality metrics
 */

import { dbClient } from '../../infrastructure/database/db-client';

export interface MatchSuccessMetrics {
  totalMatches: number;
  conversationsStarted: number;
  conversationRate: number;
  messagesExchanged: number;
  averageMessagesPerConversation: number;
  datesArranged: number;
  dateArrangementRate: number;
  averageTimeToFirstMessage: number;
  averageResponseTime: number;
  unmatchRate: number;
}

export interface ConversationQualityMetrics {
  conversationId: string;
  messageCount: number;
  averageMessageLength: number;
  mediaMessageCount: number;
  conversationDuration: number;
  lastMessageAt: Date;
  hasDateArrangement: boolean;
  sentimentScore?: number;
}

export interface DateArrangement {
  id: string;
  conversationId: string;
  userId1: string;
  userId2: string;
  proposedAt: Date;
  acceptedAt?: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  status: 'proposed' | 'accepted' | 'confirmed' | 'completed' | 'cancelled';
}

export class MatchSuccessRepository {
  /**
   * Get overall match success metrics
   */
  async getMatchSuccessMetrics(startDate?: Date, endDate?: Date): Promise<MatchSuccessMetrics> {
    let matchQuery = 'SELECT COUNT(*) as count FROM match_events WHERE 1=1';
    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      matchQuery += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      matchQuery += ` AND timestamp <= $${params.length}`;
    }

    const matchResult = await dbClient.query(matchQuery, params);
    const totalMatches = parseInt(matchResult.rows[0].count, 10);

    // Get conversations started
    let convQuery = `
      SELECT COUNT(DISTINCT conversation_id) as count
      FROM message_events
      WHERE 1=1
    `;
    const convParams: any[] = [];

    if (startDate) {
      convParams.push(startDate);
      convQuery += ` AND timestamp >= $${convParams.length}`;
    }
    if (endDate) {
      convParams.push(endDate);
      convQuery += ` AND timestamp <= $${convParams.length}`;
    }

    const convResult = await dbClient.query(convQuery, convParams);
    const conversationsStarted = parseInt(convResult.rows[0].count, 10);

    // Get total messages
    let msgQuery = 'SELECT COUNT(*) as count FROM message_events WHERE 1=1';
    const msgParams: any[] = [];

    if (startDate) {
      msgParams.push(startDate);
      msgQuery += ` AND timestamp >= $${msgParams.length}`;
    }
    if (endDate) {
      msgParams.push(endDate);
      msgQuery += ` AND timestamp <= $${msgParams.length}`;
    }

    const msgResult = await dbClient.query(msgQuery, msgParams);
    const messagesExchanged = parseInt(msgResult.rows[0].count, 10);

    // Get dates arranged
    let dateQuery = 'SELECT COUNT(*) as count FROM date_arrangements WHERE 1=1';
    const dateParams: any[] = [];

    if (startDate) {
      dateParams.push(startDate);
      dateQuery += ` AND proposed_at >= $${dateParams.length}`;
    }
    if (endDate) {
      dateParams.push(endDate);
      dateQuery += ` AND proposed_at <= $${dateParams.length}`;
    }

    const dateResult = await dbClient.query(dateQuery, dateParams);
    const datesArranged = parseInt(dateResult.rows[0].count, 10);

    // Get average time to first message
    let timeQuery = `
      SELECT AVG(mutual_swipe_time) as avg_time
      FROM match_events
      WHERE 1=1
    `;
    const timeParams: any[] = [];

    if (startDate) {
      timeParams.push(startDate);
      timeQuery += ` AND timestamp >= $${timeParams.length}`;
    }
    if (endDate) {
      timeParams.push(endDate);
      timeQuery += ` AND timestamp <= $${timeParams.length}`;
    }

    const timeResult = await dbClient.query(timeQuery, timeParams);
    const averageTimeToFirstMessage = parseFloat(timeResult.rows[0].avg_time || '0');

    // Get average response time
    let respQuery = `
      SELECT AVG(response_time) as avg_response
      FROM message_events
      WHERE response_time IS NOT NULL
    `;
    const respParams: any[] = [];

    if (startDate) {
      respParams.push(startDate);
      respQuery += ` AND timestamp >= $${respParams.length}`;
    }
    if (endDate) {
      respParams.push(endDate);
      respQuery += ` AND timestamp <= $${respParams.length}`;
    }

    const respResult = await dbClient.query(respQuery, respParams);
    const averageResponseTime = parseFloat(respResult.rows[0].avg_response || '0');

    // Get unmatch rate (would need unmatches table)
    const unmatchRate = 0; // Placeholder

    return {
      totalMatches,
      conversationsStarted,
      conversationRate: totalMatches > 0 ? (conversationsStarted / totalMatches) * 100 : 0,
      messagesExchanged,
      averageMessagesPerConversation:
        conversationsStarted > 0 ? messagesExchanged / conversationsStarted : 0,
      datesArranged,
      dateArrangementRate:
        conversationsStarted > 0 ? (datesArranged / conversationsStarted) * 100 : 0,
      averageTimeToFirstMessage,
      averageResponseTime,
      unmatchRate,
    };
  }

  /**
   * Get conversation quality metrics
   */
  async getConversationQualityMetrics(conversationId: string): Promise<ConversationQualityMetrics> {
    const query = `
      SELECT
        conversation_id,
        COUNT(*) as message_count,
        AVG(message_length) as avg_message_length,
        COUNT(CASE WHEN has_media THEN 1 END) as media_message_count,
        MAX(timestamp) - MIN(timestamp) as conversation_duration,
        MAX(timestamp) as last_message_at
      FROM message_events
      WHERE conversation_id = $1
      GROUP BY conversation_id
    `;

    const result = await dbClient.query(query, [conversationId]);

    if (result.rows.length === 0) {
      throw new Error('Conversation not found');
    }

    const row = result.rows[0];

    // Check if date arranged
    const dateQuery = `
      SELECT COUNT(*) as count
      FROM date_arrangements
      WHERE conversation_id = $1
    `;
    const dateResult = await dbClient.query(dateQuery, [conversationId]);
    const hasDateArrangement = parseInt(dateResult.rows[0].count, 10) > 0;

    return {
      conversationId,
      messageCount: parseInt(row.message_count, 10),
      averageMessageLength: parseFloat(row.avg_message_length || '0'),
      mediaMessageCount: parseInt(row.media_message_count, 10),
      conversationDuration: row.conversation_duration ? parseInt(row.conversation_duration, 10) : 0,
      lastMessageAt: row.last_message_at,
      hasDateArrangement,
    };
  }

  /**
   * Get top performing matches (by message count)
   */
  async getTopMatches(
    limit: number = 100,
    startDate?: Date,
    endDate?: Date
  ): Promise<ConversationQualityMetrics[]> {
    let query = `
      SELECT
        conversation_id,
        COUNT(*) as message_count,
        AVG(message_length) as avg_message_length,
        COUNT(CASE WHEN has_media THEN 1 END) as media_message_count,
        MAX(timestamp) - MIN(timestamp) as conversation_duration,
        MAX(timestamp) as last_message_at
      FROM message_events
      WHERE 1=1
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    params.push(limit);
    query += `
      GROUP BY conversation_id
      ORDER BY message_count DESC
      LIMIT $${params.length}
    `;

    const result = await dbClient.query(query, params);

    return result.rows.map((row) => ({
      conversationId: row.conversation_id,
      messageCount: parseInt(row.message_count, 10),
      averageMessageLength: parseFloat(row.avg_message_length || '0'),
      mediaMessageCount: parseInt(row.media_message_count, 10),
      conversationDuration: row.conversation_duration ? parseInt(row.conversation_duration, 10) : 0,
      lastMessageAt: row.last_message_at,
      hasDateArrangement: false, // Would need join query
    }));
  }

  /**
   * Track a date arrangement
   */
  async trackDateArrangement(data: {
    conversationId: string;
    userId1: string;
    userId2: string;
    status?: 'proposed' | 'accepted' | 'confirmed' | 'completed' | 'cancelled';
  }): Promise<DateArrangement> {
    const query = `
      INSERT INTO date_arrangements (
        conversation_id, user_id_1, user_id_2, proposed_at, status
      ) VALUES ($1, $2, $3, NOW(), $4)
      RETURNING *
    `;

    const values = [data.conversationId, data.userId1, data.userId2, data.status || 'proposed'];

    const result = await dbClient.query(query, values);
    return this.mapRowToDateArrangement(result.rows[0]);
  }

  /**
   * Update date arrangement status
   */
  async updateDateArrangementStatus(
    id: string,
    status: 'proposed' | 'accepted' | 'confirmed' | 'completed' | 'cancelled'
  ): Promise<DateArrangement> {
    const timestampField =
      status === 'accepted'
        ? 'accepted_at'
        : status === 'confirmed'
          ? 'confirmed_at'
          : status === 'completed'
            ? 'completed_at'
            : status === 'cancelled'
              ? 'cancelled_at'
              : null;

    let query = `
      UPDATE date_arrangements
      SET status = $1
    `;

    const params: any[] = [status];

    if (timestampField) {
      query += `, ${timestampField} = NOW()`;
    }

    params.push(id);
    query += ` WHERE id = $${params.length} RETURNING *`;

    const result = await dbClient.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Date arrangement not found');
    }

    return this.mapRowToDateArrangement(result.rows[0]);
  }

  /**
   * Get date arrangement statistics
   */
  async getDateArrangementStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalProposed: number;
    totalAccepted: number;
    totalConfirmed: number;
    totalCompleted: number;
    totalCancelled: number;
    acceptanceRate: number;
    completionRate: number;
  }> {
    let query = `
      SELECT
        COUNT(*) as total_proposed,
        COUNT(CASE WHEN status IN ('accepted', 'confirmed', 'completed') THEN 1 END) as total_accepted,
        COUNT(CASE WHEN status IN ('confirmed', 'completed') THEN 1 END) as total_confirmed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as total_cancelled
      FROM date_arrangements
      WHERE 1=1
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND proposed_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND proposed_at <= $${params.length}`;
    }

    const result = await dbClient.query(query, params);
    const row = result.rows[0];

    const totalProposed = parseInt(row.total_proposed, 10);
    const totalAccepted = parseInt(row.total_accepted, 10);
    const totalCompleted = parseInt(row.total_completed, 10);

    return {
      totalProposed,
      totalAccepted,
      totalConfirmed: parseInt(row.total_confirmed, 10),
      totalCompleted,
      totalCancelled: parseInt(row.total_cancelled, 10),
      acceptanceRate: totalProposed > 0 ? (totalAccepted / totalProposed) * 100 : 0,
      completionRate: totalAccepted > 0 ? (totalCompleted / totalAccepted) * 100 : 0,
    };
  }

  /**
   * Get match-to-conversation funnel
   */
  async getMatchToConversationFunnel(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalMatches: number;
    firstMessageSent: number;
    bothMessaged: number;
    conversationsWithMultipleMessages: number;
    conversationsWithDates: number;
    stage1Rate: number; // First message rate
    stage2Rate: number; // Both messaged rate
    stage3Rate: number; // Multiple messages rate
    stage4Rate: number; // Date arrangement rate
  }> {
    // This would need correlation between matches and messages
    // For now, returning structure

    const metrics = await this.getMatchSuccessMetrics(startDate, endDate);

    const totalMatches = metrics.totalMatches;
    const conversationsStarted = metrics.conversationsStarted;
    const datesArranged = metrics.datesArranged;

    // Get conversations with multiple messages
    let multiQuery = `
      SELECT COUNT(DISTINCT conversation_id) as count
      FROM (
        SELECT conversation_id, COUNT(*) as msg_count
        FROM message_events
        WHERE 1=1
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      multiQuery += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      multiQuery += ` AND timestamp <= $${params.length}`;
    }

    multiQuery += `
        GROUP BY conversation_id
        HAVING COUNT(*) >= 3
      ) as multi_msg_conversations
    `;

    const multiResult = await dbClient.query(multiQuery, params);
    const conversationsWithMultipleMessages = parseInt(multiResult.rows[0].count, 10);

    return {
      totalMatches,
      firstMessageSent: conversationsStarted,
      bothMessaged: conversationsStarted, // Would need bidirectional check
      conversationsWithMultipleMessages,
      conversationsWithDates: datesArranged,
      stage1Rate: totalMatches > 0 ? (conversationsStarted / totalMatches) * 100 : 0,
      stage2Rate: conversationsStarted > 0 ? 100 : 0, // Placeholder
      stage3Rate:
        conversationsStarted > 0
          ? (conversationsWithMultipleMessages / conversationsStarted) * 100
          : 0,
      stage4Rate:
        conversationsWithMultipleMessages > 0
          ? (datesArranged / conversationsWithMultipleMessages) * 100
          : 0,
    };
  }

  /**
   * Get response time distribution
   */
  async getResponseTimeDistribution(
    startDate?: Date,
    endDate?: Date
  ): Promise<
    {
      bucket: string;
      count: number;
    }[]
  > {
    let query = `
      SELECT
        CASE
          WHEN response_time < 60 THEN '< 1 min'
          WHEN response_time < 300 THEN '1-5 mins'
          WHEN response_time < 900 THEN '5-15 mins'
          WHEN response_time < 3600 THEN '15-60 mins'
          WHEN response_time < 86400 THEN '1-24 hours'
          ELSE '> 24 hours'
        END as bucket,
        COUNT(*) as count
      FROM message_events
      WHERE response_time IS NOT NULL
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    query += `
      GROUP BY bucket
      ORDER BY MIN(response_time)
    `;

    const result = await dbClient.query(query, params);

    return result.rows.map((row) => ({
      bucket: row.bucket,
      count: parseInt(row.count, 10),
    }));
  }

  /**
   * Map database row to DateArrangement
   */
  private mapRowToDateArrangement(row: any): DateArrangement {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      userId1: row.user_id_1,
      userId2: row.user_id_2,
      proposedAt: row.proposed_at,
      acceptedAt: row.accepted_at,
      confirmedAt: row.confirmed_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
      status: row.status,
    };
  }
}

export const matchSuccessRepository = new MatchSuccessRepository();
export default matchSuccessRepository;
