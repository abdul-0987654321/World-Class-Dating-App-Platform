import { createLogger } from '@flamoral/backend-shared';
import express, { Request, Response } from 'express';

import { GiftsService } from '../../domain/services/gifts.service';

const router = express.Router();
const logger = createLogger('gift-routes');
const giftsService = new GiftsService();

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role?: 'user' | 'admin' | 'moderator' | 'support';
  };
}

/**
 * Search gift products
 * GET /api/v1/partnerships/gifts/search
 */
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const { category, occasion, priceMin, priceMax, romantic, sortBy, limit, offset } = req.query;

    const results = await giftsService.searchProducts(userId, {
      category: category as any,
      occasion: occasion as string,
      priceMin: priceMin ? parseFloat(priceMin as string) : undefined,
      priceMax: priceMax ? parseFloat(priceMax as string) : undefined,
      romantic: romantic === 'true',
      sortBy: sortBy as 'price' | 'rating' | 'popular',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    logger.error('Gift search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get romantic gift suggestions
 * GET /api/v1/partnerships/gifts/romantic
 */
router.get('/romantic', async (req: AuthRequest, res: Response) => {
  try {
    const { budget } = req.query;

    const suggestions = await giftsService.getRomanticSuggestions(
      budget ? parseFloat(budget as string) : undefined
    );

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    logger.error('Romantic suggestions failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get gift ideas for an occasion
 * GET /api/v1/partnerships/gifts/occasions/:occasion
 */
router.get('/occasions/:occasion', async (req: AuthRequest, res: Response) => {
  try {
    const { occasion } = req.params;
    const { budget } = req.query;

    const ideas = await giftsService.getGiftIdeasForOccasion(
      occasion,
      budget ? parseFloat(budget as string) : undefined
    );

    res.json({
      success: true,
      data: ideas,
    });
  } catch (error: any) {
    logger.error('Gift ideas failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get product details
 * GET /api/v1/partnerships/gifts/:partnerId/:productId
 */
router.get('/:partnerId/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, productId } = req.params;

    const product = await giftsService.getProduct(partnerId, productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    logger.error('Get product failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get delivery options for a product
 * GET /api/v1/partnerships/gifts/:partnerId/:productId/delivery
 */
router.get('/:partnerId/:productId/delivery', async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, productId } = req.params;
    const { zipCode, date } = req.query;

    if (!zipCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: zipCode',
      });
    }

    const options = await giftsService.getDeliveryOptions(
      partnerId,
      productId,
      zipCode as string,
      date as string
    );

    res.json({
      success: true,
      data: options,
    });
  } catch (error: any) {
    logger.error('Get delivery options failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Create gift order
 * POST /api/v1/partnerships/gifts/orders
 */
router.post('/orders', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const {
      partnerId,
      items,
      shippingAddress,
      billingAddress,
      deliveryOptionId,
      giftMessage,
      isAnonymous,
      recipientMatchId,
    } = req.body;

    if (!partnerId || !items || !shippingAddress || !deliveryOptionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const order = await giftsService.createGiftOrder({
      userId: req.user.id,
      partnerId,
      items,
      shippingAddress,
      billingAddress,
      deliveryOptionId,
      giftMessage,
      isAnonymous,
      recipientMatchId,
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    logger.error('Create gift order failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Confirm gift order (after payment)
 * POST /api/v1/partnerships/gifts/orders/:orderId/confirm
 */
router.post('/orders/:orderId/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: paymentIntentId',
      });
    }

    const order = await giftsService.confirmGiftOrder(orderId, paymentIntentId);

    res.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    logger.error('Confirm gift order failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Cancel gift order
 * DELETE /api/v1/partnerships/gifts/orders/:orderId
 */
router.delete('/orders/:orderId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { orderId } = req.params;

    const order = await giftsService.cancelGiftOrder(orderId, req.user.id);

    res.json({
      success: true,
      data: order,
      message: 'Order cancelled successfully',
    });
  } catch (error: any) {
    logger.error('Cancel gift order failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get order status
 * GET /api/v1/partnerships/gifts/orders/:orderId/status
 */
router.get('/orders/:orderId/status', async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const status = await giftsService.getOrderStatus(orderId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Get order status failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get user's gift orders
 * GET /api/v1/partnerships/gifts/orders
 */
router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { status } = req.query;

    const orders = await giftsService.getUserGiftOrders(req.user.id, status as string | undefined);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    logger.error('Get gift orders failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
