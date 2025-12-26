/**
 * Dashboard API Routes
 * Admin dashboard analytics endpoints
 *
 * Authentication:
 * - Most endpoints: Admin JWT authentication only
 * - User activity: User JWT (own data) or Admin JWT
 * - Admin operations: Admin JWT only
 */

import { Router } from 'express';
import {
  getDashboardOverview,
  getEngagementAnalytics,
  getMatchSuccessAnalytics,
  getRevenueAnalytics,
  getUserBehaviorAnalytics,
  getTimeSeriesData,
  getComparisonMetrics,
  getRealTimeMetrics,
  getUserActivitySummary,
  trackEventFromDashboard,
  aggregateMetrics,
  backfillMetrics,
  getDailyMetrics,
  getHourlyMetrics,
} from '../controllers/dashboard.controller';
import {
  authenticate,
  requireAdmin,
  authenticateInternal,
  AuthRequest,
} from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * Middleware that allows either admin JWT or internal service authentication
 */
const adminOrInternal = async (req: Request, res: Response, next: NextFunction) => {
  // Check for internal service key first
  const serviceKey = req.headers['x-service-key'] as string;
  if (serviceKey) {
    return authenticateInternal(req, res, next);
  }

  // Fall back to JWT + admin role check
  await authenticate(req, res, async () => {
    await requireAdmin(req, res, next);
  });
};

/**
 * Middleware for user activity - allows users to view their own data or admins to view any
 */
const userOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  await authenticate(req, res, async () => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Admins can view any user's activity
    if (req.user.role === 'admin') {
      return next();
    }

    // Regular users can only view their own activity
    const requestedUserId = req.params.userId;
    if (req.user.userId !== requestedUserId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own activity data',
        code: 'FORBIDDEN',
      });
    }

    return next();
  });
};

// Overview & Summary - Admin only
router.get('/overview', adminOrInternal, getDashboardOverview);
router.get('/real-time', adminOrInternal, getRealTimeMetrics);

// Engagement Analytics - Admin only
router.get('/engagement', adminOrInternal, getEngagementAnalytics);

// Match Success Analytics - Admin only
router.get('/match-success', adminOrInternal, getMatchSuccessAnalytics);

// Revenue Analytics - Admin only
router.get('/revenue', adminOrInternal, getRevenueAnalytics);

// User Behavior Analytics - Admin only for aggregate, user can view own
router.get('/user-behavior', adminOrInternal, getUserBehaviorAnalytics);
router.get('/user/:userId/activity', userOrAdmin, getUserActivitySummary);

// Time-Series Data - Admin only
router.get('/time-series', adminOrInternal, getTimeSeriesData);
router.get('/daily-metrics', adminOrInternal, getDailyMetrics);
router.get('/hourly-metrics', adminOrInternal, getHourlyMetrics);

// Comparison & Trends - Admin only
router.get('/comparison', adminOrInternal, getComparisonMetrics);

// Admin Operations - Admin only (no internal service access for these)
router.post('/track-event', authenticate, requireAdmin, trackEventFromDashboard);
router.post('/aggregate', authenticate, requireAdmin, aggregateMetrics);
router.post('/backfill', authenticate, requireAdmin, backfillMetrics);

export default router;
