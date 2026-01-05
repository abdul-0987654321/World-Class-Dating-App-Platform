/**
 * Passport Mode Routes
 * Routes for passport/travel mode feature
 */

import { Router } from 'express';

import passportController from '../controllers/passport.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/discovery/passport/status
 * Get passport mode status for the authenticated user
 */
router.get('/status', passportController.getStatus.bind(passportController));

/**
 * POST /api/v1/discovery/passport/location
 * Set passport location (teleport to a new location)
 */
router.post('/location', passportController.setLocation.bind(passportController));

/**
 * DELETE /api/v1/discovery/passport/location
 * Deactivate passport mode and return to home location
 */
router.delete('/location', passportController.deactivate.bind(passportController));

/**
 * GET /api/v1/discovery/passport/destinations
 * Get popular destinations for passport mode
 */
router.get('/destinations', passportController.getPopularDestinations.bind(passportController));

/**
 * GET /api/v1/discovery/passport/search
 * Search locations by query
 */
router.get('/search', passportController.searchLocations.bind(passportController));

/**
 * GET /api/v1/discovery/passport/feed
 * Get discovery feed for passport location
 */
router.get('/feed', passportController.getPassportFeed.bind(passportController));

export default router;
