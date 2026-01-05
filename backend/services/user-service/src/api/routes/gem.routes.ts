import { Router, Request, Response } from 'express';

import { GEM_PRICES } from '../../domain/entities/Gem.entity';
import { gemService } from '../../domain/services/gem.service';
import logger from '../../utils/logger';
import { authMiddleware } from '../middleware/auth.middleware';

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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
    const { itemType } = req.params;

    if (!(itemType in GEM_PRICES)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type',
      });
    }

    const canAfford = await gemService.canAfford(userId, itemType as keyof typeof GEM_PRICES);
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

// ========================================
// GEM STORE ENDPOINTS
// ========================================

/**
 * @swagger
 * /api/v1/gems/store:
 *   get:
 *     summary: Get all available store items
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [boost, superlike, spotlight, gift, utility, cosmetic]
 *         description: Filter by item type
 *     responses:
 *       200:
 *         description: List of store items
 */
router.get('/store', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    let items;

    if (type && typeof type === 'string') {
      items = await gemService.getStoreItemsByType(type as any);
    } else {
      items = await gemService.getStoreItems();
    }

    res.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    logger.error('Error getting store items:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get store items',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/store/{itemId}:
 *   get:
 *     summary: Get a specific store item
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Store item details
 *       404:
 *         description: Item not found
 */
router.get('/store/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const item = await gemService.getStoreItem(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Store item not found',
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    logger.error('Error getting store item:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get store item',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/purchase/{itemId}:
 *   post:
 *     summary: Purchase an item from the store
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase successful
 *       400:
 *         description: Insufficient gems or invalid item
 */
router.post('/purchase/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const result = await gemService.purchaseItem(userId, itemId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: result.gem ? { balance: result.gem.balance } : undefined,
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        purchase: result.purchase,
        gem: result.gem,
      },
    });
  } catch (error: any) {
    logger.error('Error purchasing item:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to purchase item',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/purchases:
 *   get:
 *     summary: Get purchase history
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
 *         description: Purchase history
 */
router.get('/purchases', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const purchases = await gemService.getPurchaseHistory(userId, limit, offset);

    res.json({
      success: true,
      data: purchases,
      pagination: {
        limit,
        offset,
        hasMore: purchases.length === limit,
      },
    });
  } catch (error: any) {
    logger.error('Error getting purchases:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get purchases',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/active:
 *   get:
 *     summary: Get active purchased items
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active items
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const activeItems = await gemService.getActiveItems(userId);

    res.json({
      success: true,
      data: activeItems,
    });
  } catch (error: any) {
    logger.error('Error getting active items:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get active items',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/activate/{purchaseId}:
 *   post:
 *     summary: Activate a purchased boost/spotlight
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item activated
 *       400:
 *         description: Cannot activate item
 */
router.post('/activate/:purchaseId', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { purchaseId } = req.params;

    const result = await gemService.activateBoost(userId, purchaseId);

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
        purchase: result.purchase,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error: any) {
    logger.error('Error activating item:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate item',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/gift/{recipientId}:
 *   post:
 *     summary: Send a gift to another user
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: The store item ID for the gift
 *               message:
 *                 type: string
 *                 description: Optional message to send with the gift
 *     responses:
 *       200:
 *         description: Gift sent successfully
 *       400:
 *         description: Cannot send gift
 */
router.post('/gift/:recipientId', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { recipientId } = req.params;
    const { itemId, message } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required',
      });
    }

    if (recipientId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send a gift to yourself',
      });
    }

    const result = await gemService.sendGiftFromStore(userId, recipientId, itemId, message);

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
        purchase: result.purchase,
        gem: result.gem,
      },
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
 * /api/v1/gems/gifts/received:
 *   get:
 *     summary: Get gifts received by the user
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
 *         description: List of received gifts
 */
router.get('/gifts/received', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const gifts = await gemService.getReceivedGifts(userId, limit, offset);

    res.json({
      success: true,
      data: gifts,
      pagination: {
        limit,
        offset,
        hasMore: gifts.length === limit,
      },
    });
  } catch (error: any) {
    logger.error('Error getting received gifts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get received gifts',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/use/superlike:
 *   post:
 *     summary: Use a super like from purchased pack
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Super like used
 *       400:
 *         description: No super likes available
 */
router.post('/use/superlike', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const result = await gemService.useSuperLike(userId);

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
        remaining: result.remaining,
      },
    });
  } catch (error: any) {
    logger.error('Error using super like:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to use super like',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/use/undo:
 *   post:
 *     summary: Use an undo pass
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Undo pass used
 *       400:
 *         description: No undo passes available
 */
router.post('/use/undo', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const result = await gemService.useUndoPass(userId);

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
        purchase: result.purchase,
      },
    });
  } catch (error: any) {
    logger.error('Error using undo pass:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to use undo pass',
    });
  }
});

/**
 * @swagger
 * /api/v1/gems/purchase-stats:
 *   get:
 *     summary: Get purchase statistics
 *     tags: [Gems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Purchase statistics
 */
router.get('/purchase-stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const stats = await gemService.getPurchaseStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting purchase stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get purchase stats',
    });
  }
});

export default router;
