/**
 * Curated Picks Routes
 * Routes for daily curated picks feature
 */

import { Router } from 'express';

import curatedPicksController from '../controllers/curated-picks.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/discovery/curated-picks
 * Get daily curated picks for the authenticated user
 */
router.get('/', curatedPicksController.getDailyPicks.bind(curatedPicksController));

/**
 * POST /api/v1/discovery/curated-picks/:pickId/view
 * Mark a pick as viewed
 */
router.post('/:pickId/view', curatedPicksController.markPickViewed.bind(curatedPicksController));

/**
 * POST /api/v1/discovery/curated-picks/:pickId/action
 * Mark a pick as acted upon (liked/passed)
 */
router.post(
  '/:pickId/action',
  curatedPicksController.markPickActedUpon.bind(curatedPicksController)
);

/**
 * POST /api/v1/discovery/curated-picks/regenerate
 * Regenerate daily picks (premium feature)
 */
router.post('/regenerate', curatedPicksController.regeneratePicks.bind(curatedPicksController));

export default router;
