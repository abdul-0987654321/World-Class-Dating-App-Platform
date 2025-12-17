import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ProfileService } from '../../domain/services/profile.service';
import logger from '../../utils/logger';

export class ProfileController {
  private profileService: ProfileService;

  constructor(profileService?: ProfileService) {
    this.profileService = profileService || new ProfileService();
  }

  /**
   * Create a new profile
   */
  async createProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const profile = await this.profileService.createProfile(userId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: profile,
      });
    } catch (error: any) {
      logger.error('Create profile error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create profile',
      });
    }
  }

  /**
   * Get current user's profile
   */
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

  /**
   * Get another user's profile by user ID
   */
  async getProfileByUserId(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const viewerId = req.user!.userId;
      const targetUserId = req.params.userId;

      const profile = await this.profileService.getProfileByUserId(targetUserId, viewerId);

      // Increment view count if viewing another user's profile
      if (viewerId !== targetUserId) {
        await this.profileService.incrementViewCount(targetUserId);
      }

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      logger.error('Get profile by user ID error:', error);

      return res.status(404).json({
        success: false,
        message: error.message || 'Profile not found',
      });
    }
  }

  /**
   * Update current user's profile
   */
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

  /**
   * Delete current user's profile
   */
  async deleteProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      await this.profileService.deleteProfile(userId);

      return res.status(200).json({
        success: true,
        message: 'Profile deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete profile error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete profile',
      });
    }
  }

  /**
   * Get profile completion status
   */
  async getProfileCompletion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const percentage = await this.profileService.updateProfileCompletion(userId);

      return res.status(200).json({
        success: true,
        data: {
          completionPercentage: percentage,
          isCompleted: percentage >= 80,
        },
      });
    } catch (error: any) {
      logger.error('Get profile completion error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to get profile completion',
      });
    }
  }

  /**
   * Get profile analytics
   */
  async getProfileAnalytics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const analytics = await this.profileService.getProfileAnalytics(userId);

      return res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      logger.error('Get profile analytics error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to get profile analytics',
      });
    }
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      await this.profileService.updateLastActive(userId);

      return res.status(200).json({
        success: true,
        message: 'Last active timestamp updated',
      });
    } catch (error: any) {
      logger.error('Update last active error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update last active',
      });
    }
  }

  /**
   * Search profiles
   */
  async searchProfiles(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const criteria = {
        query: req.query.query as string,
        interests: req.query.interests ? (req.query.interests as string).split(',') : undefined,
        relationshipType: req.query.relationshipType as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const profiles = await this.profileService.searchProfiles(criteria);

      return res.status(200).json({
        success: true,
        data: profiles,
        meta: {
          limit: criteria.limit,
          offset: criteria.offset,
        },
      });
    } catch (error: any) {
      logger.error('Search profiles error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to search profiles',
      });
    }
  }
}
