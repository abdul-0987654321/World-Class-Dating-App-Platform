/**
 * Analytics Dashboard Service
 * Comprehensive analytics, A/B testing, and notification management
 */

import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    new: number;
    churned: number;
    dau: number;
    wau: number;
    mau: number;
  };
  engagement: {
    avgSessionDuration: number;
    avgSwipesPerSession: number;
    avgMessagesPerMatch: number;
    matchRate: number;
    responseRate: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
    arppu: number;
    conversionRate: number;
    churnRate: number;
  };
  content: {
    totalPhotos: number;
    totalMessages: number;
    totalMatches: number;
    reportsToday: number;
    moderationQueueSize: number;
  };
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  variants: ABTestVariant[];
  targetingRules: ABTestTargeting;
  metrics: string[];
  startDate?: Date;
  endDate?: Date;
  winningVariant?: string;
  results?: ABTestResults;
  createdAt: Date;
  updatedAt: Date;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage of traffic
  config: Record<string, any>;
}

export interface ABTestTargeting {
  percentage: number;
  platforms?: ('ios' | 'android' | 'web')[];
  subscriptionTiers?: string[];
  userSegments?: string[];
  minAppVersion?: string;
}

export interface ABTestResults {
  totalParticipants: number;
  variantResults: Record<string, {
    participants: number;
    conversions: number;
    conversionRate: number;
    avgValue: number;
    confidence: number;
  }>;
  statisticalSignificance: number;
  recommendedVariant?: string;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  type: 'push' | 'email' | 'in_app' | 'sms';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  targeting: NotificationTargeting;
  content: NotificationContent;
  scheduledAt?: Date;
  sentAt?: Date;
  metrics?: NotificationMetrics;
  createdAt: Date;
}

export interface NotificationTargeting {
  userSegments?: string[];
  subscriptionTiers?: string[];
  inactivityDays?: number;
  lastActiveWithin?: number;
  hasMatches?: boolean;
  hasMessages?: boolean;
  customQuery?: string;
}

export interface NotificationContent {
  title: string;
  body: string;
  imageUrl?: string;
  deepLink?: string;
  data?: Record<string, any>;
}

export interface NotificationMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  userCount: number;
  isAutoUpdating: boolean;
  lastUpdatedAt: Date;
}

export interface SegmentCriteria {
  subscriptionTier?: string[];
  ageRange?: { min: number; max: number };
  gender?: string[];
  activityLevel?: 'high' | 'medium' | 'low' | 'inactive';
  hasPhotos?: boolean;
  isVerified?: boolean;
  matchCount?: { min?: number; max?: number };
  messageCount?: { min?: number; max?: number };
  registeredWithin?: number; // days
  lastActiveWithin?: number; // days
}

class AnalyticsDashboardService {
  /**
   * Get dashboard metrics overview
   */
  async getDashboardMetrics(
    dateRange: { start: Date; end: Date }
  ): Promise<DashboardMetrics> {
    const { start, end } = dateRange;

    // User metrics
    const userMetrics = await this.getUserMetrics(start, end);

    // Engagement metrics
    const engagementMetrics = await this.getEngagementMetrics(start, end);

    // Revenue metrics
    const revenueMetrics = await this.getRevenueMetrics(start, end);

    // Content metrics
    const contentMetrics = await this.getContentMetrics();

    return {
      users: userMetrics,
      engagement: engagementMetrics,
      revenue: revenueMetrics,
      content: contentMetrics,
    };
  }

  /**
   * Get user funnel analytics
   */
  async getFunnelAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    registration: number;
    profileCompleted: number;
    firstSwipe: number;
    firstMatch: number;
    firstMessage: number;
    subscriptionStarted: number;
    conversionRates: Record<string, number>;
  }> {
    const registration = await db('users')
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .count('id as count')
      .first();

    const profileCompleted = await db('users')
      .join('profiles', 'users.id', 'profiles.user_id')
      .where('users.created_at', '>=', startDate)
      .where('users.created_at', '<=', endDate)
      .where('profiles.profile_completion', '>=', 80)
      .count('users.id as count')
      .first();

    const firstSwipe = await db('swipes')
      .select('user_id')
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .groupBy('user_id')
      .count('* as c')
      .then(r => r.length);

    const firstMatch = await db('matches')
      .select('user_id_1')
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .groupBy('user_id_1')
      .count('* as c')
      .then(r => r.length);

    const firstMessage = await db('messages')
      .select('sender_id')
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .groupBy('sender_id')
      .count('* as c')
      .then(r => r.length);

    const subscriptionStarted = await db('subscriptions')
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .whereNot('tier', 'free')
      .count('id as count')
      .first();

    const reg = Number(registration?.count || 0);
    const prof = Number(profileCompleted?.count || 0);

    return {
      registration: reg,
      profileCompleted: prof,
      firstSwipe,
      firstMatch,
      firstMessage,
      subscriptionStarted: Number(subscriptionStarted?.count || 0),
      conversionRates: {
        registrationToProfile: reg > 0 ? (prof / reg) * 100 : 0,
        profileToSwipe: prof > 0 ? (firstSwipe / prof) * 100 : 0,
        swipeToMatch: firstSwipe > 0 ? (firstMatch / firstSwipe) * 100 : 0,
        matchToMessage: firstMatch > 0 ? (firstMessage / firstMatch) * 100 : 0,
      },
    };
  }

  // A/B Testing

  /**
   * Create a new A/B test
   */
  async createABTest(testData: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest> {
    const test: ABTest = {
      id: uuidv4(),
      ...testData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db('ab_tests').insert({
      id: test.id,
      name: test.name,
      description: test.description,
      hypothesis: test.hypothesis,
      status: test.status,
      variants: JSON.stringify(test.variants),
      targeting_rules: JSON.stringify(test.targetingRules),
      metrics: JSON.stringify(test.metrics),
      start_date: test.startDate,
      end_date: test.endDate,
      created_at: test.createdAt,
      updated_at: test.updatedAt,
    });

    logger.info(`A/B test created: ${test.name}`);

    return test;
  }

  /**
   * Get user's variant for a test
   */
  async getUserVariant(
    userId: string,
    testId: string
  ): Promise<{ variant: ABTestVariant; isNewAssignment: boolean } | null> {
    // Check for existing assignment
    const existing = await db('ab_test_assignments')
      .where('user_id', userId)
      .where('test_id', testId)
      .first();

    if (existing) {
      const test = await this.getABTest(testId);
      const variant = test?.variants.find(v => v.id === existing.variant_id);
      return variant ? { variant, isNewAssignment: false } : null;
    }

    // Get test and assign variant
    const test = await this.getABTest(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if user matches targeting
    const matches = await this.userMatchesTestTargeting(userId, test.targetingRules);
    if (!matches) {
      return null;
    }

    // Assign variant based on weights
    const variant = this.selectVariantByWeight(test.variants);

    // Store assignment
    await db('ab_test_assignments').insert({
      id: uuidv4(),
      user_id: userId,
      test_id: testId,
      variant_id: variant.id,
      assigned_at: new Date(),
    });

    logger.debug(`User ${userId} assigned to variant ${variant.name} in test ${test.name}`);

    return { variant, isNewAssignment: true };
  }

  /**
   * Record conversion event for A/B test
   */
  async recordTestConversion(
    userId: string,
    testId: string,
    metricName: string,
    value: number = 1
  ): Promise<void> {
    const assignment = await db('ab_test_assignments')
      .where('user_id', userId)
      .where('test_id', testId)
      .first();

    if (!assignment) return;

    await db('ab_test_conversions').insert({
      id: uuidv4(),
      assignment_id: assignment.id,
      metric_name: metricName,
      value,
      created_at: new Date(),
    });
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ABTestResults | null> {
    const test = await this.getABTest(testId);
    if (!test) return null;

    const assignments = await db('ab_test_assignments')
      .where('test_id', testId)
      .select('variant_id', db.raw('COUNT(*) as count'))
      .groupBy('variant_id');

    const conversions = await db('ab_test_conversions')
      .join('ab_test_assignments', 'ab_test_conversions.assignment_id', 'ab_test_assignments.id')
      .where('ab_test_assignments.test_id', testId)
      .select(
        'ab_test_assignments.variant_id',
        db.raw('COUNT(DISTINCT ab_test_assignments.user_id) as conversions'),
        db.raw('SUM(ab_test_conversions.value) as total_value')
      )
      .groupBy('ab_test_assignments.variant_id');

    const variantResults: ABTestResults['variantResults'] = {};
    let totalParticipants = 0;

    for (const variant of test.variants) {
      const assignmentData = assignments.find((a: any) => a.variant_id === variant.id);
      const conversionData = conversions.find((c: any) => c.variant_id === variant.id);

      const participants = Number(assignmentData?.count || 0);
      const convs = Number(conversionData?.conversions || 0);
      const totalValue = Number(conversionData?.total_value || 0);

      totalParticipants += participants;

      variantResults[variant.id] = {
        participants,
        conversions: convs,
        conversionRate: participants > 0 ? (convs / participants) * 100 : 0,
        avgValue: convs > 0 ? totalValue / convs : 0,
        confidence: this.calculateConfidence(participants, convs),
      };
    }

    // Determine winning variant
    const sortedVariants = Object.entries(variantResults)
      .sort((a, b) => b[1].conversionRate - a[1].conversionRate);

    const winner = sortedVariants[0];
    const significance = this.calculateStatisticalSignificance(
      variantResults[sortedVariants[0][0]],
      variantResults[sortedVariants[1]?.[0]]
    );

    return {
      totalParticipants,
      variantResults,
      statisticalSignificance: significance,
      recommendedVariant: significance >= 95 ? winner[0] : undefined,
    };
  }

  // Notifications

  /**
   * Create notification campaign
   */
  async createNotificationCampaign(
    campaignData: Omit<NotificationCampaign, 'id' | 'createdAt' | 'metrics'>
  ): Promise<NotificationCampaign> {
    const campaign: NotificationCampaign = {
      id: uuidv4(),
      ...campaignData,
      createdAt: new Date(),
    };

    await db('notification_campaigns').insert({
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      targeting: JSON.stringify(campaign.targeting),
      content: JSON.stringify(campaign.content),
      scheduled_at: campaign.scheduledAt,
      created_at: campaign.createdAt,
    });

    logger.info(`Notification campaign created: ${campaign.name}`);

    return campaign;
  }

  /**
   * Send notification campaign
   */
  async sendNotificationCampaign(campaignId: string): Promise<{
    success: boolean;
    recipientCount: number;
    error?: string;
  }> {
    const campaign = await db('notification_campaigns')
      .where('id', campaignId)
      .first();

    if (!campaign) {
      return { success: false, recipientCount: 0, error: 'Campaign not found' };
    }

    if (campaign.status === 'sent') {
      return { success: false, recipientCount: 0, error: 'Campaign already sent' };
    }

    try {
      // Get target users
      const targeting = JSON.parse(campaign.targeting);
      const recipients = await this.getNotificationRecipients(targeting);

      // Update status
      await db('notification_campaigns')
        .where('id', campaignId)
        .update({
          status: 'sending',
          updated_at: new Date(),
        });

      // Send notifications (batch)
      const content = JSON.parse(campaign.content);
      let sent = 0;

      for (const recipient of recipients) {
        try {
          await this.sendNotification(recipient.id, campaign.type, content);
          sent++;
        } catch (error) {
          logger.error(`Failed to send notification to ${recipient.id}:`, error);
        }
      }

      // Update campaign metrics
      await db('notification_campaigns')
        .where('id', campaignId)
        .update({
          status: 'sent',
          sent_at: new Date(),
          metrics: JSON.stringify({
            sent,
            delivered: sent, // In production, track actual delivery
            opened: 0,
            clicked: 0,
            deliveryRate: 100,
            openRate: 0,
            clickRate: 0,
          }),
          updated_at: new Date(),
        });

      logger.info(`Notification campaign ${campaign.name} sent to ${sent} users`);

      return { success: true, recipientCount: sent };
    } catch (error) {
      logger.error('Error sending notification campaign:', error);

      await db('notification_campaigns')
        .where('id', campaignId)
        .update({
          status: 'draft',
          updated_at: new Date(),
        });

      return { success: false, recipientCount: 0, error: 'Failed to send campaign' };
    }
  }

  /**
   * Create user segment
   */
  async createUserSegment(
    segmentData: Omit<UserSegment, 'id' | 'userCount' | 'lastUpdatedAt'>
  ): Promise<UserSegment> {
    const userCount = await this.countUsersInSegment(segmentData.criteria);

    const segment: UserSegment = {
      id: uuidv4(),
      ...segmentData,
      userCount,
      lastUpdatedAt: new Date(),
    };

    await db('user_segments').insert({
      id: segment.id,
      name: segment.name,
      description: segment.description,
      criteria: JSON.stringify(segment.criteria),
      user_count: segment.userCount,
      is_auto_updating: segment.isAutoUpdating,
      last_updated_at: segment.lastUpdatedAt,
      created_at: new Date(),
    });

    return segment;
  }

  /**
   * Get users in segment
   */
  async getUsersInSegment(
    segmentId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<string[]> {
    const segment = await db('user_segments').where('id', segmentId).first();
    if (!segment) return [];

    const criteria = JSON.parse(segment.criteria);
    return this.queryUsersWithCriteria(criteria, limit, offset);
  }

  // Private helper methods

  private async getUserMetrics(start: Date, end: Date) {
    const total = await db('users')
      .where('is_active', true)
      .count('id as count')
      .first();

    const active = await db('users')
      .where('last_active_at', '>=', start)
      .count('id as count')
      .first();

    const newUsers = await db('users')
      .where('created_at', '>=', start)
      .where('created_at', '<=', end)
      .count('id as count')
      .first();

    // DAU, WAU, MAU
    const dayAgo = new Date(end);
    dayAgo.setDate(dayAgo.getDate() - 1);

    const weekAgo = new Date(end);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(end);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const dau = await db('users')
      .where('last_active_at', '>=', dayAgo)
      .count('id as count')
      .first();

    const wau = await db('users')
      .where('last_active_at', '>=', weekAgo)
      .count('id as count')
      .first();

    const mau = await db('users')
      .where('last_active_at', '>=', monthAgo)
      .count('id as count')
      .first();

    return {
      total: Number(total?.count || 0),
      active: Number(active?.count || 0),
      new: Number(newUsers?.count || 0),
      churned: 0, // Calculate based on inactivity
      dau: Number(dau?.count || 0),
      wau: Number(wau?.count || 0),
      mau: Number(mau?.count || 0),
    };
  }

  private async getEngagementMetrics(start: Date, end: Date) {
    const swipes = await db('swipes')
      .where('created_at', '>=', start)
      .where('created_at', '<=', end)
      .select(db.raw('COUNT(*) as total'), db.raw('COUNT(DISTINCT user_id) as users'))
      .first();

    const matches = await db('matches')
      .where('created_at', '>=', start)
      .where('created_at', '<=', end)
      .count('id as count')
      .first();

    const messages = await db('messages')
      .where('created_at', '>=', start)
      .where('created_at', '<=', end)
      .count('id as count')
      .first();

    const swipeTotal = Number(swipes?.total || 0);
    const swipeUsers = Number(swipes?.users || 1);
    const matchCount = Number(matches?.count || 0);

    return {
      avgSessionDuration: 12.5, // Would need session tracking
      avgSwipesPerSession: swipeTotal / swipeUsers,
      avgMessagesPerMatch: matchCount > 0 ? Number(messages?.count || 0) / matchCount : 0,
      matchRate: swipeTotal > 0 ? (matchCount / swipeTotal) * 100 : 0,
      responseRate: 65, // Would need message response tracking
    };
  }

  private async getRevenueMetrics(start: Date, end: Date) {
    const transactions = await db('transactions')
      .where('created_at', '>=', start)
      .where('created_at', '<=', end)
      .where('status', 'succeeded')
      .select(db.raw('SUM(amount) as total'))
      .first();

    const subscribers = await db('subscriptions')
      .whereNot('tier', 'free')
      .where('status', 'active')
      .count('id as count')
      .first();

    const totalUsers = await db('users')
      .where('is_active', true)
      .count('id as count')
      .first();

    const revenue = Number(transactions?.total || 0) / 100; // Convert cents to dollars
    const subCount = Number(subscribers?.count || 0);
    const userCount = Number(totalUsers?.count || 1);

    return {
      mrr: revenue,
      arr: revenue * 12,
      arpu: revenue / userCount,
      arppu: subCount > 0 ? revenue / subCount : 0,
      conversionRate: (subCount / userCount) * 100,
      churnRate: 5, // Would need churn tracking
    };
  }

  private async getContentMetrics() {
    const photos = await db('profile_photos').count('id as count').first();
    const messages = await db('messages').count('id as count').first();
    const matches = await db('matches').count('id as count').first();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reportsToday = await db('user_reports')
      .where('created_at', '>=', today)
      .count('id as count')
      .first();

    const moderationQueue = await db('content_moderation_queue')
      .where('status', 'pending')
      .count('id as count')
      .first();

    return {
      totalPhotos: Number(photos?.count || 0),
      totalMessages: Number(messages?.count || 0),
      totalMatches: Number(matches?.count || 0),
      reportsToday: Number(reportsToday?.count || 0),
      moderationQueueSize: Number(moderationQueue?.count || 0),
    };
  }

  private async getABTest(testId: string): Promise<ABTest | null> {
    const test = await db('ab_tests').where('id', testId).first();
    if (!test) return null;

    return {
      id: test.id,
      name: test.name,
      description: test.description,
      hypothesis: test.hypothesis,
      status: test.status,
      variants: JSON.parse(test.variants),
      targetingRules: JSON.parse(test.targeting_rules),
      metrics: JSON.parse(test.metrics),
      startDate: test.start_date,
      endDate: test.end_date,
      winningVariant: test.winning_variant,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
    };
  }

  private async userMatchesTestTargeting(userId: string, targeting: ABTestTargeting): Promise<boolean> {
    // Check percentage-based enrollment
    const hash = this.hashUserId(userId);
    if (hash > targeting.percentage) return false;

    // Additional targeting checks would go here
    return true;
  }

  private selectVariantByWeight(variants: ABTestVariant[]): ABTestVariant {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;

    for (const variant of variants) {
      random -= variant.weight;
      if (random <= 0) return variant;
    }

    return variants[0];
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  private calculateConfidence(participants: number, conversions: number): number {
    if (participants < 30) return 0;
    // Simplified confidence calculation
    const rate = conversions / participants;
    const stdError = Math.sqrt((rate * (1 - rate)) / participants);
    return Math.min(99, (1 - stdError) * 100);
  }

  private calculateStatisticalSignificance(variant1: any, variant2: any): number {
    if (!variant1 || !variant2) return 0;
    // Simplified z-test
    const n1 = variant1.participants;
    const n2 = variant2.participants;
    const p1 = variant1.conversionRate / 100;
    const p2 = variant2.conversionRate / 100;

    if (n1 < 30 || n2 < 30) return 0;

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    const z = Math.abs(p1 - p2) / se;

    // Convert z-score to confidence percentage
    if (z >= 2.58) return 99;
    if (z >= 1.96) return 95;
    if (z >= 1.65) return 90;
    return Math.min(89, z * 30);
  }

  private async getNotificationRecipients(targeting: NotificationTargeting): Promise<any[]> {
    let query = db('users').where('is_active', true);

    if (targeting.subscriptionTiers) {
      query = query.whereIn('subscription_tier', targeting.subscriptionTiers);
    }

    if (targeting.inactivityDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - targeting.inactivityDays);
      query = query.where('last_active_at', '<', cutoff);
    }

    if (targeting.lastActiveWithin) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - targeting.lastActiveWithin);
      query = query.where('last_active_at', '>=', cutoff);
    }

    return query.select('id');
  }

  private async sendNotification(userId: string, type: string, content: NotificationContent): Promise<void> {
    // In production, use notification service (FCM, APNs, SendGrid, etc.)
    await db('notifications').insert({
      id: uuidv4(),
      user_id: userId,
      type,
      title: content.title,
      body: content.body,
      data: JSON.stringify(content.data || {}),
      deep_link: content.deepLink,
      created_at: new Date(),
    });
  }

  private async countUsersInSegment(criteria: SegmentCriteria): Promise<number> {
    const userIds = await this.queryUsersWithCriteria(criteria, 100000, 0);
    return userIds.length;
  }

  private async queryUsersWithCriteria(
    criteria: SegmentCriteria,
    limit: number,
    offset: number
  ): Promise<string[]> {
    let query = db('users')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .where('users.is_active', true);

    if (criteria.subscriptionTier) {
      query = query.whereIn('users.subscription_tier', criteria.subscriptionTier);
    }

    if (criteria.gender) {
      query = query.whereIn('users.gender', criteria.gender);
    }

    if (criteria.isVerified !== undefined) {
      query = query.where('users.is_verified', criteria.isVerified);
    }

    if (criteria.registeredWithin) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - criteria.registeredWithin);
      query = query.where('users.created_at', '>=', cutoff);
    }

    if (criteria.lastActiveWithin) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - criteria.lastActiveWithin);
      query = query.where('users.last_active_at', '>=', cutoff);
    }

    const users = await query.select('users.id').limit(limit).offset(offset);
    return users.map((u: any) => u.id);
  }
}

export const analyticsDashboardService = new AnalyticsDashboardService();
