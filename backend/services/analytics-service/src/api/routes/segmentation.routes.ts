/**
 * User Segmentation API Routes
 */

import { Router, Request, Response } from 'express';

import { segmentationService } from '../../services/segmentation.service';
import { UserSegmentType } from '../../types';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/v1/segmentation/user/:userId
 * Get or calculate segments for a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const segment = await segmentationService.segmentUser(userId);

    res.json({
      success: true,
      data: segment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/segmentation/batch
 * Batch segment multiple users
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userIds array is required',
      });
    }

    if (userIds.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 1000 users per batch',
      });
    }

    const segments = await segmentationService.segmentUsers(userIds);

    res.json({
      success: true,
      data: {
        segmented: segments.length,
        failed: userIds.length - segments.length,
        segments,
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
 * GET /api/v1/segmentation/analytics
 * Get analytics for all segments
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await segmentationService.getSegmentAnalytics();

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
 * GET /api/v1/segmentation/segment/:segment/users
 * Get users in a specific segment
 */
router.get('/segment/:segment/users', async (req: Request, res: Response) => {
  try {
    const { segment } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate segment type
    if (!Object.values(UserSegmentType).includes(segment as UserSegmentType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid segment type. Valid types: ${Object.values(UserSegmentType).join(', ')}`,
      });
    }

    const userIds = await segmentationService.getUsersInSegment(
      segment as UserSegmentType,
      Math.min(limit, 500), // Cap at 500
      offset
    );

    res.json({
      success: true,
      data: {
        segment,
        userIds,
        count: userIds.length,
        pagination: {
          limit,
          offset,
          hasMore: userIds.length === limit,
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
 * GET /api/v1/segmentation/transitions
 * Get recent segment transitions
 */
router.get('/transitions', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const limit = parseInt(req.query.limit as string) || 100;

    const transitions = await segmentationService.getSegmentTransitions(
      Math.min(days, 30), // Cap at 30 days
      Math.min(limit, 500) // Cap at 500
    );

    res.json({
      success: true,
      data: {
        transitions,
        count: transitions.length,
        period: `${days} days`,
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
 * GET /api/v1/segmentation/segments
 * List all available segment types
 */
router.get('/segments', (req: Request, res: Response) => {
  const segments = Object.values(UserSegmentType).map((segment) => ({
    type: segment,
    category: getSegmentCategory(segment),
    description: getSegmentDescription(segment),
  }));

  res.json({
    success: true,
    data: segments,
  });
});

// Helper functions
function getSegmentCategory(segment: UserSegmentType): string {
  const categories: Record<string, UserSegmentType[]> = {
    engagement: [
      UserSegmentType.POWER_USER,
      UserSegmentType.ACTIVE_USER,
      UserSegmentType.CASUAL_USER,
      UserSegmentType.DORMANT_USER,
      UserSegmentType.CHURNED_USER,
    ],
    subscription: [
      UserSegmentType.FREE_USER,
      UserSegmentType.TRIAL_USER,
      UserSegmentType.PAID_USER,
      UserSegmentType.PREMIUM_USER,
      UserSegmentType.LAPSED_SUBSCRIBER,
    ],
    behavior: [
      UserSegmentType.SWIPER,
      UserSegmentType.MATCHER,
      UserSegmentType.CONVERSATIONALIST,
      UserSegmentType.PROFILE_BUILDER,
      UserSegmentType.GHOST,
    ],
    lifecycle: [
      UserSegmentType.NEW_USER,
      UserSegmentType.ONBOARDING,
      UserSegmentType.ESTABLISHED,
      UserSegmentType.VETERAN,
    ],
    value: [
      UserSegmentType.HIGH_LTV,
      UserSegmentType.MEDIUM_LTV,
      UserSegmentType.LOW_LTV,
      UserSegmentType.AT_RISK,
    ],
    intent: [
      UserSegmentType.SERIOUS_DATER,
      UserSegmentType.CASUAL_BROWSER,
      UserSegmentType.READY_TO_MEET,
    ],
  };

  for (const [category, segments] of Object.entries(categories)) {
    if (segments.includes(segment)) return category;
  }
  return 'other';
}

function getSegmentDescription(segment: UserSegmentType): string {
  const descriptions: Record<UserSegmentType, string> = {
    [UserSegmentType.POWER_USER]: 'Daily active users with high engagement (25+ days/month)',
    [UserSegmentType.ACTIVE_USER]: 'Weekly active users (10-24 days/month)',
    [UserSegmentType.CASUAL_USER]: 'Occasional users (less than 10 days/month)',
    [UserSegmentType.DORMANT_USER]: 'Inactive for 30+ days',
    [UserSegmentType.CHURNED_USER]: 'Inactive for 90+ days',
    [UserSegmentType.FREE_USER]: 'Non-paying users',
    [UserSegmentType.TRIAL_USER]: 'Users on free trial',
    [UserSegmentType.PAID_USER]: 'Basic/Gold tier subscribers',
    [UserSegmentType.PREMIUM_USER]: 'Platinum/Diamond/Elite tier subscribers',
    [UserSegmentType.LAPSED_SUBSCRIBER]: 'Former paying users now on free tier',
    [UserSegmentType.SWIPER]: 'High swipe activity (100+ per week)',
    [UserSegmentType.MATCHER]: 'High match rate (15%+)',
    [UserSegmentType.CONVERSATIONALIST]: 'High message engagement (50+ per week)',
    [UserSegmentType.PROFILE_BUILDER]: 'Complete profile with 4+ photos',
    [UserSegmentType.GHOST]: 'Matches but rarely responds (<10% response rate)',
    [UserSegmentType.NEW_USER]: 'Registered within last 7 days',
    [UserSegmentType.ONBOARDING]: 'Profile less than 70% complete',
    [UserSegmentType.ESTABLISHED]: '30+ days active with complete profile',
    [UserSegmentType.VETERAN]: '180+ days active user',
    [UserSegmentType.HIGH_LTV]: 'Lifetime value $200+',
    [UserSegmentType.MEDIUM_LTV]: 'Lifetime value $50-200',
    [UserSegmentType.LOW_LTV]: 'Lifetime value under $50',
    [UserSegmentType.AT_RISK]: 'Engagement dropped 50%+ recently',
    [UserSegmentType.SERIOUS_DATER]: 'Looking for relationship with complete profile',
    [UserSegmentType.CASUAL_BROWSER]: 'Low intent signals and activity',
    [UserSegmentType.READY_TO_MEET]: 'High engagement and response rate',
  };

  return descriptions[segment] || 'No description available';
}

export default router;
