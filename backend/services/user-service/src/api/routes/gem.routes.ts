import { Router, Request, Response } from 'express';
import { gemService } from '../../domain/services/gem.service';
import { GEM_PRICES } from '../../domain/entities/Gem.entity';
import { authMiddleware } from '../middleware/auth.middleware';
import logger from '../../utils/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/gems/balance:
 *   get:
 *     summary: Get current gem balance
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current gem balance
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const gem = await gemService.getBalance(userId);

    res.json({
      success: true,
      data: gem,
    });
  } catch (error: any) {
    logger.error('Error getting gem balance:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get gem balance',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/items:
 *   get:
 *     summary: Get all available items and prices
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available items
 */
router.get('/items', async (req: Request, res: Response) => {
  try {
    const items = gemService.getAvailableItems();

    res.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    logger.error('Error getting gem items:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get items',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/spend:
 *   post:
 *     summary: Spend gems on an item
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemType
 *             properties:
 *               itemType:
 *                 type: string
 *                 enum: [PRIORITY_QUEUE_24H, PROFILE_SPOTLIGHT_24H, etc.]
 *     responses:
 *       200:
 *         description: Purchase result
 */
router.post('/spend', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemType, metadata } = req.body;

    if (!itemType || !(itemType in GEM_PRICES)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type',
      });
    }

    const result = await gemService.spendOnItem(userId, itemType, metadata);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: { balance: result.gem.balance },
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: result.gem,
    });
  } catch (error: any) {
    logger.error('Error spending gems:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to spend gems',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/activate:
 *   post:
 *     summary: Activate a premium feature with gems
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - featureType
 *             properties:
 *               featureType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feature activation result
 */
router.post('/activate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { featureType } = req.body;

    if (!featureType || !(featureType in GEM_PRICES)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feature type',
      });
    }

    const result = await gemService.activateFeature(userId, featureType);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        gem: result.gem,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error: any) {
    logger.error('Error activating feature:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate feature',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/gift:
 *   post:
 *     summary: Send a virtual gift to another user
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - giftType
 *             properties:
 *               recipientId:
 *                 type: string
 *               giftType:
 *                 type: string
 *                 enum: [GIFT_ROSE, GIFT_HEART, GIFT_DIAMOND, GIFT_CROWN]
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gift sent successfully
 */
router.post('/gift', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { recipientId, giftType, message } = req.body;

    if (!recipientId || !giftType) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID and gift type are required',
      });
    }

    const validGifts = ['GIFT_ROSE', 'GIFT_HEART', 'GIFT_DIAMOND', 'GIFT_CROWN'];
    if (!validGifts.includes(giftType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gift type',
      });
    }

    if (recipientId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send a gift to yourself',
      });
    }

    const result = await gemService.sendGift(userId, recipientId, giftType, message);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: { gem: result.gem },
    });
  } catch (error: any) {
    logger.error('Error sending gift:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send gift',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/transactions:
 *   get:
 *     summary: Get gem transaction history
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Transaction history
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await gemService.getTransactionHistory(userId, limit, offset);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit,
      },
    });
  } catch (error: any) {
    logger.error('Error getting transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get transactions',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/analytics:
 *   get:
 *     summary: Get spending analytics
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Spending analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const analytics = await gemService.getSpendingAnalytics(userId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get analytics',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/can-afford/{itemType}:
 *   get:
 *     summary: Check if user can afford an item
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Affordability check result
 */
router.get('/can-afford/:itemType', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemType } = req.params;

    if (!(itemType in GEM_PRICES)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type',
      });
    }

    const canAfford = await gemService.canAfford(
      userId,
      itemType as keyof typeof GEM_PRICES
    );
    const price = GEM_PRICES[itemType as keyof typeof GEM_PRICES];
    const balance = (await gemService.getBalance(userId)).balance;

    res.json({
      success: true,
      data: {
        canAfford,
        price,
        balance,
        shortfall: canAfford ? 0 : price - balance,
      },
    });
  } catch (error: any) {
    logger.error('Error checking affordability:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check affordability',
    });
  }
});

export default router;
