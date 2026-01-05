/**
 * Device Management Service
 * Handles device token registration, updates, and management
 */

import { v4 as uuidv4 } from 'uuid';

import { db } from '../config/database';
import logger from '../utils/logger';

import { DeviceToken } from './push-notification-delivery.service';

export interface RegisterDeviceRequest {
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
}

export interface UpdateDeviceRequest {
  osVersion?: string;
  appVersion?: string;
  deviceModel?: string;
}

export interface DeviceInfo {
  id: string;
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DeviceManagementService {
  /**
   * Register a new device or update existing one
   */
  async registerDevice(
    request: RegisterDeviceRequest
  ): Promise<{ success: boolean; deviceId?: string; isNew?: boolean; error?: string }> {
    try {
      // Validate input
      if (!request.userId || !request.deviceToken || !request.platform) {
        return { success: false, error: 'Missing required fields' };
      }

      // Check if device already exists
      const existing = await db('user_devices')
        .where({ user_id: request.userId, device_token: request.deviceToken })
        .first();

      if (existing) {
        // Update existing device
        await db('user_devices')
          .where({ id: existing.id })
          .update({
            is_active: true,
            platform: request.platform,
            device_id: request.deviceId || existing.device_id,
            device_model: request.deviceModel || existing.device_model,
            os_version: request.osVersion || existing.os_version,
            app_version: request.appVersion || existing.app_version,
            last_active_at: new Date(),
            updated_at: new Date(),
          });

        logger.info('Device updated', {
          userId: request.userId,
          deviceId: existing.id,
          platform: request.platform,
        });

        return { success: true, deviceId: existing.id, isNew: false };
      }

      // Create new device
      const deviceId = uuidv4();
      await db('user_devices').insert({
        id: deviceId,
        user_id: request.userId,
        device_token: request.deviceToken,
        platform: request.platform,
        device_id: request.deviceId,
        device_model: request.deviceModel,
        os_version: request.osVersion,
        app_version: request.appVersion,
        is_active: true,
        last_active_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      logger.info('New device registered', {
        userId: request.userId,
        deviceId,
        platform: request.platform,
      });

      return { success: true, deviceId, isNew: true };
    } catch (error: any) {
      logger.error('Error registering device', {
        error: error.message,
        userId: request.userId,
      });
      return { success: false, error: 'Failed to register device' };
    }
  }

  /**
   * Unregister a device (soft delete - mark as inactive)
   */
  async unregisterDevice(
    userId: string,
    deviceToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db('user_devices')
        .where({ user_id: userId, device_token: deviceToken })
        .update({
          is_active: false,
          updated_at: new Date(),
        });

      if (result === 0) {
        return { success: false, error: 'Device not found' };
      }

      logger.info('Device unregistered', { userId, deviceToken });

      return { success: true };
    } catch (error: any) {
      logger.error('Error unregistering device', {
        error: error.message,
        userId,
      });
      return { success: false, error: 'Failed to unregister device' };
    }
  }

  /**
   * Update device information
   */
  async updateDevice(
    userId: string,
    deviceToken: string,
    updates: UpdateDeviceRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date(),
        last_active_at: new Date(),
      };

      if (updates.osVersion) updateData.os_version = updates.osVersion;
      if (updates.appVersion) updateData.app_version = updates.appVersion;
      if (updates.deviceModel) updateData.device_model = updates.deviceModel;

      const result = await db('user_devices')
        .where({ user_id: userId, device_token: deviceToken })
        .update(updateData);

      if (result === 0) {
        return { success: false, error: 'Device not found' };
      }

      logger.info('Device updated', { userId, deviceToken });

      return { success: true };
    } catch (error: any) {
      logger.error('Error updating device', {
        error: error.message,
        userId,
      });
      return { success: false, error: 'Failed to update device' };
    }
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(
    userId: string,
    activeOnly: boolean = false
  ): Promise<{ success: boolean; devices?: DeviceInfo[]; error?: string }> {
    try {
      let query = db('user_devices').where({ user_id: userId });

      if (activeOnly) {
        query = query.where({ is_active: true });
      }

      const devices = await query.orderBy('last_active_at', 'desc');

      const mappedDevices: DeviceInfo[] = devices.map((device) => ({
        id: device.id,
        userId: device.user_id,
        deviceToken: device.device_token,
        platform: device.platform,
        deviceId: device.device_id,
        deviceModel: device.device_model,
        osVersion: device.os_version,
        appVersion: device.app_version,
        isActive: device.is_active,
        lastActiveAt: device.last_active_at,
        createdAt: device.created_at,
        updatedAt: device.updated_at,
      }));

      return { success: true, devices: mappedDevices };
    } catch (error: any) {
      logger.error('Error fetching user devices', {
        error: error.message,
        userId,
      });
      return { success: false, error: 'Failed to fetch devices' };
    }
  }

  /**
   * Get device by ID
   */
  async getDeviceById(
    deviceId: string
  ): Promise<{ success: boolean; device?: DeviceInfo; error?: string }> {
    try {
      const device = await db('user_devices').where({ id: deviceId }).first();

      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      const deviceInfo: DeviceInfo = {
        id: device.id,
        userId: device.user_id,
        deviceToken: device.device_token,
        platform: device.platform,
        deviceId: device.device_id,
        deviceModel: device.device_model,
        osVersion: device.os_version,
        appVersion: device.app_version,
        isActive: device.is_active,
        lastActiveAt: device.last_active_at,
        createdAt: device.created_at,
        updatedAt: device.updated_at,
      };

      return { success: true, device: deviceInfo };
    } catch (error: any) {
      logger.error('Error fetching device', {
        error: error.message,
        deviceId,
      });
      return { success: false, error: 'Failed to fetch device' };
    }
  }

  /**
   * Update device last active timestamp
   */
  async updateLastActive(deviceToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db('user_devices').where({ device_token: deviceToken }).update({
        last_active_at: new Date(),
        updated_at: new Date(),
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Error updating last active', {
        error: error.message,
        deviceToken,
      });
      return { success: false, error: 'Failed to update last active' };
    }
  }

  /**
   * Delete all devices for a user (hard delete)
   */
  async deleteUserDevices(
    userId: string
  ): Promise<{ success: boolean; deleted?: number; error?: string }> {
    try {
      const deleted = await db('user_devices').where({ user_id: userId }).delete();

      logger.info('User devices deleted', { userId, count: deleted });

      return { success: true, deleted };
    } catch (error: any) {
      logger.error('Error deleting user devices', {
        error: error.message,
        userId,
      });
      return { success: false, error: 'Failed to delete devices' };
    }
  }

  /**
   * Clean up old inactive devices
   */
  async cleanupInactiveDevices(
    daysInactive: number = 90
  ): Promise<{ success: boolean; deleted?: number; error?: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const deleted = await db('user_devices')
        .where('is_active', false)
        .where('updated_at', '<', cutoffDate)
        .delete();

      logger.info('Inactive devices cleaned up', {
        daysInactive,
        deleted,
      });

      return { success: true, deleted };
    } catch (error: any) {
      logger.error('Error cleaning up inactive devices', {
        error: error.message,
      });
      return { success: false, error: 'Failed to cleanup devices' };
    }
  }

  /**
   * Get device statistics
   */
  async getDeviceStats(userId?: string): Promise<{
    success: boolean;
    stats?: {
      total: number;
      active: number;
      inactive: number;
      byPlatform: {
        ios: number;
        android: number;
        web: number;
      };
    };
    error?: string;
  }> {
    try {
      let baseQuery = db('user_devices');

      if (userId) {
        baseQuery = baseQuery.where({ user_id: userId });
      }

      const [totalCount, activeCount, inactiveCount, iosCount, androidCount, webCount] =
        await Promise.all([
          baseQuery.clone().count('* as count').first(),
          baseQuery.clone().where({ is_active: true }).count('* as count').first(),
          baseQuery.clone().where({ is_active: false }).count('* as count').first(),
          baseQuery.clone().where({ platform: 'ios', is_active: true }).count('* as count').first(),
          baseQuery
            .clone()
            .where({ platform: 'android', is_active: true })
            .count('* as count')
            .first(),
          baseQuery.clone().where({ platform: 'web', is_active: true }).count('* as count').first(),
        ]);

      const stats = {
        total: parseInt((totalCount as any).count),
        active: parseInt((activeCount as any).count),
        inactive: parseInt((inactiveCount as any).count),
        byPlatform: {
          ios: parseInt((iosCount as any).count),
          android: parseInt((androidCount as any).count),
          web: parseInt((webCount as any).count),
        },
      };

      return { success: true, stats };
    } catch (error: any) {
      logger.error('Error fetching device stats', {
        error: error.message,
      });
      return { success: false, error: 'Failed to fetch stats' };
    }
  }

  /**
   * Bulk register devices
   */
  async bulkRegisterDevices(devices: RegisterDeviceRequest[]): Promise<{
    success: boolean;
    registered?: number;
    failed?: number;
    errors?: Array<{ userId: string; error: string }>;
  }> {
    const errors: Array<{ userId: string; error: string }> = [];
    let registered = 0;
    let failed = 0;

    for (const device of devices) {
      const result = await this.registerDevice(device);

      if (result.success) {
        registered++;
      } else {
        failed++;
        errors.push({
          userId: device.userId,
          error: result.error || 'Unknown error',
        });
      }
    }

    logger.info('Bulk device registration completed', {
      total: devices.length,
      registered,
      failed,
    });

    return {
      success: registered > 0,
      registered,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Deactivate devices by platform
   */
  async deactivateByPlatform(
    userId: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<{ success: boolean; deactivated?: number; error?: string }> {
    try {
      const deactivated = await db('user_devices')
        .where({ user_id: userId, platform, is_active: true })
        .update({
          is_active: false,
          updated_at: new Date(),
        });

      logger.info('Devices deactivated by platform', {
        userId,
        platform,
        count: deactivated,
      });

      return { success: true, deactivated };
    } catch (error: any) {
      logger.error('Error deactivating devices by platform', {
        error: error.message,
        userId,
        platform,
      });
      return { success: false, error: 'Failed to deactivate devices' };
    }
  }
}

export const deviceManagementService = new DeviceManagementService();
