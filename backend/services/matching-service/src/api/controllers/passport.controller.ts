/**
 * Passport Mode Controller
 * Handles passport/travel mode API endpoints
 */

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response } from 'express';

import passportModeService from '../../domain/services/passport-mode.service';

const logger = createLogger('passport-controller');

export class PassportController {
  /**
   * Get passport mode status
   * GET /api/v1/discovery/passport/status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const status = await passportModeService.getPassportStatus(userId);

      res.status(200).json({
        success: true,
        data: {
          enabled: status.enabled,
          tier: status.tier,
          active_location: status.activeLocation
            ? {
                id: status.activeLocation.id,
                city: status.activeLocation.city,
                country: status.activeLocation.country,
                latitude: status.activeLocation.latitude,
                longitude: status.activeLocation.longitude,
                start_date: status.activeLocation.startDate.toISOString(),
                end_date: status.activeLocation.endDate.toISOString(),
              }
            : null,
          saved_locations: status.savedLocations.map((loc) => ({
            id: loc.id,
            city: loc.city,
            country: loc.country,
            latitude: loc.latitude,
            longitude: loc.longitude,
            start_date: loc.startDate.toISOString(),
            end_date: loc.endDate.toISOString(),
            is_active: loc.isActive,
          })),
          max_locations: status.maxLocations,
          remaining_days: status.remainingDays,
        },
      });
    } catch (error) {
      logger.error('Failed to get passport status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get passport status',
        code: 'PASSPORT_STATUS_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Set passport location (teleport)
   * POST /api/v1/discovery/passport/location
   */
  async setLocation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { city, country, latitude, longitude } = req.body;

      // Validate required fields
      if (!city || !country || latitude === undefined || longitude === undefined) {
        res.status(400).json({
          success: false,
          error: 'City, country, latitude, and longitude are required',
          code: 'MISSING_FIELDS',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      // Validate coordinate ranges
      if (latitude < -90 || latitude > 90) {
        res.status(400).json({
          success: false,
          error: 'Latitude must be between -90 and 90',
          code: 'INVALID_LATITUDE',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      if (longitude < -180 || longitude > 180) {
        res.status(400).json({
          success: false,
          error: 'Longitude must be between -180 and 180',
          code: 'INVALID_LONGITUDE',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      const result = await passportModeService.setPassportLocation(
        userId,
        city,
        country,
        latitude,
        longitude
      );

      if (!result.success) {
        const statusCode = result.error?.includes('requires Plus') ? 402 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.error?.includes('requires Plus')
            ? 'TIER_NOT_SUFFICIENT'
            : 'SET_LOCATION_ERROR',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          location: {
            id: result.location?.id,
            city: result.location?.city,
            country: result.location?.country,
            latitude: result.location?.latitude,
            longitude: result.location?.longitude,
            start_date: result.location?.startDate.toISOString(),
            end_date: result.location?.endDate.toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Failed to set passport location', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set passport location',
        code: 'SET_LOCATION_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Deactivate passport mode
   * DELETE /api/v1/discovery/passport/location
   */
  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      await passportModeService.deactivatePassport(userId);

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to deactivate passport', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate passport mode',
        code: 'DEACTIVATE_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Get popular destinations
   * GET /api/v1/discovery/passport/destinations
   */
  async getPopularDestinations(req: Request, res: Response): Promise<void> {
    try {
      const destinations = await passportModeService.getPopularDestinations();

      res.status(200).json({
        success: true,
        data: {
          destinations: destinations.map((dest) => ({
            city: dest.city,
            country: dest.country,
            country_code: dest.countryCode,
            latitude: dest.latitude,
            longitude: dest.longitude,
            active_users: dest.activeUsers,
            timezone: dest.timezone,
          })),
        },
      });
    } catch (error) {
      logger.error('Failed to get popular destinations', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular destinations',
        code: 'DESTINATIONS_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Search locations
   * GET /api/v1/discovery/passport/search?q=query
   */
  async searchLocations(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;

      if (!query || query.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Query must be at least 2 characters',
          code: 'INVALID_QUERY',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      const locations = await passportModeService.searchLocations(query);

      res.status(200).json({
        success: true,
        data: {
          locations,
        },
      });
    } catch (error) {
      logger.error('Failed to search locations', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search locations',
        code: 'SEARCH_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Get discovery feed for passport location
   * GET /api/v1/discovery/passport/feed
   */
  async getPassportFeed(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 20;
      const cursor = req.query.cursor as string | undefined;

      const result = await passportModeService.getPassportDiscoveryFeed(userId, limit, cursor);

      if (!result.passportLocation) {
        res.status(400).json({
          success: false,
          error: 'No active passport location. Set a location first.',
          code: 'NO_PASSPORT_LOCATION',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          items: result.items,
          next_cursor: result.nextCursor,
          passport_location: result.passportLocation,
        },
      });
    } catch (error) {
      logger.error('Failed to get passport feed', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get passport feed',
        code: 'PASSPORT_FEED_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }
}

export default new PassportController();
