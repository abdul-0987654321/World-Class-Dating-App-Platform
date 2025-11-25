import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ProfileService } from '../../domain/services/profile.service';
import logger from '../../utils/logger';

export class ProfileController {
  private profileService: ProfileService;

  constructor(profileService?: ProfileService) {
    this.profileService = profileService || new ProfileService();
  }

  async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const profile = await this.profileService.getProfileByUserId(userId);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      logger.error('Get profile error:', error);

      return res.status(404).json({
        success: false,
        message: error.message || 'Profile not found',
      });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const profile = await this.profileService.updateProfile(userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: profile,
      });
    } catch (error: any) {
      logger.error('Update profile error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update profile',
      });
    }
  }
}
