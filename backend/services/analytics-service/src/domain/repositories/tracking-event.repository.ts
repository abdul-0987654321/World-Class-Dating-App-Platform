/**
 * Tracking Event Repository
 */

import { dbClient } from '../../infrastructure/database/db-client';
import { TrackingEvent, CreateTrackingEventRequest } from '../../types';

export class TrackingEventRepository {
  /**
   * Create a new tracking event
   */
  async create(data: CreateTrackingEventRequest): Promise<TrackingEvent> {
    const query = `
      INSERT INTO tracking_events (
        user_id, session_id, event_type, event_name,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        click_ids, event_data, page_url, referrer_url,
        user_agent, ip_address, device_type, browser, os,
        country, region, city, event_timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      RETURNING *
    `;

    const values = [
      data.userId || null,
      data.sessionId || null,
      data.eventType,
      data.eventName,
      data.utmSource || null,
      data.utmMedium || null,
      data.utmCampaign || null,
      data.utmContent || null,
      data.utmTerm || null,
      data.clickIds ? JSON.stringify(data.clickIds) : null,
      data.eventData ? JSON.stringify(data.eventData) : null,
      data.pageUrl || null,
      data.referrerUrl || null,
      data.userAgent || null,
      data.ipAddress || null,
      data.deviceType || null,
      data.browser || null,
      data.os || null,
      data.country || null,
      data.region || null,
      data.city || null,
      new Date(),
    ];

    const result = await dbClient.query<TrackingEvent>(query, values);
    return this.mapRowToEvent(result.rows[0]);
  }

  /**
   * Create multiple tracking events in batch
   */
  async createBatch(events: CreateTrackingEventRequest[]): Promise<number> {
    if (events.length === 0) {
      return 0;
    }

    const values: any[] = [];
    const valuePlaceholders: string[] = [];

    events.forEach((data, index) => {
      const offset = index * 22;
      valuePlaceholders.push(`(
        $${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4},
        $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8},
        $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12},
        $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16},
        $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20},
        $${offset + 21}, $${offset + 22}
      )`);

      values.push(
        data.userId || null,
        data.sessionId || null,
        data.eventType,
        data.eventName,
        data.utmSource || null,
        data.utmMedium || null,
        data.utmCampaign || null,
        data.utmContent || null,
        data.utmTerm || null,
        data.clickIds ? JSON.stringify(data.clickIds) : null,
        data.eventData ? JSON.stringify(data.eventData) : null,
        data.pageUrl || null,
        data.referrerUrl || null,
        data.userAgent || null,
        data.ipAddress || null,
        data.deviceType || null,
        data.browser || null,
        data.os || null,
        data.country || null,
        data.region || null,
        data.city || null,
        new Date()
      );
    });

    const query = `
      INSERT INTO tracking_events (
        user_id, session_id, event_type, event_name,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        click_ids, event_data, page_url, referrer_url,
        user_agent, ip_address, device_type, browser, os,
        country, region, city, event_timestamp
      ) VALUES ${valuePlaceholders.join(', ')}
    `;

    const result = await dbClient.query(query, values);
    return result.rowCount || 0;
  }

  /**
   * Find tracking events by user ID
   */
  async findByUserId(userId: string, limit = 100, offset = 0): Promise<TrackingEvent[]> {
    const query = `
      SELECT * FROM tracking_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await dbClient.query<TrackingEvent>(query, [userId, limit, offset]);
    return result.rows.map(this.mapRowToEvent);
  }

  /**
   * Find tracking events by session ID
   */
  async findBySessionId(sessionId: string): Promise<TrackingEvent[]> {
    const query = `
      SELECT * FROM tracking_events
      WHERE session_id = $1
      ORDER BY created_at ASC
    `;

    const result = await dbClient.query<TrackingEvent>(query, [sessionId]);
    return result.rows.map(this.mapRowToEvent);
  }

  /**
   * Find tracking events by type
   */
  async findByEventType(
    eventType: string,
    startDate?: Date,
    endDate?: Date,
    limit = 1000
  ): Promise<TrackingEvent[]> {
    let query = `
      SELECT * FROM tracking_events
      WHERE event_type = $1
    `;

    const params: any[] = [eventType];

    if (startDate) {
      params.push(startDate);
      query += ` AND created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND created_at <= $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await dbClient.query<TrackingEvent>(query, params);
    return result.rows.map(this.mapRowToEvent);
  }

  /**
   * Find tracking events by UTM source
   */
  async findByUtmSource(
    utmSource: string,
    startDate?: Date,
    endDate?: Date,
    limit = 1000
  ): Promise<TrackingEvent[]> {
    let query = `
      SELECT * FROM tracking_events
      WHERE utm_source = $1
    `;

    const params: any[] = [utmSource];

    if (startDate) {
      params.push(startDate);
      query += ` AND created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND created_at <= $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await dbClient.query<TrackingEvent>(query, params);
    return result.rows.map(this.mapRowToEvent);
  }

  /**
   * Get event count by type
   */
  async getEventCount(eventType?: string, startDate?: Date, endDate?: Date): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM tracking_events WHERE 1=1';
    const params: any[] = [];

    if (eventType) {
      params.push(eventType);
      query += ` AND event_type = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND created_at <= $${params.length}`;
    }

    const result = await dbClient.query<{ count: string }>(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get events grouped by source
   */
  async getEventsBySource(
    startDate?: Date,
    endDate?: Date
  ): Promise<
    {
      source: string;
      count: number;
    }[]
  > {
    let query = `
      SELECT utm_source as source, COUNT(*) as count
      FROM tracking_events
      WHERE utm_source IS NOT NULL
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND created_at <= $${params.length}`;
    }

    query += ' GROUP BY utm_source ORDER BY count DESC';

    const result = await dbClient.query<{ source: string; count: string }>(query, params);
    return result.rows.map((row) => ({
      source: row.source,
      count: parseInt(row.count, 10),
    }));
  }

  /**
   * Delete old tracking events (for data retention)
   */
  async deleteOldEvents(daysToKeep: number): Promise<number> {
    const query = `
      DELETE FROM tracking_events
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
    `;

    const result = await dbClient.query(query);
    return result.rowCount || 0;
  }

  /**
   * Map database row to TrackingEvent object
   */
  private mapRowToEvent(row: any): TrackingEvent {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      eventType: row.event_type,
      eventName: row.event_name,
      utmSource: row.utm_source,
      utmMedium: row.utm_medium,
      utmCampaign: row.utm_campaign,
      utmContent: row.utm_content,
      utmTerm: row.utm_term,
      clickIds: row.click_ids,
      eventData: row.event_data,
      pageUrl: row.page_url,
      referrerUrl: row.referrer_url,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      country: row.country,
      region: row.region,
      city: row.city,
      createdAt: row.created_at,
      eventTimestamp: row.event_timestamp,
    };
  }
}

export const trackingEventRepository = new TrackingEventRepository();
export default trackingEventRepository;
