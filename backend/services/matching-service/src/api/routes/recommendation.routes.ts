import { Router } from 'express';
import recommendationController from '../controllers/recommendation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/recommendations - Get personalized recommendations
router.get('/', recommendationController.getRecommendations.bind(recommendationController));

// GET /api/recommendations/top - Get top matches (premium feature)
router.get('/top', recommendationController.getTopMatches.bind(recommendationController));

// POST /api/recommendations/refresh - Refresh recommendations
router.post('/refresh', recommendationController.refreshRecommendations.bind(recommendationController));

export default router;
