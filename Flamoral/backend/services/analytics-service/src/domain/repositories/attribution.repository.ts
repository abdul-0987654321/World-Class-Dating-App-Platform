/**
 * User Attribution Repository
 */

import { dbClient } from '../../infrastructure/database/db-client';
import { UserAttribution, CreateAttributionRequest } from '../../types';

export class AttributionRepository {
  /**
   * Create or update user attribution (upsert)
   */
  async upsert(data: CreateAttributionRequest): Promise<UserAttribution> {
    const existingAttribution = await this.findByUserId(data.userId);

    if (existingAttribution) {
      // Update last touch and increment touchpoints
      return this.updateLastTouch(data);
    } else {
      // Create new attribution with first touch
      return this.createFirstTouch(data);
    }
  }

  /**
   * Create initial attribution (first touch)
   */
  private async createFirstTouch(data: CreateAttributionRequest): Promise<UserAttribution> {
    const query = `
      INSERT INTO user_attribution (
        user_id,
        first_touch_source, first_touch_medium, first_touch_campaign,
        first_touch_content, first_touch_click_id, first_touch_timestamp,
        first_touch_landing_page, first_touch_referrer,
        last_touch_source, last_touch_medium, last_touch_campaign,
        last_touch_content, last_touch_click_id, last_touch_timestamp,
        total_touchpoints, touchpoint_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), $7, $8,
        $2, $3, $4, $5, $6, NOW(), 1, $9
      )
      RETURNING *
    `;

    const touchpointData = JSON.stringify([{
      source: data.source,
      campaign: data.campaign,
      timestamp: new Date(),
    }]);

    const values = [
      data.userId,
      data.source || null,
      data.medium || null,
      data.campaign || null,
      data.content || null,
      data.clickId ? JSON.stringify(data.clickId) : null,
      data.landingPage || null,
      data.referrer || null,
      touchpointData,
    ];

    const result = await dbClient.query<UserAttribution>(query, values);
    return this.mapRowToAttribution(result.rows[0]);
  }

  /**
   * Update last touch attribution
   */
  private async updateLastTouch(data: CreateAttributionRequest): Promise<UserAttribution> {
    // Get existing touchpoint data
    const existing = await this.findByUserId(data.userId);
    const touchpoints = existing?.touchpointData || [];

    // Add new touchpoint
    touchpoints.push({
      source: data.source || 'direct',
      campaign: data.campaign,
      timestamp: new Date(),
    });

    const query = `
      UPDATE user_attribution
      SET
        last_touch_source = $2,
        last_touch_medium = $3,
        last_touch_campaign = $4,
        last_touch_content = $5,
        last_touch_click_id = $6,
        last_touch_timestamp = NOW(),
        total_touchpoints = total_touchpoints + 1,
        touchpoint_data = $7,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `;

    const values = [
      data.userId,
      data.source || null,
      data.medium || null,
      data.campaign || null,
      data.content || null,
      data.clickId ? JSON.stringify(data.clickId) : null,
      JSON.stringify(touchpoints),
    ];

    const result = await dbClient.query<UserAttribution>(query, values);
    return this.mapRowToAttribution(result.rows[0]);
  }

  /**
   * Mark registration timestamp
   */
  async markRegistration(
    userId: string,
    source?: string,
    campaign?: string
  ): Promise<UserAttribution> {
    const query = `
      UPDATE user_attribution
      SET
        registration_timestamp = NOW(),
        registration_source = $2,
        registration_campaign = $3,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `;

    const values = [userId, source || null, campaign || null];
    const result = await dbClient.query<UserAttribution>(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Attribution not found for user ${userId}`);
    }

    return this.mapRowToAttribution(result.rows[0]);
  }

  /**
   * Find attribution by user ID
   */
  async findByUserId(userId: string): Promise<UserAttribution | null> {
    const query = 'SELECT * FROM user_attribution WHERE user_id = $1';
    const result = await dbClient.query<UserAttribution>(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAttribution(result.rows[0]);
  }

  /**
   * Get attribution summary
   */
  async getAttributionSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    firstTouchSource: string;
    lastTouchSource: string;
    totalUsers: number;
    registeredUsers: number;
    avgTouchpoints: number;
    conversionRate: number;
  }[]> {
    let query = `
      SELECT
        first_touch_source,
        last_touch_source,
        COUNT(*) as total_users,
        COUNT(CASE WHEN registration_timestamp IS NOT NULL THEN 1 END) as registered_users,
        AVG(total_touchpoints) as avg_touchpoints,
        ROUND(
          100.0 * COUNT(CASE WHEN registration_timestamp IS NOT NULL THEN 1 END) / COUNT(*),
          2
        ) as conversion_rate
      FROM user_attribution
      WHERE 1=1
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

    query += ` GROUP BY first_touch_source, last_touch_source ORDER BY total_users DESC`;

    const result = await dbClient.query<{
      first_touch_source: string;
      last_touch_source: string;
      total_users: string;
      registered_users: string;
      avg_touchpoints: string;
      conversion_rate: string;
    }>(query, params);

    return result.rows.map(row => ({
      firstTouchSource: row.first_touch_source,
      lastTouchSource: row.last_touch_source,
      totalUsers: parseInt(row.total_users, 10),
      registeredUsers: parseInt(row.registered_users, 10),
      avgTouchpoints: parseFloat(row.avg_touchpoints),
      conversionRate: parseFloat(row.conversion_rate),
    }));
  }

  /**
   * Get users by first touch source
   */
  async getUsersByFirstTouchSource(source: string): Promise<UserAttribution[]> {
    const query = `
      SELECT * FROM user_attribution
      WHERE first_touch_source = $1
      ORDER BY created_at DESC
    `;

    const result = await dbClient.query<UserAttribution>(query, [source]);
    return result.rows.map(this.mapRowToAttribution);
  }

  /**
   * Get users by last touch source
   */
  async getUsersByLastTouchSource(source: string): Promise<UserAttribution[]> {
    const query = `
      SELECT * FROM user_attribution
      WHERE last_touch_source = $1
      ORDER BY created_at DESC
    `;

    const result = await dbClient.query<UserAttribution>(query, [source]);
    return result.rows.map(this.mapRowToAttribution);
  }

  /**
   * Get attribution by model type
   */
  async getAttributionByModel(
    model: 'first_touch' | 'last_touch',
    startDate?: Date,
    endDate?: Date
  ): Promise<{ source: string; count: number; registrations: number }[]> {
    const sourceColumn = model === 'first_touch' ? 'first_touch_source' : 'last_touch_source';

    let query = `
      SELECT
        ${sourceColumn} as source,
        COUNT(*) as count,
        COUNT(CASE WHEN registration_timestamp IS NOT NULL THEN 1 END) as registrations
      FROM user_attribution
      WHERE ${sourceColumn} IS NOT NULL
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

    query += ` GROUP BY ${sourceColumn} ORDER BY count DESC`;

    const result = await dbClient.query<{
      source: string;
      count: string;
      registrations: string;
    }>(query, params);

    return result.rows.map(row => ({
      source: row.source,
      count: parseInt(row.count, 10),
      registrations: parseInt(row.registrations, 10),
    }));
  }

  /**
   * Map database row to UserAttribution object
   */
  private mapRowToAttribution(row: any): UserAttribution {
    return {
      userId: row.user_id,
      firstTouchSource: row.first_touch_source,
      firstTouchMedium: row.first_touch_medium,
      firstTouchCampaign: row.first_touch_campaign,
      firstTouchContent: row.first_touch_content,
      firstTouchClickId: row.first_touch_click_id,
      firstTouchTimestamp: row.first_touch_timestamp,
      firstTouchLandingPage: row.first_touch_landing_page,
      firstTouchReferrer: row.first_touch_referrer,
      lastTouchSource: row.last_touch_source,
      lastTouchMedium: row.last_touch_medium,
      lastTouchCampaign: row.last_touch_campaign,
      lastTouchContent: row.last_touch_content,
      lastTouchClickId: row.last_touch_click_id,
      lastTouchTimestamp: row.last_touch_timestamp,
      registrationTimestamp: row.registration_timestamp,
      registrationSource: row.registration_source,
      registrationCampaign: row.registration_campaign,
      attributionModel: row.attribution_model,
      totalTouchpoints: row.total_touchpoints,
      touchpointData: row.touchpoint_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const attributionRepository = new AttributionRepository();
export default attributionRepository;
