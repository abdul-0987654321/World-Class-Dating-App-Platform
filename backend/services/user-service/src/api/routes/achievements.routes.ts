/**
 * Achievements Routes
 * API routes for achievements system
 */

import { Router } from 'express';
import { Pool } from 'pg';

import { getDbConnection } from '../../infrastructure/database/connection';
import { AchievementsController } from '../controllers/achievements.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const dbPool = getDbConnection() as unknown as Pool;
const controller = new AchievementsController(dbPool);

// Public routes
/**
 * @route GET /api/achievements
 * @desc Get all available achievements
 * @access Public
 */
router.get('/', controller.getAllAchievements);

/**
 * @route GET /api/achievements/:id
 * @desc Get achievement by ID
 * @access Public
 */
router.get('/:id', controller.getAchievementById);

// Protected routes - require authentication
router.use(authenticate);

/**
 * @route GET /api/achievements/user/me
 * @desc Get current user's achievements with progress
 * @access Private
 */
router.get('/user/me', controller.getUserAchievements);

/**
 * @route GET /api/achievements/user/me/unlocked
 * @desc Get current user's unlocked achievements
 * @access Private
 */
router.get('/user/me/unlocked', controller.getUnlockedAchievements);

/**
 * @route GET /api/achievements/user/me/showcase
 * @desc Get current user's showcased achievements
 * @access Private
 */
router.get('/user/me/showcase', controller.getShowcaseAchievements);

/**
 * @route GET /api/achievements/user/:userId/showcase
 * @desc Get another user's showcased achievements
 * @access Private
 */
router.get('/user/:userId/showcase', controller.getOtherUserShowcase);

/**
 * @route PUT /api/achievements/:achievementId/showcase
 * @desc Toggle achievement showcase on profile
 * @access Private
 */
router.put('/:achievementId/showcase', controller.toggleShowcase);

/**
 * @route GET /api/achievements/user/me/stats
 * @desc Get current user's achievement statistics
 * @access Private
 */
router.get('/user/me/stats', controller.getAchievementStats);

/**
 * @route POST /api/achievements/progress
 * @desc Update achievement progress (Internal API)
 * @access Internal
 */
router.post('/progress', controller.updateProgress);

/**
 * @route POST /api/achievements/initialize/:userId
 * @desc Initialize achievements for a new user (Internal API)
 * @access Internal
 */
router.post('/initialize/:userId', controller.initializeUserAchievements);

/**
 * @route POST /api/achievements
 * @desc Create a new achievement (Admin only)
 * @access Admin
 */
router.post('/', controller.createAchievement);

/**
 * @route PUT /api/achievements/:id
 * @desc Update an achievement (Admin only)
 * @access Admin
 */
router.put('/:id', controller.updateAchievement);

export default router;
