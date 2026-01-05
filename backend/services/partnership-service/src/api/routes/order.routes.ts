import { createLogger } from '@flamoral/backend-shared';
import express, { Request, Response, RequestHandler } from 'express';

import { db } from '../../infrastructure/database/connection';

const router = express.Router();
const logger = createLogger('order-routes');

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
 * Get unified order history for user
 * GET /api/v1/partnerships/orders
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { orderType, status, page, limit } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;
  const offset = (pageNum - 1) * limitNum;

  // Build query for unified order history
  let query = db('order_history').where('user_id', req.user.id).orderBy('created_at', 'desc');

  if (orderType) {
    query = query.where('order_type', orderType);
  }

  if (status) {
    query = query.where('status', status);
  }

  // Get total count
  const [{ count }] = await query.clone().count('* as count');
  const total = parseInt(count as string) || 0;

  // Get paginated results
  const orders = await query.limit(limitNum).offset(offset);

  // Enrich with partner info
  const partnerIds = [...new Set(orders.map((o: any) => o.partner_id))];
  const partners = await db('partners').whereIn('id', partnerIds);
  const partnerMap = new Map(partners.map((p: any) => [p.id, p]));

  const enrichedOrders = orders.map((order: any) => ({
    id: order.id,
    userId: order.user_id,
    matchId: order.match_id,
    orderType: order.order_type,
    status: order.status,
    totalAmount: order.total_amount ? parseFloat(order.total_amount) : null,
    currency: order.currency,
    affiliateTrackingId: order.affiliate_tracking_id,
    commission: order.commission ? parseFloat(order.commission) : null,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    partner: partnerMap.get(order.partner_id)
      ? {
          id: partnerMap.get(order.partner_id).id,
          name: partnerMap.get(order.partner_id).name,
          type: partnerMap.get(order.partner_id).type,
          logoUrl: partnerMap.get(order.partner_id).logo_url,
        }
      : null,
  }));

  res.json({
    success: true,
    data: enrichedOrders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}));

/**
 * Get order statistics for user
 * GET /api/v1/partnerships/orders/stats
 */
router.get('/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const stats = await db('order_history')
    .where('user_id', req.user.id)
    .select('order_type')
    .count('* as count')
    .sum('total_amount as total_spent')
    .groupBy('order_type');

  const byStatus = await db('order_history')
    .where('user_id', req.user.id)
    .select('status')
    .count('* as count')
    .groupBy('status');

  const result = {
    byType: {} as Record<string, { count: number; totalSpent: number }>,
    byStatus: {} as Record<string, number>,
    totalOrders: 0,
    totalSpent: 0,
  };

  for (const row of stats) {
    const count = parseInt((row as any).count as string) || 0;
    const totalSpent = parseFloat((row as any).total_spent as string) || 0;

    result.byType[(row as any).order_type] = { count, totalSpent };
    result.totalOrders += count;
    result.totalSpent += totalSpent;
  }

  for (const row of byStatus) {
    result.byStatus[(row as any).status] = parseInt((row as any).count as string) || 0;
  }

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * Get order details by ID and type
 * GET /api/v1/partnerships/orders/:orderType/:orderId
 */
router.get('/:orderType/:orderId', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { orderType, orderId } = req.params;

  let order: any = null;
  let details: any = null;

  switch (orderType) {
    case 'reservation':
      order = await db('reservations').where('id', orderId).where('user_id', req.user.id).first();

      if (order) {
        const restaurant = await db('restaurants').where('id', order.restaurant_id).first();
        details = {
          ...order,
          restaurant,
        };
      }
      break;

    case 'ticket':
      order = await db('ticket_purchases')
        .where('id', orderId)
        .where('user_id', req.user.id)
        .first();

      if (order) {
        const event = await db('events').where('id', order.event_id).first();
        details = {
          ...order,
          tickets: typeof order.tickets === 'string' ? JSON.parse(order.tickets) : order.tickets,
          event,
        };
      }
      break;

    case 'gift':
      order = await db('gift_orders').where('id', orderId).where('user_id', req.user.id).first();

      if (order) {
        details = {
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
          shippingAddress:
            typeof order.shipping_address === 'string'
              ? JSON.parse(order.shipping_address)
              : order.shipping_address,
          deliveryOption:
            typeof order.delivery_option === 'string'
              ? JSON.parse(order.delivery_option)
              : order.delivery_option,
        };
      }
      break;

    default:
      res.status(400).json({
        success: false,
        error: 'Invalid order type',
      });
      return;
  }

  if (!details) {
    res.status(404).json({
      success: false,
      error: 'Order not found',
    });
    return;
  }

  // Get partner info
  const partner = await db('partners').where('id', order.partner_id).first();

  res.json({
    success: true,
    data: {
      ...details,
      partner: partner
        ? {
            id: partner.id,
            name: partner.name,
            type: partner.type,
            logoUrl: partner.logo_url,
            contactEmail: partner.contact_email,
            contactPhone: partner.contact_phone,
          }
        : null,
    },
  });
}));

export default router;
