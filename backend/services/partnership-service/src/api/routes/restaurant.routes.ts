import express, { Request, Response } from 'express';
import { RestaurantService } from '../../domain/services/restaurant.service';
import { createLogger } from '@flamoral/backend-shared';

const router = express.Router();
const logger = createLogger('restaurant-routes');
const restaurantService = new RestaurantService();

// Extend Request type with user property
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

/**
 * Search restaurants
 * GET /api/v1/partnerships/restaurants/search
 */
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
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
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: latitude, longitude, date, time, partySize',
      });
    }

    const results = await restaurantService.searchRestaurants(userId, {
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      date: date as string,
      time: time as string,
      partySize: parseInt(partySize as string),
      cuisine: cuisine ? (cuisine as string).split(',') : undefined,
      priceRange: priceRange
        ? (priceRange as string).split(',').map(p => parseInt(p))
        : undefined,
      dateNightOnly: dateNightOnly === 'true',
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      radiusMiles: radiusMiles ? parseInt(radiusMiles as string) : undefined,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    logger.error('Restaurant search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get date night restaurant suggestions
 * GET /api/v1/partnerships/restaurants/date-night
 */
router.get('/date-night', async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude, budget } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: latitude, longitude',
      });
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
  } catch (error: any) {
    logger.error('Date night suggestions failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get restaurant availability
 * GET /api/v1/partnerships/restaurants/:partnerId/:restaurantId/availability
 */
router.get('/:partnerId/:restaurantId/availability', async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, restaurantId } = req.params;
    const { date, partySize } = req.query;

    if (!date || !partySize) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: date, partySize',
      });
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
  } catch (error: any) {
    logger.error('Get availability failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Create a reservation
 * POST /api/v1/partnerships/restaurants/reservations
 */
router.post('/reservations', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { partnerId, restaurantId, date, time, partySize, specialRequests, matchId } = req.body;

    if (!partnerId || !restaurantId || !date || !time || !partySize) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
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
  } catch (error: any) {
    logger.error('Create reservation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Cancel a reservation
 * DELETE /api/v1/partnerships/restaurants/reservations/:reservationId
 */
router.delete('/reservations/:reservationId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { reservationId } = req.params;

    const reservation = await restaurantService.cancelReservation(
      reservationId,
      req.user.id
    );

    res.json({
      success: true,
      data: reservation,
      message: 'Reservation cancelled successfully',
    });
  } catch (error: any) {
    logger.error('Cancel reservation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get user's reservations
 * GET /api/v1/partnerships/restaurants/reservations
 */
router.get('/reservations', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
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
  } catch (error: any) {
    logger.error('Get reservations failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get a specific reservation
 * GET /api/v1/partnerships/restaurants/reservations/:reservationId
 */
router.get('/reservations/:reservationId', async (req: AuthRequest, res: Response) => {
  try {
    const { reservationId } = req.params;

    const reservation = await restaurantService.getReservation(reservationId);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    res.json({
      success: true,
      data: reservation,
    });
  } catch (error: any) {
    logger.error('Get reservation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
