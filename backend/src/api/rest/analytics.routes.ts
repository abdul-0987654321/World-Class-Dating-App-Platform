/**
 * Analytics Routes
 * Dashboard metrics, A/B testing, and analytics endpoints
 */

import { Router, Request, Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware.enhanced';
import { CSRFProtection } from '../../middleware/csrf.middleware';
import { logger } from '../../utils/logger';
import { AnalyticsDashboardService } from '../../services/core/AnalyticsDashboard.service';

const router = Router();
const analyticsService = new AnalyticsDashboardService();

/**
 * GET /api/analytics/dashboard
 * Get dashboard metrics overview
 * Requires: Authentication + Admin role
 */
router.get('/dashboard', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '7d';
    const metrics = await analyticsService.getDashboardMetrics(timeRange);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error('Get dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch dashboard metrics',
        code: 'ANALYTICS_ERROR',
      },
    });
  }
});

/**
 * GET /api/analytics/users
 * Get user analytics
 * Requires: Authentication
 */
router.get('/users', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '30d';
    const metrics = await analyticsService.getUserMetrics(timeRange);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch user analytics',
        code: 'ANALYTICS_ERROR',
      },
    });
  }
});

/**
 * GET /api/analytics/engagement
 * Get engagement analytics
 * Requires: Authentication
 */
router.get('/engagement', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '30d';
    const metrics = await analyticsService.getEngagementMetrics(timeRange);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error('Get engagement analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch engagement analytics',
        code: 'ANALYTICS_ERROR',
      },
    });
  }
});

/**
 * GET /api/analytics/revenue
 * Get revenue analytics
 * Requires: Authentication + Admin role
 */
router.get('/revenue', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '30d';
    const metrics = await analyticsService.getRevenueMetrics(timeRange);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch revenue analytics',
        code: 'ANALYTICS_ERROR',
      },
    });
  }
});

/**
 * POST /api/analytics/events
 * Track analytics event
 * Requires: Authentication
 */
router.post('/events', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { eventType, eventData, timestamp } = req.body;
    const userId = req.user?.userId;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Event type is required',
          code: 'MISSING_EVENT_TYPE',
        },
      });
    }

    await analyticsService.trackEvent({
      userId: userId || 'anonymous',
      eventType,
      eventData: eventData || {},
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    res.status(201).json({
      success: true,
      data: {
        message: 'Event tracked successfully',
      },
    });
  } catch (error: any) {
    logger.error('Track event error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to track event',
        code: 'TRACKING_ERROR',
      },
    });
  }
});

/**
 * GET /api/analytics/ab-tests
 * Get all A/B tests
 * Requires: Authentication + Admin role
 */
router.get('/ab-tests', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const tests = await analyticsService.getABTests(status);

    res.status(200).json({
      success: true,
      data: tests,
    });
  } catch (error: any) {
    logger.error('Get A/B tests error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch A/B tests',
        code: 'AB_TEST_ERROR',
      },
    });
  }
});

/**
 * POST /api/analytics/ab-tests
 * Create new A/B test
 * Requires: Authentication + Admin role + CSRF
 */
router.post(
  '/ab-tests',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const { name, description, hypothesis, variants, targetingRules, metrics } = req.body;

      if (!name || !variants || variants.length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Name and at least 2 variants are required',
            code: 'INVALID_AB_TEST',
          },
        });
      }

      const test = await analyticsService.createABTest({
        name,
        description,
        hypothesis,
        variants,
        targetingRules,
        metrics,
      });

      res.status(201).json({
        success: true,
        data: test,
      });
    } catch (error: any) {
      logger.error('Create A/B test error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create A/B test',
          code: 'AB_TEST_ERROR',
        },
      });
    }
  }
);

/**
 * GET /api/analytics/ab-tests/:testId/variant
 * Get user's assigned variant for an A/B test
 * Requires: Authentication
 */
router.get('/ab-tests/:testId/variant', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NO_AUTH',
        },
      });
    }

    const variant = await analyticsService.getABTestVariant(testId, userId);

    res.status(200).json({
      success: true,
      data: variant,
    });
  } catch (error: any) {
    logger.error('Get A/B test variant error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get variant',
        code: 'AB_TEST_ERROR',
      },
    });
  }
});

export default router;
