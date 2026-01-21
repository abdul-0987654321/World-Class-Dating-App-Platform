/**
 * Relationship Health Dashboard Service
 *
 * Provides long-term relationship tracking and insights for users who have been
 * dating/matched for a while. Includes health metrics, milestones, and actionable insights.
 *
 * Privacy: Both users must opt-in, and individual views don't share metrics
 * that could cause conflict.
 *
 * Feature flag: RELATIONSHIP_DASHBOARD_ENABLED (0% rollout)
 */

import { v4 as uuidv4 } from 'uuid';

import { postgresClient } from '../infrastructure/database/postgres-client';
import redisClient from '../infrastructure/cache/redis';
import { createLogger } from '../utils/logger';

const logger = createLogger('relationship-dashboard-service');

// Feature flag - 0% rollout initially
const FEATURE_FLAG_PERCENTAGE = 0;

// ============================================================================
// Types and Interfaces
// ============================================================================

export type HealthTrend = 'improving' | 'stable' | 'declining';
export type InsightPriority = 'high' | 'medium' | 'low';
export type InsightType =
  | 'communication'
  | 'engagement'
  | 'balance'
  | 'milestone'
  | 'suggestion'
  | 'warning';

export type MilestoneType =
  | 'first_message'
  | 'first_date_planned'
  | 'messages_100'
  | 'messages_500'
  | 'messages_1000'
  | 'week_streak'
  | 'month_streak'
  | 'first_call'
  | 'first_gift'
  | 'custom';

export interface RelationshipHealth {
  relationshipId: string;
  users: {
    user1Id: string;
    user2Id: string;
  };
  healthScore: number; // 0-100
  trend: HealthTrend;
  milestones: RelationshipMilestone[];
  insights: RelationshipInsight[];
  lastCalculated: Date;
}

export interface HealthMetric {
  name: string;
  value: number;
  trend: HealthTrend;
  benchmark: number; // Average for similar relationships
  description: string;
  weight: number; // Weight for overall health score calculation
}

export interface RelationshipMilestone {
  id: string;
  type: MilestoneType;
  date: Date;
  description: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  isCustom: boolean;
  celebratedBy?: string[]; // User IDs who acknowledged milestone
}

export interface RelationshipInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  actionable: boolean;
  priority: InsightPriority;
  createdAt: Date;
  expiresAt?: Date;
  dismissedBy?: string[]; // User IDs who dismissed this insight
}

export interface DashboardData {
  health: RelationshipHealth;
  metrics: HealthMetric[];
  milestones: RelationshipMilestone[];
  insights: RelationshipInsight[];
  recommendations: string[];
  periodStart: Date;
  periodEnd: Date;
}

export interface RelationshipRecord {
  id: string;
  user1Id: string;
  user2Id: string;
  conversationId: string;
  user1OptedIn: boolean;
  user2OptedIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  healthScore: number;
  trend: HealthTrend;
  metadata?: Record<string, any>;
}

export interface MessageStats {
  totalMessages: number;
  messagesByUser: Map<string, number>;
  avgMessageLength: Map<string, number>;
  emojiCount: Map<string, number>;
  questionCount: Map<string, number>;
  responseTimeAvg: Map<string, number>;
  datesMentioned: number;
  topicsDiscussed: string[];
}

export interface HealthTrendData {
  date: Date;
  score: number;
  metrics: Record<string, number>;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class RelationshipDashboardService {
  private readonly cachePrefix = 'relationship:dashboard:';
  private readonly cacheTTL = 3600; // 1 hour
  private readonly minMessagesForTracking = 10;
  private readonly minDaysForTracking = 3;

  /**
   * Check if feature is enabled for a user
   */
  isFeatureEnabled(userId: string): boolean {
    // Use consistent hashing for user to determine rollout
    const hash = this.hashString(userId);
    const percentage = hash % 100;
    return percentage < FEATURE_FLAG_PERCENTAGE;
  }

  /**
   * Create a new relationship for tracking
   * Both users must opt-in for tracking to be active
   */
  async createRelationship(
    user1Id: string,
    user2Id: string,
    conversationId: string
  ): Promise<RelationshipRecord> {
    try {
      logger.info('Creating relationship tracking', { user1Id, user2Id, conversationId });

      // Ensure consistent ordering of user IDs
      const [orderedUser1, orderedUser2] = [user1Id, user2Id].sort();

      // Check if relationship already exists
      const existing = await this.findRelationshipByUsers(orderedUser1, orderedUser2);
      if (existing) {
        logger.info('Relationship already exists', { relationshipId: existing.id });
        return existing;
      }

      const relationship: RelationshipRecord = {
        id: uuidv4(),
        user1Id: orderedUser1,
        user2Id: orderedUser2,
        conversationId,
        user1OptedIn: false,
        user2OptedIn: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        healthScore: 50, // Neutral starting score
        trend: 'stable',
      };

      await postgresClient
        .knex('relationship_tracking')
        .insert({
          id: relationship.id,
          user1_id: relationship.user1Id,
          user2_id: relationship.user2Id,
          conversation_id: relationship.conversationId,
          user1_opted_in: relationship.user1OptedIn,
          user2_opted_in: relationship.user2OptedIn,
          created_at: relationship.createdAt,
          updated_at: relationship.updatedAt,
          health_score: relationship.healthScore,
          trend: relationship.trend,
        });

      logger.info('Relationship created', { relationshipId: relationship.id });
      return relationship;
    } catch (error: any) {
      logger.error('Failed to create relationship', { error: error.message, user1Id, user2Id });
      throw new Error(`Failed to create relationship: ${error.message}`);
    }
  }

  /**
   * Opt-in a user for relationship tracking
   */
  async optIn(relationshipId: string, userId: string): Promise<boolean> {
    try {
      const relationship = await this.findRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      const isUser1 = relationship.user1Id === userId;
      const isUser2 = relationship.user2Id === userId;

      if (!isUser1 && !isUser2) {
        throw new Error('User is not part of this relationship');
      }

      const updateField = isUser1 ? 'user1_opted_in' : 'user2_opted_in';

      await postgresClient
        .knex('relationship_tracking')
        .where('id', relationshipId)
        .update({
          [updateField]: true,
          updated_at: new Date(),
        });

      logger.info('User opted in to relationship tracking', { relationshipId, userId });

      // Clear cache
      await this.clearCache(relationshipId);

      return true;
    } catch (error: any) {
      logger.error('Failed to opt in', { error: error.message, relationshipId, userId });
      throw error;
    }
  }

  /**
   * Opt-out a user from relationship tracking
   */
  async optOut(relationshipId: string, userId: string): Promise<boolean> {
    try {
      const relationship = await this.findRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      const isUser1 = relationship.user1Id === userId;
      const isUser2 = relationship.user2Id === userId;

      if (!isUser1 && !isUser2) {
        throw new Error('User is not part of this relationship');
      }

      const updateField = isUser1 ? 'user1_opted_in' : 'user2_opted_in';

      await postgresClient
        .knex('relationship_tracking')
        .where('id', relationshipId)
        .update({
          [updateField]: false,
          updated_at: new Date(),
        });

      logger.info('User opted out of relationship tracking', { relationshipId, userId });

      // Clear cache
      await this.clearCache(relationshipId);

      return true;
    } catch (error: any) {
      logger.error('Failed to opt out', { error: error.message, relationshipId, userId });
      throw error;
    }
  }

  /**
   * Check if both users have opted in
   */
  async isBothOptedIn(relationshipId: string): Promise<boolean> {
    const relationship = await this.findRelationshipById(relationshipId);
    if (!relationship) {
      return false;
    }
    return relationship.user1OptedIn && relationship.user2OptedIn;
  }

  /**
   * Calculate overall health score (0-100) for a relationship
   */
  async calculateHealthScore(relationshipId: string): Promise<number> {
    try {
      const relationship = await this.findRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      // Check opt-in status
      if (!relationship.user1OptedIn || !relationship.user2OptedIn) {
        throw new Error('Both users must opt-in for health tracking');
      }

      const metrics = await this.calculateMetrics(relationshipId);

      // Calculate weighted average of all metrics
      let totalWeight = 0;
      let weightedSum = 0;

      for (const metric of metrics) {
        weightedSum += metric.value * metric.weight;
        totalWeight += metric.weight;
      }

      const healthScore = totalWeight > 0
        ? Math.round(weightedSum / totalWeight)
        : 50;

      // Clamp to 0-100 range
      const clampedScore = Math.max(0, Math.min(100, healthScore));

      // Update stored health score
      await postgresClient
        .knex('relationship_tracking')
        .where('id', relationshipId)
        .update({
          health_score: clampedScore,
          updated_at: new Date(),
        });

      logger.info('Health score calculated', { relationshipId, score: clampedScore });

      return clampedScore;
    } catch (error: any) {
      logger.error('Failed to calculate health score', { error: error.message, relationshipId });
      throw error;
    }
  }

  /**
   * Calculate individual health metrics
   */
  async calculateMetrics(relationshipId: string): Promise<HealthMetric[]> {
    try {
      const relationship = await this.findRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      const stats = await this.getMessageStats(relationship.conversationId, 30); // Last 30 days
      const previousStats = await this.getMessageStats(relationship.conversationId, 60, 30); // 30-60 days ago

      const metrics: HealthMetric[] = [];

      // 1. Communication Frequency Trend
      metrics.push(this.calculateCommunicationFrequency(stats, previousStats));

      // 2. Response Enthusiasm (length, emojis, questions)
      metrics.push(this.calculateResponseEnthusiasm(stats, relationship));

      // 3. Conversation Depth Score
      metrics.push(this.calculateConversationDepth(stats));

      // 4. Balance of Effort (who initiates more)
      metrics.push(this.calculateEffortBalance(stats, relationship));

      // 5. Topic Variety
      metrics.push(this.calculateTopicVariety(stats, previousStats));

      // 6. Response Time
      metrics.push(this.calculateResponseTimeMetric(stats, relationship));

      return metrics;
    } catch (error: any) {
      logger.error('Failed to calculate metrics', { error: error.message, relationshipId });
      throw error;
    }
  }

  /**
   * Get health trend over a period
   */
  async getHealthTrend(
    relationshipId: string,
    period: 'week' | 'month' | 'quarter'
  ): Promise<HealthTrendData[]> {
    try {
      const relationship = await this.findRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      const daysMap = {
        week: 7,
        month: 30,
        quarter: 90,
      };

      const days = daysMap[period];
      const trendData: HealthTrendData[] = [];

      // Get historical health scores from database
      const rows = await postgresClient
        .knex('relationship_health_history')
        .where('relationship_id', relationshipId)
        .where('recorded_at', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000))
        .orderBy('recorded_at', 'asc')
        .select('*');

      for (const row of rows) {
        trendData.push({
          date: new Date(row.recorded_at),
          score: row.health_score,
          metrics: row.metrics || {},
        });
      }

      // If no historical data, return current state
      if (trendData.length === 0) {
        trendData.push({
          date: new Date(),
          score: relationship.healthScore,
          metrics: {},
        });
      }

      return trendData;
    } catch (error: any) {
      logger.error('Failed to get health trend', { error: error.message, relationshipId, period });
      throw error;
    }
  }

  /**
   * Detect and record milestones for a relationship
   */
  async detectMilestones(relationshipId: string): Promise<RelationshipMilestone[]> {
    try {
      const relationship = await this.findRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      const existingMilestones = await this.getMilestones(relationshipId);
      const existingTypes = new Set(existingMilestones.map(m => m.type));
      const newMilestones: RelationshipMilestone[] = [];

      const stats = await this.getMessageStats(relationship.conversationId);

      // Check for message count milestones
      const messageCountMilestones: { count: number; type: MilestoneType; description: string }[] = [
        { count: 100, type: 'messages_100', description: 'You exchanged your 100th message!' },
        { count: 500, type: 'messages_500', description: 'Amazing! 500 messages and counting!' },
        { count: 1000, type: 'messages_1000', description: 'Incredible connection! 1,000 messages shared!' },
      ];

      for (const milestone of messageCountMilestones) {
        if (stats.totalMessages >= milestone.count && !existingTypes.has(milestone.type)) {
          const newMilestone = await this.createMilestone(
            relationshipId,
            milestone.type,
            milestone.description,
            'positive'
          );
          newMilestones.push(newMilestone);
        }
      }

      // Check for first message milestone
      if (stats.totalMessages > 0 && !existingTypes.has('first_message')) {
        const newMilestone = await this.createMilestone(
          relationshipId,
          'first_message',
          'Your conversation has begun!',
          'positive'
        );
        newMilestones.push(newMilestone);
      }

      // Check for streak milestones
      const streak = await this.calculateConversationStreak(relationship.conversationId);

      if (streak >= 7 && !existingTypes.has('week_streak')) {
        const newMilestone = await this.createMilestone(
          relationshipId,
          'week_streak',
          '7-day conversation streak achieved!',
          'positive'
        );
        newMilestones.push(newMilestone);
      }

      if (streak >= 30 && !existingTypes.has('month_streak')) {
        const newMilestone = await this.createMilestone(
          relationshipId,
          'month_streak',
          '30-day conversation streak achieved!',
          'positive'
        );
        newMilestones.push(newMilestone);
      }

      // Check for date planning milestone
      if (stats.datesMentioned > 0 && !existingTypes.has('first_date_planned')) {
        const newMilestone = await this.createMilestone(
          relationshipId,
          'first_date_planned',
          'First date plans are in motion!',
          'positive'
        );
        newMilestones.push(newMilestone);
      }

      logger.info('Milestones detected', {
        relationshipId,
        newCount: newMilestones.length,
        totalCount: existingMilestones.length + newMilestones.length
      });

      return newMilestones;
    } catch (error: any) {
      logger.error('Failed to detect milestones', { error: error.message, relationshipId });
      throw error;
    }
  }

  /**
   * Create a new milestone
   */
  async createMilestone(
    relationshipId: string,
    type: MilestoneType,
    description: string,
    sentiment: 'positive' | 'neutral' | 'negative',
    isCustom: boolean = false
  ): Promise<RelationshipMilestone> {
    const milestone: RelationshipMilestone = {
      id: uuidv4(),
      type,
      date: new Date(),
      description,
      sentiment,
      isCustom,
      celebratedBy: [],
    };

    await postgresClient
      .knex('relationship_milestones')
      .insert({
        id: milestone.id,
        relationship_id: relationshipId,
        type: milestone.type,
        date: milestone.date,
        description: milestone.description,
        sentiment: milestone.sentiment,
        is_custom: milestone.isCustom,
        celebrated_by: JSON.stringify(milestone.celebratedBy),
      });

    logger.info('Milestone created', { relationshipId, type, milestoneId: milestone.id });

    return milestone;
  }

  /**
   * Add a custom milestone
   */
  async addCustomMilestone(
    relationshipId: string,
    userId: string,
    description: string,
    date?: Date
  ): Promise<RelationshipMilestone> {
    const relationship = await this.findRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    if (relationship.user1Id !== userId && relationship.user2Id !== userId) {
      throw new Error('User is not part of this relationship');
    }

    const milestone: RelationshipMilestone = {
      id: uuidv4(),
      type: 'custom',
      date: date || new Date(),
      description,
      sentiment: 'positive',
      isCustom: true,
      celebratedBy: [userId],
    };

    await postgresClient
      .knex('relationship_milestones')
      .insert({
        id: milestone.id,
        relationship_id: relationshipId,
        type: milestone.type,
        date: milestone.date,
        description: milestone.description,
        sentiment: milestone.sentiment,
        is_custom: milestone.isCustom,
        celebrated_by: JSON.stringify(milestone.celebratedBy),
      });

    logger.info('Custom milestone added', { relationshipId, userId, milestoneId: milestone.id });

    return milestone;
  }

  /**
   * Get all milestones for a relationship
   */
  async getMilestones(relationshipId: string): Promise<RelationshipMilestone[]> {
    try {
      const rows = await postgresClient
        .knex('relationship_milestones')
        .where('relationship_id', relationshipId)
        .orderBy('date', 'desc')
        .select('*');

      return rows.map((row: any) => ({
        id: row.id,
        type: row.type as MilestoneType,
        date: new Date(row.date),
        description: row.description,
        sentiment: row.sentiment,
        isCustom: row.is_custom,
        celebratedBy: JSON.parse(row.celebrated_by || '[]'),
      }));
    } catch (error: any) {
      logger.error('Failed to get milestones', { error: error.message, relationshipId });
      throw error;
    }
  }

  /**
   * Generate actionable insights for a relationship
   */
  async generateInsights(relationshipId: string): Promise<RelationshipInsight[]> {
    try {
      const relationship = await this.findRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      if (!relationship.user1OptedIn || !relationship.user2OptedIn) {
        return [];
      }

      const stats = await this.getMessageStats(relationship.conversationId, 14); // Last 2 weeks
      const previousStats = await this.getMessageStats(relationship.conversationId, 28, 14);
      const insights: RelationshipInsight[] = [];

      // 1. Communication frequency insight
      const currentFreq = stats.totalMessages;
      const previousFreq = previousStats.totalMessages;

      if (previousFreq > 0) {
        const changePercent = Math.round(((currentFreq - previousFreq) / previousFreq) * 100);

        if (changePercent > 15) {
          insights.push(this.createInsight(
            'communication',
            'Communication is thriving!',
            `Your message frequency has increased ${changePercent}% this week. Great connection!`,
            false,
            'low'
          ));
        } else if (changePercent < -30) {
          insights.push(this.createInsight(
            'communication',
            'Communication has slowed down',
            'Your messages have decreased recently. Consider reaching out to keep the connection strong.',
            true,
            'medium'
          ));
        }
      }

      // 2. Date planning insight
      const daysSinceLastDateMention = await this.getDaysSinceLastDateMention(relationship.conversationId);
      if (daysSinceLastDateMention > 14) {
        insights.push(this.createInsight(
          'suggestion',
          'Time for a date?',
          "It's been a while since you discussed plans. Consider suggesting a date!",
          true,
          'medium'
        ));
      }

      // 3. Balance of effort insight
      const user1Messages = stats.messagesByUser.get(relationship.user1Id) || 0;
      const user2Messages = stats.messagesByUser.get(relationship.user2Id) || 0;
      const totalMessages = user1Messages + user2Messages;

      if (totalMessages > 10) {
        const balance = Math.abs(user1Messages - user2Messages) / totalMessages;

        if (balance < 0.2) {
          insights.push(this.createInsight(
            'balance',
            'Great conversation balance!',
            'Both of you are equally engaged in the conversation. Keep it up!',
            false,
            'low'
          ));
        } else if (balance > 0.5) {
          insights.push(this.createInsight(
            'balance',
            'Conversation balance could improve',
            'One person is doing most of the messaging. Consider encouraging more back-and-forth.',
            true,
            'medium'
          ));
        }
      }

      // 4. Response time insight
      const avgResponseTime = this.calculateAverageResponseTime(stats);
      if (avgResponseTime > 24 * 60 * 60 * 1000) { // More than 24 hours
        insights.push(this.createInsight(
          'engagement',
          'Response times are long',
          'Average response time is over 24 hours. Quicker responses can help maintain momentum.',
          true,
          'medium'
        ));
      }

      // 5. Topic variety insight
      if (stats.topicsDiscussed.length < 3 && stats.totalMessages > 50) {
        insights.push(this.createInsight(
          'suggestion',
          'Try new conversation topics',
          'Your conversations tend to stay on similar subjects. Try exploring new interests together!',
          true,
          'low'
        ));
      }

      // Store insights in database
      await this.storeInsights(relationshipId, insights);

      logger.info('Insights generated', { relationshipId, count: insights.length });

      return insights;
    } catch (error: any) {
      logger.error('Failed to generate insights', { error: error.message, relationshipId });
      throw error;
    }
  }

  /**
   * Get full dashboard data for a user
   * Shows personalized view that respects privacy
   */
  async getDashboard(relationshipId: string, userId: string): Promise<DashboardData | null> {
    try {
      // Check cache first
      const cacheKey = `${this.cachePrefix}${relationshipId}:${userId}`;
      const cached = await redisClient.getClient().get(cacheKey);
      if (cached && typeof cached === 'string') {
        logger.debug('Dashboard loaded from cache', { relationshipId, userId });
        return JSON.parse(cached);
      }

      const relationship = await this.findRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      // Verify user is part of relationship
      if (relationship.user1Id !== userId && relationship.user2Id !== userId) {
        throw new Error('User is not part of this relationship');
      }

      // Check if both have opted in
      if (!relationship.user1OptedIn || !relationship.user2OptedIn) {
        logger.info('Dashboard not available - both users must opt in', { relationshipId, userId });
        return null;
      }

      // Calculate health score
      const healthScore = await this.calculateHealthScore(relationshipId);

      // Detect new milestones
      await this.detectMilestones(relationshipId);

      // Get all data
      const metrics = await this.calculateMetrics(relationshipId);
      const milestones = await this.getMilestones(relationshipId);
      const insights = await this.generateInsights(relationshipId);

      // Filter insights - only show ones not dismissed by this user
      const filteredInsights = insights.filter(
        insight => !insight.dismissedBy?.includes(userId)
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, insights, userId);

      // Determine overall trend
      const trendData = await this.getHealthTrend(relationshipId, 'week');
      const trend = this.determineTrend(trendData);

      const dashboardData: DashboardData = {
        health: {
          relationshipId,
          users: {
            user1Id: relationship.user1Id,
            user2Id: relationship.user2Id,
          },
          healthScore,
          trend,
          milestones,
          insights: filteredInsights,
          lastCalculated: new Date(),
        },
        metrics: this.sanitizeMetricsForUser(metrics, userId, relationship),
        milestones,
        insights: filteredInsights,
        recommendations,
        periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(),
      };

      // Cache result
      await redisClient.getClient().setEx(
        cacheKey,
        this.cacheTTL,
        JSON.stringify(dashboardData)
      );

      logger.info('Dashboard generated', { relationshipId, userId, healthScore });

      return dashboardData;
    } catch (error: any) {
      logger.error('Failed to get dashboard', { error: error.message, relationshipId, userId });
      throw error;
    }
  }

  /**
   * Dismiss an insight for a user
   */
  async dismissInsight(relationshipId: string, insightId: string, userId: string): Promise<void> {
    try {
      const relationship = await this.findRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      if (relationship.user1Id !== userId && relationship.user2Id !== userId) {
        throw new Error('User is not part of this relationship');
      }

      await postgresClient
        .knex('relationship_insights')
        .where('id', insightId)
        .update({
          dismissed_by: postgresClient.knex.raw(
            "COALESCE(dismissed_by, '[]')::jsonb || ?::jsonb",
            [JSON.stringify([userId])]
          ),
        });

      // Clear cache
      await this.clearCache(relationshipId);

      logger.info('Insight dismissed', { relationshipId, insightId, userId });
    } catch (error: any) {
      logger.error('Failed to dismiss insight', { error: error.message, insightId, userId });
      throw error;
    }
  }

  /**
   * Celebrate a milestone
   */
  async celebrateMilestone(
    relationshipId: string,
    milestoneId: string,
    userId: string
  ): Promise<void> {
    try {
      const relationship = await this.findRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Relationship not found');
      }

      if (relationship.user1Id !== userId && relationship.user2Id !== userId) {
        throw new Error('User is not part of this relationship');
      }

      await postgresClient
        .knex('relationship_milestones')
        .where('id', milestoneId)
        .update({
          celebrated_by: postgresClient.knex.raw(
            "COALESCE(celebrated_by, '[]')::jsonb || ?::jsonb",
            [JSON.stringify([userId])]
          ),
        });

      logger.info('Milestone celebrated', { relationshipId, milestoneId, userId });
    } catch (error: any) {
      logger.error('Failed to celebrate milestone', { error: error.message, milestoneId, userId });
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async findRelationshipById(id: string): Promise<RelationshipRecord | null> {
    try {
      const row = await postgresClient
        .knex('relationship_tracking')
        .where('id', id)
        .first();

      if (!row) return null;

      return {
        id: row.id,
        user1Id: row.user1_id,
        user2Id: row.user2_id,
        conversationId: row.conversation_id,
        user1OptedIn: row.user1_opted_in,
        user2OptedIn: row.user2_opted_in,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        healthScore: row.health_score,
        trend: row.trend as HealthTrend,
        metadata: row.metadata,
      };
    } catch (error: any) {
      logger.error('Failed to find relationship', { error: error.message, id });
      return null;
    }
  }

  private async findRelationshipByUsers(
    user1Id: string,
    user2Id: string
  ): Promise<RelationshipRecord | null> {
    try {
      const [orderedUser1, orderedUser2] = [user1Id, user2Id].sort();

      const row = await postgresClient
        .knex('relationship_tracking')
        .where('user1_id', orderedUser1)
        .where('user2_id', orderedUser2)
        .first();

      if (!row) return null;

      return {
        id: row.id,
        user1Id: row.user1_id,
        user2Id: row.user2_id,
        conversationId: row.conversation_id,
        user1OptedIn: row.user1_opted_in,
        user2OptedIn: row.user2_opted_in,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        healthScore: row.health_score,
        trend: row.trend as HealthTrend,
        metadata: row.metadata,
      };
    } catch (error: any) {
      logger.error('Failed to find relationship by users', { error: error.message, user1Id, user2Id });
      return null;
    }
  }

  private async getMessageStats(
    conversationId: string,
    days: number = 30,
    offsetDays: number = 0
  ): Promise<MessageStats> {
    try {
      const endDate = new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000);
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const messages = await postgresClient
        .knex('messages')
        .where('conversation_id', conversationId)
        .whereBetween('sent_at', [startDate, endDate])
        .select('*');

      const messagesByUser = new Map<string, number>();
      const avgMessageLength = new Map<string, number>();
      const messageLengthSum = new Map<string, number>();
      const emojiCount = new Map<string, number>();
      const questionCount = new Map<string, number>();
      const responseTimeSum = new Map<string, number>();
      const responseCount = new Map<string, number>();

      let datesMentioned = 0;
      const topicKeywords = new Map<string, number>();

      // Date-related keywords
      const dateKeywords = ['date', 'meet', 'coffee', 'dinner', 'lunch', 'drinks', 'movie', 'plans'];
      // Topic extraction keywords (simplified)
      const topicCategories = [
        'work', 'travel', 'food', 'music', 'movies', 'sports',
        'family', 'hobbies', 'pets', 'books', 'art', 'fitness'
      ];

      // Emoji regex
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

      let previousMessage: any = null;

      for (const msg of messages) {
        const senderId = msg.sender_id;
        const content = msg.content || '';

        // Count messages by user
        messagesByUser.set(senderId, (messagesByUser.get(senderId) || 0) + 1);

        // Track message length
        messageLengthSum.set(senderId, (messageLengthSum.get(senderId) || 0) + content.length);

        // Count emojis
        const emojis = content.match(emojiRegex);
        if (emojis) {
          emojiCount.set(senderId, (emojiCount.get(senderId) || 0) + emojis.length);
        }

        // Count questions
        const questions = (content.match(/\?/g) || []).length;
        questionCount.set(senderId, (questionCount.get(senderId) || 0) + questions);

        // Check for date mentions
        const lowerContent = content.toLowerCase();
        for (const keyword of dateKeywords) {
          if (lowerContent.includes(keyword)) {
            datesMentioned++;
            break;
          }
        }

        // Extract topics
        for (const topic of topicCategories) {
          if (lowerContent.includes(topic)) {
            topicKeywords.set(topic, (topicKeywords.get(topic) || 0) + 1);
          }
        }

        // Calculate response time
        if (previousMessage && previousMessage.sender_id !== senderId) {
          const responseTime = new Date(msg.sent_at).getTime() - new Date(previousMessage.sent_at).getTime();
          // Only count reasonable response times (< 24 hours)
          if (responseTime < 24 * 60 * 60 * 1000) {
            responseTimeSum.set(senderId, (responseTimeSum.get(senderId) || 0) + responseTime);
            responseCount.set(senderId, (responseCount.get(senderId) || 0) + 1);
          }
        }

        previousMessage = msg;
      }

      // Calculate averages
      for (const [userId, sum] of messageLengthSum) {
        const count = messagesByUser.get(userId) || 1;
        avgMessageLength.set(userId, Math.round(sum / count));
      }

      const responseTimeAvg = new Map<string, number>();
      for (const [userId, sum] of responseTimeSum) {
        const count = responseCount.get(userId) || 1;
        responseTimeAvg.set(userId, Math.round(sum / count));
      }

      // Get top discussed topics
      const topicsDiscussed = Array.from(topicKeywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic);

      return {
        totalMessages: messages.length,
        messagesByUser,
        avgMessageLength,
        emojiCount,
        questionCount,
        responseTimeAvg,
        datesMentioned,
        topicsDiscussed,
      };
    } catch (error: any) {
      logger.error('Failed to get message stats', { error: error.message, conversationId });
      return {
        totalMessages: 0,
        messagesByUser: new Map(),
        avgMessageLength: new Map(),
        emojiCount: new Map(),
        questionCount: new Map(),
        responseTimeAvg: new Map(),
        datesMentioned: 0,
        topicsDiscussed: [],
      };
    }
  }

  private calculateCommunicationFrequency(
    current: MessageStats,
    previous: MessageStats
  ): HealthMetric {
    const currentFreq = current.totalMessages;
    const previousFreq = previous.totalMessages;

    let trend: HealthTrend = 'stable';
    if (previousFreq > 0) {
      const change = (currentFreq - previousFreq) / previousFreq;
      if (change > 0.1) trend = 'improving';
      else if (change < -0.1) trend = 'declining';
    }

    // Score based on messages per day (benchmark: 5 messages/day = 100%)
    const messagesPerDay = currentFreq / 30;
    const value = Math.min(100, (messagesPerDay / 5) * 100);

    return {
      name: 'Communication Frequency',
      value: Math.round(value),
      trend,
      benchmark: 70,
      description: `${currentFreq} messages in the last 30 days`,
      weight: 0.2,
    };
  }

  private calculateResponseEnthusiasm(
    stats: MessageStats,
    relationship: RelationshipRecord
  ): HealthMetric {
    // Calculate combined score from message length, emojis, and questions
    let totalScore = 0;
    let count = 0;

    for (const userId of [relationship.user1Id, relationship.user2Id]) {
      const avgLength = stats.avgMessageLength.get(userId) || 0;
      const emojis = stats.emojiCount.get(userId) || 0;
      const questions = stats.questionCount.get(userId) || 0;
      const messages = stats.messagesByUser.get(userId) || 0;

      if (messages > 0) {
        // Length score (50 chars = 50 points, max 100)
        const lengthScore = Math.min(100, avgLength * 2);

        // Emoji score (1 emoji per 5 messages = 50 points)
        const emojiScore = Math.min(100, (emojis / messages) * 250);

        // Question score (1 question per 3 messages = 50 points)
        const questionScore = Math.min(100, (questions / messages) * 150);

        totalScore += (lengthScore * 0.4 + emojiScore * 0.3 + questionScore * 0.3);
        count++;
      }
    }

    const value = count > 0 ? totalScore / count : 50;

    // Determine trend based on value vs benchmark
    let trend: HealthTrend = 'stable';
    if (value > 70) trend = 'improving';
    else if (value < 40) trend = 'declining';

    return {
      name: 'Response Enthusiasm',
      value: Math.round(value),
      trend,
      benchmark: 60,
      description: 'Message quality based on length, emojis, and engagement',
      weight: 0.2,
    };
  }

  private calculateConversationDepth(stats: MessageStats): HealthMetric {
    // Based on topic variety and question frequency
    const topicScore = Math.min(100, stats.topicsDiscussed.length * 20);

    let questionRatio = 0;
    let totalMessages = 0;
    let totalQuestions = 0;

    for (const [, questions] of stats.questionCount) {
      totalQuestions += questions;
    }
    totalMessages = stats.totalMessages;

    if (totalMessages > 0) {
      questionRatio = totalQuestions / totalMessages;
    }

    const questionScore = Math.min(100, questionRatio * 500);

    const value = (topicScore * 0.6 + questionScore * 0.4);

    let trend: HealthTrend = 'stable';
    if (value > 70) trend = 'improving';
    else if (value < 40) trend = 'declining';

    return {
      name: 'Conversation Depth',
      value: Math.round(value),
      trend,
      benchmark: 55,
      description: `${stats.topicsDiscussed.length} topics discussed`,
      weight: 0.15,
    };
  }

  private calculateEffortBalance(
    stats: MessageStats,
    relationship: RelationshipRecord
  ): HealthMetric {
    const user1Messages = stats.messagesByUser.get(relationship.user1Id) || 0;
    const user2Messages = stats.messagesByUser.get(relationship.user2Id) || 0;
    const total = user1Messages + user2Messages;

    if (total === 0) {
      return {
        name: 'Effort Balance',
        value: 50,
        trend: 'stable',
        benchmark: 80,
        description: 'No messages to analyze',
        weight: 0.15,
      };
    }

    // Perfect balance = 50/50, score decreases as imbalance increases
    const ratio = Math.min(user1Messages, user2Messages) / Math.max(user1Messages, user2Messages);
    const value = ratio * 100;

    let trend: HealthTrend = 'stable';
    if (value > 80) trend = 'improving';
    else if (value < 50) trend = 'declining';

    const percentages = [
      Math.round((user1Messages / total) * 100),
      Math.round((user2Messages / total) * 100),
    ].sort((a, b) => b - a);

    return {
      name: 'Effort Balance',
      value: Math.round(value),
      trend,
      benchmark: 80,
      description: `Message split: ${percentages[0]}% / ${percentages[1]}%`,
      weight: 0.15,
    };
  }

  private calculateTopicVariety(
    current: MessageStats,
    previous: MessageStats
  ): HealthMetric {
    const currentTopics = current.topicsDiscussed.length;
    const previousTopics = previous.topicsDiscussed.length;

    let trend: HealthTrend = 'stable';
    if (currentTopics > previousTopics) trend = 'improving';
    else if (currentTopics < previousTopics - 1) trend = 'declining';

    // Score based on number of topics (5+ topics = 100%)
    const value = Math.min(100, (currentTopics / 5) * 100);

    return {
      name: 'Topic Variety',
      value: Math.round(value),
      trend,
      benchmark: 60,
      description: `${currentTopics} different topics discussed recently`,
      weight: 0.15,
    };
  }

  private calculateResponseTimeMetric(
    stats: MessageStats,
    relationship: RelationshipRecord
  ): HealthMetric {
    const user1Time = stats.responseTimeAvg.get(relationship.user1Id) || 0;
    const user2Time = stats.responseTimeAvg.get(relationship.user2Id) || 0;

    // Average response time
    let avgTime = 0;
    let count = 0;
    if (user1Time > 0) { avgTime += user1Time; count++; }
    if (user2Time > 0) { avgTime += user2Time; count++; }

    avgTime = count > 0 ? avgTime / count : 0;

    // Score inversely proportional to response time
    // < 1 hour = 100, 1-4 hours = 80, 4-12 hours = 60, 12-24 hours = 40, >24 hours = 20
    let value = 50;
    const hours = avgTime / (60 * 60 * 1000);

    if (avgTime === 0) {
      value = 50; // Neutral if no data
    } else if (hours < 1) {
      value = 100;
    } else if (hours < 4) {
      value = 80;
    } else if (hours < 12) {
      value = 60;
    } else if (hours < 24) {
      value = 40;
    } else {
      value = 20;
    }

    let trend: HealthTrend = 'stable';
    if (value >= 80) trend = 'improving';
    else if (value <= 40) trend = 'declining';

    const description = avgTime > 0
      ? `Average response time: ${this.formatDuration(avgTime)}`
      : 'Not enough data for response time';

    return {
      name: 'Response Time',
      value: Math.round(value),
      trend,
      benchmark: 70,
      description,
      weight: 0.15,
    };
  }

  private calculateAverageResponseTime(stats: MessageStats): number {
    let total = 0;
    let count = 0;

    for (const [, time] of stats.responseTimeAvg) {
      if (time > 0) {
        total += time;
        count++;
      }
    }

    return count > 0 ? total / count : 0;
  }

  private async calculateConversationStreak(conversationId: string): Promise<number> {
    try {
      // Get distinct dates with messages, ordered descending
      const rows = await postgresClient
        .knex('messages')
        .where('conversation_id', conversationId)
        .select(postgresClient.knex.raw('DATE(sent_at) as date'))
        .groupBy(postgresClient.knex.raw('DATE(sent_at)'))
        .orderBy('date', 'desc');

      if (rows.length === 0) return 0;

      let streak = 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if the most recent message is today or yesterday
      const lastMessageDate = new Date(rows[0].date);
      lastMessageDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor((today.getTime() - lastMessageDate.getTime()) / (24 * 60 * 60 * 1000));

      if (dayDiff > 1) {
        return 0; // Streak is broken
      }

      // Count consecutive days
      for (let i = 1; i < rows.length; i++) {
        const currentDate = new Date(rows[i - 1].date);
        const prevDate = new Date(rows[i].date);

        const diff = Math.floor(
          (currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error: any) {
      logger.error('Failed to calculate streak', { error: error.message, conversationId });
      return 0;
    }
  }

  private async getDaysSinceLastDateMention(conversationId: string): Promise<number> {
    try {
      const dateKeywords = ['date', 'meet', 'coffee', 'dinner', 'lunch', 'drinks', 'movie', 'plans'];
      const pattern = dateKeywords.join('|');

      const row = await postgresClient
        .knex('messages')
        .where('conversation_id', conversationId)
        .whereRaw(`LOWER(content) ~* ?`, [pattern])
        .orderBy('sent_at', 'desc')
        .first();

      if (!row) return 999; // No date mention found

      const lastMention = new Date(row.sent_at);
      const now = new Date();

      return Math.floor((now.getTime() - lastMention.getTime()) / (24 * 60 * 60 * 1000));
    } catch (error: any) {
      logger.error('Failed to get days since date mention', { error: error.message, conversationId });
      return 999;
    }
  }

  private createInsight(
    type: InsightType,
    title: string,
    description: string,
    actionable: boolean,
    priority: InsightPriority
  ): RelationshipInsight {
    return {
      id: uuidv4(),
      type,
      title,
      description,
      actionable,
      priority,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      dismissedBy: [],
    };
  }

  private async storeInsights(
    relationshipId: string,
    insights: RelationshipInsight[]
  ): Promise<void> {
    try {
      // Delete expired insights
      await postgresClient
        .knex('relationship_insights')
        .where('relationship_id', relationshipId)
        .where('expires_at', '<', new Date())
        .delete();

      // Insert new insights
      for (const insight of insights) {
        await postgresClient
          .knex('relationship_insights')
          .insert({
            id: insight.id,
            relationship_id: relationshipId,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            actionable: insight.actionable,
            priority: insight.priority,
            created_at: insight.createdAt,
            expires_at: insight.expiresAt,
            dismissed_by: JSON.stringify(insight.dismissedBy || []),
          })
          .onConflict('id')
          .ignore();
      }
    } catch (error: any) {
      logger.error('Failed to store insights', { error: error.message, relationshipId });
    }
  }

  private generateRecommendations(
    metrics: HealthMetric[],
    insights: RelationshipInsight[],
    _userId: string
  ): string[] {
    const recommendations: string[] = [];

    // Based on metrics
    for (const metric of metrics) {
      if (metric.value < metric.benchmark - 20) {
        switch (metric.name) {
          case 'Communication Frequency':
            recommendations.push('Try sending a thoughtful message to keep the connection going');
            break;
          case 'Response Enthusiasm':
            recommendations.push('Add more personality to your messages with emojis or questions');
            break;
          case 'Conversation Depth':
            recommendations.push('Ask open-ended questions to explore new topics together');
            break;
          case 'Effort Balance':
            recommendations.push('Consider initiating more conversations');
            break;
          case 'Topic Variety':
            recommendations.push('Share something new about your interests or hobbies');
            break;
          case 'Response Time':
            recommendations.push('Try to respond more promptly when possible');
            break;
        }
      }
    }

    // Based on actionable insights
    for (const insight of insights) {
      if (insight.actionable && insight.priority === 'high') {
        recommendations.push(insight.description);
      }
    }

    // Limit to top 5 recommendations
    return recommendations.slice(0, 5);
  }

  private sanitizeMetricsForUser(
    metrics: HealthMetric[],
    _userId: string,
    _relationship: RelationshipRecord
  ): HealthMetric[] {
    // Return metrics without user-specific breakdowns that could cause conflict
    // Show aggregate scores only, not "who is doing better"
    return metrics.map(metric => ({
      ...metric,
      // Remove any user-specific details from description if needed
      description: metric.description,
    }));
  }

  private determineTrend(trendData: HealthTrendData[]): HealthTrend {
    if (trendData.length < 2) return 'stable';

    const recent = trendData.slice(-3);
    const older = trendData.slice(0, Math.min(3, trendData.length - 3));

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, d) => sum + d.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.score, 0) / older.length;

    const change = recentAvg - olderAvg;

    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private async clearCache(relationshipId: string): Promise<void> {
    try {
      const pattern = `${this.cachePrefix}${relationshipId}:*`;
      const keys = await redisClient.getClient().keys(pattern);
      if (keys.length > 0) {
        await redisClient.getClient().del(keys);
      }
    } catch (error: any) {
      logger.error('Failed to clear cache', { error: error.message, relationshipId });
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
export const relationshipDashboardService = new RelationshipDashboardService();
export default relationshipDashboardService;
