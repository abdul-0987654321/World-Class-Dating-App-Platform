import { Router } from 'express';
import { GamificationController } from '../controllers/Gamification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new GamificationController();

// Public routes
router.get('/levels', controller.getLevelDefinitions);
router.get('/badges', controller.getAllBadges);

// Protected routes - require authentication
router.use(authenticate);

// Overview/Dashboard
router.get('/dashboard', controller.getDashboard);

// Experience & Levels
router.get('/experience', controller.getUserExperience);
router.get('/experience/transactions', controller.getXPTransactions);
router.get('/experience/leaderboard', controller.getXPLeaderboard);

// Streaks
router.get('/streaks', controller.getUserStreaks);
router.post('/streaks/protect', controller.protectStreak);
router.get('/streaks/leaderboard', controller.getStreakLeaderboard);

// Challenges
router.get('/challenges/active', controller.getActiveChallenges);
router.get('/challenges/available', controller.getAvailableChallenges);
router.post('/challenges/start', controller.startChallenge);

// Badges
router.get('/badges/user', controller.getUserBadges);
router.put('/badges/:badgeId/equip', controller.equipBadge);

// Webhook endpoints (should add internal auth middleware in production)
router.post('/track', controller.trackAction);

export default router;
