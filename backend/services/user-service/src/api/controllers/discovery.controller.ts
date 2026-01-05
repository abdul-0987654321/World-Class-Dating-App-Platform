import { Response } from 'express';

import { DiscoveryService, DiscoveryFilters } from '../../domain/services/discovery.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class DiscoveryController {
  private discoveryService: DiscoveryService;

  constructor(discoveryService?: DiscoveryService) {
    this.discoveryService = discoveryService || new DiscoveryService();
  }

  async getDiscoveryProfiles(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: DiscoveryFilters = {
        age_min: req.query.age_min ? parseInt(req.query.age_min as string) : undefined,
        age_max: req.query.age_max ? parseInt(req.query.age_max as string) : undefined,
        distance_max: req.query.distance_max
          ? parseInt(req.query.distance_max as string)
          : undefined,
        gender: req.query.gender as string,
      };

      const profiles = await this.discoveryService.getDiscoveryProfiles(userId, limit, filters);

      return res.status(200).json({
        success: true,
        data: profiles,
        count: profiles.length,
      });
    } catch (error: any) {
      logger.error('Get discovery profiles error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve profiles',
      });
    }
  }

  async getProfileById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { profileId } = req.params;

      const profile = await this.discoveryService.getProfileById(userId, profileId);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      logger.error('Get profile by ID error:', error);
      return res.status(404).json({
        success: false,
        message: error.message || 'Profile not found',
      });
    }
  }
}
