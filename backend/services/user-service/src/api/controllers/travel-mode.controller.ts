import { Request, Response } from 'express';
import { createLogger } from '../../utils/logger';
import { TravelModeService } from '../../domain/services/travel-mode.service';
import { Knex } from 'knex';

const logger = createLogger('TravelModeController');

export class TravelModeController {
  private travelModeService: TravelModeService;

  constructor(db: Knex) {
    this.travelModeService = new TravelModeService(db);
  }

  // Get travel mode status
  getTravelModeStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const status = await this.travelModeService.getTravelModeStatus(userId);
      res.json(status);
    } catch (error) {
      logger.error('Get travel mode status error:', { error });
      res.status(500).json({ error: 'Failed to get travel mode status' });
    }
  };

  // Create travel destination
  createTravelDestination = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        city,
        state,
        country,
        country_code,
        airport_code,
        latitude,
        longitude,
        timezone,
        start_date,
        end_date,
        show_on_profile,
        match_before_arrival,
        travel_notes,
      } = req.body;

      // Validate required fields
      if (
        !city ||
        !country ||
        !country_code ||
        !latitude ||
        !longitude ||
        !timezone ||
        !start_date ||
        !end_date
      ) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const destination = await this.travelModeService.createTravelDestination(
        userId,
        {
          city,
          state,
          country,
          country_code,
          airport_code,
          latitude,
          longitude,
          timezone,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          show_on_profile,
          match_before_arrival,
          travel_notes,
        }
      );

      res.status(201).json(destination);
    } catch (error: any) {
      logger.error('Create travel destination error:', { error });
      res.status(400).json({ error: error.message || 'Failed to create travel destination' });
    }
  };

  // Get user's travel destinations
  getTravelDestinations = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const destinations = await this.travelModeService.getTravelDestinations(userId);
      res.json(destinations);
    } catch (error) {
      logger.error('Get travel destinations error:', { error });
      res.status(500).json({ error: 'Failed to get travel destinations' });
    }
  };

  // Get active travel destination
  getActiveTravelDestination = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const destination = await this.travelModeService.getActiveTravelDestination(userId);
      res.json(destination);
    } catch (error) {
      logger.error('Get active travel destination error:', { error });
      res.status(500).json({ error: 'Failed to get active travel destination' });
    }
  };

  // Update travel destination
  updateTravelDestination = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { destinationId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        start_date,
        end_date,
        show_on_profile,
        match_before_arrival,
        travel_notes,
        status,
      } = req.body;

      const updated = await this.travelModeService.updateTravelDestination(
        destinationId,
        userId,
        {
          start_date: start_date ? new Date(start_date) : undefined,
          end_date: end_date ? new Date(end_date) : undefined,
          show_on_profile,
          match_before_arrival,
          travel_notes,
          status,
        }
      );

      res.json(updated);
    } catch (error: any) {
      logger.error('Update travel destination error:', { error });
      res.status(400).json({ error: error.message || 'Failed to update travel destination' });
    }
  };

  // Cancel travel destination
  cancelTravelDestination = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { destinationId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.travelModeService.cancelTravelDestination(destinationId, userId);
      res.json({ message: 'Travel destination cancelled successfully' });
    } catch (error: any) {
      logger.error('Cancel travel destination error:', { error });
      res.status(400).json({ error: error.message || 'Failed to cancel travel destination' });
    }
  };

  // Get travel mode settings
  getTravelModeSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const settings = await this.travelModeService.getTravelModeSettings(userId);
      res.json(settings);
    } catch (error) {
      logger.error('Get travel mode settings error:', { error });
      res.status(500).json({ error: 'Failed to get travel mode settings' });
    }
  };

  // Update travel mode settings
  updateTravelModeSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        travel_mode_enabled,
        auto_location_switch,
        notify_local_matches,
        show_travel_badge,
        notify_before_arrival,
        notify_days_before,
      } = req.body;

      const settings = await this.travelModeService.updateTravelModeSettings(userId, {
        travel_mode_enabled,
        auto_location_switch,
        notify_local_matches,
        show_travel_badge,
        notify_before_arrival,
        notify_days_before,
      });

      res.json(settings);
    } catch (error) {
      logger.error('Update travel mode settings error:', { error });
      res.status(500).json({ error: 'Failed to update travel mode settings' });
    }
  };

  // Change location with passport
  changeLocationWithPassport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { city, country, latitude, longitude } = req.body;

      if (!city || !country || !latitude || !longitude) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      await this.travelModeService.changeLocationWithPassport(userId, {
        city,
        country,
        latitude,
        longitude,
        change_type: 'passport',
      });

      res.json({ message: 'Location changed successfully' });
    } catch (error: any) {
      logger.error('Change location with passport error:', { error });
      res.status(400).json({ error: error.message || 'Failed to change location' });
    }
  };

  // Get location change history
  getLocationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const history = await this.travelModeService.getLocationHistory(userId, limit);
      res.json(history);
    } catch (error) {
      logger.error('Get location history error:', { error });
      res.status(500).json({ error: 'Failed to get location history' });
    }
  };

  // Get travel history
  getTravelHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const history = await this.travelModeService.getTravelHistory(userId);
      res.json(history);
    } catch (error) {
      logger.error('Get travel history error:', { error });
      res.status(500).json({ error: 'Failed to get travel history' });
    }
  };

  // Get popular destinations
  getPopularDestinations = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const destinations = await this.travelModeService.getPopularDestinations(limit);
      res.json(destinations);
    } catch (error) {
      logger.error('Get popular destinations error:', { error });
      res.status(500).json({ error: 'Failed to get popular destinations' });
    }
  };

  // Get travel buddy preferences
  getTravelBuddyPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const preferences = await this.travelModeService.getTravelBuddyPreferences(userId);
      res.json(preferences);
    } catch (error) {
      logger.error('Get travel buddy preferences error:', { error });
      res.status(500).json({ error: 'Failed to get travel buddy preferences' });
    }
  };

  // Update travel buddy preferences
  updateTravelBuddyPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        looking_for_travel_buddy,
        travel_style,
        preferred_activities,
        budget_range_min,
        budget_range_max,
        budget_currency,
      } = req.body;

      const preferences = await this.travelModeService.updateTravelBuddyPreferences(
        userId,
        {
          looking_for_travel_buddy,
          travel_style,
          preferred_activities,
          budget_range_min,
          budget_range_max,
          budget_currency,
        }
      );

      res.json(preferences);
    } catch (error) {
      logger.error('Update travel buddy preferences error:', { error });
      res.status(500).json({ error: 'Failed to update travel buddy preferences' });
    }
  };

  // Get premium travel features
  getPremiumTravelFeatures = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const features = await this.travelModeService.getPremiumTravelFeatures(userId);
      res.json(features);
    } catch (error) {
      logger.error('Get premium travel features error:', { error });
      res.status(500).json({ error: 'Failed to get premium travel features' });
    }
  };
}
