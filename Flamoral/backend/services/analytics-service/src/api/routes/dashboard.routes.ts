/**
 * Dashboard API Routes
 * Admin dashboard analytics endpoints
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

const router = Router();

// Overview & Summary
router.get('/overview', getDashboardOverview);
router.get('/real-time', getRealTimeMetrics);

// Engagement Analytics
router.get('/engagement', getEngagementAnalytics);

// Match Success Analytics
router.get('/match-success', getMatchSuccessAnalytics);

// Revenue Analytics
router.get('/revenue', getRevenueAnalytics);

// User Behavior Analytics
router.get('/user-behavior', getUserBehaviorAnalytics);
router.get('/user/:userId/activity', getUserActivitySummary);

// Time-Series Data
router.get('/time-series', getTimeSeriesData);
router.get('/daily-metrics', getDailyMetrics);
router.get('/hourly-metrics', getHourlyMetrics);

// Comparison & Trends
router.get('/comparison', getComparisonMetrics);

// Admin Operations
router.post('/track-event', trackEventFromDashboard);
router.post('/aggregate', aggregateMetrics);
router.post('/backfill', backfillMetrics);

export default router;
