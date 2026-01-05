import { Router } from 'express';

import { BoostController } from '../controllers/boost.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { purchaseBoostSchema, boostHistoryQuerySchema } from '../validators/boost.validator';

const router = Router();
const boostController = new BoostController();

/**
 * @swagger
 * /api/boosts/products:
 *   get:
 *     summary: Get available boost products
 *     description: Returns all active boost products with pricing and duration information
 *     tags: [Boosts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Boost products retrieved successfully
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
 *                     $ref: '#/components/schemas/BoostProduct'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/products', authenticate, boostController.getProducts.bind(boostController));

/**
 * @swagger
 * /api/boosts/purchase:
 *   post:
 *     summary: Purchase a profile boost with coins
 *     description: Purchase a boost to increase profile visibility. Requires sufficient coin balance.
 *     tags: [Boosts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productSku
 *             properties:
 *               productSku:
 *                 type: string
 *                 example: BOOST_1HR
 *                 description: Product SKU for the boost
 *     responses:
 *       200:
 *         description: Boost purchased successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BoostInstance'
 *       400:
 *         description: Insufficient balance or invalid product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/purchase',
  authenticate,
  validate(purchaseBoostSchema),
  boostController.purchaseWithCoins.bind(boostController)
);

/**
 * @swagger
 * /api/boosts/active:
 *   get:
 *     summary: Get current active boost
 *     description: Returns the currently active boost if one exists
 *     tags: [Boosts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active boost retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BoostInstance'
 *       404:
 *         description: No active boost found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/active', authenticate, boostController.getActiveBoost.bind(boostController));

/**
 * @swagger
 * /api/boosts/history:
 *   get:
 *     summary: Get boost purchase history
 *     description: Returns paginated history of past boosts
 *     tags: [Boosts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Boost history retrieved successfully
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
 *                     $ref: '#/components/schemas/BoostInstance'
 */
router.get(
  '/history',
  authenticate,
  validate(boostHistoryQuerySchema, 'query'),
  boostController.getHistory.bind(boostController)
);

/**
 * @swagger
 * /api/boosts/stats:
 *   get:
 *     summary: Get boost statistics
 *     description: Returns aggregate statistics for all boosts used by the user
 *     tags: [Boosts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Boost statistics retrieved successfully
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
 *                     totalBoosts:
 *                       type: integer
 *                     totalViews:
 *                       type: integer
 *                     totalLikes:
 *                       type: integer
 *                     averageViewsPerBoost:
 *                       type: number
 *                     averageLikesPerBoost:
 *                       type: number
 */
router.get('/stats', authenticate, boostController.getStats.bind(boostController));

/**
 * @swagger
 * /api/boosts/cancel:
 *   post:
 *     summary: Cancel active boost
 *     description: Cancel the currently active boost (no refund)
 *     tags: [Boosts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Boost canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: No active boost to cancel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/cancel', authenticate, boostController.cancelBoost.bind(boostController));

export default router;
