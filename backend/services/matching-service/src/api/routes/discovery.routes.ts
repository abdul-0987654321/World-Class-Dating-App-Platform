import { Router } from 'express';
import discoveryController from '../controllers/discovery.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/discovery/feed - Get discovery feed (replaces /recommendations)
// Response format matches DiscoveryFeedResponse from openapi.yaml
router.get('/feed', discoveryController.getFeed.bind(discoveryController));

// POST /api/v1/discovery/like - Like a user (daily caps enforced server-side)
router.post('/like', discoveryController.like.bind(discoveryController));

// POST /api/v1/discovery/pass - Pass on a user
router.post('/pass', discoveryController.pass.bind(discoveryController));

// POST /api/v1/discovery/super-like - Super-like a user (Plus/Premium only)
router.post('/super-like', discoveryController.superLike.bind(discoveryController));

// GET /api/v1/discovery/stats - Get discovery stats (likes remaining, etc.)
router.get('/stats', discoveryController.getStats.bind(discoveryController));

export default router;
