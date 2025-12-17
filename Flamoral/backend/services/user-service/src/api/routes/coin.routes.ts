import { Router } from 'express';
import { CoinController } from '../controllers/coin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  purchaseCoinsSchema,
  spendCoinsSchema,
  transactionHistoryQuerySchema,
} from '../validators/coin.validator';

const router = Router();
const coinController = new CoinController();

/**
 * @swagger
 * /api/coins/balance:
 *   get:
 *     summary: Get user's coin balance
 *     tags: [Coins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/balance',
  authenticate,
  coinController.getBalance.bind(coinController)
);

/**
 * @swagger
 * /api/coins/transactions:
 *   get:
 *     summary: Get transaction history
 *     tags: [Coins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [purchase, reward, spent, refund, admin_adjustment]
 *         description: Filter by transaction type
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 */
router.get(
  '/transactions',
  authenticate,
  validate(transactionHistoryQuerySchema, 'query'),
  coinController.getTransactionHistory.bind(coinController)
);

/**
 * @swagger
 * /api/coins/transactions/summary:
 *   get:
 *     summary: Get transaction summary
 *     tags: [Coins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 */
router.get(
  '/transactions/summary',
  authenticate,
  coinController.getTransactionSummary.bind(coinController)
);

/**
 * @swagger
 * /api/coins/products:
 *   get:
 *     summary: Get available coin products
 *     tags: [Coins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 */
router.get(
  '/products',
  authenticate,
  coinController.getProducts.bind(coinController)
);

/**
 * @swagger
 * /api/coins/purchase:
 *   post:
 *     summary: Purchase coins
 *     tags: [Coins]
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
 *               - stripePaymentId
 *             properties:
 *               productSku:
 *                 type: string
 *               stripePaymentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coins purchased successfully
 *       400:
 *         description: Purchase failed
 */
router.post(
  '/purchase',
  authenticate,
  validate(purchaseCoinsSchema),
  coinController.purchaseCoins.bind(coinController)
);

/**
 * @swagger
 * /api/coins/spend:
 *   post:
 *     summary: Spend coins
 *     tags: [Coins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - reason
 *             properties:
 *               amount:
 *                 type: integer
 *               reason:
 *                 type: string
 *               referenceId:
 *                 type: string
 *               referenceType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coins spent successfully
 *       400:
 *         description: Insufficient balance or invalid request
 */
router.post(
  '/spend',
  authenticate,
  validate(spendCoinsSchema),
  coinController.spendCoins.bind(coinController)
);

/**
 * @swagger
 * /api/coins/daily-reward:
 *   post:
 *     summary: Claim daily reward
 *     tags: [Coins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily reward claimed successfully
 *       400:
 *         description: Already claimed today
 */
router.post(
  '/daily-reward',
  authenticate,
  coinController.claimDailyReward.bind(coinController)
);

export default router;
