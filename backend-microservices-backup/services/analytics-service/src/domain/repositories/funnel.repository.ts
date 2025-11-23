/**
 * Conversion Funnel Repository
 */

import { dbClient } from '../../infrastructure/database/db-client';
import { ConversionFunnel, UpdateFunnelStepRequest, FunnelConversionRates } from '../../types';

export class FunnelRepository {
  /**
   * Create a new funnel entry
   */
  async create(
    sessionId: string,
    userId?: string,
    utmSource?: string,
    utmCampaign?: string
  ): Promise<ConversionFunnel> {
    const query = `
      INSERT INTO conversion_funnel (
        user_id, session_id, utm_source, utm_campaign,
        landing_page_view_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const values = [userId || null, sessionId, utmSource || null, utmCampaign || null];
    const result = await dbClient.query<ConversionFunnel>(query, values);

    return this.mapRowToFunnel(result.rows[0]);
  }

  /**
   * Update funnel step
   */
  async updateStep(data: UpdateFunnelStepRequest): Promise<ConversionFunnel> {
    const funnel = await this.findBySessionId(data.sessionId);

    if (!funnel) {
      // Create new funnel if doesn't exist
      const newFunnel = await this.create(data.sessionId, data.userId);
      return this.updateStep(data);
    }

    const timestamp = data.timestamp || new Date();
    const columnMap: { [key: string]: string } = {
      landingPageViewAt: 'landing_page_view_at',
      registrationStartedAt: 'registration_started_at',
      emailEnteredAt: 'email_entered_at',
      passwordCreatedAt: 'password_created_at',
      registrationCompletedAt: 'registration_completed_at',
      emailVerifiedAt: 'email_verified_at',
      profileStartedAt: 'profile_started_at',
      photoUploadedAt: 'photo_uploaded_at',
      profileCompletedAt: 'profile_completed_at',
      firstMatchAt: 'first_match_at',
      firstMessageAt: 'first_message_at',
      subscriptionPurchasedAt: 'subscription_purchased_at',
    };

    const columnName = columnMap[data.step];
    if (!columnName) {
      throw new Error(`Invalid funnel step: ${data.step}`);
    }

    // Update the step timestamp
    let query = `
      UPDATE conversion_funnel
      SET ${columnName} = $1, updated_at = NOW()
    `;

    const params: any[] = [timestamp];

    // Update user_id if provided and not already set
    if (data.userId && !funnel.userId) {
      params.push(data.userId);
      query += `, user_id = $${params.length}`;
    }

    // Calculate time to complete if this is a milestone step
    if (data.step === 'registrationCompletedAt' && funnel.landingPageViewAt) {
      const timeToRegister = Math.floor(
        (timestamp.getTime() - funnel.landingPageViewAt.getTime()) / 1000
      );
      params.push(timeToRegister);
      query += `, time_to_register = $${params.length}`;
    } else if (data.step === 'emailVerifiedAt' && funnel.registrationCompletedAt) {
      const timeToVerify = Math.floor(
        (timestamp.getTime() - funnel.registrationCompletedAt.getTime()) / 1000
      );
      params.push(timeToVerify);
      query += `, time_to_verify = $${params.length}`;
    } else if (data.step === 'profileCompletedAt' && funnel.emailVerifiedAt) {
      const timeToProfile = Math.floor(
        (timestamp.getTime() - funnel.emailVerifiedAt.getTime()) / 1000
      );
      params.push(timeToProfile);
      query += `, time_to_profile = $${params.length}`;
    } else if (data.step === 'firstMatchAt' && funnel.profileCompletedAt) {
      const timeToMatch = Math.floor(
        (timestamp.getTime() - funnel.profileCompletedAt.getTime()) / 1000
      );
      params.push(timeToMatch);
      query += `, time_to_match = $${params.length}`;
    } else if (data.step === 'subscriptionPurchasedAt' && funnel.registrationCompletedAt) {
      const timeToSubscribe = Math.floor(
        (timestamp.getTime() - funnel.registrationCompletedAt.getTime()) / 1000
      );
      params.push(timeToSubscribe);
      query += `, time_to_subscribe = $${params.length}`;
    }

    // Check if funnel is now completed
    if (data.step === 'subscriptionPurchasedAt') {
      query += `, completed = TRUE`;
    }

    params.push(data.sessionId);
    query += ` WHERE session_id = $${params.length} RETURNING *`;

    const result = await dbClient.query<ConversionFunnel>(query, params);
    return this.mapRowToFunnel(result.rows[0]);
  }

  /**
   * Mark funnel as dropped at a specific step
   */
  async markDroppedAt(sessionId: string, step: string): Promise<void> {
    const query = `
      UPDATE conversion_funnel
      SET dropped_at_step = $1, updated_at = NOW()
      WHERE session_id = $2
    `;

    await dbClient.query(query, [step, sessionId]);
  }

  /**
   * Find funnel by session ID
   */
  async findBySessionId(sessionId: string): Promise<ConversionFunnel | null> {
    const query = 'SELECT * FROM conversion_funnel WHERE session_id = $1';
    const result = await dbClient.query<ConversionFunnel>(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFunnel(result.rows[0]);
  }

  /**
   * Find funnel by user ID
   */
  async findByUserId(userId: string): Promise<ConversionFunnel | null> {
    const query = `
      SELECT * FROM conversion_funnel
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await dbClient.query<ConversionFunnel>(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFunnel(result.rows[0]);
  }

  /**
   * Get funnel conversion rates
   */
  async getConversionRates(
    utmSource?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FunnelConversionRates[]> {
    let query = `
      SELECT
        utm_source,
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN landing_page_view_at IS NOT NULL THEN 1 END) as landing_views,
        COUNT(CASE WHEN registration_started_at IS NOT NULL THEN 1 END) as registrations_started,
        COUNT(CASE WHEN registration_completed_at IS NOT NULL THEN 1 END) as registrations_completed,
        COUNT(CASE WHEN email_verified_at IS NOT NULL THEN 1 END) as emails_verified,
        COUNT(CASE WHEN profile_completed_at IS NOT NULL THEN 1 END) as profiles_completed,
        COUNT(CASE WHEN first_match_at IS NOT NULL THEN 1 END) as first_matches,
        COUNT(CASE WHEN subscription_purchased_at IS NOT NULL THEN 1 END) as subscriptions,
        ROUND(
          100.0 * COUNT(CASE WHEN registration_completed_at IS NOT NULL THEN 1 END) /
          NULLIF(COUNT(CASE WHEN landing_page_view_at IS NOT NULL THEN 1 END), 0),
          2
        ) as registration_rate,
        ROUND(
          100.0 * COUNT(CASE WHEN profile_completed_at IS NOT NULL THEN 1 END) /
          NULLIF(COUNT(CASE WHEN registration_completed_at IS NOT NULL THEN 1 END), 0),
          2
        ) as profile_completion_rate,
        ROUND(
          100.0 * COUNT(CASE WHEN subscription_purchased_at IS NOT NULL THEN 1 END) /
          NULLIF(COUNT(CASE WHEN registration_completed_at IS NOT NULL THEN 1 END), 0),
          2
        ) as subscription_rate
      FROM conversion_funnel
      WHERE 1=1
    `;

    const params: any[] = [];

    if (utmSource) {
      params.push(utmSource);
      query += ` AND utm_source = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND created_at <= $${params.length}`;
    }

    query += ' GROUP BY utm_source ORDER BY total_sessions DESC';

    const result = await dbClient.query<any>(query, params);

    return result.rows.map(row => ({
      utmSource: row.utm_source || 'direct',
      totalSessions: parseInt(row.total_sessions, 10),
      landingViews: parseInt(row.landing_views, 10),
      registrationsStarted: parseInt(row.registrations_started, 10),
      registrationsCompleted: parseInt(row.registrations_completed, 10),
      emailsVerified: parseInt(row.emails_verified, 10),
      profilesCompleted: parseInt(row.profiles_completed, 10),
      firstMatches: parseInt(row.first_matches, 10),
      subscriptions: parseInt(row.subscriptions, 10),
      registrationRate: parseFloat(row.registration_rate || '0'),
      profileCompletionRate: parseFloat(row.profile_completion_rate || '0'),
      subscriptionRate: parseFloat(row.subscription_rate || '0'),
    }));
  }

  /**
   * Get average time to complete each step
   */
  async getAverageTimings(utmSource?: string): Promise<{
    avgTimeToRegister: number;
    avgTimeToVerify: number;
    avgTimeToProfile: number;
    avgTimeToMatch: number;
    avgTimeToSubscribe: number;
  }> {
    let query = `
      SELECT
        AVG(time_to_register) as avg_time_to_register,
        AVG(time_to_verify) as avg_time_to_verify,
        AVG(time_to_profile) as avg_time_to_profile,
        AVG(time_to_match) as avg_time_to_match,
        AVG(time_to_subscribe) as avg_time_to_subscribe
      FROM conversion_funnel
      WHERE 1=1
    `;

    const params: any[] = [];

    if (utmSource) {
      params.push(utmSource);
      query += ` AND utm_source = $${params.length}`;
    }

    const result = await dbClient.query<any>(query, params);
    const row = result.rows[0];

    return {
      avgTimeToRegister: parseFloat(row.avg_time_to_register || '0'),
      avgTimeToVerify: parseFloat(row.avg_time_to_verify || '0'),
      avgTimeToProfile: parseFloat(row.avg_time_to_profile || '0'),
      avgTimeToMatch: parseFloat(row.avg_time_to_match || '0'),
      avgTimeToSubscribe: parseFloat(row.avg_time_to_subscribe || '0'),
    };
  }

  /**
   * Get drop-off analysis
   */
  async getDropoffAnalysis(utmSource?: string): Promise<{
    step: string;
    count: number;
    percentage: number;
  }[]> {
    let query = `
      SELECT
        dropped_at_step as step,
        COUNT(*) as count,
        ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM conversion_funnel), 2) as percentage
      FROM conversion_funnel
      WHERE dropped_at_step IS NOT NULL
    `;

    const params: any[] = [];

    if (utmSource) {
      params.push(utmSource);
      query += ` AND utm_source = $${params.length}`;
    }

    query += ' GROUP BY dropped_at_step ORDER BY count DESC';

    const result = await dbClient.query<any>(query, params);

    return result.rows.map(row => ({
      step: row.step,
      count: parseInt(row.count, 10),
      percentage: parseFloat(row.percentage),
    }));
  }

  /**
   * Map database row to ConversionFunnel object
   */
  private mapRowToFunnel(row: any): ConversionFunnel {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      landingPageViewAt: row.landing_page_view_at,
      registrationStartedAt: row.registration_started_at,
      emailEnteredAt: row.email_entered_at,
      passwordCreatedAt: row.password_created_at,
      registrationCompletedAt: row.registration_completed_at,
      emailVerifiedAt: row.email_verified_at,
      profileStartedAt: row.profile_started_at,
      photoUploadedAt: row.photo_uploaded_at,
      profileCompletedAt: row.profile_completed_at,
      firstMatchAt: row.first_match_at,
      firstMessageAt: row.first_message_at,
      subscriptionPurchasedAt: row.subscription_purchased_at,
      timeToRegister: row.time_to_register,
      timeToVerify: row.time_to_verify,
      timeToProfile: row.time_to_profile,
      timeToMatch: row.time_to_match,
      timeToSubscribe: row.time_to_subscribe,
      droppedAtStep: row.dropped_at_step,
      completed: row.completed,
      utmSource: row.utm_source,
      utmCampaign: row.utm_campaign,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const funnelRepository = new FunnelRepository();
export default funnelRepository;
