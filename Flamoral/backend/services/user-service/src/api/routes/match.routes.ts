import { Router } from 'express';
import { MatchController } from '../controllers/match.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const matchController = new MatchController();

/**
 * @swagger
 * /api/matches:
 *   get:
 *     summary: Get all user's matches
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Matches retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, matchController.getUserMatches.bind(matchController));

/**
 * @swagger
 * /api/matches/{matchId}:
 *   get:
 *     summary: Get match details
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Match details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Match not found
 */
router.get('/:matchId', authenticate, matchController.getMatchDetail.bind(matchController));

/**
 * @swagger
 * /api/matches/{matchId}/unmatch:
 *   post:
 *     summary: Unmatch with a user
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unmatched successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/:matchId/unmatch', authenticate, matchController.unmatch.bind(matchController));

/**
 * @swagger
 * /api/matches/stats:
 *   get:
 *     summary: Get match statistics
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, matchController.getMatchStats.bind(matchController));

export default router;
