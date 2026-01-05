/**
 * User Segmentation Engine
 * Categorizes users into behavioral, engagement, value, and lifecycle segments
 * for targeted marketing, personalization, and analytics
 */

import { createLogger } from '@flamoral/backend-shared';

import { dbClient } from '../infrastructure/database/db-client';
import {
  UserSegmentType,
  UserSegment,
  SegmentationCriteria,
  SegmentAnalytics,
  SegmentTransition,
} from '../types';

const logger = createLogger('segmentation-service');

// Default segmentation criteria
const DEFAULT_CRITERIA: SegmentationCriteria = {
  // Engagement thresholds
  powerUserDaysActive: 25, // 25+ days active in last 30
  activeUserDaysActive: 10, // 10+ days active in last 30
  dormantDaysInactive: 30, // 30+ days since last activity
  churnedDaysInactive: 90, // 90+ days = churned

  // Behavior thresholds
  swiperMinSwipes: 100, // 100+ swipes/week
  matcherMinMatchRate: 0.15, // 15%+ match rate
  conversationalistMinMessages: 50, // 50+ messages/week
  ghostMaxResponseRate: 0.1, // <10% response rate = ghost

  // Value thresholds
  highLtvThreshold: 200, // $200+ LTV
  mediumLtvThreshold: 50, // $50-200 LTV
  atRiskEngagementDrop: 0.5, // 50% engagement drop
};

export class SegmentationService {
  private criteria: SegmentationCriteria;

  constructor(criteria: Partial<SegmentationCriteria> = {}) {
    this.criteria = { ...DEFAULT_CRITERIA, ...criteria };
  }

  /**
   * Segment a single user based on their activity and metrics
   */
  async segmentUser(userId: string): Promise<UserSegment> {
    logger.info(`Segmenting user: ${userId}`);

    // Fetch user metrics from database
    const metrics = await this.fetchUserMetrics(userId);

    // Calculate all applicable segments
    const segments: UserSegmentType[] = [];

    // Engagement segments (mutually exclusive)
    const engagementSegment = this.determineEngagementSegment(metrics);
    segments.push(engagementSegment);

    // Subscription segments
    const subscriptionSegment = this.determineSubscriptionSegment(metrics);
    segments.push(subscriptionSegment);

    // Behavior segments (can have multiple)
    const behaviorSegments = this.determineBehaviorSegments(metrics);
    segments.push(...behaviorSegments);

    // Lifecycle segments
    const lifecycleSegment = this.determineLifecycleSegment(metrics);
    segments.push(lifecycleSegment);

    // Value segments
    const valueSegment = this.determineValueSegment(metrics);
    segments.push(valueSegment);

    // Intent segments
    const intentSegment = this.determineIntentSegment(metrics);
    if (intentSegment) segments.push(intentSegment);

    // Determine primary segment (most actionable)
    const primarySegment = this.determinePrimarySegment(segments, metrics);

    // Calculate risk indicators
    const churnRisk = this.calculateChurnRisk(metrics);
    const upsellPotential = this.calculateUpsellPotential(metrics);

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(metrics);

    const userSegment: UserSegment = {
      id: `seg_${userId}_${Date.now()}`,
      userId,
      segments,
      primarySegment,
      engagementScore,
      activityLevel: this.getActivityLevel(metrics.daysSinceLastActive),
      lastActiveAt: metrics.lastActiveAt,
      daysActive: metrics.daysActiveInLast30,
      daysSinceLastActive: metrics.daysSinceLastActive,
      totalSwipes: metrics.totalSwipes,
      totalMatches: metrics.totalMatches,
      matchRate: metrics.totalSwipes > 0 ? metrics.totalMatches / metrics.totalSwipes : 0,
      totalMessages: metrics.totalMessages,
      avgMessagesPerMatch:
        metrics.totalMatches > 0 ? metrics.totalMessages / metrics.totalMatches : 0,
      responseRate: metrics.responseRate,
      subscriptionTier: metrics.subscriptionTier,
      subscriptionStartDate: metrics.subscriptionStartDate,
      totalSpend: metrics.totalSpend,
      ltv: metrics.ltv,
      ltvPredicted: this.predictLtv(metrics),
      profileCompletion: metrics.profileCompletion,
      photoCount: metrics.photoCount,
      hasVerification: metrics.hasVerification,
      churnRisk,
      upsellPotential,
      segmentedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store segment and check for transitions
    await this.storeSegment(userSegment);
    await this.checkAndRecordTransition(userId, primarySegment);

    return userSegment;
  }

  /**
   * Batch segment multiple users
   */
  async segmentUsers(userIds: string[]): Promise<UserSegment[]> {
    logger.info(`Batch segmenting ${userIds.length} users`);
    const results: UserSegment[] = [];

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((userId) =>
          this.segmentUser(userId).catch((err) => {
            logger.error(`Failed to segment user ${userId}:`, err);
            return null;
          })
        )
      );
      results.push(...batchResults.filter((r): r is UserSegment => r !== null));
    }

    return results;
  }

  /**
   * Get segment analytics
   */
  async getSegmentAnalytics(): Promise<SegmentAnalytics[]> {
    const query = `
      SELECT
        primary_segment as segment,
        COUNT(*) as user_count,
        AVG(engagement_score) as avg_engagement_score,
        AVG(ltv) as avg_ltv,
        AVG(match_rate) as avg_match_rate,
        SUM(CASE WHEN subscription_tier != 'FREE' THEN 1 ELSE 0 END)::float / COUNT(*) as conversion_rate,
        SUM(CASE WHEN days_since_last_active > 30 THEN 1 ELSE 0 END)::float / COUNT(*) as churn_rate
      FROM user_segments
      WHERE segmented_at > NOW() - INTERVAL '7 days'
      GROUP BY primary_segment
    `;

    try {
      const result = await dbClient.query(query);
      const totalUsers = result.rows.reduce(
        (sum: number, r: any) => sum + parseInt(r.user_count),
        0
      );

      return result.rows.map((row: any) => ({
        segment: row.segment as UserSegmentType,
        userCount: parseInt(row.user_count),
        percentOfTotal: totalUsers > 0 ? parseInt(row.user_count) / totalUsers : 0,
        avgEngagementScore: parseFloat(row.avg_engagement_score) || 0,
        avgLtv: parseFloat(row.avg_ltv) || 0,
        avgMatchRate: parseFloat(row.avg_match_rate) || 0,
        conversionRate: parseFloat(row.conversion_rate) || 0,
        churnRate: parseFloat(row.churn_rate) || 0,
      }));
    } catch (error) {
      logger.error('Failed to get segment analytics:', error);
      return [];
    }
  }

  /**
   * Get users in a specific segment
   */
  async getUsersInSegment(
    segment: UserSegmentType,
    limit: number = 100,
    offset: number = 0
  ): Promise<string[]> {
    const query = `
      SELECT user_id
      FROM user_segments
      WHERE $1 = ANY(segments)
      ORDER BY engagement_score DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await dbClient.query(query, [segment, limit, offset]);
      return result.rows.map((row: any) => row.user_id);
    } catch (error) {
      logger.error(`Failed to get users in segment ${segment}:`, error);
      return [];
    }
  }

  /**
   * Get recent segment transitions
   */
  async getSegmentTransitions(days: number = 7, limit: number = 100): Promise<SegmentTransition[]> {
    const query = `
      SELECT user_id, from_segment, to_segment, transitioned_at, trigger
      FROM segment_transitions
      WHERE transitioned_at > NOW() - INTERVAL '${days} days'
      ORDER BY transitioned_at DESC
      LIMIT $1
    `;

    try {
      const result = await dbClient.query(query, [limit]);
      return result.rows.map((row: any) => ({
        userId: row.user_id,
        fromSegment: row.from_segment as UserSegmentType,
        toSegment: row.to_segment as UserSegmentType,
        transitionedAt: new Date(row.transitioned_at),
        trigger: row.trigger,
      }));
    } catch (error) {
      logger.error('Failed to get segment transitions:', error);
      return [];
    }
  }

  // =============================================
  // PRIVATE METHODS
  // =============================================

  private async fetchUserMetrics(userId: string): Promise<UserMetrics> {
    // Fetch comprehensive user metrics from multiple tables
    const metricsQuery = `
      SELECT
        u.id,
        u.created_at,
        u.last_active_at,
        u.profile_completion,
        u.subscription_tier,
        u.subscription_start_date,
        COALESCE(
          (SELECT COUNT(*) FROM user_photos WHERE user_id = u.id),
          0
        ) as photo_count,
        COALESCE(
          (SELECT verified FROM user_verifications WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1),
          false
        ) as has_verification,
        COALESCE(
          (SELECT COUNT(DISTINCT DATE(created_at)) FROM user_activities WHERE user_id = u.id AND created_at > NOW() - INTERVAL '30 days'),
          0
        ) as days_active_30,
        COALESCE(
          (SELECT COUNT(*) FROM swipes WHERE user_id = u.id),
          0
        ) as total_swipes,
        COALESCE(
          (SELECT COUNT(*) FROM matches WHERE user_id_1 = u.id OR user_id_2 = u.id),
          0
        ) as total_matches,
        COALESCE(
          (SELECT COUNT(*) FROM messages WHERE sender_id = u.id),
          0
        ) as total_messages,
        COALESCE(
          (SELECT SUM(amount) FROM payments WHERE user_id = u.id AND status = 'completed'),
          0
        ) as total_spend,
        u.relationship_goal
      FROM users u
      WHERE u.id = $1
    `;

    try {
      const result = await dbClient.query(metricsQuery, [userId]);

      if (result.rows.length === 0) {
        // Return default metrics for new/unknown users
        return this.getDefaultMetrics(userId);
      }

      const row = result.rows[0];
      const createdAt = new Date(row.created_at);
      const lastActiveAt = row.last_active_at ? new Date(row.last_active_at) : new Date();
      const now = new Date();

      return {
        userId,
        createdAt,
        lastActiveAt,
        daysSinceCreated: Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        daysSinceLastActive: Math.floor(
          (now.getTime() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
        daysActiveInLast30: parseInt(row.days_active_30) || 0,
        profileCompletion: parseInt(row.profile_completion) || 0,
        photoCount: parseInt(row.photo_count) || 0,
        hasVerification: row.has_verification || false,
        subscriptionTier: row.subscription_tier || 'FREE',
        subscriptionStartDate: row.subscription_start_date
          ? new Date(row.subscription_start_date)
          : undefined,
        totalSwipes: parseInt(row.total_swipes) || 0,
        totalMatches: parseInt(row.total_matches) || 0,
        totalMessages: parseInt(row.total_messages) || 0,
        responseRate: await this.calculateResponseRate(userId),
        totalSpend: parseFloat(row.total_spend) || 0,
        ltv: parseFloat(row.total_spend) || 0,
        relationshipGoal: row.relationship_goal,
        weeklySwipes: await this.getWeeklySwipes(userId),
        weeklyMessages: await this.getWeeklyMessages(userId),
        previousEngagementScore: await this.getPreviousEngagementScore(userId),
      };
    } catch (error) {
      logger.error(`Failed to fetch metrics for user ${userId}:`, error);
      return this.getDefaultMetrics(userId);
    }
  }

  private getDefaultMetrics(userId: string): UserMetrics {
    return {
      userId,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      daysSinceCreated: 0,
      daysSinceLastActive: 0,
      daysActiveInLast30: 0,
      profileCompletion: 0,
      photoCount: 0,
      hasVerification: false,
      subscriptionTier: 'FREE',
      totalSwipes: 0,
      totalMatches: 0,
      totalMessages: 0,
      responseRate: 0,
      totalSpend: 0,
      ltv: 0,
      weeklySwipes: 0,
      weeklyMessages: 0,
      previousEngagementScore: 0,
    };
  }

  private async calculateResponseRate(userId: string): Promise<number> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE responded) as responded,
        COUNT(*) as total
      FROM (
        SELECT
          m.id,
          EXISTS(
            SELECT 1 FROM messages m2
            WHERE m2.conversation_id = m.conversation_id
            AND m2.sender_id = $1
            AND m2.created_at > m.created_at
          ) as responded
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE (c.user_id_1 = $1 OR c.user_id_2 = $1)
        AND m.sender_id != $1
        AND m.created_at > NOW() - INTERVAL '30 days'
      ) responses
    `;

    try {
      const result = await dbClient.query(query, [userId]);
      const row = result.rows[0];
      if (!row || parseInt(row.total) === 0) return 0;
      return parseInt(row.responded) / parseInt(row.total);
    } catch {
      return 0;
    }
  }

  private async getWeeklySwipes(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM swipes
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
    `;
    try {
      const result = await dbClient.query(query, [userId]);
      return parseInt(result.rows[0]?.count) || 0;
    } catch {
      return 0;
    }
  }

  private async getWeeklyMessages(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM messages
      WHERE sender_id = $1 AND created_at > NOW() - INTERVAL '7 days'
    `;
    try {
      const result = await dbClient.query(query, [userId]);
      return parseInt(result.rows[0]?.count) || 0;
    } catch {
      return 0;
    }
  }

  private async getPreviousEngagementScore(userId: string): Promise<number> {
    const query = `
      SELECT engagement_score
      FROM user_segments
      WHERE user_id = $1
      ORDER BY segmented_at DESC
      LIMIT 1 OFFSET 1
    `;
    try {
      const result = await dbClient.query(query, [userId]);
      return parseFloat(result.rows[0]?.engagement_score) || 0;
    } catch {
      return 0;
    }
  }

  private determineEngagementSegment(metrics: UserMetrics): UserSegmentType {
    if (metrics.daysSinceLastActive >= this.criteria.churnedDaysInactive) {
      return UserSegmentType.CHURNED_USER;
    }
    if (metrics.daysSinceLastActive >= this.criteria.dormantDaysInactive) {
      return UserSegmentType.DORMANT_USER;
    }
    if (metrics.daysActiveInLast30 >= this.criteria.powerUserDaysActive) {
      return UserSegmentType.POWER_USER;
    }
    if (metrics.daysActiveInLast30 >= this.criteria.activeUserDaysActive) {
      return UserSegmentType.ACTIVE_USER;
    }
    return UserSegmentType.CASUAL_USER;
  }

  private determineSubscriptionSegment(metrics: UserMetrics): UserSegmentType {
    const tier = metrics.subscriptionTier?.toUpperCase() || 'FREE';

    if (tier === 'FREE') {
      return UserSegmentType.FREE_USER;
    }
    if (tier === 'TRIAL') {
      return UserSegmentType.TRIAL_USER;
    }
    if (['DIAMOND', 'ELITE', 'PLATINUM'].includes(tier)) {
      return UserSegmentType.PREMIUM_USER;
    }
    if (['GOLD', 'BASIC', 'PLUS'].includes(tier)) {
      return UserSegmentType.PAID_USER;
    }

    // Check for lapsed subscribers
    if (metrics.totalSpend > 0 && tier === 'FREE') {
      return UserSegmentType.LAPSED_SUBSCRIBER;
    }

    return UserSegmentType.FREE_USER;
  }

  private determineBehaviorSegments(metrics: UserMetrics): UserSegmentType[] {
    const segments: UserSegmentType[] = [];

    // Swiper: High swipe volume
    if (metrics.weeklySwipes >= this.criteria.swiperMinSwipes) {
      segments.push(UserSegmentType.SWIPER);
    }

    // Matcher: High match rate
    const matchRate = metrics.totalSwipes > 0 ? metrics.totalMatches / metrics.totalSwipes : 0;
    if (matchRate >= this.criteria.matcherMinMatchRate) {
      segments.push(UserSegmentType.MATCHER);
    }

    // Conversationalist: High message engagement
    if (metrics.weeklyMessages >= this.criteria.conversationalistMinMessages) {
      segments.push(UserSegmentType.CONVERSATIONALIST);
    }

    // Profile Builder: Complete profile with photos
    if (metrics.profileCompletion >= 90 && metrics.photoCount >= 4) {
      segments.push(UserSegmentType.PROFILE_BUILDER);
    }

    // Ghost: Matches but doesn't respond
    if (metrics.totalMatches > 5 && metrics.responseRate < this.criteria.ghostMaxResponseRate) {
      segments.push(UserSegmentType.GHOST);
    }

    return segments;
  }

  private determineLifecycleSegment(metrics: UserMetrics): UserSegmentType {
    // New user: < 7 days
    if (metrics.daysSinceCreated < 7) {
      return UserSegmentType.NEW_USER;
    }

    // Onboarding: Incomplete profile
    if (metrics.profileCompletion < 70) {
      return UserSegmentType.ONBOARDING;
    }

    // Veteran: 180+ days, still active
    if (metrics.daysSinceCreated >= 180 && metrics.daysSinceLastActive < 30) {
      return UserSegmentType.VETERAN;
    }

    // Established: 30+ days, complete profile
    if (metrics.daysSinceCreated >= 30 && metrics.profileCompletion >= 70) {
      return UserSegmentType.ESTABLISHED;
    }

    return UserSegmentType.ONBOARDING;
  }

  private determineValueSegment(metrics: UserMetrics): UserSegmentType {
    // Check for at-risk users (engagement dropping)
    if (metrics.previousEngagementScore > 0) {
      const currentScore = this.calculateEngagementScore(metrics);
      const drop =
        (metrics.previousEngagementScore - currentScore) / metrics.previousEngagementScore;
      if (drop >= this.criteria.atRiskEngagementDrop) {
        return UserSegmentType.AT_RISK;
      }
    }

    // LTV-based segments
    if (metrics.ltv >= this.criteria.highLtvThreshold) {
      return UserSegmentType.HIGH_LTV;
    }
    if (metrics.ltv >= this.criteria.mediumLtvThreshold) {
      return UserSegmentType.MEDIUM_LTV;
    }

    return UserSegmentType.LOW_LTV;
  }

  private determineIntentSegment(metrics: UserMetrics): UserSegmentType | null {
    // Serious dater: Looking for relationship, complete profile, active
    if (
      metrics.relationshipGoal === 'RELATIONSHIP' &&
      metrics.profileCompletion >= 80 &&
      metrics.daysActiveInLast30 >= 10
    ) {
      return UserSegmentType.SERIOUS_DATER;
    }

    // Ready to meet: High engagement, responds quickly
    if (
      metrics.responseRate >= 0.7 &&
      metrics.daysActiveInLast30 >= 15 &&
      metrics.totalMatches >= 5
    ) {
      return UserSegmentType.READY_TO_MEET;
    }

    // Casual browser: Low activity, incomplete profile
    if (metrics.daysActiveInLast30 < 5 && metrics.profileCompletion < 50) {
      return UserSegmentType.CASUAL_BROWSER;
    }

    return null;
  }

  private determinePrimarySegment(
    segments: UserSegmentType[],
    metrics: UserMetrics
  ): UserSegmentType {
    // Priority order for primary segment (most actionable)
    const priorityOrder: UserSegmentType[] = [
      // High-value first
      UserSegmentType.AT_RISK, // Prevent churn
      UserSegmentType.LAPSED_SUBSCRIBER, // Win back
      UserSegmentType.TRIAL_USER, // Convert
      UserSegmentType.NEW_USER, // Onboard
      UserSegmentType.GHOST, // Re-engage
      UserSegmentType.DORMANT_USER, // Reactivate
      UserSegmentType.ONBOARDING, // Complete profile
      UserSegmentType.HIGH_LTV, // Retain
      UserSegmentType.PREMIUM_USER, // Upsell/retain
      UserSegmentType.READY_TO_MEET, // Facilitate
      UserSegmentType.SERIOUS_DATER, // Premium target
      UserSegmentType.POWER_USER, // Ambassador
      UserSegmentType.CONVERSATIONALIST, // Engagement driver
      UserSegmentType.MATCHER, // Success story
    ];

    for (const segment of priorityOrder) {
      if (segments.includes(segment)) {
        return segment;
      }
    }

    // Default to first segment
    return segments[0] || UserSegmentType.CASUAL_USER;
  }

  private calculateEngagementScore(metrics: UserMetrics): number {
    // Weighted engagement score (0-100)
    let score = 0;

    // Activity (30%)
    const activityScore = Math.min(metrics.daysActiveInLast30 / 30, 1) * 30;
    score += activityScore;

    // Profile completion (15%)
    score += (metrics.profileCompletion / 100) * 15;

    // Swipe activity (15%)
    const swipeScore = Math.min(metrics.weeklySwipes / 200, 1) * 15;
    score += swipeScore;

    // Match rate (15%)
    const matchRate = metrics.totalSwipes > 0 ? metrics.totalMatches / metrics.totalSwipes : 0;
    score += Math.min(matchRate * 10, 1) * 15;

    // Message engagement (15%)
    const msgScore = Math.min(metrics.weeklyMessages / 100, 1) * 15;
    score += msgScore;

    // Response rate (10%)
    score += metrics.responseRate * 10;

    return Math.round(score);
  }

  private calculateChurnRisk(metrics: UserMetrics): number {
    let risk = 0;

    // Days since last active (major factor)
    if (metrics.daysSinceLastActive > 14) {
      risk += 0.3 * Math.min(metrics.daysSinceLastActive / 60, 1);
    }

    // Engagement drop
    if (metrics.previousEngagementScore > 0) {
      const currentScore = this.calculateEngagementScore(metrics);
      const drop =
        (metrics.previousEngagementScore - currentScore) / metrics.previousEngagementScore;
      if (drop > 0) {
        risk += 0.3 * Math.min(drop, 1);
      }
    }

    // No matches
    if (metrics.totalMatches === 0 && metrics.daysSinceCreated > 14) {
      risk += 0.2;
    }

    // Incomplete profile
    if (metrics.profileCompletion < 50) {
      risk += 0.1;
    }

    // Ghost behavior
    if (metrics.responseRate < 0.2 && metrics.totalMatches > 3) {
      risk += 0.1;
    }

    return Math.min(risk, 1);
  }

  private calculateUpsellPotential(metrics: UserMetrics): number {
    // Only for non-premium users
    if (['DIAMOND', 'ELITE', 'PLATINUM'].includes(metrics.subscriptionTier || '')) {
      return 0;
    }

    let potential = 0;

    // High engagement = high potential
    const engagementScore = this.calculateEngagementScore(metrics);
    potential += (engagementScore / 100) * 0.4;

    // Active swipers hit limits
    if (metrics.weeklySwipes >= 50) {
      potential += 0.2;
    }

    // Matchers want more visibility
    const matchRate = metrics.totalSwipes > 0 ? metrics.totalMatches / metrics.totalSwipes : 0;
    if (matchRate >= 0.1) {
      potential += 0.15;
    }

    // Complete profile = serious user
    if (metrics.profileCompletion >= 80) {
      potential += 0.15;
    }

    // Trial users
    if (metrics.subscriptionTier === 'TRIAL') {
      potential += 0.1;
    }

    return Math.min(potential, 1);
  }

  private predictLtv(metrics: UserMetrics): number {
    // Simple LTV prediction model
    let predictedLtv = metrics.ltv; // Start with actual

    // Engagement multiplier
    const engagementScore = this.calculateEngagementScore(metrics);
    const engagementMultiplier = 1 + engagementScore / 100;

    // Conversion probability for free users
    if (metrics.subscriptionTier === 'FREE') {
      const conversionProb = this.calculateUpsellPotential(metrics);
      // Average subscription value * probability * expected duration
      predictedLtv += conversionProb * 20 * 6; // $20/month * 6 months avg
    }

    // Existing subscribers - predict retention
    if (metrics.totalSpend > 0) {
      const churnRisk = this.calculateChurnRisk(metrics);
      const retentionProb = 1 - churnRisk;
      // Expected future value
      const monthlyValue = metrics.totalSpend / Math.max(metrics.daysSinceCreated / 30, 1);
      predictedLtv += monthlyValue * retentionProb * 12; // 12 month horizon
    }

    return Math.round(predictedLtv * engagementMultiplier);
  }

  private getActivityLevel(daysSinceLastActive: number): 'high' | 'medium' | 'low' | 'none' {
    if (daysSinceLastActive <= 1) return 'high';
    if (daysSinceLastActive <= 7) return 'medium';
    if (daysSinceLastActive <= 30) return 'low';
    return 'none';
  }

  private async storeSegment(segment: UserSegment): Promise<void> {
    const query = `
      INSERT INTO user_segments (
        id, user_id, segments, primary_segment, engagement_score,
        activity_level, last_active_at, days_active, days_since_last_active,
        total_swipes, total_matches, match_rate, total_messages,
        avg_messages_per_match, response_rate, subscription_tier,
        subscription_start_date, total_spend, ltv, ltv_predicted,
        profile_completion, photo_count, has_verification,
        churn_risk, upsell_potential, segmented_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      )
      ON CONFLICT (user_id) DO UPDATE SET
        segments = EXCLUDED.segments,
        primary_segment = EXCLUDED.primary_segment,
        engagement_score = EXCLUDED.engagement_score,
        activity_level = EXCLUDED.activity_level,
        last_active_at = EXCLUDED.last_active_at,
        days_active = EXCLUDED.days_active,
        days_since_last_active = EXCLUDED.days_since_last_active,
        total_swipes = EXCLUDED.total_swipes,
        total_matches = EXCLUDED.total_matches,
        match_rate = EXCLUDED.match_rate,
        total_messages = EXCLUDED.total_messages,
        avg_messages_per_match = EXCLUDED.avg_messages_per_match,
        response_rate = EXCLUDED.response_rate,
        subscription_tier = EXCLUDED.subscription_tier,
        subscription_start_date = EXCLUDED.subscription_start_date,
        total_spend = EXCLUDED.total_spend,
        ltv = EXCLUDED.ltv,
        ltv_predicted = EXCLUDED.ltv_predicted,
        profile_completion = EXCLUDED.profile_completion,
        photo_count = EXCLUDED.photo_count,
        has_verification = EXCLUDED.has_verification,
        churn_risk = EXCLUDED.churn_risk,
        upsell_potential = EXCLUDED.upsell_potential,
        segmented_at = EXCLUDED.segmented_at,
        updated_at = EXCLUDED.updated_at
    `;

    try {
      await dbClient.query(query, [
        segment.id,
        segment.userId,
        segment.segments,
        segment.primarySegment,
        segment.engagementScore,
        segment.activityLevel,
        segment.lastActiveAt,
        segment.daysActive,
        segment.daysSinceLastActive,
        segment.totalSwipes,
        segment.totalMatches,
        segment.matchRate,
        segment.totalMessages,
        segment.avgMessagesPerMatch,
        segment.responseRate,
        segment.subscriptionTier,
        segment.subscriptionStartDate,
        segment.totalSpend,
        segment.ltv,
        segment.ltvPredicted,
        segment.profileCompletion,
        segment.photoCount,
        segment.hasVerification,
        segment.churnRisk,
        segment.upsellPotential,
        segment.segmentedAt,
        segment.createdAt,
        segment.updatedAt,
      ]);
    } catch (error) {
      logger.error('Failed to store segment:', error);
    }
  }

  private async checkAndRecordTransition(
    userId: string,
    newPrimarySegment: UserSegmentType
  ): Promise<void> {
    const query = `
      SELECT primary_segment
      FROM user_segments
      WHERE user_id = $1
      ORDER BY segmented_at DESC
      LIMIT 1 OFFSET 1
    `;

    try {
      const result = await dbClient.query(query, [userId]);
      if (result.rows.length === 0) return;

      const previousSegment = result.rows[0].primary_segment as UserSegmentType;
      if (previousSegment !== newPrimarySegment) {
        await this.recordTransition(userId, previousSegment, newPrimarySegment);
      }
    } catch (error) {
      logger.error('Failed to check transition:', error);
    }
  }

  private async recordTransition(
    userId: string,
    fromSegment: UserSegmentType,
    toSegment: UserSegmentType
  ): Promise<void> {
    const query = `
      INSERT INTO segment_transitions (user_id, from_segment, to_segment, transitioned_at)
      VALUES ($1, $2, $3, NOW())
    `;

    try {
      await dbClient.query(query, [userId, fromSegment, toSegment]);
      logger.info(`User ${userId} transitioned from ${fromSegment} to ${toSegment}`);
    } catch (error) {
      logger.error('Failed to record transition:', error);
    }
  }
}

// Internal interface for metrics
interface UserMetrics {
  userId: string;
  createdAt: Date;
  lastActiveAt?: Date;
  daysSinceCreated: number;
  daysSinceLastActive: number;
  daysActiveInLast30: number;
  profileCompletion: number;
  photoCount: number;
  hasVerification: boolean;
  subscriptionTier?: string;
  subscriptionStartDate?: Date;
  totalSwipes: number;
  totalMatches: number;
  totalMessages: number;
  responseRate: number;
  totalSpend: number;
  ltv: number;
  relationshipGoal?: string;
  weeklySwipes: number;
  weeklyMessages: number;
  previousEngagementScore: number;
}

// Singleton instance
export const segmentationService = new SegmentationService();
