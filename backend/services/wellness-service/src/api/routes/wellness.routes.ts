/**
 * Wellness Service Routes
 */

import { Router } from 'express';

import * as wellnessController from '../controllers/wellness.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Wellness Metrics Routes
// ============================================================================

/**
 * @route   GET /api/v1/wellness/metrics
 * @desc    Get wellness metrics for the authenticated user
 * @query   startDate, endDate, granularity (daily|weekly|monthly)
 * @access  Private
 */
router.get('/metrics', wellnessController.getMetrics);

/**
 * @route   POST /api/v1/wellness/metrics
 * @desc    Record wellness metrics
 * @body    { date?, sessionCount?, totalMinutesUsed?, swipeCount?, ... }
 * @access  Private
 */
router.post('/metrics', wellnessController.recordMetrics);

/**
 * @route   GET /api/v1/wellness/trend
 * @desc    Get wellness trend analysis
 * @query   period (daily|weekly|monthly)
 * @access  Private
 */
router.get('/trend', wellnessController.getTrend);

// ============================================================================
// Mood Tracking Routes
// ============================================================================

/**
 * @route   POST /api/v1/wellness/mood
 * @desc    Record a mood check-in
 * @body    { sessionType: 'start'|'end', mood, anxiety?, frustration?, notes? }
 * @access  Private
 */
router.post('/mood', wellnessController.recordMood);

// ============================================================================
// Dashboard Routes
// ============================================================================

/**
 * @route   GET /api/v1/wellness/dashboard
 * @desc    Get the Heart Health Dashboard
 * @access  Private
 */
router.get('/dashboard', wellnessController.getDashboard);

// ============================================================================
// Alert Routes
// ============================================================================

/**
 * @route   POST /api/v1/wellness/alerts/:alertId/dismiss
 * @desc    Dismiss a wellness alert
 * @access  Private
 */
router.post('/alerts/:alertId/dismiss', wellnessController.dismissAlert);

// ============================================================================
// Readiness Assessment Routes
// ============================================================================

/**
 * @route   POST /api/v1/wellness/readiness/start
 * @desc    Start a new readiness assessment
 * @body    { context?: 'initial'|'periodic'|'post_break' }
 * @access  Private
 */
router.post('/readiness/start', wellnessController.startReadinessAssessment);

/**
 * @route   POST /api/v1/wellness/readiness/submit
 * @desc    Submit readiness assessment answers
 * @body    { assessmentId, answers: { [questionId]: value } }
 * @access  Private
 */
router.post('/readiness/submit', wellnessController.submitReadinessAssessment);

/**
 * @route   GET /api/v1/wellness/readiness/latest
 * @desc    Get the latest readiness assessment
 * @access  Private
 */
router.get('/readiness/latest', wellnessController.getLatestReadiness);

/**
 * @route   GET /api/v1/wellness/readiness/history
 * @desc    Get readiness assessment history
 * @query   limit (default: 10)
 * @access  Private
 */
router.get('/readiness/history', wellnessController.getReadinessHistory);

export default router;
