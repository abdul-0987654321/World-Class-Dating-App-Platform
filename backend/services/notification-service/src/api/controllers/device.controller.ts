/**
 * Device Controller
 * Handles device registration and management endpoints
 */

import { Request, Response } from 'express';

import { deviceManagementService } from '../../services/device-management.service';
import logger from '../../utils/logger';

export class DeviceController {
  /**
   * POST /api/devices/register
   * Register a new device for push notifications
   */
  async registerDevice(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { deviceToken, platform, deviceId, deviceModel, osVersion, appVersion } = req.body;

      // Validate required fields
      if (!deviceToken || !platform) {
        res.status(400).json({
          success: false,
          error: 'Device token and platform are required',
        });
        return;
      }

      // Validate platform
      if (!['ios', 'android', 'web'].includes(platform)) {
        res.status(400).json({
          success: false,
          error: 'Platform must be ios, android, or web',
        });
        return;
      }

      const result = await deviceManagementService.registerDevice({
        userId,
        deviceToken,
        platform,
        deviceId,
        deviceModel,
        osVersion,
        appVersion,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          deviceId: result.deviceId,
          isNew: result.isNew,
          message: result.isNew ? 'Device registered successfully' : 'Device updated successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to register device',
        });
      }
    } catch (error: any) {
      logger.error('Error in registerDevice controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /api/devices/unregister
   * Unregister a device from push notifications
   */
  async unregisterDevice(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { deviceToken } = req.body;

      if (!deviceToken) {
        res.status(400).json({
          success: false,
          error: 'Device token is required',
        });
        return;
      }

      const result = await deviceManagementService.unregisterDevice(userId, deviceToken);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Device unregistered successfully',
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error || 'Device not found',
        });
      }
    } catch (error: any) {
      logger.error('Error in unregisterDevice controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/devices/update
   * Update device information
   */
  async updateDevice(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { deviceToken, osVersion, appVersion, deviceModel } = req.body;

      if (!deviceToken) {
        res.status(400).json({
          success: false,
          error: 'Device token is required',
        });
        return;
      }

      const result = await deviceManagementService.updateDevice(userId, deviceToken, {
        osVersion,
        appVersion,
        deviceModel,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Device updated successfully',
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error || 'Device not found',
        });
      }
    } catch (error: any) {
      logger.error('Error in updateDevice controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/devices
   * Get all devices for the authenticated user
   */
  async getUserDevices(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const activeOnly = req.query.activeOnly === 'true';

      const result = await deviceManagementService.getUserDevices(userId, activeOnly);

      if (result.success) {
        res.status(200).json({
          success: true,
          devices: result.devices,
          count: result.devices?.length || 0,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch devices',
        });
      }
    } catch (error: any) {
      logger.error('Error in getUserDevices controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/devices/:deviceId
   * Get device by ID
   */
  async getDeviceById(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.params.deviceId;

      const result = await deviceManagementService.getDeviceById(deviceId);

      if (result.success) {
        // Verify the device belongs to the authenticated user
        if (result.device?.userId !== req.user.id) {
          res.status(403).json({
            success: false,
            error: 'Access denied',
          });
          return;
        }

        res.status(200).json({
          success: true,
          device: result.device,
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error || 'Device not found',
        });
      }
    } catch (error: any) {
      logger.error('Error in getDeviceById controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /api/devices
   * Delete all devices for the authenticated user
   */
  async deleteAllDevices(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await deviceManagementService.deleteUserDevices(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'All devices deleted successfully',
          deleted: result.deleted,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to delete devices',
        });
      }
    } catch (error: any) {
      logger.error('Error in deleteAllDevices controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /api/devices/platform/:platform
   * Deactivate all devices of a specific platform for the user
   */
  async deactivateByPlatform(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const platform = req.params.platform as 'ios' | 'android' | 'web';

      if (!['ios', 'android', 'web'].includes(platform)) {
        res.status(400).json({
          success: false,
          error: 'Invalid platform',
        });
        return;
      }

      const result = await deviceManagementService.deactivateByPlatform(userId, platform);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: `All ${platform} devices deactivated`,
          deactivated: result.deactivated,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to deactivate devices',
        });
      }
    } catch (error: any) {
      logger.error('Error in deactivateByPlatform controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/devices/stats
   * Get device statistics for the authenticated user
   */
  async getDeviceStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await deviceManagementService.getDeviceStats(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          stats: result.stats,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch stats',
        });
      }
    } catch (error: any) {
      logger.error('Error in getDeviceStats controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/devices/ping
   * Update device last active timestamp
   */
  async pingDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceToken } = req.body;

      if (!deviceToken) {
        res.status(400).json({
          success: false,
          error: 'Device token is required',
        });
        return;
      }

      const result = await deviceManagementService.updateLastActive(deviceToken);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Device pinged successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to ping device',
        });
      }
    } catch (error: any) {
      logger.error('Error in pingDevice controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export const deviceController = new DeviceController();
