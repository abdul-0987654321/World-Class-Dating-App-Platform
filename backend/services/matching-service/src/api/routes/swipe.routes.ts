import { Router } from 'express';
import swipeController from '../controllers/swipe.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/swipes - Process a swipe action
router.post('/', swipeController.swipe.bind(swipeController));

// GET /api/swipes/likes - Get users who liked me
router.get('/likes', swipeController.getWhoLikedMe.bind(swipeController));

// GET /api/swipes/stats - Get swipe statistics
router.get('/stats', swipeController.getStats.bind(swipeController));

// POST /api/swipes/undo - Undo last swipe (premium feature)
router.post('/undo', swipeController.undoSwipe.bind(swipeController));

export default router;
