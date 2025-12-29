import { Router } from 'express';
import swipeController from '../controllers/swipe.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { SwipeDto } from '../../dto';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/swipes - Process a swipe action
router.post('/', validateBody(SwipeDto), swipeController.swipe.bind(swipeController));

// GET /api/swipes/likes - Get users who liked me
router.get('/likes', swipeController.getWhoLikedMe.bind(swipeController));

// GET /api/swipes/stats - Get swipe statistics
router.get('/stats', swipeController.getStats.bind(swipeController));

// POST /api/swipes/undo - Undo last swipe (premium feature)
router.post('/undo', swipeController.undoSwipe.bind(swipeController));

export default router;
