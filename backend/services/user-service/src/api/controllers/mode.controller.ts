import { Response } from 'express';

import { UserMode } from '../../domain/entities/Profile.entity';
import { ModeService } from '../../domain/services/mode.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class ModeController {
  private modeService: ModeService;

  constructor(modeService?: ModeService) {
    this.modeService = modeService || new ModeService();
  }

  /**
   * GET /users/me/modes
   * Get all modes for the current user
   */
  async getUserModes(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const modes = await this.modeService.getUserModes(userId);

      return res.status(200).json({
        success: true,
        data: modes,
      });
    } catch (error: any) {
      logger.error('Get user modes error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to get user modes',
      });
    }
  }

  /**
   * GET /users/me/modes/:mode
   * Get a specific mode for the current user
   */
  async getUserMode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const mode = req.params.mode as UserMode;

      // Validate mode
      if (!['date', 'friends', 'network'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mode. Must be one of: date, friends, network',
        });
      }

      const modeData = await this.modeService.getUserMode(userId, mode);

      return res.status(200).json({
        success: true,
        data: modeData,
      });
    } catch (error: any) {
      logger.error('Get user mode error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to get user mode',
      });
    }
  }

  /**
   * PUT /users/me/modes/:mode
   * Update a specific mode for the current user
   */
  async updateUserMode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const mode = req.params.mode as UserMode;
      const { enabled, preferences } = req.body;

      // Validate mode
      if (!['date', 'friends', 'network'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mode. Must be one of: date, friends, network',
        });
      }

      const updatedMode = await this.modeService.updateUserMode(userId, mode, {
        enabled,
        preferences,
      });

      return res.status(200).json({
        success: true,
        message: 'Mode updated successfully',
        data: updatedMode,
      });
    } catch (error: any) {
      logger.error('Update user mode error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update user mode',
      });
    }
  }

  /**
   * POST /users/me/modes/:mode/enable
   * Enable a specific mode
   */
  async enableMode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const mode = req.params.mode as UserMode;

      // Validate mode
      if (!['date', 'friends', 'network'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mode. Must be one of: date, friends, network',
        });
      }

      const updatedMode = await this.modeService.enableMode(userId, mode);

      return res.status(200).json({
        success: true,
        message: `${mode} mode enabled successfully`,
        data: updatedMode,
      });
    } catch (error: any) {
      logger.error('Enable mode error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to enable mode',
      });
    }
  }

  /**
   * POST /users/me/modes/:mode/disable
   * Disable a specific mode
   */
  async disableMode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const mode = req.params.mode as UserMode;

      // Validate mode
      if (!['date', 'friends', 'network'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mode. Must be one of: date, friends, network',
        });
      }

      const updatedMode = await this.modeService.disableMode(userId, mode);

      return res.status(200).json({
        success: true,
        message: `${mode} mode disabled successfully`,
        data: updatedMode,
      });
    } catch (error: any) {
      logger.error('Disable mode error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to disable mode',
      });
    }
  }

  /**
   * POST /users/me/modes/switch
   * Switch to a different mode
   */
  async switchMode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { mode } = req.body;

      // Validate mode
      if (!['date', 'friends', 'network'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mode. Must be one of: date, friends, network',
        });
      }

      const result = await this.modeService.switchMode(userId, mode);

      return res.status(200).json({
        success: true,
        message: `Switched to ${mode} mode successfully`,
        data: result,
      });
    } catch (error: any) {
      logger.error('Switch mode error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to switch mode',
      });
    }
  }

  /**
   * PUT /users/me/modes/:mode/preferences
   * Update preferences for a specific mode
   */
  async updateModePreferences(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const mode = req.params.mode as UserMode;
      const preferences = req.body;

      // Validate mode
      if (!['date', 'friends', 'network'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mode. Must be one of: date, friends, network',
        });
      }

      const updatedMode = await this.modeService.updateModePreferences(userId, mode, preferences);

      return res.status(200).json({
        success: true,
        message: 'Mode preferences updated successfully',
        data: updatedMode,
      });
    } catch (error: any) {
      logger.error('Update mode preferences error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update mode preferences',
      });
    }
  }
}
