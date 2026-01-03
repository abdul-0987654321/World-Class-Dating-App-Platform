/**
 * Rewind Routes
 *
 * Routes for the Swipe Rewind feature.
 */

import { Router } from 'express';
import rewindController from '../controllers/rewind.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/swipes/rewind
 * Undo the last swipe (Premium+ feature with tier-based limits)
 */
router.post('/', rewindController.rewind.bind(rewindController));

/**
 * GET /api/v1/swipes/rewind/status
 * Check if user can rewind and get quota
 */
router.get('/status', rewindController.getRewindStatus.bind(rewindController));

/**
 * GET /api/v1/swipes/rewind/quota
 * Get rewind quota for current user
 */
router.get('/quota', rewindController.getQuota.bind(rewindController));

/**
 * GET /api/v1/swipes/rewind/history
 * Get user's rewind history
 */
router.get('/history', rewindController.getHistory.bind(rewindController));

/**
 * GET /api/v1/swipes/rewind/available
 * Get swipes that can still be rewound
 */
router.get('/available', rewindController.getRewindableSwipes.bind(rewindController));

/**
 * GET /api/v1/swipes/rewind/stats
 * Get rewind usage statistics
 */
router.get('/stats', rewindController.getStats.bind(rewindController));

export default router;
