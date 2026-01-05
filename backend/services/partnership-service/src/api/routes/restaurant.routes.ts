import { createLogger } from '@flamoral/backend-shared';
import express, { Request, Response, RequestHandler } from 'express';

import { RestaurantService } from '../../domain/services/restaurant.service';

const router = express.Router();
const logger = createLogger('restaurant-routes');
const restaurantService = new RestaurantService();

// Extend Request type with user property
interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role?: 'user' | 'admin' | 'moderator' | 'support';
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

// Helper to wrap async handlers
const asyncHandler = (fn: (req: AuthRequest, res: Response) => Promise<void>): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as AuthRequest, res)).catch(next);
  };
};

/**
 * Search restaurants
 * GET /api/v1/partnerships/restaurants/search
 */
router.get('/search', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || 'anonymous';
  const {
    latitude,
    longitude,
    date,
    time,
    partySize,
    cuisine,
    priceRange,
    dateNightOnly,
    minRating,
    radiusMiles,
  } = req.query;

  if (!latitude || !longitude || !date || !time || !partySize) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: latitude, longitude, date, time, partySize',
    });
    return;
  }

  const results = await restaurantService.searchRestaurants(userId, {
    latitude: parseFloat(latitude as string),
    longitude: parseFloat(longitude as string),
    date: date as string,
    time: time as string,
    partySize: parseInt(partySize as string),
    cuisine: cuisine ? (cuisine as string).split(',') : undefined,
    priceRange: priceRange
      ? (priceRange as string).split(',').map((p) => parseInt(p))
      : undefined,
    dateNightOnly: dateNightOnly === 'true',
    minRating: minRating ? parseFloat(minRating as string) : undefined,
    radiusMiles: radiusMiles ? parseInt(radiusMiles as string) : undefined,
  });

  res.json({
    success: true,
    data: results,
  });
}));

/**
 * Get date night restaurant suggestions
 * GET /api/v1/partnerships/restaurants/date-night
 */
router.get('/date-night', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { latitude, longitude, budget } = req.query;

  if (!latitude || !longitude) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: latitude, longitude',
    });
    return;
  }

  const suggestions = await restaurantService.getDateNightSuggestions(
    parseFloat(latitude as string),
    parseFloat(longitude as string),
    budget ? parseFloat(budget as string) : undefined
  );

  res.json({
    success: true,
    data: suggestions,
  });
}));

/**
 * Get restaurant availability
 * GET /api/v1/partnerships/restaurants/:partnerId/:restaurantId/availability
 */
router.get('/:partnerId/:restaurantId/availability', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { partnerId, restaurantId } = req.params;
  const { date, partySize } = req.query;

  if (!date || !partySize) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: date, partySize',
    });
    return;
  }

  const availability = await restaurantService.getAvailability(
    partnerId,
    restaurantId,
    date as string,
    parseInt(partySize as string)
  );

  res.json({
    success: true,
    data: availability,
  });
}));

/**
 * Create a reservation
 * POST /api/v1/partnerships/restaurants/reservations
 */
router.post('/reservations', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { partnerId, restaurantId, date, time, partySize, specialRequests, matchId } = req.body;

  if (!partnerId || !restaurantId || !date || !time || !partySize) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
    });
    return;
  }

  const reservation = await restaurantService.createReservation(
    {
      userId: req.user.id,
      partnerId,
      restaurantId,
      date,
      time,
      partySize,
      specialRequests,
      matchId,
    },
    {
      firstName: req.user.firstName || '',
      lastName: req.user.lastName || '',
      email: req.user.email,
      phone: req.user.phone || '',
    }
  );

  res.status(201).json({
    success: true,
    data: reservation,
  });
}));

/**
 * Cancel a reservation
 * DELETE /api/v1/partnerships/restaurants/reservations/:reservationId
 */
router.delete('/reservations/:reservationId', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { reservationId } = req.params;

  const reservation = await restaurantService.cancelReservation(reservationId, req.user.id);

  res.json({
    success: true,
    data: reservation,
    message: 'Reservation cancelled successfully',
  });
}));

/**
 * Get user's reservations
 * GET /api/v1/partnerships/restaurants/reservations
 */
router.get('/reservations', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { status } = req.query;

  const reservations = await restaurantService.getUserReservations(
    req.user.id,
    status as string | undefined
  );

  res.json({
    success: true,
    data: reservations,
  });
}));

/**
 * Get a specific reservation
 * GET /api/v1/partnerships/restaurants/reservations/:reservationId
 */
router.get('/reservations/:reservationId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { reservationId } = req.params;

  const reservation = await restaurantService.getReservation(reservationId);

  if (!reservation) {
    res.status(404).json({
      success: false,
      error: 'Reservation not found',
    });
    return;
  }

  res.json({
    success: true,
    data: reservation,
  });
}));

export default router;
