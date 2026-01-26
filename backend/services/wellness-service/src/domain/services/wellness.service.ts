/**
 * Wellness Service - Core Business Logic
 * Handles wellness tracking, scoring, and recommendations
 */

import { createLogger } from '@flamoral/backend-shared';
import { v4 as uuidv4 } from 'uuid';

import config from '../../config';
import { dbClient } from '../../infrastructure/database/db-client';
import {
  WellnessMetrics,
  WellnessTrend,
  WellnessRecommendation,
  UsageInsight,
  EmotionalInsight,
  HeartHealthDashboard,
  HealthStatus,
  HealthMetric,
  HealthAlert,
  MoodLevel,
  RecordMoodRequest,
} from '../types/wellness.types';

const logger = createLogger('wellness-service');

export class WellnessService {
  /**
   * Record or update daily wellness metrics for a user
   */
  async recordMetrics(
    userId: string,
    date: string,
    metrics: Partial<WellnessMetrics>
  ): Promise<WellnessMetrics> {
    const db = dbClient.getClient();

    try {
      // Check if record exists for this date
      const existing = await db('wellness_metrics').where({ user_id: userId, date }).first();

      const scores = this.calculateWellnessScores({
        sessionCount: metrics.sessionCount || existing?.session_count || 0,
        totalMinutesUsed: metrics.totalMinutesUsed || existing?.total_minutes_used || 0,
        swipeCount: metrics.swipeCount || existing?.swipe_count || 0,
        messagesSent: metrics.messagesSent || existing?.messages_sent || 0,
        messagesReceived: metrics.messagesReceived || existing?.messages_received || 0,
        matchesReceived: metrics.matchesReceived || existing?.matches_received || 0,
        rejectionsReceived: metrics.rejectionsReceived || existing?.rejections_received || 0,
        averageConversationDepth:
          metrics.averageConversationDepth || existing?.average_conversation_depth || 0,
        meaningfulConversations:
          metrics.meaningfulConversations || existing?.meaningful_conversations || 0,
        ghostedConversations: metrics.ghostedConversations || existing?.ghosted_conversations || 0,
        moodBeforeSession: metrics.moodBeforeSession || existing?.mood_before_session,
        moodAfterSession: metrics.moodAfterSession || existing?.mood_after_session,
        reportedAnxiety: metrics.reportedAnxiety ?? existing?.reported_anxiety,
        reportedFrustration: metrics.reportedFrustration ?? existing?.reported_frustration,
      });

      const data = {
        user_id: userId,
        date,
        session_count: metrics.sessionCount ?? existing?.session_count ?? 0,
        total_minutes_used: metrics.totalMinutesUsed ?? existing?.total_minutes_used ?? 0,
        swipe_count: metrics.swipeCount ?? existing?.swipe_count ?? 0,
        messages_sent: metrics.messagesSent ?? existing?.messages_sent ?? 0,
        messages_received: metrics.messagesReceived ?? existing?.messages_received ?? 0,
        matches_received: metrics.matchesReceived ?? existing?.matches_received ?? 0,
        rejections_received: metrics.rejectionsReceived ?? existing?.rejections_received ?? 0,
        average_conversation_depth:
          metrics.averageConversationDepth ?? existing?.average_conversation_depth ?? 0,
        meaningful_conversations:
          metrics.meaningfulConversations ?? existing?.meaningful_conversations ?? 0,
        ghosted_conversations: metrics.ghostedConversations ?? existing?.ghosted_conversations ?? 0,
        mood_before_session: metrics.moodBeforeSession ?? existing?.mood_before_session,
        mood_after_session: metrics.moodAfterSession ?? existing?.mood_after_session,
        reported_anxiety: metrics.reportedAnxiety ?? existing?.reported_anxiety,
        reported_frustration: metrics.reportedFrustration ?? existing?.reported_frustration,
        overall_wellness_score: scores.overallWellnessScore,
        usage_health_score: scores.usageHealthScore,
        emotional_impact_score: scores.emotionalImpactScore,
        engagement_quality_score: scores.engagementQualityScore,
        updated_at: new Date(),
      };

      let result;
      if (existing) {
        [result] = await db('wellness_metrics')
          .where({ id: existing.id })
          .update(data)
          .returning('*');
      } else {
        [result] = await db('wellness_metrics')
          .insert({ ...data, id: uuidv4() })
          .returning('*');
      }

      // Check for alerts based on new metrics
      await this.checkAndGenerateAlerts(userId, result);

      return this.mapToWellnessMetrics(result);
    } catch (error: any) {
      logger.error('Error recording wellness metrics:', error);
      throw error;
    }
  }

  /**
   * Get wellness metrics for a user
   */
  async getMetrics(
    userId: string,
    startDate?: string,
    endDate?: string,
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<WellnessMetrics[]> {
    const db = dbClient.getClient();

    try {
      let query = db('wellness_metrics').where('user_id', userId);

      if (startDate) {
        query = query.where('date', '>=', startDate);
      }
      if (endDate) {
        query = query.where('date', '<=', endDate);
      }

      const results = await query.orderBy('date', 'desc');

      // For weekly/monthly, aggregate the data
      if (granularity !== 'daily') {
        return this.aggregateMetrics(results, granularity);
      }

      return results.map(this.mapToWellnessMetrics);
    } catch (error: any) {
      logger.error('Error getting wellness metrics:', error);
      throw error;
    }
  }

  /**
   * Get wellness trend analysis
   */
  async getTrend(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<WellnessTrend> {
    const db = dbClient.getClient();

    try {
      const periodDays = period === 'daily' ? 7 : period === 'weekly' ? 28 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const metrics = await db('wellness_metrics')
        .where('user_id', userId)
        .where('date', '>=', startDate.toISOString().split('T')[0])
        .orderBy('date', 'asc');

      if (metrics.length === 0) {
        return this.createEmptyTrend(userId, period);
      }

      const avgScore =
        metrics.reduce((sum, m) => sum + parseFloat(m.overall_wellness_score), 0) / metrics.length;

      // Calculate trend
      const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
      const secondHalf = metrics.slice(Math.floor(metrics.length / 2));

      const firstHalfAvg =
        firstHalf.reduce((sum, m) => sum + parseFloat(m.overall_wellness_score), 0) /
        (firstHalf.length || 1);
      const secondHalfAvg =
        secondHalf.reduce((sum, m) => sum + parseFloat(m.overall_wellness_score), 0) /
        (secondHalf.length || 1);

      const trendPercentage = ((secondHalfAvg - firstHalfAvg) / (firstHalfAvg || 1)) * 100;
      const trendDirection =
        trendPercentage > 5 ? 'improving' : trendPercentage < -5 ? 'declining' : 'stable';

      return {
        userId,
        period,
        startDate: metrics[0]?.date || startDate.toISOString().split('T')[0],
        endDate: metrics[metrics.length - 1]?.date || new Date().toISOString().split('T')[0],
        averageWellnessScore: Math.round(avgScore * 100) / 100,
        wellnessScoreTrend: trendDirection,
        trendPercentage: Math.round(trendPercentage * 100) / 100,
        usagePatternInsights: this.generateUsageInsights(metrics),
        emotionalPatternInsights: this.generateEmotionalInsights(metrics),
        recommendations: await this.generateRecommendations(userId, metrics),
      };
    } catch (error: any) {
      logger.error('Error getting wellness trend:', error);
      throw error;
    }
  }

  /**
   * Record a mood check-in
   */
  async recordMood(request: RecordMoodRequest): Promise<void> {
    const db = dbClient.getClient();

    try {
      await db('mood_checkins').insert({
        id: uuidv4(),
        user_id: request.userId,
        session_type: request.sessionType,
        mood: request.mood,
        anxiety: request.anxiety,
        frustration: request.frustration,
        notes: request.notes,
      });

      // Update today's metrics with mood
      const today = new Date().toISOString().split('T')[0];
      const moodField = request.sessionType === 'start' ? 'moodBeforeSession' : 'moodAfterSession';
      await this.recordMetrics(request.userId, today, {
        [moodField]: request.mood,
        reportedAnxiety: request.anxiety,
        reportedFrustration: request.frustration,
      });
    } catch (error: any) {
      logger.error('Error recording mood:', error);
      throw error;
    }
  }

  /**
   * Get the Heart Health Dashboard
   */
  async getHeartHealthDashboard(userId: string): Promise<HeartHealthDashboard> {
    const db = dbClient.getClient();

    try {
      // Get recent metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentMetrics = await db('wellness_metrics')
        .where('user_id', userId)
        .where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0])
        .orderBy('date', 'desc');

      // Get active alerts
      const activeAlerts = await db('health_alerts')
        .where('user_id', userId)
        .whereNull('dismissed_at')
        .where(function () {
          this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
        })
        .orderBy('created_at', 'desc');

      // Calculate current status
      const latestMetrics = recentMetrics[0];
      const currentScore = latestMetrics ? parseFloat(latestMetrics.overall_wellness_score) : 50;
      const monthlyAvg =
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + parseFloat(m.overall_wellness_score), 0) /
            recentMetrics.length
          : 50;

      // Calculate streak
      const streak = await this.calculateHealthyUsageStreak(userId);

      // Calculate trend
      const weeklyScores = this.getWeeklyScores(recentMetrics);
      const trend = this.calculateTrend(weeklyScores);

      const overallStatus = this.getHealthStatus(currentScore);

      return {
        userId,
        generatedAt: new Date().toISOString(),
        overallStatus,
        statusMessage: this.getStatusMessage(overallStatus, trend),
        currentWellnessScore: Math.round(currentScore * 100) / 100,
        wellnessTrend: trend,
        streakDays: streak,
        usageHealth: this.calculateHealthMetric(
          'Usage Health',
          latestMetrics,
          'usage_health_score'
        ),
        emotionalHealth: this.calculateHealthMetric(
          'Emotional Health',
          latestMetrics,
          'emotional_impact_score'
        ),
        conversationHealth: this.calculateHealthMetric(
          'Conversation Quality',
          latestMetrics,
          'engagement_quality_score'
        ),
        matchQualityHealth: this.calculateMatchQualityMetric(latestMetrics),
        activeAlerts: activeAlerts.map(this.mapToHealthAlert),
        topRecommendations: await this.generateRecommendations(userId, recentMetrics.slice(0, 7)),
        weeklyScores,
        monthlyAverage: Math.round(monthlyAvg * 100) / 100,
      };
    } catch (error: any) {
      logger.error('Error getting heart health dashboard:', error);
      throw error;
    }
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string, userId: string): Promise<void> {
    const db = dbClient.getClient();

    await db('health_alerts')
      .where({ id: alertId, user_id: userId })
      .update({ dismissed_at: new Date() });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateWellnessScores(metrics: Partial<WellnessMetrics>): {
    overallWellnessScore: number;
    usageHealthScore: number;
    emotionalImpactScore: number;
    engagementQualityScore: number;
  } {
    const { healthyUsageMinutes, maxDailyUsageMinutes } = config.wellness;

    // Usage Health Score (0-100)
    let usageHealthScore = 100;
    const minutes = metrics.totalMinutesUsed || 0;
    if (minutes > maxDailyUsageMinutes) {
      usageHealthScore = Math.max(0, 100 - (minutes - maxDailyUsageMinutes) * 2);
    } else if (minutes > healthyUsageMinutes) {
      usageHealthScore =
        100 - ((minutes - healthyUsageMinutes) / (maxDailyUsageMinutes - healthyUsageMinutes)) * 30;
    }

    // Emotional Impact Score (0-100)
    let emotionalImpactScore = 50; // Neutral baseline
    const moodBefore = this.moodToScore(metrics.moodBeforeSession);
    const moodAfter = this.moodToScore(metrics.moodAfterSession);

    if (moodBefore !== null && moodAfter !== null) {
      const moodChange = moodAfter - moodBefore;
      emotionalImpactScore = 50 + moodChange * 10; // +/- 40 points based on mood change
    }

    // Adjust for anxiety and frustration
    if (metrics.reportedAnxiety !== null && metrics.reportedAnxiety !== undefined) {
      emotionalImpactScore -= metrics.reportedAnxiety * 3;
    }
    if (metrics.reportedFrustration !== null && metrics.reportedFrustration !== undefined) {
      emotionalImpactScore -= metrics.reportedFrustration * 3;
    }
    emotionalImpactScore = Math.max(0, Math.min(100, emotionalImpactScore));

    // Engagement Quality Score (0-100)
    let engagementQualityScore = 50;
    engagementQualityScore += (metrics.averageConversationDepth || 0) * 0.3;
    engagementQualityScore += (metrics.meaningfulConversations || 0) * 5;
    engagementQualityScore -= (metrics.ghostedConversations || 0) * 10;

    // Balance messages sent/received
    const sent = metrics.messagesSent || 0;
    const received = metrics.messagesReceived || 0;
    if (sent > 0 && received > 0) {
      const ratio = Math.min(sent, received) / Math.max(sent, received);
      engagementQualityScore += ratio * 20;
    }
    engagementQualityScore = Math.max(0, Math.min(100, engagementQualityScore));

    // Overall Wellness Score (weighted average)
    const overallWellnessScore =
      usageHealthScore * 0.35 + emotionalImpactScore * 0.35 + engagementQualityScore * 0.3;

    return {
      overallWellnessScore: Math.round(overallWellnessScore * 100) / 100,
      usageHealthScore: Math.round(usageHealthScore * 100) / 100,
      emotionalImpactScore: Math.round(emotionalImpactScore * 100) / 100,
      engagementQualityScore: Math.round(engagementQualityScore * 100) / 100,
    };
  }

  private moodToScore(mood: MoodLevel | null | undefined): number | null {
    if (!mood) return null;
    const moodScores: Record<MoodLevel, number> = {
      very_low: -2,
      low: -1,
      neutral: 0,
      good: 1,
      excellent: 2,
    };
    return moodScores[mood] ?? null;
  }

  private async checkAndGenerateAlerts(userId: string, metrics: any): Promise<void> {
    const db = dbClient.getClient();
    const { maxDailyUsageMinutes, burnoutUsageMinutes } = config.wellness;
    const alerts: Partial<HealthAlert>[] = [];

    // Excessive usage alert
    if (metrics.total_minutes_used > burnoutUsageMinutes) {
      alerts.push({
        severity: 'urgent',
        type: 'excessive_usage',
        title: 'High Usage Detected',
        message: `You've spent ${metrics.total_minutes_used} minutes on the app today. Consider taking a break to recharge.`,
        actionRequired: true,
        suggestedAction: 'Take at least a 24-hour break from the app.',
      });
    } else if (metrics.total_minutes_used > maxDailyUsageMinutes) {
      alerts.push({
        severity: 'warning',
        type: 'excessive_usage',
        title: 'Extended Usage',
        message: `You've been active for ${metrics.total_minutes_used} minutes today. Remember to balance app time with other activities.`,
        actionRequired: false,
        suggestedAction: 'Consider setting daily usage limits.',
      });
    }

    // Mood decline alert
    const moodBefore = this.moodToScore(metrics.mood_before_session);
    const moodAfter = this.moodToScore(metrics.mood_after_session);
    if (moodBefore !== null && moodAfter !== null && moodAfter - moodBefore <= -2) {
      alerts.push({
        severity: 'warning',
        type: 'mood_decline',
        title: 'Mood Impact Noticed',
        message:
          'Your mood seems to have declined during your session. This is normal sometimes, but worth paying attention to.',
        actionRequired: false,
        suggestedAction: 'Consider what aspects of your experience affected your mood.',
      });
    }

    // Rejection pattern alert (check recent history)
    const recentRejections = await db('rejection_events')
      .where('user_id', userId)
      .where('occurred_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .count('* as count')
      .first();

    if (recentRejections && parseInt(recentRejections.count as string) >= 3) {
      alerts.push({
        severity: 'info',
        type: 'rejection_pattern',
        title: 'Multiple Rejections Today',
        message:
          "You've experienced a few rejections today. Remember, this is a normal part of dating and doesn't reflect your worth.",
        actionRequired: false,
        suggestedAction: 'Read our guide on handling rejection healthily.',
      });
    }

    // Positive milestone alert
    if (parseFloat(metrics.overall_wellness_score) >= 85) {
      alerts.push({
        severity: 'info',
        type: 'positive_milestone',
        title: 'Great Dating Health!',
        message: "You're maintaining excellent dating wellness. Keep up the balanced approach!",
        actionRequired: false,
        suggestedAction: null,
      });
    }

    // Insert alerts
    for (const alert of alerts) {
      // Check if similar alert exists recently
      const existing = await db('health_alerts')
        .where('user_id', userId)
        .where('type', alert.type)
        .where('created_at', '>=', new Date(Date.now() - 12 * 60 * 60 * 1000))
        .whereNull('dismissed_at')
        .first();

      if (!existing) {
        await db('health_alerts').insert({
          id: uuidv4(),
          user_id: userId,
          ...alert,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });
      }
    }
  }

  private generateUsageInsights(metrics: any[]): UsageInsight[] {
    const insights: UsageInsight[] = [];
    const { healthyUsageMinutes, maxDailyUsageMinutes } = config.wellness;

    const avgMinutes =
      metrics.reduce((sum, m) => sum + (m.total_minutes_used || 0), 0) / (metrics.length || 1);
    const avgSwipes =
      metrics.reduce((sum, m) => sum + (m.swipe_count || 0), 0) / (metrics.length || 1);

    if (avgMinutes <= healthyUsageMinutes) {
      insights.push({
        type: 'healthy',
        category: 'time',
        message: 'Your daily app usage is within healthy limits.',
        metric: 'average_daily_minutes',
        value: avgMinutes,
        threshold: healthyUsageMinutes,
      });
    } else if (avgMinutes > maxDailyUsageMinutes) {
      insights.push({
        type: 'concern',
        category: 'time',
        message: 'Your app usage is higher than recommended. Consider setting time limits.',
        metric: 'average_daily_minutes',
        value: avgMinutes,
        threshold: maxDailyUsageMinutes,
      });
    }

    if (avgSwipes > 100) {
      insights.push({
        type: 'warning',
        category: 'pattern',
        message: 'High swipe volume detected. Quality over quantity often leads to better matches.',
        metric: 'average_daily_swipes',
        value: avgSwipes,
        threshold: 100,
      });
    }

    return insights;
  }

  private generateEmotionalInsights(metrics: any[]): EmotionalInsight[] {
    const insights: EmotionalInsight[] = [];

    // Analyze mood patterns
    const moodChanges = metrics
      .filter((m) => m.mood_before_session && m.mood_after_session)
      .map((m) => ({
        before: this.moodToScore(m.mood_before_session),
        after: this.moodToScore(m.mood_after_session),
      }));

    if (moodChanges.length > 0) {
      const avgChange =
        moodChanges.reduce((sum, m) => sum + ((m.after || 0) - (m.before || 0)), 0) /
        moodChanges.length;

      if (avgChange > 0.5) {
        insights.push({
          type: 'positive',
          category: 'mood',
          message: 'Using the app tends to improve your mood. Great sign of healthy engagement!',
          correlatedWith: ['positive_matches', 'meaningful_conversations'],
        });
      } else if (avgChange < -0.5) {
        insights.push({
          type: 'negative',
          category: 'mood',
          message:
            'Your mood tends to decline after using the app. Consider what aspects might be affecting you.',
          correlatedWith: ['rejections', 'ghosting', 'excessive_usage'],
        });
      }
    }

    // Anxiety patterns
    const avgAnxiety =
      metrics
        .filter((m) => m.reported_anxiety !== null)
        .reduce((sum, m) => sum + parseFloat(m.reported_anxiety || 0), 0) /
      (metrics.filter((m) => m.reported_anxiety !== null).length || 1);

    if (avgAnxiety > 6) {
      insights.push({
        type: 'negative',
        category: 'anxiety',
        message: 'Elevated anxiety levels detected during dating app use.',
        correlatedWith: ['waiting_for_responses', 'fear_of_rejection'],
      });
    }

    return insights;
  }

  private async generateRecommendations(
    userId: string,
    metrics: any[]
  ): Promise<WellnessRecommendation[]> {
    const recommendations: WellnessRecommendation[] = [];

    if (metrics.length === 0) {
      return [
        {
          id: uuidv4(),
          priority: 'low',
          type: 'try_new_strategy',
          title: 'Start Tracking Your Wellness',
          description: 'Begin logging your dating app usage to get personalized insights.',
          actionItems: ['Open the app regularly', 'Complete mood check-ins'],
          expectedBenefit: 'Understand your dating patterns better',
        },
      ];
    }

    const avgScore =
      metrics.reduce((sum, m) => sum + parseFloat(m.overall_wellness_score), 0) / metrics.length;
    const avgMinutes =
      metrics.reduce((sum, m) => sum + (m.total_minutes_used || 0), 0) / metrics.length;

    if (avgScore < 50) {
      recommendations.push({
        id: uuidv4(),
        priority: 'high',
        type: 'take_break',
        title: 'Consider a Dating Break',
        description:
          'Your wellness scores suggest you might benefit from stepping back temporarily.',
        actionItems: [
          'Take a 3-7 day break from active swiping',
          'Use this time for self-reflection',
          'Focus on activities that boost your mood',
        ],
        expectedBenefit: 'Return refreshed with better results',
      });
    }

    if (avgMinutes > config.wellness.maxDailyUsageMinutes) {
      recommendations.push({
        id: uuidv4(),
        priority: 'medium',
        type: 'reduce_usage',
        title: 'Set Daily Time Limits',
        description: 'Research shows excessive app use can lead to burnout.',
        actionItems: [
          `Limit daily usage to ${config.wellness.healthyUsageMinutes} minutes`,
          'Set specific times for app use',
          'Use app timers if available',
        ],
        expectedBenefit: 'Reduced burnout and better quality interactions',
      });
    }

    if (avgScore >= 80) {
      recommendations.push({
        id: uuidv4(),
        priority: 'low',
        type: 'celebrate_progress',
        title: 'Maintain Your Great Balance',
        description: "You're doing an excellent job maintaining healthy dating habits!",
        actionItems: [
          'Continue your current approach',
          'Share what works with friends',
          'Stay mindful of changes',
        ],
        expectedBenefit: 'Sustained positive dating experience',
      });
    }

    return recommendations.slice(0, 3); // Return top 3 recommendations
  }

  private async calculateHealthyUsageStreak(userId: string): Promise<number> {
    const db = dbClient.getClient();
    const { healthyUsageMinutes } = config.wellness;

    const recentMetrics = await db('wellness_metrics')
      .where('user_id', userId)
      .where('total_minutes_used', '<=', healthyUsageMinutes)
      .where('overall_wellness_score', '>=', 60)
      .orderBy('date', 'desc')
      .limit(30);

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < recentMetrics.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];

      if (recentMetrics[i]?.date === expectedDateStr) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private getWeeklyScores(metrics: any[]): number[] {
    const weeks: number[][] = [[], [], [], []];
    const today = new Date();

    for (const metric of metrics) {
      const metricDate = new Date(metric.date);
      const daysDiff = Math.floor((today.getTime() - metricDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.min(3, Math.floor(daysDiff / 7));
      weeks[weekIndex].push(parseFloat(metric.overall_wellness_score));
    }

    return weeks
      .map((week) =>
        week.length > 0
          ? Math.round((week.reduce((a, b) => a + b, 0) / week.length) * 100) / 100
          : 0
      )
      .reverse();
  }

  private calculateTrend(weeklyScores: number[]): 'improving' | 'stable' | 'declining' {
    if (weeklyScores.length < 2) return 'stable';

    const recent = weeklyScores[weeklyScores.length - 1];
    const previous = weeklyScores[weeklyScores.length - 2];

    if (recent > previous + 5) return 'improving';
    if (recent < previous - 5) return 'declining';
    return 'stable';
  }

  private getHealthStatus(score: number): HealthStatus {
    if (score >= 85) return 'thriving';
    if (score >= 70) return 'healthy';
    if (score >= 50) return 'attention_needed';
    if (score >= 30) return 'struggling';
    return 'critical';
  }

  private getStatusMessage(
    status: HealthStatus,
    trend: 'improving' | 'stable' | 'declining'
  ): string {
    const messages: Record<HealthStatus, Record<string, string>> = {
      thriving: {
        improving: "You're doing amazing! Your dating wellness is excellent and getting better.",
        stable: "You're thriving! Keep maintaining these healthy dating habits.",
        declining: "You're still doing well, but keep an eye on recent changes.",
      },
      healthy: {
        improving: 'Good progress! Your dating health is improving steadily.',
        stable: "You're maintaining a healthy approach to dating.",
        declining: 'Your wellness is good but trending down. Consider what changed.',
      },
      attention_needed: {
        improving: "You're making progress! Keep up the positive changes.",
        stable: 'Your dating wellness needs some attention.',
        declining: 'Your wellness is declining. Review our recommendations.',
      },
      struggling: {
        improving: "It's been tough, but you're moving in the right direction.",
        stable: "You're going through a difficult period. Consider our support resources.",
        declining: 'This seems like a challenging time. A break might help.',
      },
      critical: {
        improving: 'Things are improving. Keep taking care of yourself.',
        stable: 'We recommend taking a break and focusing on self-care.',
        declining: 'Please consider pausing and reaching out to support resources.',
      },
    };

    return messages[status][trend] || 'Monitor your wellness and follow recommendations.';
  }

  private calculateHealthMetric(name: string, metrics: any, field: string): HealthMetric {
    const score = metrics ? parseFloat(metrics[field]) : 50;
    return {
      name,
      score: Math.round(score * 100) / 100,
      status: this.getHealthStatus(score),
      description: this.getMetricDescription(name, score),
      trend: 'stable', // Would need historical data for actual trend
      factors: [],
    };
  }

  private calculateMatchQualityMetric(metrics: any): HealthMetric {
    if (!metrics) {
      return {
        name: 'Match Quality',
        score: 50,
        status: 'attention_needed',
        description: 'Not enough data yet.',
        trend: 'stable',
        factors: [],
      };
    }

    const matches = metrics.matches_received || 0;
    const meaningful = metrics.meaningful_conversations || 0;
    const ghosted = metrics.ghosted_conversations || 0;

    let score = 50;
    if (matches > 0) {
      const qualityRatio = meaningful / matches;
      score = Math.min(100, qualityRatio * 100 + 30);
    }
    score -= ghosted * 5;
    score = Math.max(0, Math.min(100, score));

    return {
      name: 'Match Quality',
      score: Math.round(score * 100) / 100,
      status: this.getHealthStatus(score),
      description: this.getMetricDescription('Match Quality', score),
      trend: 'stable',
      factors: [
        {
          name: 'Matches',
          impact: matches > 0 ? 'positive' : 'neutral',
          value: String(matches),
          weight: 0.3,
        },
        {
          name: 'Meaningful Conversations',
          impact: meaningful > 0 ? 'positive' : 'neutral',
          value: String(meaningful),
          weight: 0.5,
        },
        {
          name: 'Ghosted',
          impact: ghosted > 0 ? 'negative' : 'neutral',
          value: String(ghosted),
          weight: 0.2,
        },
      ],
    };
  }

  private getMetricDescription(name: string, score: number): string {
    if (score >= 80) return `Your ${name.toLowerCase()} is excellent.`;
    if (score >= 60) return `Your ${name.toLowerCase()} is good.`;
    if (score >= 40) return `Your ${name.toLowerCase()} could use some attention.`;
    return `Your ${name.toLowerCase()} needs improvement.`;
  }

  private mapToWellnessMetrics(row: any): WellnessMetrics {
    return {
      userId: row.user_id,
      date: row.date,
      sessionCount: row.session_count,
      totalMinutesUsed: row.total_minutes_used,
      swipeCount: row.swipe_count,
      messagesSent: row.messages_sent,
      messagesReceived: row.messages_received,
      matchesReceived: row.matches_received,
      rejectionsReceived: row.rejections_received,
      averageConversationDepth: parseFloat(row.average_conversation_depth),
      meaningfulConversations: row.meaningful_conversations,
      ghostedConversations: row.ghosted_conversations,
      moodBeforeSession: row.mood_before_session,
      moodAfterSession: row.mood_after_session,
      reportedAnxiety: row.reported_anxiety ? parseFloat(row.reported_anxiety) : null,
      reportedFrustration: row.reported_frustration ? parseFloat(row.reported_frustration) : null,
      overallWellnessScore: parseFloat(row.overall_wellness_score),
      usageHealthScore: parseFloat(row.usage_health_score),
      emotionalImpactScore: parseFloat(row.emotional_impact_score),
      engagementQualityScore: parseFloat(row.engagement_quality_score),
    };
  }

  private mapToHealthAlert(row: any): HealthAlert {
    return {
      id: row.id,
      severity: row.severity,
      type: row.type,
      title: row.title,
      message: row.message,
      actionRequired: row.action_required,
      suggestedAction: row.suggested_action,
      createdAt: row.created_at,
      dismissedAt: row.dismissed_at,
    };
  }

  private aggregateMetrics(metrics: any[], granularity: 'weekly' | 'monthly'): WellnessMetrics[] {
    // Group by week or month
    const grouped: Record<string, any[]> = {};

    for (const m of metrics) {
      const date = new Date(m.date);
      let key: string;

      if (granularity === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }

    return Object.entries(grouped).map(([date, items]) => {
      const avg = (field: string) =>
        items.reduce((sum, i) => sum + (parseFloat(i[field]) || 0), 0) / items.length;
      const sum = (field: string) => items.reduce((total, i) => total + (i[field] || 0), 0);

      return {
        userId: items[0].user_id,
        date,
        sessionCount: sum('session_count'),
        totalMinutesUsed: sum('total_minutes_used'),
        swipeCount: sum('swipe_count'),
        messagesSent: sum('messages_sent'),
        messagesReceived: sum('messages_received'),
        matchesReceived: sum('matches_received'),
        rejectionsReceived: sum('rejections_received'),
        averageConversationDepth: avg('average_conversation_depth'),
        meaningfulConversations: sum('meaningful_conversations'),
        ghostedConversations: sum('ghosted_conversations'),
        moodBeforeSession: null,
        moodAfterSession: null,
        reportedAnxiety: null,
        reportedFrustration: null,
        overallWellnessScore: avg('overall_wellness_score'),
        usageHealthScore: avg('usage_health_score'),
        emotionalImpactScore: avg('emotional_impact_score'),
        engagementQualityScore: avg('engagement_quality_score'),
      };
    });
  }

  private createEmptyTrend(userId: string, period: 'daily' | 'weekly' | 'monthly'): WellnessTrend {
    return {
      userId,
      period,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      averageWellnessScore: 0,
      wellnessScoreTrend: 'stable',
      trendPercentage: 0,
      usagePatternInsights: [],
      emotionalPatternInsights: [],
      recommendations: [],
    };
  }
}

export const wellnessService = new WellnessService();
