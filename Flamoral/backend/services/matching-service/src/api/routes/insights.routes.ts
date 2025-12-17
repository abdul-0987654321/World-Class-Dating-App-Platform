import { Router } from 'express';
import insightsController from '../controllers/insights.controller';
import { authenticate as authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All insights routes require authentication
router.use(authMiddleware);

// Get profile insights
router.get('/', insightsController.getProfileInsights.bind(insightsController));

// Get who viewed me
router.get('/views', insightsController.getWhoViewedMe.bind(insightsController));

// Get who liked you
router.get('/likes', insightsController.getWhoLikedYou.bind(insightsController));

// Get who liked you count
router.get('/likes/count', insightsController.getWhoLikedYouCount.bind(insightsController));

// Track profile view
router.post('/track-view', insightsController.trackProfileView.bind(insightsController));

export default router;
