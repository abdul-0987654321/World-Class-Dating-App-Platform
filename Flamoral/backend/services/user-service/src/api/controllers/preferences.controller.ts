import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PreferencesService } from '../../domain/services/preferences.service';
import logger from '../../utils/logger';

export class PreferencesController {
  private preferencesService: PreferencesService;

  constructor(preferencesService?: PreferencesService) {
    this.preferencesService = preferencesService || new PreferencesService();
  }

  async getPreferences(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const preferences = await this.preferencesService.getPreferencesByUserId(userId);

      return res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error: any) {
      logger.error('Get preferences error:', error);

      return res.status(404).json({
        success: false,
        message: error.message || 'Preferences not found',
      });
    }
  }

  async updatePreferences(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const preferences = await this.preferencesService.updatePreferences(userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        data: preferences,
      });
    } catch (error: any) {
      logger.error('Update preferences error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update preferences',
      });
    }
  }
}
