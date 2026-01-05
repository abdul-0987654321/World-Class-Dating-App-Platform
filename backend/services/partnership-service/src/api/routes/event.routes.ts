import { createLogger } from '@flamoral/backend-shared';
import express, { Request, Response, RequestHandler } from 'express';

import { EventsService } from '../../domain/services/events.service';

const router = express.Router();
const logger = createLogger('event-routes');
const eventsService = new EventsService();

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
 * Search events
 * GET /api/v1/partnerships/events/search
 */
router.get('/search', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || 'anonymous';
  const {
    latitude,
    longitude,
    startDate,
    endDate,
    category,
    priceMin,
    priceMax,
    dateFriendlyOnly,
    keyword,
    radiusMiles,
  } = req.query;

  if (!latitude || !longitude || !startDate) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: latitude, longitude, startDate',
    });
    return;
  }

  const results = await eventsService.searchEvents(userId, {
    latitude: parseFloat(latitude as string),
    longitude: parseFloat(longitude as string),
    startDate: startDate as string,
    endDate: endDate as string,
    category: category ? ((category as string).split(',') as any) : undefined,
    priceMin: priceMin ? parseFloat(priceMin as string) : undefined,
    priceMax: priceMax ? parseFloat(priceMax as string) : undefined,
    dateFriendlyOnly: dateFriendlyOnly === 'true',
    keyword: keyword as string,
    radiusMiles: radiusMiles ? parseInt(radiusMiles as string) : undefined,
  });

  res.json({
    success: true,
    data: results,
  });
}));

/**
 * Get date-friendly events
 * GET /api/v1/partnerships/events/date-friendly
 */
router.get('/date-friendly', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { latitude, longitude, startDate, budget } = req.query;

  if (!latitude || !longitude) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: latitude, longitude',
    });
    return;
  }

  const events = await eventsService.getDateFriendlyEvents(
    parseFloat(latitude as string),
    parseFloat(longitude as string),
    startDate as string,
    budget ? parseFloat(budget as string) : undefined
  );

  res.json({
    success: true,
    data: events,
  });
}));

/**
 * Get event details
 * GET /api/v1/partnerships/events/:partnerId/:eventId
 */
router.get('/:partnerId/:eventId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { partnerId, eventId } = req.params;

  const event = await eventsService.getEvent(partnerId, eventId);

  if (!event) {
    res.status(404).json({
      success: false,
      error: 'Event not found',
    });
    return;
  }

  res.json({
    success: true,
    data: event,
  });
}));

/**
 * Get event inventory/availability
 * GET /api/v1/partnerships/events/:partnerId/:eventId/inventory
 */
router.get('/:partnerId/:eventId/inventory', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { partnerId, eventId } = req.params;

  const inventory = await eventsService.getEventInventory(partnerId, eventId);

  res.json({
    success: true,
    data: inventory,
  });
}));

/**
 * Create ticket purchase
 * POST /api/v1/partnerships/events/purchases
 */
router.post('/purchases', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { partnerId, eventId, tickets, totalAmount, currency, matchId } = req.body;

  if (!partnerId || !eventId || !tickets || !totalAmount) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
    });
    return;
  }

  const purchase = await eventsService.createTicketPurchase({
    userId: req.user.id,
    partnerId,
    eventId,
    tickets,
    totalAmount,
    currency: currency || 'USD',
    matchId,
  });

  res.status(201).json({
    success: true,
    data: purchase,
  });
}));

/**
 * Confirm ticket purchase (after payment)
 * POST /api/v1/partnerships/events/purchases/:purchaseId/confirm
 */
router.post('/purchases/:purchaseId/confirm', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { purchaseId } = req.params;
  const { externalOrderId, paymentIntentId } = req.body;

  if (!externalOrderId || !paymentIntentId) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: externalOrderId, paymentIntentId',
    });
    return;
  }

  const purchase = await eventsService.confirmTicketPurchase(
    purchaseId,
    externalOrderId,
    paymentIntentId
  );

  res.json({
    success: true,
    data: purchase,
  });
}));

/**
 * Cancel ticket purchase
 * DELETE /api/v1/partnerships/events/purchases/:purchaseId
 */
router.delete('/purchases/:purchaseId', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { purchaseId } = req.params;

  const purchase = await eventsService.cancelTicketPurchase(purchaseId, req.user.id);

  res.json({
    success: true,
    data: purchase,
    message: 'Purchase cancelled successfully',
  });
}));

/**
 * Get user's ticket purchases
 * GET /api/v1/partnerships/events/purchases
 */
router.get('/purchases', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { status } = req.query;

  const purchases = await eventsService.getUserTicketPurchases(
    req.user.id,
    status as string | undefined
  );

  res.json({
    success: true,
    data: purchases,
  });
}));

/**
 * Get upcoming events by category
 * GET /api/v1/partnerships/events/upcoming/:category
 */
router.get('/upcoming/:category', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { category } = req.params;
  const { latitude, longitude, limit } = req.query;

  if (!latitude || !longitude) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: latitude, longitude',
    });
    return;
  }

  const events = await eventsService.getUpcomingEvents(
    parseFloat(latitude as string),
    parseFloat(longitude as string),
    category,
    limit ? parseInt(limit as string) : 10
  );

  res.json({
    success: true,
    data: events,
  });
}));

export default router;
