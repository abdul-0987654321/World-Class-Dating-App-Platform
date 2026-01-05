import { createLogger } from '@flamoral/backend-shared';
import express, { Request, Response, RequestHandler } from 'express';

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

// Helper to wrap async handlers
const asyncHandler = (fn: (req: AuthRequest, res: Response) => Promise<void>): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as AuthRequest, res)).catch(next);
  };
};

/**
 * Search gift products
 * GET /api/v1/partnerships/gifts/search
 */
router.get('/search', asyncHandler(async (req: AuthRequest, res: Response) => {
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
}));

/**
 * Get romantic gift suggestions
 * GET /api/v1/partnerships/gifts/romantic
 */
router.get('/romantic', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { budget } = req.query;

  const suggestions = await giftsService.getRomanticSuggestions(
    budget ? parseFloat(budget as string) : undefined
  );

  res.json({
    success: true,
    data: suggestions,
  });
}));

/**
 * Get gift ideas for an occasion
 * GET /api/v1/partnerships/gifts/occasions/:occasion
 */
router.get('/occasions/:occasion', asyncHandler(async (req: AuthRequest, res: Response) => {
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
}));

/**
 * Get product details
 * GET /api/v1/partnerships/gifts/:partnerId/:productId
 */
router.get('/:partnerId/:productId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { partnerId, productId } = req.params;

  const product = await giftsService.getProduct(partnerId, productId);

  if (!product) {
    res.status(404).json({
      success: false,
      error: 'Product not found',
    });
    return;
  }

  res.json({
    success: true,
    data: product,
  });
}));

/**
 * Get delivery options for a product
 * GET /api/v1/partnerships/gifts/:partnerId/:productId/delivery
 */
router.get('/:partnerId/:productId/delivery', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { partnerId, productId } = req.params;
  const { zipCode, date } = req.query;

  if (!zipCode) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameter: zipCode',
    });
    return;
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
}));

/**
 * Create gift order
 * POST /api/v1/partnerships/gifts/orders
 */
router.post('/orders', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
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
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
    });
    return;
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
}));

/**
 * Confirm gift order (after payment)
 * POST /api/v1/partnerships/gifts/orders/:orderId/confirm
 */
router.post('/orders/:orderId/confirm', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    res.status(400).json({
      success: false,
      error: 'Missing required field: paymentIntentId',
    });
    return;
  }

  const order = await giftsService.confirmGiftOrder(orderId, paymentIntentId);

  res.json({
    success: true,
    data: order,
  });
}));

/**
 * Cancel gift order
 * DELETE /api/v1/partnerships/gifts/orders/:orderId
 */
router.delete('/orders/:orderId', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { orderId } = req.params;

  const order = await giftsService.cancelGiftOrder(orderId, req.user.id);

  res.json({
    success: true,
    data: order,
    message: 'Order cancelled successfully',
  });
}));

/**
 * Get order status
 * GET /api/v1/partnerships/gifts/orders/:orderId/status
 */
router.get('/orders/:orderId/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;

  const status = await giftsService.getOrderStatus(orderId);

  res.json({
    success: true,
    data: status,
  });
}));

/**
 * Get user's gift orders
 * GET /api/v1/partnerships/gifts/orders
 */
router.get('/orders', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { status } = req.query;

  const orders = await giftsService.getUserGiftOrders(req.user.id, status as string | undefined);

  res.json({
    success: true,
    data: orders,
  });
}));

export default router;
