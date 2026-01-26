import { Response } from 'express';

import { ProfileService } from '../../domain/services/profile.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class ProfileController {
  private profileService: ProfileService;

  constructor(profileService?: ProfileService) {
    this.profileService = profileService || new ProfileService();
  }

  async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
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
      const userId = req.user.userId;
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

  async setupProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const profile = await this.profileService.setupProfile(userId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Profile setup completed successfully',
        data: profile,
      });
    } catch (error: any) {
      logger.error('Profile setup error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to complete profile setup',
      });
    }
  }

  async getProfileStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const status = await this.profileService.getProfileStatus(userId);

      return res.status(200).json({
        success: true,
        ...status,
      });
    } catch (error: any) {
      logger.error('Get profile status error:', error);

      return res.status(200).json({
        success: true,
        isComplete: false,
      });
    }
  }
}
