/**
 * Churn Prediction API Routes
 *
 * Provides endpoints for:
 * - Individual user churn risk calculation
 * - At-risk user lists for admin dashboard
 * - Churn analytics and insights
 * - Retention campaign management
 * - Model management and job control
 */

import { Router, Request, Response } from 'express';
import { churnPredictionService } from '../../services/churn-prediction.service';
import { churnPredictionJobRunner } from '../../jobs/churn-prediction.job';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import {
  ChurnRiskTier,
  RetentionCampaignType,
} from '../../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// =============================================
// USER CHURN RISK ENDPOINTS
// =============================================

/**
 * GET /api/v1/churn/user/:userId/risk
 * Calculate and return churn risk for a specific user
 */
router.get('/user/:userId/risk', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const riskResult = await churnPredictionService.calculateChurnRisk(userId);

    res.json({
      success: true,
      data: riskResult,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/churn/user/:userId/indicators
 * Get detailed churn indicators for a user
 */
router.get('/user/:userId/indicators', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const indicators = await churnPredictionService.getChurnIndicators(userId);

    res.json({
      success: true,
      data: {
        userId,
        indicators,
        indicatorCount: indicators.length,
        lastUpdated: new Date(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =============================================
// AT-RISK USERS ENDPOINTS (Admin)
// =============================================

/**
 * GET /api/v1/churn/at-risk
 * Get list of at-risk users with optional filtering
 */
router.get('/at-risk', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const riskLevel = (req.query.riskLevel as ChurnRiskTier) || ChurnRiskTier.HIGH;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate risk level
    if (!Object.values(ChurnRiskTier).includes(riskLevel)) {
      return res.status(400).json({
        success: false,
        error: `Invalid risk level. Valid levels: ${Object.values(ChurnRiskTier).join(', ')}`,
      });
    }

    const atRiskUsers = await churnPredictionService.getAtRiskUsers(
      riskLevel,
      limit,
      offset
    );

    res.json({
      success: true,
      data: {
        users: atRiskUsers,
        count: atRiskUsers.length,
        riskLevel,
        pagination: {
          limit,
          offset,
          hasMore: atRiskUsers.length === limit,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/churn/at-risk/summary
 * Get summary of at-risk users by tier
 */
router.get('/at-risk/summary', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const summaries = await Promise.all(
      Object.values(ChurnRiskTier).map(async (tier) => {
        const users = await churnPredictionService.getAtRiskUsers(tier, 1);
        return {
          tier,
          // This is a simplified count - in production, would use a count query
          estimatedCount: users.length > 0 ? 'has users' : 'no users',
        };
      })
    );

    res.json({
      success: true,
      data: {
        tierSummaries: summaries,
        lastUpdated: new Date(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =============================================
// ANALYTICS ENDPOINTS (Admin)
// =============================================

/**
 * GET /api/v1/churn/analytics
 * Get comprehensive churn analytics
 */
router.get('/analytics', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const analytics = await churnPredictionService.getChurnAnalytics(startDate, endDate);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/churn/analytics/trends
 * Get churn risk trends over time
 */
router.get('/analytics/trends', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const analytics = await churnPredictionService.getChurnAnalytics(startDate, endDate);

    res.json({
      success: true,
      data: {
        period: { startDate, endDate, days },
        trends: analytics.riskTrends,
        topIndicators: analytics.topRiskIndicators,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/churn/analytics/campaigns
 * Get retention campaign effectiveness metrics
 */
router.get('/analytics/campaigns', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const analytics = await churnPredictionService.getChurnAnalytics(startDate, endDate);

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        campaigns: analytics.campaignMetrics,
        availableCampaignTypes: Object.values(RetentionCampaignType),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =============================================
// RETENTION CAMPAIGN ENDPOINTS (Admin)
// =============================================

/**
 * POST /api/v1/churn/campaign/trigger
 * Manually trigger a retention campaign for a user
 */
router.post('/campaign/trigger', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, campaignType } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    if (!campaignType || !Object.values(RetentionCampaignType).includes(campaignType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid campaignType. Valid types: ${Object.values(RetentionCampaignType).join(', ')}`,
      });
    }

    await churnPredictionService.triggerRetentionCampaign(userId, campaignType);

    res.json({
      success: true,
      data: {
        userId,
        campaignType,
        triggeredAt: new Date(),
        message: 'Retention campaign triggered successfully',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/churn/campaign/trigger-batch
 * Trigger retention campaigns for multiple users
 */
router.post('/campaign/trigger-batch', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userIds, campaignType } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userIds array is required',
      });
    }

    if (userIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 users per batch',
      });
    }

    if (!campaignType || !Object.values(RetentionCampaignType).includes(campaignType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid campaignType. Valid types: ${Object.values(RetentionCampaignType).join(', ')}`,
      });
    }

    const results = await Promise.allSettled(
      userIds.map((userId: string) =>
        churnPredictionService.triggerRetentionCampaign(userId, campaignType)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      data: {
        campaignType,
        total: userIds.length,
        successful,
        failed,
        triggeredAt: new Date(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/churn/campaign/types
 * Get available campaign types with descriptions
 */
router.get('/campaign/types', async (req: Request, res: Response) => {
  const campaignTypes = [
    {
      type: RetentionCampaignType.REENGAGEMENT_EMAIL,
      name: 'Re-engagement Email',
      description: 'Send personalized email to bring user back',
      channel: 'email',
    },
    {
      type: RetentionCampaignType.PUSH_NOTIFICATION,
      name: 'Push Notification',
      description: 'Send push notification with compelling content',
      channel: 'push',
    },
    {
      type: RetentionCampaignType.IN_APP_MESSAGE,
      name: 'In-App Message',
      description: 'Display message when user opens app',
      channel: 'in_app',
    },
    {
      type: RetentionCampaignType.DISCOUNT_OFFER,
      name: 'Discount Offer',
      description: 'Offer subscription discount to retain user',
      channel: 'multi',
    },
    {
      type: RetentionCampaignType.PROFILE_BOOST,
      name: 'Free Profile Boost',
      description: 'Give user free boost to increase visibility',
      channel: 'in_app',
    },
    {
      type: RetentionCampaignType.FREE_SUPER_LIKES,
      name: 'Free Super Likes',
      description: 'Give user free super likes as incentive',
      channel: 'in_app',
    },
    {
      type: RetentionCampaignType.PERSONALIZED_MATCHES,
      name: 'Personalized Matches',
      description: 'Send curated high-quality matches',
      channel: 'push',
    },
    {
      type: RetentionCampaignType.WIN_BACK_CAMPAIGN,
      name: 'Win-Back Campaign',
      description: 'Comprehensive campaign to win back churned users',
      channel: 'multi',
    },
    {
      type: RetentionCampaignType.FEEDBACK_REQUEST,
      name: 'Feedback Request',
      description: 'Ask for feedback to understand why user is leaving',
      channel: 'email',
    },
    {
      type: RetentionCampaignType.FEATURE_EDUCATION,
      name: 'Feature Education',
      description: 'Educate user about features they may not be using',
      channel: 'in_app',
    },
    {
      type: RetentionCampaignType.VIP_SUPPORT,
      name: 'VIP Support Outreach',
      description: 'Personal outreach from customer success team',
      channel: 'email',
    },
    {
      type: RetentionCampaignType.SUBSCRIPTION_PAUSE,
      name: 'Subscription Pause Offer',
      description: 'Offer to pause subscription instead of canceling',
      channel: 'multi',
    },
  ];

  res.json({
    success: true,
    data: campaignTypes,
  });
});

// =============================================
// MODEL MANAGEMENT ENDPOINTS (Admin)
// =============================================

/**
 * POST /api/v1/churn/model/update
 * Manually trigger model weight update
 */
router.post('/model/update', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const modelWeights = await churnPredictionService.updateChurnModel();

    res.json({
      success: true,
      data: {
        version: modelWeights.version,
        accuracy: modelWeights.accuracy,
        precision: modelWeights.precision,
        recall: modelWeights.recall,
        f1Score: modelWeights.f1Score,
        trainingDataSize: modelWeights.trainingDataSize,
        updatedAt: modelWeights.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/churn/model/info
 * Get current model information
 */
router.get('/model/info', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get job status which includes model version info
    const jobStatus = churnPredictionJobRunner.getStatus();

    res.json({
      success: true,
      data: {
        isRunning: jobStatus.isRunning,
        lastJobResult: jobStatus.lastJobResult,
        scheduledJobs: jobStatus.scheduledJobs,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =============================================
// JOB CONTROL ENDPOINTS (Admin)
// =============================================

/**
 * POST /api/v1/churn/job/run-predictions
 * Manually trigger daily predictions job
 */
router.post('/job/run-predictions', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await churnPredictionJobRunner.runDailyPredictions();

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/churn/job/run-interventions
 * Manually trigger intervention check
 */
router.post('/job/run-interventions', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await churnPredictionJobRunner.runInterventionCheck();

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/churn/job/predict-users
 * Run predictions for specific users
 */
router.post('/job/predict-users', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userIds array is required',
      });
    }

    if (userIds.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 500 users per request',
      });
    }

    const result = await churnPredictionJobRunner.runPredictionForUsers(userIds);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/churn/job/status
 * Get status of scheduled jobs
 */
router.get('/job/status', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const status = churnPredictionJobRunner.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =============================================
// UTILITY ENDPOINTS
// =============================================

/**
 * GET /api/v1/churn/risk-tiers
 * Get risk tier definitions
 */
router.get('/risk-tiers', (req: Request, res: Response) => {
  const riskTiers = [
    {
      tier: ChurnRiskTier.LOW,
      range: '0-25%',
      description: 'User is engaged and unlikely to churn',
      action: 'Monitor and maintain engagement',
    },
    {
      tier: ChurnRiskTier.MEDIUM,
      range: '25-50%',
      description: 'User shows some warning signs',
      action: 'Consider proactive engagement',
    },
    {
      tier: ChurnRiskTier.HIGH,
      range: '50-75%',
      description: 'User is at significant risk of churning',
      action: 'Immediate intervention recommended',
    },
    {
      tier: ChurnRiskTier.CRITICAL,
      range: '75-100%',
      description: 'User is very likely to churn soon',
      action: 'Urgent intervention required',
    },
  ];

  res.json({
    success: true,
    data: riskTiers,
  });
});

/**
 * GET /api/v1/churn/indicators
 * Get list of all churn indicators with descriptions
 */
router.get('/indicators', (req: Request, res: Response) => {
  const indicators = [
    {
      type: 'LOGIN_FREQUENCY',
      name: 'Login Frequency',
      description: 'How often the user logs into the app',
      weight: 0.18,
    },
    {
      type: 'DECLINING_ENGAGEMENT',
      name: 'Engagement Decline',
      description: 'Trend in overall app engagement over time',
      weight: 0.15,
    },
    {
      type: 'PAYMENT_FAILURE',
      name: 'Payment Issues',
      description: 'Payment failures and subscription status changes',
      weight: 0.12,
    },
    {
      type: 'MESSAGE_RESPONSE_RATE',
      name: 'Message Response Rate',
      description: 'Rate of responding to received messages',
      weight: 0.10,
    },
    {
      type: 'SWIPE_ACTIVITY',
      name: 'Swipe Activity',
      description: 'Daily swiping activity level',
      weight: 0.09,
    },
    {
      type: 'PROFILE_COMPLETION',
      name: 'Profile Completion',
      description: 'Profile completeness and quality',
      weight: 0.08,
    },
    {
      type: 'SUBSCRIPTION_RENEWAL',
      name: 'Subscription Status',
      description: 'Subscription renewal likelihood',
      weight: 0.07,
    },
    {
      type: 'SESSION_DURATION',
      name: 'Session Duration',
      description: 'Average time spent in app per session',
      weight: 0.06,
    },
    {
      type: 'MATCH_SUCCESS_RATE',
      name: 'Match Success',
      description: 'Rate of successful matches',
      weight: 0.05,
    },
    {
      type: 'APP_OPEN_FREQUENCY',
      name: 'App Opens',
      description: 'How often the app is opened',
      weight: 0.04,
    },
    {
      type: 'FEATURE_USAGE',
      name: 'Feature Usage',
      description: 'Usage of premium features',
      weight: 0.03,
    },
    {
      type: 'SUPPORT_TICKETS',
      name: 'Support Requests',
      description: 'Number of support tickets submitted',
      weight: 0.02,
    },
    {
      type: 'NEGATIVE_FEEDBACK',
      name: 'User Feedback',
      description: 'App ratings and feedback sentiment',
      weight: 0.01,
    },
  ];

  res.json({
    success: true,
    data: indicators,
  });
});

export default router;
