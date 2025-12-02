import { Router } from 'express';
import { AchievementController } from '../controllers/Achievement.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new AchievementController();

// Public routes
router.get('/all', controller.getAllAchievements);
router.get('/leaderboard', controller.getLeaderboard);
router.get('/showcase/:userId', controller.getShowcase);
router.get('/stats/:userId', controller.getUserStats);

// Protected routes - require authentication
router.use(authenticate);

router.get('/', controller.getUserAchievements);
router.get('/category/:category', controller.getUserAchievementsByCategory);
router.get('/unlocked', controller.getUnlockedAchievements);
router.get('/my-showcase', controller.getShowcase);
router.put('/:achievementId/showcase', controller.toggleShowcase);
router.get('/my-stats', controller.getUserStats);

// Webhook/Internal routes for tracking (should add service-to-service auth)
router.post('/track/profile-completion', controller.trackProfileCompletion);
router.post('/track/photo-upload', controller.trackPhotoUpload);
router.post('/track/verification', controller.trackVerification);
router.post('/track/match', controller.trackMatch);
router.post('/track/message', controller.trackMessage);
router.post('/track/swipe', controller.trackSwipe);
router.post('/track/login-streak', controller.trackLoginStreak);
router.post('/track/subscription', controller.trackSubscription);
router.post('/track/referral', controller.trackReferral);

export default router;
