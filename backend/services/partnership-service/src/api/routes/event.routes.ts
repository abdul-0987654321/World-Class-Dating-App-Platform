import express, { Request, Response } from 'express';
import { EventsService } from '../../domain/services/events.service';
import { createLogger } from '@flamoral/backend-shared';

const router = express.Router();
const logger = createLogger('event-routes');
const eventsService = new EventsService();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Search events
 * GET /api/v1/partnerships/events/search
 */
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
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
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: latitude, longitude, startDate',
      });
    }

    const results = await eventsService.searchEvents(userId, {
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      startDate: startDate as string,
      endDate: endDate as string,
      category: category ? (category as string).split(',') as any : undefined,
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
  } catch (error: any) {
    logger.error('Event search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get date-friendly events
 * GET /api/v1/partnerships/events/date-friendly
 */
router.get('/date-friendly', async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude, startDate, budget } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: latitude, longitude',
      });
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
  } catch (error: any) {
    logger.error('Date-friendly events failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get event details
 * GET /api/v1/partnerships/events/:partnerId/:eventId
 */
router.get('/:partnerId/:eventId', async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, eventId } = req.params;

    const event = await eventsService.getEvent(partnerId, eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    logger.error('Get event failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get event inventory/availability
 * GET /api/v1/partnerships/events/:partnerId/:eventId/inventory
 */
router.get('/:partnerId/:eventId/inventory', async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, eventId } = req.params;

    const inventory = await eventsService.getEventInventory(partnerId, eventId);

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error: any) {
    logger.error('Get event inventory failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Create ticket purchase
 * POST /api/v1/partnerships/events/purchases
 */
router.post('/purchases', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { partnerId, eventId, tickets, totalAmount, currency, matchId } = req.body;

    if (!partnerId || !eventId || !tickets || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
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
  } catch (error: any) {
    logger.error('Create ticket purchase failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Confirm ticket purchase (after payment)
 * POST /api/v1/partnerships/events/purchases/:purchaseId/confirm
 */
router.post('/purchases/:purchaseId/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const { purchaseId } = req.params;
    const { externalOrderId, paymentIntentId } = req.body;

    if (!externalOrderId || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: externalOrderId, paymentIntentId',
      });
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
  } catch (error: any) {
    logger.error('Confirm ticket purchase failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Cancel ticket purchase
 * DELETE /api/v1/partnerships/events/purchases/:purchaseId
 */
router.delete('/purchases/:purchaseId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { purchaseId } = req.params;

    const purchase = await eventsService.cancelTicketPurchase(
      purchaseId,
      req.user.id
    );

    res.json({
      success: true,
      data: purchase,
      message: 'Purchase cancelled successfully',
    });
  } catch (error: any) {
    logger.error('Cancel ticket purchase failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get user's ticket purchases
 * GET /api/v1/partnerships/events/purchases
 */
router.get('/purchases', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
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
  } catch (error: any) {
    logger.error('Get ticket purchases failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get upcoming events by category
 * GET /api/v1/partnerships/events/upcoming/:category
 */
router.get('/upcoming/:category', async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.params;
    const { latitude, longitude, limit } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: latitude, longitude',
      });
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
  } catch (error: any) {
    logger.error('Get upcoming events failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
