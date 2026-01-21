import { Router } from 'express';

import {
  BuildChemistryProfileDto,
  GetTopChemistryMatchesQueryDto,
  FindChemistryMatchesDto,
} from '../../dto/chemistry.dto';
import chemistryController from '../controllers/chemistry.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';

const router = Router();

/**
 * Chemistry Matching Routes
 *
 * Pheromone-Inspired Matching Algorithm endpoints.
 * This is an EXPERIMENTAL/RESEARCH feature (Tier 4).
 *
 * All routes require JWT authentication.
 * Feature flag: innovative_chemistry_matching (limited rollout)
 *
 * Rate Limits (applied at API gateway level):
 * - Profile build: 10 requests/hour
 * - Score/explanation: 60 requests/minute
 * - Top matches: 30 requests/minute
 * - Find matches: 20 requests/minute
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/matching/chemistry/availability:
 *   get:
 *     summary: Check chemistry matching availability
 *     description: Check if the chemistry matching feature is available for the current user
 *     tags: [Chemistry Matching]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feature availability status
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
 *                       type: boolean
 *                     reason:
 *                       type: string
 *       401:
 *         description: Authentication required
 */
router.get(
  '/availability',
  chemistryController.checkAvailability.bind(chemistryController)
);

/**
 * @swagger
 * /api/v1/matching/chemistry/profile:
 *   get:
 *     summary: Get user's chemistry profile
 *     description: Retrieve the current user's chemistry profile
 *     tags: [Chemistry Matching]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chemistry profile retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Feature not available for this user
 *       404:
 *         description: Profile not found
 */
router.get(
  '/profile',
  chemistryController.getProfile.bind(chemistryController)
);

/**
 * @swagger
 * /api/v1/matching/chemistry/profile:
 *   post:
 *     summary: Build chemistry profile from behavior data
 *     description: |
 *       Analyzes user behavior data to build a chemistry profile.
 *       The profile is used for matching with other users based on
 *       behavioral compatibility signals.
 *     tags: [Chemistry Matching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - behaviorData
 *             properties:
 *               behaviorData:
 *                 type: object
 *                 properties:
 *                   activityLogs:
 *                     type: array
 *                     items:
 *                       type: object
 *                   messageHistory:
 *                     type: array
 *                     items:
 *                       type: object
 *                   swipeHistory:
 *                     type: array
 *                     items:
 *                       type: object
 *                   profileInteractions:
 *                     type: array
 *                     items:
 *                       type: object
 *               forceRebuild:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Profile built successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Feature not available for this user
 */
router.post(
  '/profile',
  validateBody(BuildChemistryProfileDto),
  chemistryController.buildProfile.bind(chemistryController)
);

/**
 * @swagger
 * /api/v1/matching/chemistry/score/{matchId}:
 *   get:
 *     summary: Calculate chemistry score with a match
 *     description: Calculate the chemistry compatibility score between the current user and a specific match
 *     tags: [Chemistry Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to calculate chemistry with
 *     responses:
 *       200:
 *         description: Chemistry score calculated successfully
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
 *                     matchId:
 *                       type: string
 *                     overall:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                     confidence:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 1
 *                     sparkPotential:
 *                       type: string
 *                       enum: [low, medium, high, exceptional]
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Feature not available for this user
 *       404:
 *         description: Profile not found
 */
router.get(
  '/score/:matchId',
  chemistryController.getChemistryScore.bind(chemistryController)
);

/**
 * @swagger
 * /api/v1/matching/chemistry/top-matches:
 *   get:
 *     summary: Get top chemistry matches
 *     description: |
 *       Retrieve the top potential matches ranked by chemistry score.
 *       Returns matches that exceed the minimum score threshold.
 *     tags: [Chemistry Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Maximum number of matches to return
 *       - in: query
 *         name: minimumScore
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           default: 75
 *         description: Minimum chemistry score threshold
 *       - in: query
 *         name: includeExplanations
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to include detailed explanations
 *     responses:
 *       200:
 *         description: Top matches retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Feature not available for this user
 *       404:
 *         description: Profile not found
 */
router.get(
  '/top-matches',
  validateQuery(GetTopChemistryMatchesQueryDto),
  chemistryController.getTopMatches.bind(chemistryController)
);

/**
 * @swagger
 * /api/v1/matching/chemistry/explain/{matchId}:
 *   get:
 *     summary: Get chemistry explanation for a match
 *     description: |
 *       Get a detailed, human-readable explanation of the chemistry
 *       between the current user and a specific match, including
 *       highlights, concerns, tips, and ice breakers.
 *     tags: [Chemistry Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to explain chemistry with
 *     responses:
 *       200:
 *         description: Chemistry explanation retrieved successfully
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
 *                     matchId:
 *                       type: string
 *                     summary:
 *                       type: string
 *                     highlights:
 *                       type: array
 *                       items:
 *                         type: string
 *                     concerns:
 *                       type: array
 *                       items:
 *                         type: string
 *                     tips:
 *                       type: array
 *                       items:
 *                         type: string
 *                     iceBreakers:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Feature not available for this user
 *       404:
 *         description: Profile not found
 */
router.get(
  '/explain/:matchId',
  chemistryController.getChemistryExplanation.bind(chemistryController)
);

/**
 * @swagger
 * /api/v1/matching/chemistry/find-matches:
 *   post:
 *     summary: Find high chemistry matches from candidates
 *     description: |
 *       Given a list of candidate user IDs, find those with high
 *       chemistry scores. Useful for filtering existing match candidates.
 *     tags: [Chemistry Matching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateIds
 *             properties:
 *               candidateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 description: List of user IDs to evaluate
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 20
 *               minimumScore:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 75
 *               includeExplanations:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Matches found successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Feature not available for this user
 *       404:
 *         description: Profile not found
 */
router.post(
  '/find-matches',
  validateBody(FindChemistryMatchesDto),
  chemistryController.findMatches.bind(chemistryController)
);

export default router;
