/**
 * Challenge Routes
 * API routes for the gamification challenge system
 */

import { Router } from 'express';

import { ChallengeController } from '../controllers/challenge.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  getChallengesQuerySchema,
  challengeIdParamSchema,
  updateProgressSchema,
} from '../validators/challenge.validator';

const router = Router();
const challengeController = new ChallengeController();

/**
 * @swagger
 * tags:
 *   name: Challenges
 *   description: Gamification challenge system endpoints
 */

/**
 * @swagger
 * /api/v1/challenges:
 *   get:
 *     summary: Get all challenges
 *     description: Get all active, available, daily, and weekly challenges for the authenticated user
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, special_event, limited_time]
 *         description: Filter challenges by type
 *     responses:
 *       200:
 *         description: Challenges retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     available:
 *                       type: array
 *                       description: Challenges user can start
 *                     active:
 *                       type: array
 *                       description: Challenges user has started
 *                     daily:
 *                       type: array
 *                       description: Daily challenges
 *                     weekly:
 *                       type: array
 *                       description: Weekly challenges
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  authenticate,
  validate(getChallengesQuerySchema, 'query'),
  challengeController.getActiveChallenges.bind(challengeController)
);

/**
 * @swagger
 * /api/v1/challenges/available:
 *   get:
 *     summary: Get available challenges
 *     description: Get all challenges available for the user to start
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, special_event, limited_time]
 *         description: Filter by challenge type
 *     responses:
 *       200:
 *         description: Available challenges retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/available',
  authenticate,
  validate(getChallengesQuerySchema, 'query'),
  challengeController.getAvailableChallenges.bind(challengeController)
);

/**
 * @swagger
 * /api/v1/challenges/daily:
 *   get:
 *     summary: Get daily challenges
 *     description: Get all daily challenges for the user with auto-generation
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily challenges retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       challenge_id:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [not_started, in_progress, completed, failed, expired]
 *                       progress:
 *                         type: integer
 *                       target:
 *                         type: integer
 *                       progress_percentage:
 *                         type: number
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/daily',
  authenticate,
  challengeController.getDailyChallenges.bind(challengeController)
);

/**
 * @swagger
 * /api/v1/challenges/weekly:
 *   get:
 *     summary: Get weekly challenges
 *     description: Get all weekly challenges for the user
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly challenges retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/weekly',
  authenticate,
  challengeController.getWeeklyChallenges.bind(challengeController)
);

/**
 * @swagger
 * /api/v1/challenges/monthly:
 *   get:
 *     summary: Get monthly challenges
 *     description: Get all monthly challenges for the user
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly challenges retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/monthly',
  authenticate,
  challengeController.getMonthlyChallenges.bind(challengeController)
);

/**
 * @swagger
 * /api/v1/challenges/{id}/start:
 *   post:
 *     summary: Start a challenge
 *     description: Start a specific challenge for the authenticated user
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The challenge ID to start
 *     responses:
 *       201:
 *         description: Challenge started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     user_id:
 *                       type: string
 *                     challenge_id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     progress:
 *                       type: integer
 *                     target:
 *                       type: integer
 *                     started_at:
 *                       type: string
 *                       format: date-time
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Challenge already started or invalid request
 *       404:
 *         description: Challenge not found or inactive
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/:id/start',
  authenticate,
  validate(challengeIdParamSchema, 'params'),
  challengeController.startChallenge.bind(challengeController)
);

/**
 * @swagger
 * /api/v1/challenges/{id}/progress:
 *   get:
 *     summary: Get challenge progress
 *     description: Get detailed progress for a specific challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The challenge ID
 *     responses:
 *       200:
 *         description: Challenge progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     challenge:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         targetValue:
 *                           type: integer
 *                         rewards:
 *                           type: object
 *                     progress:
 *                       type: object
 *                       properties:
 *                         currentProgress:
 *                           type: integer
 *                         targetProgress:
 *                           type: integer
 *                         progressPercentage:
 *                           type: number
 *                         daysRemaining:
 *                           type: integer
 *                         status:
 *                           type: string
 *       404:
 *         description: Challenge not found or not started
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:id/progress',
  authenticate,
  validate(challengeIdParamSchema, 'params'),
  challengeController.getChallengeProgress.bind(challengeController)
);

/**
 * @swagger
 * /api/v1/challenges/{id}/claim:
 *   post:
 *     summary: Claim challenge reward
 *     description: Claim the reward for a completed challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The challenge ID
 *     responses:
 *       200:
 *         description: Reward claimed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     challengeId:
 *                       type: string
 *                     challengeTitle:
 *                       type: string
 *                     rewards:
 *                       type: object
 *                       properties:
 *                         coins:
 *                           type: integer
 *                         xp:
 *                           type: integer
 *                         boosts:
 *                           type: integer
 *                         superLikes:
 *                           type: integer
 *                     claimedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Challenge not completed or reward already claimed
 *       404:
 *         description: Challenge not found
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/:id/claim',
  authenticate,
  validate(challengeIdParamSchema, 'params'),
  challengeController.claimReward.bind(challengeController)
);

/**
 * @swagger
 * /api/v1/challenges/progress:
 *   post:
 *     summary: Update challenge progress (Internal)
 *     description: Internal API to update challenge progress based on user actions
 *     tags: [Challenges]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - actionType
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               actionType:
 *                 type: string
 *                 enum: [swipe, message, match, login, profile_update, photo_upload, refer_friend, verify_photo]
 *               challengeId:
 *                 type: string
 *                 format: uuid
 *               progressIncrement:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post(
  '/progress',
  validate(updateProgressSchema),
  challengeController.updateProgress.bind(challengeController)
);

export default router;
