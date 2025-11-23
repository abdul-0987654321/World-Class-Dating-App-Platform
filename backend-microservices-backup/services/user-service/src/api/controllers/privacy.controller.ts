import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PrivacyService } from '../../domain/services/privacy.service';
import logger from '../../utils/logger';

export class PrivacyController {
  private privacyService: PrivacyService;

  constructor(privacyService?: PrivacyService) {
    this.privacyService = privacyService || new PrivacyService();
  }

  async getPrivacySettings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const settings = await this.privacyService.getUserPrivacySettings(userId);

      return res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      logger.error('Get privacy settings error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get privacy settings',
      });
    }
  }

  async updatePrivacySettings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const settings = await this.privacyService.updatePrivacySettings(userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Privacy settings updated successfully',
        data: settings,
      });
    } catch (error: any) {
      logger.error('Update privacy settings error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update privacy settings',
      });
    }
  }

  async toggleIncognito(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { enabled, durationHours } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const settings = await this.privacyService.toggleIncognitoMode(
        userId,
        enabled,
        durationHours
      );

      return res.status(200).json({
        success: true,
        message: enabled ? 'Incognito mode enabled' : 'Incognito mode disabled',
        data: settings,
      });
    } catch (error: any) {
      logger.error('Toggle incognito error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to toggle incognito mode',
      });
    }
  }

  async applyPreset(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { preset } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!preset || !['public', 'balanced', 'private'].includes(preset)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid preset. Must be: public, balanced, or private',
        });
      }

      const settings = await this.privacyService.applyPrivacyPreset(userId, preset);

      return res.status(200).json({
        success: true,
        message: `Privacy preset "${preset}" applied successfully`,
        data: settings,
      });
    } catch (error: any) {
      logger.error('Apply preset error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to apply privacy preset',
      });
    }
  }
}

export default new PrivacyController();
