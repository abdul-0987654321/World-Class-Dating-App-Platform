/**
 * Churn Prediction ML Service
 *
 * Implements machine learning-based churn prediction for user retention.
 * Uses weighted feature scoring with automatic model retraining capabilities.
 */

import { createLogger } from '@flamoral/backend-shared';

import { dbClient } from '../infrastructure/database/db-client';
import {
  ChurnRiskTier,
  ChurnIndicatorType,
  RetentionCampaignType,
  ChurnIndicator,
  ChurnModelWeights,
  ChurnRiskResult,
  AtRiskUser,
  ChurnAnalyticsSummary,
  ChurnPredictionHistory,
  RetentionCampaignRecord,
  UserBehaviorFeatures,
  ChurnPredictionJob,
} from '../types';

const logger = createLogger('churn-prediction-service');

// Default model weights (calibrated based on typical dating app churn patterns)
const DEFAULT_MODEL_WEIGHTS: Record<ChurnIndicatorType, number> = {
  [ChurnIndicatorType.LOGIN_FREQUENCY]: 0.18,
  [ChurnIndicatorType.DECLINING_ENGAGEMENT]: 0.15,
  [ChurnIndicatorType.PAYMENT_FAILURE]: 0.12,
  [ChurnIndicatorType.MESSAGE_RESPONSE_RATE]: 0.1,
  [ChurnIndicatorType.SWIPE_ACTIVITY]: 0.09,
  [ChurnIndicatorType.PROFILE_COMPLETION]: 0.08,
  [ChurnIndicatorType.SUBSCRIPTION_RENEWAL]: 0.07,
  [ChurnIndicatorType.SESSION_DURATION]: 0.06,
  [ChurnIndicatorType.MATCH_SUCCESS_RATE]: 0.05,
  [ChurnIndicatorType.APP_OPEN_FREQUENCY]: 0.04,
  [ChurnIndicatorType.FEATURE_USAGE]: 0.03,
  [ChurnIndicatorType.SUPPORT_TICKETS]: 0.02,
  [ChurnIndicatorType.NEGATIVE_FEEDBACK]: 0.01,
};

// Risk tier thresholds
const RISK_TIER_THRESHOLDS = {
  LOW: 0.25,
  MEDIUM: 0.5,
  HIGH: 0.75,
  CRITICAL: 1.0,
};

// Intervention urgency thresholds
const INTERVENTION_THRESHOLDS = {
  immediate: 0.8,
  this_week: 0.6,
  this_month: 0.4,
  monitoring: 0,
};

export class ChurnPredictionService {
  private modelVersion: string = '1.0.0';
  private modelWeights: Record<ChurnIndicatorType, number>;

  constructor() {
    this.modelWeights = { ...DEFAULT_MODEL_WEIGHTS };
    this.loadActiveModelWeights();
  }

  /**
   * Load active model weights from database
   */
  private async loadActiveModelWeights(): Promise<void> {
    try {
      const query = `
        SELECT * FROM churn_model_weights
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const result = await dbClient.query(query);

      if (result.rows.length > 0) {
        const model = result.rows[0];
        this.modelWeights = model.weights;
        this.modelVersion = model.version;
        logger.info(`Loaded model weights version ${this.modelVersion}`);
      }
    } catch (error) {
      logger.warn('Failed to load model weights, using defaults:', error);
    }
  }

  /**
   * Calculate churn risk for a specific user
   */
  async calculateChurnRisk(userId: string): Promise<ChurnRiskResult> {
    logger.info(`Calculating churn risk for user: ${userId}`);

    // Extract user behavior features
    const features = await this.extractUserFeatures(userId);

    // Calculate all indicators
    const indicators = await this.calculateIndicators(userId, features);

    // Calculate weighted risk score
    const riskScore = this.calculateWeightedRiskScore(indicators);

    // Determine risk tier
    const riskTier = this.determineRiskTier(riskScore);

    // Get historical data for trend analysis
    const previousPrediction = await this.getPreviousPrediction(userId);
    const riskTrend = this.calculateRiskTrend(riskScore, previousPrediction?.riskScore);

    // Identify top risk factors and positive signals
    const sortedIndicators = [...indicators].sort((a, b) => b.weightedScore - a.weightedScore);
    const topRiskFactors = sortedIndicators.filter((i) => i.score > 0.5).slice(0, 5);
    const positiveSignals = sortedIndicators.filter((i) => i.score <= 0.3).slice(-3);

    // Determine recommended campaigns based on risk factors
    const recommendedCampaigns = this.determineRecommendedCampaigns(
      topRiskFactors,
      riskTier,
      features
    );

    // Determine intervention urgency
    const interventionUrgency = this.determineInterventionUrgency(riskScore);

    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence(features);

    const result: ChurnRiskResult = {
      userId,
      riskScore,
      riskTier,
      confidence,
      indicators,
      topRiskFactors,
      positiveSignals,
      previousRiskScore: previousPrediction?.riskScore,
      riskTrend,
      daysSinceLastPrediction: previousPrediction
        ? Math.floor(
            (Date.now() - new Date(previousPrediction.predictedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : undefined,
      recommendedCampaigns,
      interventionUrgency,
      modelVersion: this.modelVersion,
      predictedAt: new Date(),
      nextPredictionAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
    };

    // Store prediction
    await this.storePrediction(result);

    return result;
  }

  /**
   * Get churn indicators for a user
   */
  async getChurnIndicators(userId: string): Promise<ChurnIndicator[]> {
    const features = await this.extractUserFeatures(userId);
    return this.calculateIndicators(userId, features);
  }

  /**
   * Get at-risk users filtered by risk level
   */
  async getAtRiskUsers(
    riskLevel: ChurnRiskTier,
    limit: number = 100,
    offset: number = 0
  ): Promise<AtRiskUser[]> {
    logger.info(`Getting at-risk users with risk level: ${riskLevel}`);

    const tierCondition = this.getRiskTierCondition(riskLevel);

    const query = `
      SELECT
        cp.user_id,
        cp.risk_score,
        cp.risk_tier,
        cp.indicators,
        cp.predicted_at,
        u.email,
        u.display_name,
        u.subscription_tier,
        u.created_at as user_created_at,
        u.last_active_at,
        COALESCE(SUM(p.amount), 0) as ltv,
        (
          SELECT rc.campaign_type
          FROM retention_campaigns rc
          WHERE rc.user_id = cp.user_id
          ORDER BY rc.triggered_at DESC
          LIMIT 1
        ) as last_campaign_type,
        (
          SELECT rc.triggered_at
          FROM retention_campaigns rc
          WHERE rc.user_id = cp.user_id
          ORDER BY rc.triggered_at DESC
          LIMIT 1
        ) as last_campaign_date,
        (
          SELECT rc.status
          FROM retention_campaigns rc
          WHERE rc.user_id = cp.user_id
          ORDER BY rc.triggered_at DESC
          LIMIT 1
        ) as campaign_status,
        LAG(cp.risk_score) OVER (PARTITION BY cp.user_id ORDER BY cp.predicted_at) as prev_risk_score
      FROM churn_predictions cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN payments p ON cp.user_id = p.user_id AND p.status = 'completed'
      WHERE cp.predicted_at = (
        SELECT MAX(predicted_at)
        FROM churn_predictions
        WHERE user_id = cp.user_id
      )
      AND ${tierCondition}
      GROUP BY cp.user_id, cp.risk_score, cp.risk_tier, cp.indicators, cp.predicted_at,
               u.email, u.display_name, u.subscription_tier, u.created_at, u.last_active_at
      ORDER BY cp.risk_score DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await dbClient.query(query, [limit, offset]);

      return result.rows.map((row: any) => {
        const indicators =
          typeof row.indicators === 'string' ? JSON.parse(row.indicators) : row.indicators;

        const topRiskFactor =
          indicators && indicators.length > 0
            ? indicators.reduce((max: ChurnIndicator, i: ChurnIndicator) =>
                i.weightedScore > (max?.weightedScore || 0) ? i : max
              ).type
            : ChurnIndicatorType.LOGIN_FREQUENCY;

        const riskTrend = row.prev_risk_score
          ? row.risk_score > row.prev_risk_score + 0.05
            ? 'increasing'
            : row.risk_score < row.prev_risk_score - 0.05
              ? 'decreasing'
              : 'stable'
          : 'stable';

        return {
          userId: row.user_id,
          email: row.email,
          displayName: row.display_name,
          riskScore: parseFloat(row.risk_score),
          riskTier: row.risk_tier as ChurnRiskTier,
          riskTrend,
          subscriptionTier: row.subscription_tier,
          ltv: parseFloat(row.ltv) || 0,
          monthsActive: Math.floor(
            (Date.now() - new Date(row.user_created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
          ),
          daysSinceLastLogin: row.last_active_at
            ? Math.floor(
                (Date.now() - new Date(row.last_active_at).getTime()) / (1000 * 60 * 60 * 24)
              )
            : 999,
          engagementScore: this.calculateEngagementScoreFromIndicators(indicators),
          topRiskFactor,
          lastCampaignType: row.last_campaign_type as RetentionCampaignType | undefined,
          lastCampaignDate: row.last_campaign_date ? new Date(row.last_campaign_date) : undefined,
          campaignResponseStatus: this.mapCampaignStatus(row.campaign_status),
          predictedAt: new Date(row.predicted_at),
        } as AtRiskUser;
      });
    } catch (error) {
      logger.error('Failed to get at-risk users:', error);
      return [];
    }
  }

  /**
   * Trigger a retention campaign for a user
   */
  async triggerRetentionCampaign(
    userId: string,
    campaignType: RetentionCampaignType
  ): Promise<void> {
    logger.info(`Triggering retention campaign ${campaignType} for user ${userId}`);

    // Get current risk data
    const currentPrediction = await this.getPreviousPrediction(userId);

    const campaignRecord: Partial<RetentionCampaignRecord> = {
      id: `rc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      campaignType,
      riskScoreAtTrigger: currentPrediction?.riskScore || 0.5,
      riskTierAtTrigger: currentPrediction?.riskTier || ChurnRiskTier.MEDIUM,
      triggeredAt: new Date(),
      status: 'pending',
      outcome: 'pending',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    };

    const query = `
      INSERT INTO retention_campaigns (
        id, user_id, campaign_type, risk_score_at_trigger, risk_tier_at_trigger,
        triggered_at, status, outcome, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `;

    try {
      await dbClient.query(query, [
        campaignRecord.id,
        campaignRecord.userId,
        campaignRecord.campaignType,
        campaignRecord.riskScoreAtTrigger,
        campaignRecord.riskTierAtTrigger,
        campaignRecord.triggeredAt,
        campaignRecord.status,
        campaignRecord.outcome,
        campaignRecord.expiresAt,
      ]);

      // Emit event for campaign execution (would be handled by notification service)
      await this.emitCampaignEvent(campaignRecord as RetentionCampaignRecord);

      logger.info(`Retention campaign ${campaignType} triggered successfully for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to trigger retention campaign for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update churn model weights based on historical data
   */
  async updateChurnModel(): Promise<ChurnModelWeights> {
    logger.info('Starting churn model update...');

    // Get historical training data
    const trainingData = await this.getTrainingData();

    if (trainingData.length < 100) {
      logger.warn('Insufficient training data for model update');
      throw new Error('Insufficient training data (minimum 100 samples required)');
    }

    // Calculate new weights using logistic regression approach
    const newWeights = await this.calculateOptimalWeights(trainingData);

    // Evaluate model performance
    const performance = await this.evaluateModel(trainingData, newWeights);

    // Only update if new model performs better
    const currentPerformance = await this.getCurrentModelPerformance();

    if (performance.accuracy <= currentPerformance.accuracy) {
      logger.info('New model does not improve performance, keeping current weights');
      return this.getCurrentModelWeights();
    }

    // Create new model version
    const newVersion = this.incrementVersion(this.modelVersion);

    const modelWeights: ChurnModelWeights = {
      id: `model_${Date.now()}`,
      version: newVersion,
      createdAt: new Date(),
      validFrom: new Date(),
      isActive: true,
      weights: newWeights,
      accuracy: performance.accuracy,
      precision: performance.precision,
      recall: performance.recall,
      f1Score: performance.f1Score,
      auc: performance.auc,
      trainingDataSize: trainingData.length,
      trainingPeriodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      trainingPeriodEnd: new Date(),
      modelType: 'weighted_features',
    };

    // Deactivate old model and save new one
    await this.saveNewModel(modelWeights);

    // Update in-memory weights
    this.modelWeights = newWeights;
    this.modelVersion = newVersion;

    logger.info(`Model updated to version ${newVersion} with accuracy ${performance.accuracy}`);

    return modelWeights;
  }

  /**
   * Get churn analytics summary for dashboard
   */
  async getChurnAnalytics(
    startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ): Promise<ChurnAnalyticsSummary> {
    logger.info(`Getting churn analytics from ${startDate} to ${endDate}`);

    // Get total users analyzed
    const usersQuery = `
      SELECT COUNT(DISTINCT user_id) as total_users
      FROM churn_predictions
      WHERE predicted_at BETWEEN $1 AND $2
    `;
    const usersResult = await dbClient.query(usersQuery, [startDate, endDate]);
    const totalUsersAnalyzed = parseInt(usersResult.rows[0]?.total_users) || 0;

    // Get tier distribution
    const tierQuery = `
      SELECT
        risk_tier,
        COUNT(*) as count,
        AVG(risk_score) as avg_score
      FROM (
        SELECT DISTINCT ON (user_id) user_id, risk_tier, risk_score
        FROM churn_predictions
        WHERE predicted_at BETWEEN $1 AND $2
        ORDER BY user_id, predicted_at DESC
      ) latest
      GROUP BY risk_tier
    `;
    const tierResult = await dbClient.query(tierQuery, [startDate, endDate]);

    const tierDistribution = {
      [ChurnRiskTier.LOW]: { count: 0, percentage: 0, avgLtv: 0 },
      [ChurnRiskTier.MEDIUM]: { count: 0, percentage: 0, avgLtv: 0 },
      [ChurnRiskTier.HIGH]: { count: 0, percentage: 0, avgLtv: 0 },
      [ChurnRiskTier.CRITICAL]: { count: 0, percentage: 0, avgLtv: 0 },
    };

    let atRiskCount = 0;
    tierResult.rows.forEach((row: any) => {
      const tier = row.risk_tier as ChurnRiskTier;
      const count = parseInt(row.count);
      tierDistribution[tier] = {
        count,
        percentage: totalUsersAnalyzed > 0 ? (count / totalUsersAnalyzed) * 100 : 0,
        avgLtv: 0, // Would need to join with payments
      };
      if (tier !== ChurnRiskTier.LOW) {
        atRiskCount += count;
      }
    });

    // Get risk trends over time
    const trendsQuery = `
      SELECT
        DATE(predicted_at) as date,
        AVG(risk_score) as avg_risk_score,
        COUNT(CASE WHEN risk_tier IN ('HIGH', 'CRITICAL') THEN 1 END) as at_risk_count,
        0 as churned_count
      FROM churn_predictions
      WHERE predicted_at BETWEEN $1 AND $2
      GROUP BY DATE(predicted_at)
      ORDER BY date
    `;
    const trendsResult = await dbClient.query(trendsQuery, [startDate, endDate]);

    const riskTrends = trendsResult.rows.map((row: any) => ({
      date: new Date(row.date),
      avgRiskScore: parseFloat(row.avg_risk_score) || 0,
      atRiskCount: parseInt(row.at_risk_count) || 0,
      churnedCount: parseInt(row.churned_count) || 0,
    }));

    // Get top risk indicators
    const indicatorsQuery = `
      SELECT
        indicator_type,
        AVG(score) as avg_score,
        COUNT(*) as affected_users,
        AVG(weighted_score) as contribution
      FROM churn_indicator_scores
      WHERE created_at BETWEEN $1 AND $2
      AND score > 0.5
      GROUP BY indicator_type
      ORDER BY contribution DESC
      LIMIT 10
    `;

    let topRiskIndicators: any[] = [];
    try {
      const indicatorsResult = await dbClient.query(indicatorsQuery, [startDate, endDate]);
      topRiskIndicators = indicatorsResult.rows.map((row: any) => ({
        indicator: row.indicator_type as ChurnIndicatorType,
        avgScore: parseFloat(row.avg_score) || 0,
        affectedUsers: parseInt(row.affected_users) || 0,
        contribution: parseFloat(row.contribution) * 100 || 0,
      }));
    } catch (error) {
      logger.warn('Could not fetch indicator scores:', error);
    }

    // Get campaign metrics
    const campaignQuery = `
      SELECT
        campaign_type,
        COUNT(*) as sent,
        COUNT(CASE WHEN status = 'engaged' THEN 1 END) as engaged,
        COUNT(CASE WHEN outcome = 'retained' THEN 1 END) as retained
      FROM retention_campaigns
      WHERE triggered_at BETWEEN $1 AND $2
      GROUP BY campaign_type
    `;

    let campaignMetrics: any[] = [];
    try {
      const campaignResult = await dbClient.query(campaignQuery, [startDate, endDate]);
      campaignMetrics = campaignResult.rows.map((row: any) => ({
        campaignType: row.campaign_type as RetentionCampaignType,
        sent: parseInt(row.sent) || 0,
        engaged: parseInt(row.engaged) || 0,
        retained: parseInt(row.retained) || 0,
        retentionRate: row.sent > 0 ? (parseInt(row.retained) / parseInt(row.sent)) * 100 : 0,
      }));
    } catch (error) {
      logger.warn('Could not fetch campaign metrics:', error);
    }

    // Get prediction accuracy
    const accuracyQuery = `
      SELECT
        COUNT(CASE WHEN risk_tier IN ('HIGH', 'CRITICAL') THEN 1 END) as predicted,
        COUNT(CASE WHEN actual_outcome = 'churned' THEN 1 END) as actual_churned
      FROM churn_predictions
      WHERE predicted_at BETWEEN $1 AND $2
      AND actual_outcome IS NOT NULL
    `;

    let predictionAccuracy = { predicted: 0, actualChurned: 0, accuracy: 0 };
    try {
      const accuracyResult = await dbClient.query(accuracyQuery, [startDate, endDate]);
      if (accuracyResult.rows.length > 0) {
        const predicted = parseInt(accuracyResult.rows[0].predicted) || 0;
        const actualChurned = parseInt(accuracyResult.rows[0].actual_churned) || 0;
        predictionAccuracy = {
          predicted,
          actualChurned,
          accuracy: predicted > 0 ? (actualChurned / predicted) * 100 : 0,
        };
      }
    } catch (error) {
      logger.warn('Could not fetch prediction accuracy:', error);
    }

    return {
      period: { startDate, endDate },
      totalUsersAnalyzed,
      atRiskUserCount: atRiskCount,
      atRiskPercentage: totalUsersAnalyzed > 0 ? (atRiskCount / totalUsersAnalyzed) * 100 : 0,
      tierDistribution,
      riskTrends,
      topRiskIndicators,
      campaignMetrics,
      predictionAccuracy,
    };
  }

  /**
   * Run daily churn predictions for all active users
   */
  async runDailyPredictions(): Promise<ChurnPredictionJob> {
    const jobId = `job_${Date.now()}`;
    logger.info(`Starting daily prediction job: ${jobId}`);

    const job: ChurnPredictionJob = {
      id: jobId,
      status: 'running',
      startedAt: new Date(),
      usersProcessed: 0,
      usersTotal: 0,
      modelVersion: this.modelVersion,
      createdAt: new Date(),
    };

    // Store job record
    await this.storeJob(job);

    try {
      // Get all active users (active in last 90 days)
      const usersQuery = `
        SELECT DISTINCT user_id
        FROM session_events
        WHERE start_time > NOW() - INTERVAL '90 days'
        AND user_id IS NOT NULL
      `;
      const usersResult = await dbClient.query(usersQuery);
      const userIds = usersResult.rows.map((r: any) => r.user_id);

      job.usersTotal = userIds.length;
      await this.updateJob(job);

      // Process users in batches
      const batchSize = 100;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (userId: string) => {
            try {
              await this.calculateChurnRisk(userId);
              job.usersProcessed++;
            } catch (error) {
              logger.error(`Failed to process user ${userId}:`, error);
            }
          })
        );

        // Update progress
        await this.updateJob(job);
        logger.info(`Processed ${job.usersProcessed}/${job.usersTotal} users`);
      }

      job.status = 'completed';
      job.completedAt = new Date();

      // Trigger interventions for high-risk users
      await this.triggerAutomaticInterventions();
    } catch (error: any) {
      job.status = 'failed';
      job.errorMessage = error.message;
      logger.error('Daily prediction job failed:', error);
    }

    await this.updateJob(job);
    return job;
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  /**
   * Extract user behavior features from database
   */
  private async extractUserFeatures(userId: string): Promise<UserBehaviorFeatures> {
    const now = new Date();

    // Login and session features
    const sessionQuery = `
      SELECT
        MAX(start_time) as last_login,
        COUNT(*) FILTER (WHERE start_time > NOW() - INTERVAL '7 days') as logins_7d,
        COUNT(*) FILTER (WHERE start_time > NOW() - INTERVAL '30 days') as logins_30d,
        AVG(duration) as avg_session_duration,
        COUNT(*) as total_sessions_30d,
        AVG(screen_views) as avg_screens
      FROM session_events
      WHERE user_id = $1
      AND start_time > NOW() - INTERVAL '30 days'
    `;

    // Swipe features
    const swipeQuery = `
      SELECT
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '7 days') as swipes_7d,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '30 days') as swipes_30d,
        COUNT(*) FILTER (WHERE direction = 'right') as right_swipes,
        COUNT(*) as total_swipes
      FROM swipe_events
      WHERE user_id = $1
      AND timestamp > NOW() - INTERVAL '30 days'
    `;

    // Match features
    const matchQuery = `
      SELECT
        COUNT(*) as matches_30d
      FROM match_events
      WHERE (user_id_1 = $1 OR user_id_2 = $1)
      AND timestamp > NOW() - INTERVAL '30 days'
    `;

    // Message features
    const messageQuery = `
      SELECT
        COUNT(*) FILTER (WHERE sender_id = $1) as messages_sent,
        COUNT(*) FILTER (WHERE receiver_id = $1) as messages_received,
        AVG(response_time) as avg_response_time
      FROM message_events
      WHERE (sender_id = $1 OR receiver_id = $1)
      AND timestamp > NOW() - INTERVAL '30 days'
    `;

    // User profile features
    const profileQuery = `
      SELECT
        u.created_at,
        u.last_active_at,
        u.profile_completion,
        u.subscription_tier,
        u.subscription_start_date,
        (SELECT COUNT(*) FROM user_photos WHERE user_id = u.id) as photo_count,
        (SELECT verified FROM user_verifications WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as has_verification,
        COALESCE(LENGTH(p.bio), 0) as bio_length,
        p.updated_at as profile_updated_at
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `;

    // Payment features
    const paymentQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '90 days') as failed_payments,
        MAX(created_at) as last_payment
      FROM payments
      WHERE user_id = $1
    `;

    // Premium feature usage
    const featureQuery = `
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'boost_used' AND created_at > NOW() - INTERVAL '30 days') as boosts,
        COUNT(*) FILTER (WHERE event_name = 'super_like_used' AND created_at > NOW() - INTERVAL '30 days') as super_likes,
        COUNT(*) FILTER (WHERE event_name = 'rewind_used' AND created_at > NOW() - INTERVAL '30 days') as rewinds
      FROM tracking_events
      WHERE user_id = $1
    `;

    try {
      const [sessionRes, swipeRes, matchRes, messageRes, profileRes, paymentRes, featureRes] =
        await Promise.all([
          dbClient.query(sessionQuery, [userId]),
          dbClient.query(swipeQuery, [userId]),
          dbClient.query(matchQuery, [userId]),
          dbClient.query(messageQuery, [userId]),
          dbClient.query(profileQuery, [userId]),
          dbClient.query(paymentQuery, [userId]),
          dbClient.query(featureQuery, [userId]),
        ]);

      const session = sessionRes.rows[0] || {};
      const swipe = swipeRes.rows[0] || {};
      const match = matchRes.rows[0] || {};
      const message = messageRes.rows[0] || {};
      const profile = profileRes.rows[0] || {};
      const payment = paymentRes.rows[0] || {};
      const feature = featureRes.rows[0] || {};

      const lastLogin = session.last_login ? new Date(session.last_login) : now;
      const daysSinceLastLogin = Math.floor(
        (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
      );

      const loginsLast7Days = parseInt(session.logins_7d) || 0;
      const loginsLast30Days = parseInt(session.logins_30d) || 0;

      // Calculate trends
      const loginFrequencyTrend = this.calculateTrend(loginsLast7Days * 4, loginsLast30Days);

      const swipesLast7Days = parseInt(swipe.swipes_7d) || 0;
      const swipesLast30Days = parseInt(swipe.swipes_30d) || 0;
      const swipeActivityTrend = this.calculateTrend(swipesLast7Days * 4, swipesLast30Days);

      const totalSwipes = parseInt(swipe.total_swipes) || 1;
      const rightSwipes = parseInt(swipe.right_swipes) || 0;
      const rightSwipeRatio = totalSwipes > 0 ? rightSwipes / totalSwipes : 0.5;

      const matchesLast30Days = parseInt(match.matches_30d) || 0;
      const matchRate = swipesLast30Days > 0 ? matchesLast30Days / swipesLast30Days : 0;

      const messagesSent = parseInt(message.messages_sent) || 0;
      const messagesReceived = parseInt(message.messages_received) || 0;
      const responseRate = messagesReceived > 0 ? messagesSent / messagesReceived : 0;

      const profileCreatedAt = profile.created_at ? new Date(profile.created_at) : now;
      const subscriptionStartDate = profile.subscription_start_date
        ? new Date(profile.subscription_start_date)
        : undefined;

      const features: UserBehaviorFeatures = {
        userId,
        extractedAt: now,

        // Login/Activity
        daysSinceLastLogin,
        loginsLast7Days,
        loginsLast30Days,
        loginFrequencyTrend,
        avgDaysBetweenLogins: loginsLast30Days > 0 ? 30 / loginsLast30Days : 30,

        // Session
        avgSessionDurationMinutes: (parseFloat(session.avg_session_duration) || 0) / 60,
        totalSessionsLast30Days: parseInt(session.total_sessions_30d) || 0,
        sessionDurationTrend: 0, // Would need historical data
        avgScreensPerSession: parseFloat(session.avg_screens) || 0,

        // Swipes
        swipesLast7Days,
        swipesLast30Days,
        swipeActivityTrend,
        rightSwipeRatio,

        // Matches
        matchesLast30Days,
        matchRate,
        matchRateTrend: 0, // Would need historical data
        avgTimeToFirstMessage: 0, // Would need more complex query

        // Messages
        messagesSentLast30Days: messagesSent,
        messagesReceivedLast30Days: messagesReceived,
        responseRate,
        responseRateTrend: 0,
        avgResponseTimeHours: (parseFloat(message.avg_response_time) || 0) / 3600,
        conversationsInitiated: 0,

        // Profile
        profileCompletionPercent: parseInt(profile.profile_completion) || 0,
        photoCount: parseInt(profile.photo_count) || 0,
        lastProfileUpdateDays: profile.profile_updated_at
          ? Math.floor(
              (now.getTime() - new Date(profile.profile_updated_at).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 999,
        hasVerification: profile.has_verification || false,
        bioLength: parseInt(profile.bio_length) || 0,

        // Subscription
        subscriptionTier: profile.subscription_tier || 'FREE',
        subscriptionAge: subscriptionStartDate
          ? Math.floor((now.getTime() - subscriptionStartDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        daysUntilRenewal: 0, // Would need subscription data
        paymentFailuresLast90Days: parseInt(payment.failed_payments) || 0,
        hasActiveSubscription: profile.subscription_tier && profile.subscription_tier !== 'FREE',
        previouslyPaidUser: !!payment.last_payment,

        // Feature usage
        usedBoostLast30Days: (parseInt(feature.boosts) || 0) > 0,
        usedSuperLikeLast30Days: (parseInt(feature.super_likes) || 0) > 0,
        usedRewindLast30Days: (parseInt(feature.rewinds) || 0) > 0,
        premiumFeaturesUsed:
          (parseInt(feature.boosts) || 0) +
          (parseInt(feature.super_likes) || 0) +
          (parseInt(feature.rewinds) || 0),

        // Support
        supportTicketsLast90Days: 0,
        hasReportedIssue: false,

        // Derived
        engagementScore: this.calculateEngagementScore(
          loginsLast30Days,
          swipesLast30Days,
          messagesSent,
          matchesLast30Days
        ),
        valueScore: this.calculateValueScore(profile.subscription_tier),
        satisfactionIndicator: this.calculateSatisfactionIndicator(
          matchRate,
          responseRate,
          loginsLast30Days
        ),
      };

      return features;
    } catch (error) {
      logger.error(`Failed to extract features for user ${userId}:`, error);
      return this.getDefaultFeatures(userId);
    }
  }

  /**
   * Calculate all churn indicators from features
   */
  private async calculateIndicators(
    userId: string,
    features: UserBehaviorFeatures
  ): Promise<ChurnIndicator[]> {
    const now = new Date();
    const indicators: ChurnIndicator[] = [];

    // 1. Login Frequency
    const loginScore = this.calculateLoginScore(features);
    indicators.push({
      type: ChurnIndicatorType.LOGIN_FREQUENCY,
      name: 'Login Frequency',
      description: 'How often the user logs into the app',
      score: loginScore,
      weight: this.modelWeights[ChurnIndicatorType.LOGIN_FREQUENCY],
      weightedScore: loginScore * this.modelWeights[ChurnIndicatorType.LOGIN_FREQUENCY],
      trend:
        features.loginFrequencyTrend > 0.1
          ? 'improving'
          : features.loginFrequencyTrend < -0.1
            ? 'declining'
            : 'stable',
      severity: this.getSeverity(loginScore),
      dataPoints: {
        current: features.loginsLast7Days,
        previous: features.loginsLast30Days / 4,
        average: 4, // Average user logs in 4 times per week
        percentile: await this.getPercentile(userId, 'logins_7d', features.loginsLast7Days),
      },
      lastUpdated: now,
    });

    // 2. Declining Engagement
    const engagementScore = this.calculateEngagementDeclineScore(features);
    indicators.push({
      type: ChurnIndicatorType.DECLINING_ENGAGEMENT,
      name: 'Engagement Decline',
      description: 'Trend in overall app engagement',
      score: engagementScore,
      weight: this.modelWeights[ChurnIndicatorType.DECLINING_ENGAGEMENT],
      weightedScore: engagementScore * this.modelWeights[ChurnIndicatorType.DECLINING_ENGAGEMENT],
      trend:
        features.swipeActivityTrend > 0.1
          ? 'improving'
          : features.swipeActivityTrend < -0.1
            ? 'declining'
            : 'stable',
      severity: this.getSeverity(engagementScore),
      dataPoints: {
        current: features.engagementScore,
        previous: features.engagementScore * 1.2, // Estimated previous
        average: 50,
        percentile: await this.getPercentile(userId, 'engagement', features.engagementScore),
      },
      lastUpdated: now,
    });

    // 3. Payment Failure
    const paymentScore = this.calculatePaymentScore(features);
    indicators.push({
      type: ChurnIndicatorType.PAYMENT_FAILURE,
      name: 'Payment Issues',
      description: 'Payment failures and subscription status',
      score: paymentScore,
      weight: this.modelWeights[ChurnIndicatorType.PAYMENT_FAILURE],
      weightedScore: paymentScore * this.modelWeights[ChurnIndicatorType.PAYMENT_FAILURE],
      trend: 'stable',
      severity: this.getSeverity(paymentScore),
      dataPoints: {
        current: features.paymentFailuresLast90Days,
        previous: 0,
        average: 0.1,
        percentile: 0,
      },
      lastUpdated: now,
    });

    // 4. Message Response Rate
    const responseScore = this.calculateResponseScore(features);
    indicators.push({
      type: ChurnIndicatorType.MESSAGE_RESPONSE_RATE,
      name: 'Message Response Rate',
      description: 'Rate of responding to received messages',
      score: responseScore,
      weight: this.modelWeights[ChurnIndicatorType.MESSAGE_RESPONSE_RATE],
      weightedScore: responseScore * this.modelWeights[ChurnIndicatorType.MESSAGE_RESPONSE_RATE],
      trend:
        features.responseRateTrend > 0
          ? 'improving'
          : features.responseRateTrend < 0
            ? 'declining'
            : 'stable',
      severity: this.getSeverity(responseScore),
      dataPoints: {
        current: features.responseRate * 100,
        previous: 0,
        average: 40,
        percentile: await this.getPercentile(userId, 'response_rate', features.responseRate * 100),
      },
      lastUpdated: now,
    });

    // 5. Swipe Activity
    const swipeScore = this.calculateSwipeScore(features);
    indicators.push({
      type: ChurnIndicatorType.SWIPE_ACTIVITY,
      name: 'Swipe Activity',
      description: 'Daily swiping activity level',
      score: swipeScore,
      weight: this.modelWeights[ChurnIndicatorType.SWIPE_ACTIVITY],
      weightedScore: swipeScore * this.modelWeights[ChurnIndicatorType.SWIPE_ACTIVITY],
      trend:
        features.swipeActivityTrend > 0.1
          ? 'improving'
          : features.swipeActivityTrend < -0.1
            ? 'declining'
            : 'stable',
      severity: this.getSeverity(swipeScore),
      dataPoints: {
        current: features.swipesLast7Days,
        previous: features.swipesLast30Days / 4,
        average: 50,
        percentile: await this.getPercentile(userId, 'swipes_7d', features.swipesLast7Days),
      },
      lastUpdated: now,
    });

    // 6. Profile Completion
    const profileScore = this.calculateProfileScore(features);
    indicators.push({
      type: ChurnIndicatorType.PROFILE_COMPLETION,
      name: 'Profile Completion',
      description: 'Profile completeness and quality',
      score: profileScore,
      weight: this.modelWeights[ChurnIndicatorType.PROFILE_COMPLETION],
      weightedScore: profileScore * this.modelWeights[ChurnIndicatorType.PROFILE_COMPLETION],
      trend: 'stable',
      severity: this.getSeverity(profileScore),
      dataPoints: {
        current: features.profileCompletionPercent,
        previous: features.profileCompletionPercent,
        average: 70,
        percentile: await this.getPercentile(
          userId,
          'profile_completion',
          features.profileCompletionPercent
        ),
      },
      lastUpdated: now,
    });

    // 7. Subscription Renewal
    const subscriptionScore = this.calculateSubscriptionScore(features);
    indicators.push({
      type: ChurnIndicatorType.SUBSCRIPTION_RENEWAL,
      name: 'Subscription Status',
      description: 'Subscription renewal likelihood',
      score: subscriptionScore,
      weight: this.modelWeights[ChurnIndicatorType.SUBSCRIPTION_RENEWAL],
      weightedScore: subscriptionScore * this.modelWeights[ChurnIndicatorType.SUBSCRIPTION_RENEWAL],
      trend: 'stable',
      severity: this.getSeverity(subscriptionScore),
      dataPoints: {
        current: features.daysUntilRenewal,
        previous: 0,
        average: 15,
        percentile: 0,
      },
      lastUpdated: now,
    });

    // 8. Session Duration
    const sessionScore = this.calculateSessionScore(features);
    indicators.push({
      type: ChurnIndicatorType.SESSION_DURATION,
      name: 'Session Duration',
      description: 'Average time spent in app',
      score: sessionScore,
      weight: this.modelWeights[ChurnIndicatorType.SESSION_DURATION],
      weightedScore: sessionScore * this.modelWeights[ChurnIndicatorType.SESSION_DURATION],
      trend:
        features.sessionDurationTrend > 0
          ? 'improving'
          : features.sessionDurationTrend < 0
            ? 'declining'
            : 'stable',
      severity: this.getSeverity(sessionScore),
      dataPoints: {
        current: features.avgSessionDurationMinutes,
        previous: 0,
        average: 8,
        percentile: await this.getPercentile(
          userId,
          'session_duration',
          features.avgSessionDurationMinutes
        ),
      },
      lastUpdated: now,
    });

    // 9. Match Success Rate
    const matchScore = this.calculateMatchScore(features);
    indicators.push({
      type: ChurnIndicatorType.MATCH_SUCCESS_RATE,
      name: 'Match Success',
      description: 'Rate of successful matches',
      score: matchScore,
      weight: this.modelWeights[ChurnIndicatorType.MATCH_SUCCESS_RATE],
      weightedScore: matchScore * this.modelWeights[ChurnIndicatorType.MATCH_SUCCESS_RATE],
      trend:
        features.matchRateTrend > 0
          ? 'improving'
          : features.matchRateTrend < 0
            ? 'declining'
            : 'stable',
      severity: this.getSeverity(matchScore),
      dataPoints: {
        current: features.matchRate * 100,
        previous: 0,
        average: 5,
        percentile: await this.getPercentile(userId, 'match_rate', features.matchRate * 100),
      },
      lastUpdated: now,
    });

    // 10. App Open Frequency
    const appOpenScore = this.calculateAppOpenScore(features);
    indicators.push({
      type: ChurnIndicatorType.APP_OPEN_FREQUENCY,
      name: 'App Opens',
      description: 'How often the app is opened',
      score: appOpenScore,
      weight: this.modelWeights[ChurnIndicatorType.APP_OPEN_FREQUENCY],
      weightedScore: appOpenScore * this.modelWeights[ChurnIndicatorType.APP_OPEN_FREQUENCY],
      trend: 'stable',
      severity: this.getSeverity(appOpenScore),
      dataPoints: {
        current: features.totalSessionsLast30Days,
        previous: 0,
        average: 20,
        percentile: await this.getPercentile(userId, 'app_opens', features.totalSessionsLast30Days),
      },
      lastUpdated: now,
    });

    // 11. Feature Usage
    const featureScore = this.calculateFeatureUsageScore(features);
    indicators.push({
      type: ChurnIndicatorType.FEATURE_USAGE,
      name: 'Feature Usage',
      description: 'Usage of premium features',
      score: featureScore,
      weight: this.modelWeights[ChurnIndicatorType.FEATURE_USAGE],
      weightedScore: featureScore * this.modelWeights[ChurnIndicatorType.FEATURE_USAGE],
      trend: 'stable',
      severity: this.getSeverity(featureScore),
      dataPoints: {
        current: features.premiumFeaturesUsed,
        previous: 0,
        average: 2,
        percentile: 0,
      },
      lastUpdated: now,
    });

    // 12. Support Tickets
    const supportScore = this.calculateSupportScore(features);
    indicators.push({
      type: ChurnIndicatorType.SUPPORT_TICKETS,
      name: 'Support Requests',
      description: 'Number of support tickets submitted',
      score: supportScore,
      weight: this.modelWeights[ChurnIndicatorType.SUPPORT_TICKETS],
      weightedScore: supportScore * this.modelWeights[ChurnIndicatorType.SUPPORT_TICKETS],
      trend: 'stable',
      severity: this.getSeverity(supportScore),
      dataPoints: {
        current: features.supportTicketsLast90Days,
        previous: 0,
        average: 0.5,
        percentile: 0,
      },
      lastUpdated: now,
    });

    // 13. Negative Feedback
    const feedbackScore = this.calculateFeedbackScore(features);
    indicators.push({
      type: ChurnIndicatorType.NEGATIVE_FEEDBACK,
      name: 'User Feedback',
      description: 'App ratings and feedback sentiment',
      score: feedbackScore,
      weight: this.modelWeights[ChurnIndicatorType.NEGATIVE_FEEDBACK],
      weightedScore: feedbackScore * this.modelWeights[ChurnIndicatorType.NEGATIVE_FEEDBACK],
      trend: 'stable',
      severity: this.getSeverity(feedbackScore),
      dataPoints: {
        current: features.appRating || 0,
        previous: 0,
        average: 4,
        percentile: 0,
      },
      lastUpdated: now,
    });

    // Store indicator scores for analytics
    await this.storeIndicatorScores(userId, indicators);

    return indicators;
  }

  // Individual score calculation methods
  private calculateLoginScore(features: UserBehaviorFeatures): number {
    // Higher score = higher churn risk
    if (features.daysSinceLastLogin > 30) return 0.95;
    if (features.daysSinceLastLogin > 14) return 0.8;
    if (features.daysSinceLastLogin > 7) return 0.6;
    if (features.daysSinceLastLogin > 3) return 0.3;
    if (features.loginsLast7Days < 2) return 0.4;
    if (features.loginsLast7Days < 4) return 0.2;
    return 0.1;
  }

  private calculateEngagementDeclineScore(features: UserBehaviorFeatures): number {
    // Based on engagement trend and current engagement
    const trendScore = Math.max(0, -features.loginFrequencyTrend) * 0.5;
    const engagementScore = Math.max(0, (50 - features.engagementScore) / 50) * 0.5;
    return Math.min(1, trendScore + engagementScore);
  }

  private calculatePaymentScore(features: UserBehaviorFeatures): number {
    if (features.paymentFailuresLast90Days > 2) return 0.9;
    if (features.paymentFailuresLast90Days > 0) return 0.6;
    if (features.previouslyPaidUser && !features.hasActiveSubscription) return 0.7;
    return 0.1;
  }

  private calculateResponseScore(features: UserBehaviorFeatures): number {
    // Low response rate = high churn risk
    if (features.messagesReceivedLast30Days === 0) return 0.3;
    if (features.responseRate < 0.1) return 0.8;
    if (features.responseRate < 0.3) return 0.5;
    if (features.responseRate < 0.5) return 0.3;
    return 0.1;
  }

  private calculateSwipeScore(features: UserBehaviorFeatures): number {
    if (features.swipesLast7Days === 0) return 0.8;
    if (features.swipesLast7Days < 10) return 0.5;
    if (features.swipesLast7Days < 30) return 0.3;
    if (features.swipeActivityTrend < -0.3) return 0.4;
    return 0.1;
  }

  private calculateProfileScore(features: UserBehaviorFeatures): number {
    if (features.profileCompletionPercent < 30) return 0.7;
    if (features.profileCompletionPercent < 50) return 0.5;
    if (features.profileCompletionPercent < 70) return 0.3;
    if (features.photoCount < 2) return 0.4;
    return 0.1;
  }

  private calculateSubscriptionScore(features: UserBehaviorFeatures): number {
    if (!features.hasActiveSubscription) {
      return features.previouslyPaidUser ? 0.6 : 0.3;
    }
    if (features.daysUntilRenewal < 3) return 0.5;
    if (features.daysUntilRenewal < 7) return 0.3;
    return 0.1;
  }

  private calculateSessionScore(features: UserBehaviorFeatures): number {
    if (features.avgSessionDurationMinutes < 1) return 0.7;
    if (features.avgSessionDurationMinutes < 3) return 0.5;
    if (features.avgSessionDurationMinutes < 5) return 0.3;
    return 0.1;
  }

  private calculateMatchScore(features: UserBehaviorFeatures): number {
    if (features.matchesLast30Days === 0) return 0.6;
    if (features.matchRate < 0.01) return 0.5;
    if (features.matchRate < 0.03) return 0.3;
    return 0.1;
  }

  private calculateAppOpenScore(features: UserBehaviorFeatures): number {
    if (features.totalSessionsLast30Days < 5) return 0.7;
    if (features.totalSessionsLast30Days < 15) return 0.4;
    if (features.totalSessionsLast30Days < 30) return 0.2;
    return 0.1;
  }

  private calculateFeatureUsageScore(features: UserBehaviorFeatures): number {
    // Not using premium features when paying = risk
    if (features.hasActiveSubscription && features.premiumFeaturesUsed === 0) return 0.6;
    if (features.premiumFeaturesUsed < 2) return 0.3;
    return 0.1;
  }

  private calculateSupportScore(features: UserBehaviorFeatures): number {
    if (features.supportTicketsLast90Days > 3) return 0.6;
    if (features.supportTicketsLast90Days > 1) return 0.4;
    if (features.hasReportedIssue) return 0.5;
    return 0.1;
  }

  private calculateFeedbackScore(features: UserBehaviorFeatures): number {
    if (!features.appRating) return 0.3;
    if (features.appRating < 2) return 0.8;
    if (features.appRating < 3) return 0.5;
    if (features.appRating < 4) return 0.2;
    return 0.1;
  }

  /**
   * Calculate weighted risk score from indicators
   */
  private calculateWeightedRiskScore(indicators: ChurnIndicator[]): number {
    const totalWeightedScore = indicators.reduce((sum, i) => sum + i.weightedScore, 0);
    return Math.min(1, Math.max(0, totalWeightedScore));
  }

  /**
   * Determine risk tier from score
   */
  private determineRiskTier(riskScore: number): ChurnRiskTier {
    if (riskScore >= RISK_TIER_THRESHOLDS.HIGH) return ChurnRiskTier.CRITICAL;
    if (riskScore >= RISK_TIER_THRESHOLDS.MEDIUM) return ChurnRiskTier.HIGH;
    if (riskScore >= RISK_TIER_THRESHOLDS.LOW) return ChurnRiskTier.MEDIUM;
    return ChurnRiskTier.LOW;
  }

  /**
   * Calculate risk trend
   */
  private calculateRiskTrend(
    currentScore: number,
    previousScore?: number
  ): 'increasing' | 'stable' | 'decreasing' {
    if (!previousScore) return 'stable';
    const diff = currentScore - previousScore;
    if (diff > 0.05) return 'increasing';
    if (diff < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Determine recommended campaigns based on risk factors
   */
  private determineRecommendedCampaigns(
    topRiskFactors: ChurnIndicator[],
    riskTier: ChurnRiskTier,
    features: UserBehaviorFeatures
  ): RetentionCampaignType[] {
    const campaigns: RetentionCampaignType[] = [];

    // Based on risk tier
    if (riskTier === ChurnRiskTier.CRITICAL) {
      campaigns.push(RetentionCampaignType.WIN_BACK_CAMPAIGN);
      campaigns.push(RetentionCampaignType.DISCOUNT_OFFER);
    }

    // Based on specific risk factors
    topRiskFactors.forEach((factor) => {
      switch (factor.type) {
        case ChurnIndicatorType.LOGIN_FREQUENCY:
          if (!campaigns.includes(RetentionCampaignType.PUSH_NOTIFICATION)) {
            campaigns.push(RetentionCampaignType.PUSH_NOTIFICATION);
          }
          break;
        case ChurnIndicatorType.DECLINING_ENGAGEMENT:
          if (!campaigns.includes(RetentionCampaignType.PERSONALIZED_MATCHES)) {
            campaigns.push(RetentionCampaignType.PERSONALIZED_MATCHES);
          }
          break;
        case ChurnIndicatorType.MATCH_SUCCESS_RATE:
          if (!campaigns.includes(RetentionCampaignType.PROFILE_BOOST)) {
            campaigns.push(RetentionCampaignType.PROFILE_BOOST);
          }
          break;
        case ChurnIndicatorType.SWIPE_ACTIVITY:
          if (!campaigns.includes(RetentionCampaignType.FREE_SUPER_LIKES)) {
            campaigns.push(RetentionCampaignType.FREE_SUPER_LIKES);
          }
          break;
        case ChurnIndicatorType.PROFILE_COMPLETION:
          if (!campaigns.includes(RetentionCampaignType.FEATURE_EDUCATION)) {
            campaigns.push(RetentionCampaignType.FEATURE_EDUCATION);
          }
          break;
        case ChurnIndicatorType.SUPPORT_TICKETS:
        case ChurnIndicatorType.NEGATIVE_FEEDBACK:
          if (!campaigns.includes(RetentionCampaignType.VIP_SUPPORT)) {
            campaigns.push(RetentionCampaignType.VIP_SUPPORT);
          }
          break;
        case ChurnIndicatorType.PAYMENT_FAILURE:
        case ChurnIndicatorType.SUBSCRIPTION_RENEWAL:
          if (!campaigns.includes(RetentionCampaignType.SUBSCRIPTION_PAUSE)) {
            campaigns.push(RetentionCampaignType.SUBSCRIPTION_PAUSE);
          }
          break;
      }
    });

    // Default re-engagement
    if (campaigns.length === 0) {
      campaigns.push(RetentionCampaignType.REENGAGEMENT_EMAIL);
    }

    return campaigns.slice(0, 3);
  }

  /**
   * Determine intervention urgency
   */
  private determineInterventionUrgency(
    riskScore: number
  ): 'immediate' | 'this_week' | 'this_month' | 'monitoring' {
    if (riskScore >= INTERVENTION_THRESHOLDS.immediate) return 'immediate';
    if (riskScore >= INTERVENTION_THRESHOLDS.this_week) return 'this_week';
    if (riskScore >= INTERVENTION_THRESHOLDS.this_month) return 'this_month';
    return 'monitoring';
  }

  /**
   * Calculate confidence in prediction
   */
  private calculateConfidence(features: UserBehaviorFeatures): number {
    let confidence = 0.5; // Base confidence

    // More data = higher confidence
    if (features.totalSessionsLast30Days > 10) confidence += 0.1;
    if (features.swipesLast30Days > 50) confidence += 0.1;
    if (features.messagesSentLast30Days > 10) confidence += 0.1;

    // Longer user history = higher confidence
    const daysActive = 30 - features.daysSinceLastLogin;
    if (daysActive > 14) confidence += 0.1;

    // Profile completeness = more reliable data
    if (features.profileCompletionPercent > 70) confidence += 0.1;

    return Math.min(0.95, confidence);
  }

  // Helper methods
  private getSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.75) return 'critical';
    if (score >= 0.5) return 'high';
    if (score >= 0.25) return 'medium';
    return 'low';
  }

  private calculateTrend(recent: number, total: number): number {
    if (total === 0) return 0;
    return (recent - total) / total;
  }

  private calculateEngagementScore(
    logins: number,
    swipes: number,
    messages: number,
    matches: number
  ): number {
    // Weighted engagement score 0-100
    const loginScore = Math.min(logins / 20, 1) * 30;
    const swipeScore = Math.min(swipes / 100, 1) * 30;
    const messageScore = Math.min(messages / 30, 1) * 25;
    const matchScore = Math.min(matches / 5, 1) * 15;
    return loginScore + swipeScore + messageScore + matchScore;
  }

  private calculateValueScore(subscriptionTier: string): number {
    const tiers: Record<string, number> = {
      FREE: 10,
      BASIC: 30,
      PLUS: 50,
      GOLD: 70,
      PLATINUM: 85,
      DIAMOND: 95,
      ELITE: 100,
    };
    return tiers[subscriptionTier?.toUpperCase()] || 10;
  }

  private calculateSatisfactionIndicator(
    matchRate: number,
    responseRate: number,
    logins: number
  ): number {
    const matchSatisfaction = Math.min(matchRate * 1000, 40);
    const responseSatisfaction = responseRate * 30;
    const activitySatisfaction = Math.min(logins / 30, 1) * 30;
    return matchSatisfaction + responseSatisfaction + activitySatisfaction;
  }

  private calculateEngagementScoreFromIndicators(indicators: ChurnIndicator[]): number {
    if (!indicators || indicators.length === 0) return 50;
    const avgScore = indicators.reduce((sum, i) => sum + (1 - i.score), 0) / indicators.length;
    return Math.round(avgScore * 100);
  }

  private mapCampaignStatus(status: string): 'pending' | 'engaged' | 'no_response' | undefined {
    if (!status) return undefined;
    if (status === 'engaged') return 'engaged';
    if (['pending', 'sent', 'delivered'].includes(status)) return 'pending';
    return 'no_response';
  }

  private getRiskTierCondition(riskLevel: ChurnRiskTier): string {
    switch (riskLevel) {
      case ChurnRiskTier.CRITICAL:
        return "cp.risk_tier = 'CRITICAL'";
      case ChurnRiskTier.HIGH:
        return "cp.risk_tier IN ('HIGH', 'CRITICAL')";
      case ChurnRiskTier.MEDIUM:
        return "cp.risk_tier IN ('MEDIUM', 'HIGH', 'CRITICAL')";
      default:
        return '1=1';
    }
  }

  private getDefaultFeatures(userId: string): UserBehaviorFeatures {
    return {
      userId,
      extractedAt: new Date(),
      daysSinceLastLogin: 999,
      loginsLast7Days: 0,
      loginsLast30Days: 0,
      loginFrequencyTrend: 0,
      avgDaysBetweenLogins: 30,
      avgSessionDurationMinutes: 0,
      totalSessionsLast30Days: 0,
      sessionDurationTrend: 0,
      avgScreensPerSession: 0,
      swipesLast7Days: 0,
      swipesLast30Days: 0,
      swipeActivityTrend: 0,
      rightSwipeRatio: 0.5,
      matchesLast30Days: 0,
      matchRate: 0,
      matchRateTrend: 0,
      avgTimeToFirstMessage: 0,
      messagesSentLast30Days: 0,
      messagesReceivedLast30Days: 0,
      responseRate: 0,
      responseRateTrend: 0,
      avgResponseTimeHours: 0,
      conversationsInitiated: 0,
      profileCompletionPercent: 0,
      photoCount: 0,
      lastProfileUpdateDays: 999,
      hasVerification: false,
      bioLength: 0,
      subscriptionTier: 'FREE',
      subscriptionAge: 0,
      daysUntilRenewal: 0,
      paymentFailuresLast90Days: 0,
      hasActiveSubscription: false,
      previouslyPaidUser: false,
      usedBoostLast30Days: false,
      usedSuperLikeLast30Days: false,
      usedRewindLast30Days: false,
      premiumFeaturesUsed: 0,
      supportTicketsLast90Days: 0,
      hasReportedIssue: false,
      engagementScore: 0,
      valueScore: 10,
      satisfactionIndicator: 0,
    };
  }

  private async getPercentile(userId: string, metric: string, value: number): Promise<number> {
    // Simplified percentile calculation
    // In production, would query against all users
    return Math.min(100, Math.max(0, value));
  }

  private async getPreviousPrediction(userId: string): Promise<ChurnPredictionHistory | null> {
    try {
      const query = `
        SELECT * FROM churn_predictions
        WHERE user_id = $1
        ORDER BY predicted_at DESC
        LIMIT 1
      `;
      const result = await dbClient.query(query, [userId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        riskScore: parseFloat(row.risk_score),
        riskTier: row.risk_tier as ChurnRiskTier,
        indicators:
          typeof row.indicators === 'string' ? JSON.parse(row.indicators) : row.indicators,
        modelVersion: row.model_version,
        predictedAt: new Date(row.predicted_at),
        actualOutcome: row.actual_outcome,
        outcomeDate: row.outcome_date ? new Date(row.outcome_date) : undefined,
      };
    } catch (error) {
      return null;
    }
  }

  private async storePrediction(result: ChurnRiskResult): Promise<void> {
    const query = `
      INSERT INTO churn_predictions (
        id, user_id, risk_score, risk_tier, confidence, indicators,
        top_risk_factors, recommended_campaigns, intervention_urgency,
        model_version, predicted_at, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
      )
    `;

    try {
      await dbClient.query(query, [
        `pred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        result.userId,
        result.riskScore,
        result.riskTier,
        result.confidence,
        JSON.stringify(result.indicators),
        JSON.stringify(result.topRiskFactors.map((i) => i.type)),
        JSON.stringify(result.recommendedCampaigns),
        result.interventionUrgency,
        result.modelVersion,
        result.predictedAt,
      ]);
    } catch (error) {
      logger.error('Failed to store prediction:', error);
    }
  }

  private async storeIndicatorScores(userId: string, indicators: ChurnIndicator[]): Promise<void> {
    const query = `
      INSERT INTO churn_indicator_scores (
        user_id, indicator_type, score, weight, weighted_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    try {
      for (const indicator of indicators) {
        await dbClient.query(query, [
          userId,
          indicator.type,
          indicator.score,
          indicator.weight,
          indicator.weightedScore,
        ]);
      }
    } catch (error) {
      logger.warn('Failed to store indicator scores:', error);
    }
  }

  private async emitCampaignEvent(campaign: RetentionCampaignRecord): Promise<void> {
    // Would emit to notification service via message queue
    logger.info(`Campaign event emitted: ${campaign.campaignType} for user ${campaign.userId}`);
  }

  private async getTrainingData(): Promise<any[]> {
    const query = `
      SELECT
        cp.user_id,
        cp.indicators,
        CASE
          WHEN u.last_active_at < NOW() - INTERVAL '90 days' THEN 1
          ELSE 0
        END as churned
      FROM churn_predictions cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.predicted_at < NOW() - INTERVAL '90 days'
      LIMIT 10000
    `;

    try {
      const result = await dbClient.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get training data:', error);
      return [];
    }
  }

  private async calculateOptimalWeights(
    trainingData: any[]
  ): Promise<Record<ChurnIndicatorType, number>> {
    // Simplified weight optimization using correlation with churn outcome
    const indicatorCorrelations: Record<ChurnIndicatorType, { sum: number; count: number }> =
      Object.values(ChurnIndicatorType).reduce(
        (acc, type) => {
          acc[type] = { sum: 0, count: 0 };
          return acc;
        },
        {} as Record<ChurnIndicatorType, { sum: number; count: number }>
      );

    trainingData.forEach((data) => {
      const indicators =
        typeof data.indicators === 'string' ? JSON.parse(data.indicators) : data.indicators;
      const churned = data.churned === 1;

      indicators?.forEach((indicator: ChurnIndicator) => {
        if (indicatorCorrelations[indicator.type]) {
          // Higher score for indicators that correlate with churn
          indicatorCorrelations[indicator.type].sum += churned
            ? indicator.score
            : 1 - indicator.score;
          indicatorCorrelations[indicator.type].count++;
        }
      });
    });

    // Normalize weights
    const weights: Record<ChurnIndicatorType, number> = {} as Record<ChurnIndicatorType, number>;
    let totalWeight = 0;

    Object.entries(indicatorCorrelations).forEach(([type, { sum, count }]) => {
      const avgCorrelation = count > 0 ? sum / count : 0.5;
      weights[type as ChurnIndicatorType] = avgCorrelation;
      totalWeight += avgCorrelation;
    });

    // Normalize to sum to 1
    Object.keys(weights).forEach((type) => {
      weights[type as ChurnIndicatorType] =
        totalWeight > 0
          ? weights[type as ChurnIndicatorType] / totalWeight
          : 1 / Object.keys(weights).length;
    });

    return weights;
  }

  private async evaluateModel(
    trainingData: any[],
    weights: Record<ChurnIndicatorType, number>
  ): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  }> {
    let tp = 0,
      fp = 0,
      tn = 0,
      fn = 0;

    trainingData.forEach((data) => {
      const indicators =
        typeof data.indicators === 'string' ? JSON.parse(data.indicators) : data.indicators;
      const actualChurned = data.churned === 1;

      // Calculate predicted score with new weights
      let predictedScore = 0;
      indicators?.forEach((indicator: ChurnIndicator) => {
        const weight = weights[indicator.type] || 0;
        predictedScore += indicator.score * weight;
      });

      const predictedChurn = predictedScore > 0.5;

      if (actualChurned && predictedChurn) tp++;
      else if (!actualChurned && predictedChurn) fp++;
      else if (!actualChurned && !predictedChurn) tn++;
      else fn++;
    });

    const accuracy = (tp + tn) / (tp + tn + fp + fn) || 0;
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = (2 * (precision * recall)) / (precision + recall) || 0;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      auc: (accuracy + recall) / 2, // Simplified AUC
    };
  }

  private async getCurrentModelPerformance(): Promise<{ accuracy: number }> {
    try {
      const query = `
        SELECT accuracy FROM churn_model_weights
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const result = await dbClient.query(query);
      return { accuracy: result.rows[0]?.accuracy || 0 };
    } catch {
      return { accuracy: 0 };
    }
  }

  private async getCurrentModelWeights(): Promise<ChurnModelWeights> {
    const query = `
      SELECT * FROM churn_model_weights
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await dbClient.query(query);

    if (result.rows.length === 0) {
      throw new Error('No active model found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      version: row.version,
      createdAt: new Date(row.created_at),
      validFrom: new Date(row.valid_from),
      validUntil: row.valid_until ? new Date(row.valid_until) : undefined,
      isActive: row.is_active,
      weights: typeof row.weights === 'string' ? JSON.parse(row.weights) : row.weights,
      accuracy: parseFloat(row.accuracy),
      precision: parseFloat(row.precision_score),
      recall: parseFloat(row.recall_score),
      f1Score: parseFloat(row.f1_score),
      auc: parseFloat(row.auc),
      trainingDataSize: parseInt(row.training_data_size),
      trainingPeriodStart: new Date(row.training_period_start),
      trainingPeriodEnd: new Date(row.training_period_end),
      modelType: row.model_type,
    };
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    parts[2] = String(parseInt(parts[2]) + 1);
    return parts.join('.');
  }

  private async saveNewModel(model: ChurnModelWeights): Promise<void> {
    // Deactivate old models
    await dbClient.query(`
      UPDATE churn_model_weights
      SET is_active = false, valid_until = NOW()
      WHERE is_active = true
    `);

    // Insert new model
    const query = `
      INSERT INTO churn_model_weights (
        id, version, created_at, valid_from, is_active, weights,
        accuracy, precision_score, recall_score, f1_score, auc,
        training_data_size, training_period_start, training_period_end, model_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;

    await dbClient.query(query, [
      model.id,
      model.version,
      model.createdAt,
      model.validFrom,
      model.isActive,
      JSON.stringify(model.weights),
      model.accuracy,
      model.precision,
      model.recall,
      model.f1Score,
      model.auc,
      model.trainingDataSize,
      model.trainingPeriodStart,
      model.trainingPeriodEnd,
      model.modelType,
    ]);
  }

  private async storeJob(job: ChurnPredictionJob): Promise<void> {
    const query = `
      INSERT INTO churn_prediction_jobs (
        id, status, started_at, users_processed, users_total,
        model_version, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await dbClient.query(query, [
      job.id,
      job.status,
      job.startedAt,
      job.usersProcessed,
      job.usersTotal,
      job.modelVersion,
      job.createdAt,
    ]);
  }

  private async updateJob(job: ChurnPredictionJob): Promise<void> {
    const query = `
      UPDATE churn_prediction_jobs
      SET status = $1, completed_at = $2, users_processed = $3,
          users_total = $4, error_message = $5
      WHERE id = $6
    `;

    await dbClient.query(query, [
      job.status,
      job.completedAt,
      job.usersProcessed,
      job.usersTotal,
      job.errorMessage,
      job.id,
    ]);
  }

  private async triggerAutomaticInterventions(): Promise<void> {
    // Get users who need immediate intervention
    const atRiskUsers = await this.getAtRiskUsers(ChurnRiskTier.CRITICAL, 100);

    for (const user of atRiskUsers) {
      // Check if they haven't received a campaign recently
      if (
        !user.lastCampaignDate ||
        Date.now() - user.lastCampaignDate.getTime() > 7 * 24 * 60 * 60 * 1000
      ) {
        try {
          // Determine best campaign based on top risk factor
          const campaignType = this.getCampaignForRiskFactor(user.topRiskFactor);
          await this.triggerRetentionCampaign(user.userId, campaignType);
        } catch (error) {
          logger.error(`Failed to trigger intervention for user ${user.userId}:`, error);
        }
      }
    }
  }

  private getCampaignForRiskFactor(riskFactor: ChurnIndicatorType): RetentionCampaignType {
    const mapping: Partial<Record<ChurnIndicatorType, RetentionCampaignType>> = {
      [ChurnIndicatorType.LOGIN_FREQUENCY]: RetentionCampaignType.PUSH_NOTIFICATION,
      [ChurnIndicatorType.DECLINING_ENGAGEMENT]: RetentionCampaignType.PERSONALIZED_MATCHES,
      [ChurnIndicatorType.PAYMENT_FAILURE]: RetentionCampaignType.SUBSCRIPTION_PAUSE,
      [ChurnIndicatorType.MATCH_SUCCESS_RATE]: RetentionCampaignType.PROFILE_BOOST,
      [ChurnIndicatorType.SWIPE_ACTIVITY]: RetentionCampaignType.FREE_SUPER_LIKES,
    };

    return mapping[riskFactor] || RetentionCampaignType.REENGAGEMENT_EMAIL;
  }
}

// Export singleton instance
export const churnPredictionService = new ChurnPredictionService();
export default churnPredictionService;
