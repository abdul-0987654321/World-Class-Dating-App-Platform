/**
 * Trust Routes
 * API route definitions for trust service
 */

import { Router } from 'express';
import { authenticate, requireUserId, serviceOnly } from '../middleware/auth.middleware';
import * as controller from '../controllers/trust.controller';

const router = Router();

// ============================================================================
// Trust Score Routes
// ============================================================================

/**
 * @route   GET /api/v1/trust/score
 * @desc    Get current user's trust score
 * @access  Private
 */
router.get('/score', authenticate, requireUserId, controller.getMyTrustScore);

/**
 * @route   GET /api/v1/trust/profile/:userId
 * @desc    Get public trust profile for a user
 * @access  Private
 */
router.get('/profile/:userId', authenticate, requireUserId, controller.getTrustProfile);

/**
 * @route   POST /api/v1/trust/signal
 * @desc    Record a trust signal (internal service use)
 * @access  Service
 */
router.post('/signal', serviceOnly, controller.recordSignal);

/**
 * @route   POST /api/v1/trust/recalculate/:userId
 * @desc    Recalculate trust score (internal service use)
 * @access  Service
 */
router.post('/recalculate/:userId', serviceOnly, controller.recalculateScore);

// ============================================================================
// Rating Routes
// ============================================================================

/**
 * @route   POST /api/v1/trust/ratings
 * @desc    Submit a rating for another user
 * @access  Private
 */
router.post('/ratings', authenticate, requireUserId, controller.submitRating);

/**
 * @route   GET /api/v1/trust/ratings/mine
 * @desc    Get ratings received by current user
 * @access  Private
 */
router.get('/ratings/mine', authenticate, requireUserId, controller.getMyRatings);

/**
 * @route   GET /api/v1/trust/ratings/stats/:userId
 * @desc    Get rating stats for a user
 * @access  Private
 */
router.get('/ratings/stats/:userId', authenticate, requireUserId, controller.getRatingStats);

// ============================================================================
// Endorsement Routes
// ============================================================================

/**
 * @route   POST /api/v1/trust/endorsements
 * @desc    Give an endorsement to another user
 * @access  Private
 */
router.post('/endorsements', authenticate, requireUserId, controller.giveEndorsement);

/**
 * @route   GET /api/v1/trust/endorsements/mine
 * @desc    Get endorsements received by current user
 * @access  Private
 */
router.get('/endorsements/mine', authenticate, requireUserId, controller.getMyEndorsements);

/**
 * @route   GET /api/v1/trust/endorsements/counts/:userId
 * @desc    Get endorsement counts for a user
 * @access  Private
 */
router.get(
  '/endorsements/counts/:userId',
  authenticate,
  requireUserId,
  controller.getEndorsementCounts
);

export default router;
