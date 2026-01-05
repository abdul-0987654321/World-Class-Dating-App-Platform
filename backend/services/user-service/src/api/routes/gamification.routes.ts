import { Router } from 'express';

import { EnhancedGamificationController } from '../controllers/EnhancedGamification.controller';
import { GamificationController } from '../controllers/Gamification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new GamificationController();
const enhancedController = new EnhancedGamificationController();

// =============================================
// PUBLIC ROUTES
// =============================================
router.get('/levels', controller.getLevelDefinitions);
router.get('/badges', controller.getAllBadges);
router.get('/streaks/leaderboard', enhancedController.getStreakLeaderboard);

// =============================================
// PROTECTED ROUTES - require authentication
// =============================================
router.use(authenticate);

// UNIFIED DASHBOARD - Get all gamification data at once
router.get('/dashboard', enhancedController.getGamificationDashboard);

// DAILY REWARDS
router.get('/daily-rewards/status', enhancedController.getDailyRewardStatus);
router.post('/daily-rewards/claim', enhancedController.claimDailyReward);

// ACHIEVEMENT BADGES
router.get('/achievements', enhancedController.getAchievementBadges);
router.get('/achievements/unlocked', enhancedController.getUnlockedBadges);
router.put('/achievements/:badgeId/display', enhancedController.toggleBadgeDisplay);

// STREAKS
router.get('/streaks', enhancedController.getStreaks);
router.post('/streaks/protect', enhancedController.protectStreak);

// COINS & WALLET
router.get('/wallet', enhancedController.getCoinWallet);
router.get('/shop', enhancedController.getCoinShop);

// LEVELS & XP
router.get('/level', enhancedController.getLevelInfo);

// LEGACY ENDPOINTS (maintained for backward compatibility)
router.get('/experience', controller.getUserExperience);
router.get('/experience/transactions', controller.getXPTransactions);
router.get('/experience/leaderboard', controller.getXPLeaderboard);

// Challenges
router.get('/challenges/active', controller.getActiveChallenges);
router.get('/challenges/available', controller.getAvailableChallenges);
router.post('/challenges/start', controller.startChallenge);

// Profile Badges (different from achievement badges)
router.get('/badges/user', controller.getUserBadges);
router.put('/badges/:badgeId/equip', controller.equipBadge);

// INTERNAL ACTION TRACKING
router.post('/track', enhancedController.trackAction);

export default router;
