import { Router } from 'express';

import { DailyRewardController } from '../controllers/DailyReward.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new DailyRewardController();

// Public routes
router.get('/calendar', controller.getCalendar);
router.get('/leaderboard', controller.getLeaderboard);

// Protected routes - require authentication
router.use(authenticate);

router.get('/status', controller.getStatus);
router.post('/claim', controller.claimReward);
router.get('/stats', controller.getStats);
router.get('/history', controller.getHistory);

// Admin routes - should add admin middleware
router.put('/calendar/:dayNumber', controller.updateCalendar);

export default router;
