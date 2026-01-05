import { Router } from 'express';

import {
  ProfileInsightsQueryDto,
  WhoViewedMeQueryDto,
  WhoLikedYouQueryDto,
  TrackProfileViewDto,
} from '../../dto';
import insightsController from '../controllers/insights.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';

const router = Router();

// All insights routes require authentication
router.use(authMiddleware);

// Get profile insights
router.get(
  '/',
  validateQuery(ProfileInsightsQueryDto),
  insightsController.getProfileInsights.bind(insightsController)
);

// Get who viewed me
router.get(
  '/views',
  validateQuery(WhoViewedMeQueryDto),
  insightsController.getWhoViewedMe.bind(insightsController)
);

// Get who liked you
router.get(
  '/likes',
  validateQuery(WhoLikedYouQueryDto),
  insightsController.getWhoLikedYou.bind(insightsController)
);

// Get who liked you count
router.get('/likes/count', insightsController.getWhoLikedYouCount.bind(insightsController));

// Track profile view
router.post(
  '/track-view',
  validateBody(TrackProfileViewDto),
  insightsController.trackProfileView.bind(insightsController)
);

export default router;
