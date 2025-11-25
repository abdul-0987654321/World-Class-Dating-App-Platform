/**
 * Speed Dating API Routes
 * Live video speed dating events
 */

import { Router, Request, Response, NextFunction } from 'express';
import { speedDatingService } from '../../services/core/SpeedDating.service';
import { logger } from '../../utils/logger';

const router = Router();

// Middleware to extract user ID
const getUserId = (req: Request): string => {
  return (req as any).user?.id || req.headers['x-user-id'] as string || 'demo_user';
};

/**
 * @swagger
 * /api/speed-dating/events:
 *   get:
 *     summary: Get upcoming speed dating events
 *     tags: [SpeedDating]
 */
router.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, theme } = req.query;

    const events = await speedDatingService.getUpcomingEvents({
      type: type as any,
      theme: theme as string,
    });

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/events/{eventId}:
 *   get:
 *     summary: Get event details
 *     tags: [SpeedDating]
 */
router.get('/events/:eventId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const event = await speedDatingService.getEvent(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/events/{eventId}/register:
 *   post:
 *     summary: Register for a speed dating event
 *     tags: [SpeedDating]
 */
router.post('/events/:eventId/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { eventId } = req.params;
    const { gender, userTier } = req.body;

    if (!gender) {
      return res.status(400).json({
        success: false,
        error: { message: 'Gender is required', code: 'MISSING_GENDER' }
      });
    }

    const result = await speedDatingService.registerForEvent(eventId, userId, gender, userTier);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'REGISTRATION_FAILED' }
      });
    }

    res.status(201).json({
      success: true,
      data: result.participant
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/events/{eventId}/check-in:
 *   post:
 *     summary: Check in to a speed dating event
 *     tags: [SpeedDating]
 */
router.post('/events/:eventId/check-in', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { eventId } = req.params;

    const result = await speedDatingService.checkIn(eventId, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'CHECK_IN_FAILED' }
      });
    }

    res.json({
      success: true,
      data: { message: 'Successfully checked in' }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/events/{eventId}/current-round:
 *   get:
 *     summary: Get current round status
 *     tags: [SpeedDating]
 */
router.get('/events/:eventId/current-round', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const round = await speedDatingService.getCurrentRound(eventId);

    res.json({
      success: true,
      data: round
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/events/{eventId}/my-pairing:
 *   get:
 *     summary: Get user's current pairing and room info
 *     tags: [SpeedDating]
 */
router.get('/events/:eventId/my-pairing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { eventId } = req.params;

    const pairing = await speedDatingService.getUserPairing(eventId, userId);

    if (!pairing) {
      return res.json({
        success: true,
        data: null,
        message: 'No active pairing'
      });
    }

    res.json({
      success: true,
      data: pairing
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/events/{eventId}/interest:
 *   post:
 *     summary: Mark interest in a partner
 *     tags: [SpeedDating]
 */
router.post('/events/:eventId/interest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { eventId } = req.params;
    const { partnerId, interested } = req.body;

    if (!partnerId || interested === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'partnerId and interested status required', code: 'MISSING_DATA' }
      });
    }

    const result = await speedDatingService.markInterest(eventId, userId, partnerId, interested);

    res.json({
      success: true,
      data: {
        success: result.success,
        isMatch: result.isMatch,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/events/{eventId}/matches:
 *   get:
 *     summary: Get user's matches from an event
 *     tags: [SpeedDating]
 */
router.get('/events/:eventId/matches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { eventId } = req.params;

    const matches = await speedDatingService.getUserEventMatches(eventId, userId);

    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/history:
 *   get:
 *     summary: Get user's speed dating event history
 *     tags: [SpeedDating]
 */
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const history = await speedDatingService.getUserEventHistory(userId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/events/{eventId}/start:
 *   post:
 *     summary: Start an event (admin only)
 *     tags: [SpeedDating]
 */
router.post('/events/:eventId/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const result = await speedDatingService.startEvent(eventId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'START_FAILED' }
      });
    }

    res.json({
      success: true,
      data: { rounds: result.rounds }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/events/{eventId}/complete:
 *   post:
 *     summary: Complete an event and reveal matches (admin only)
 *     tags: [SpeedDating]
 */
router.post('/events/:eventId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const result = await speedDatingService.completeEvent(eventId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'COMPLETE_FAILED' }
      });
    }

    res.json({
      success: true,
      data: { matches: result.matches }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/speed-dating/admin/events:
 *   post:
 *     summary: Create a new event (admin only)
 *     tags: [SpeedDating]
 */
router.post('/admin/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventData = req.body;
    const event = await speedDatingService.createEvent(eventData);

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
});

export default router;
