/**
 * Ad Revenue Routes
 * API routes for ad impressions, clicks, and rewards
 */

import { Router } from 'express';

import adRevenueController from '../controllers/ad-revenue.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/ads/config
 * @desc    Get ad configuration for client
 * @access  Public (but returns different config based on auth)
 */
router.get('/config', adRevenueController.getAdConfig);

/**
 * @route   GET /api/v1/ads/config/:userId
 * @desc    Get ad configuration for specific user
 * @access  Private
 */
router.get('/config/:userId', authMiddleware, adRevenueController.getAdConfig);

/**
 * @route   GET /api/v1/ads/state/:userId
 * @desc    Get user's ad state (for frequency capping)
 * @access  Private
 */
router.get('/state/:userId', authMiddleware, adRevenueController.getUserAdState);

/**
 * @route   GET /api/v1/ads/state
 * @desc    Get current user's ad state
 * @access  Private
 */
router.get('/state', authMiddleware, adRevenueController.getUserAdState);

/**
 * @route   POST /api/v1/ads/action
 * @desc    Record a user action (for frequency capping)
 * @access  Private
 */
router.post('/action', authMiddleware, adRevenueController.recordAction);

/**
 * @route   POST /api/v1/ads/impression
 * @desc    Record an ad impression
 * @access  Private
 * @body    { adType, network, placement, platform, sessionId, deviceInfo }
 */
router.post('/impression', authMiddleware, adRevenueController.recordImpression);

/**
 * @route   POST /api/v1/ads/click
 * @desc    Record an ad click
 * @access  Private
 * @body    { impressionId, adType }
 */
router.post('/click', authMiddleware, adRevenueController.recordClick);

/**
 * @route   GET /api/v1/ads/rewards
 * @desc    Get available rewards for video ads
 * @access  Private
 */
router.get('/rewards', authMiddleware, adRevenueController.getAvailableRewards);

/**
 * @route   GET /api/v1/ads/rewards/:userId
 * @desc    Get available rewards for specific user
 * @access  Private
 */
router.get('/rewards/:userId', authMiddleware, adRevenueController.getAvailableRewards);

/**
 * @route   POST /api/v1/ads/rewards/claim
 * @desc    Claim a reward after watching video ad
 * @access  Private
 * @body    { rewardId, transactionId, impressionId, videoCompletionPercent }
 */
router.post('/rewards/claim', authMiddleware, adRevenueController.claimReward);

/**
 * @route   POST /api/v1/ads/purchase
 * @desc    Record a purchase (triggers ad cooldown)
 * @access  Private
 */
router.post('/purchase', authMiddleware, adRevenueController.recordPurchase);

/**
 * @route   GET /api/v1/ads/analytics/performance
 * @desc    Get ad performance metrics (admin only)
 * @access  Private (Admin)
 * @query   { startDate, endDate, period }
 */
router.get('/analytics/performance', authMiddleware, adRevenueController.getPerformanceMetrics);

/**
 * @route   GET /api/v1/ads/analytics/rewards
 * @desc    Get reward analytics (admin only)
 * @access  Private (Admin)
 * @query   { startDate, endDate, period }
 */
router.get('/analytics/rewards', authMiddleware, adRevenueController.getRewardAnalytics);

export default router;
