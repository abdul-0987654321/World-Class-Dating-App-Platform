import { Router } from 'express';
import { SwipeController } from '../controllers/swipe.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const swipeController = new SwipeController();

/**
 * @swagger
 * /api/swipes/like:
 *   post:
 *     summary: Like a user
 *     tags: [Swipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target_user_id
 *             properties:
 *               target_user_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Like sent or match created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/like', authenticate, swipeController.like.bind(swipeController));

/**
 * @swagger
 * /api/swipes/pass:
 *   post:
 *     summary: Pass on a user
 *     tags: [Swipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target_user_id
 *             properties:
 *               target_user_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pass recorded
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/pass', authenticate, swipeController.pass.bind(swipeController));

/**
 * @swagger
 * /api/swipes/super-like:
 *   post:
 *     summary: Super Like a user
 *     tags: [Swipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target_user_id
 *             properties:
 *               target_user_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Super Like sent or match created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/super-like', authenticate, swipeController.superLike.bind(swipeController));

/**
 * @swagger
 * /api/swipes/likes-received:
 *   get:
 *     summary: Get likes received
 *     tags: [Swipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Likes retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/likes-received', authenticate, swipeController.getLikesReceived.bind(swipeController));

/**
 * @swagger
 * /api/swipes/super-likes-received:
 *   get:
 *     summary: Get super likes received
 *     tags: [Swipes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Super likes retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/super-likes-received', authenticate, swipeController.getSuperLikesReceived.bind(swipeController));

/**
 * @swagger
 * /api/swipes/stats:
 *   get:
 *     summary: Get swipe statistics
 *     tags: [Swipes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, swipeController.getSwipeStats.bind(swipeController));

export default router;
