import crypto from 'crypto';

import { Request } from 'express';

import redisCache from '../../infrastructure/cache/redis';
import logger from '../../utils/logger';

export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  ip: string;
  acceptLanguage: string;
  timezone: string;
  screenResolution?: string;
  platform?: string;
  isTrusted: boolean;
  firstSeen: Date;
  lastSeen: Date;
  loginCount: number;
}

export interface DeviceFingerprintData {
  userAgent: string;
  ip: string;
  acceptLanguage: string;
  timezone?: string;
  screenResolution?: string;
  platform?: string;
}

class DeviceFingerprintService {
  private readonly FINGERPRINT_TTL = 90 * 24 * 60 * 60; // 90 days

  /**
   * Generate device fingerprint from request
   */
  generateFingerprint(req: Request, additionalData?: Partial<DeviceFingerprintData>): string {
    const data: DeviceFingerprintData = {
      userAgent: req.headers['user-agent'] || '',
      ip: this.getClientIp(req),
      acceptLanguage: req.headers['accept-language'] || '',
      timezone: additionalData?.timezone,
      screenResolution: additionalData?.screenResolution,
      platform: additionalData?.platform,
    };

    // Create fingerprint hash
    const fingerprintString = [
      data.userAgent,
      data.acceptLanguage,
      data.timezone || '',
      data.screenResolution || '',
      data.platform || '',
    ].join('|');

    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * Record device fingerprint for user
   */
  async recordDevice(
    userId: string,
    fingerprintId: string,
    data: DeviceFingerprintData
  ): Promise<DeviceFingerprint> {
    const key = `device:${userId}:${fingerprintId}`;
    const existing = await redisCache.get(key);

    let device: DeviceFingerprint;

    if (existing) {
      device = JSON.parse(existing);
      device.lastSeen = new Date();
      device.loginCount += 1;

      // Update IP if changed (user might be traveling)
      if (device.ip !== data.ip) {
        logger.info(`IP changed for device ${fingerprintId}: ${device.ip} -> ${data.ip}`);
        device.ip = data.ip;
      }
    } else {
      device = {
        id: fingerprintId,
        userAgent: data.userAgent,
        ip: data.ip,
        acceptLanguage: data.acceptLanguage,
        timezone: data.timezone || '',
        screenResolution: data.screenResolution,
        platform: data.platform,
        isTrusted: false, // New devices start as untrusted
        firstSeen: new Date(),
        lastSeen: new Date(),
        loginCount: 1,
      };
    }

    // Store in Redis
    await redisCache.set(key, JSON.stringify(device), this.FINGERPRINT_TTL);

    // Add to user's device list
    await this.addToUserDeviceList(userId, fingerprintId);

    logger.info(`Device recorded for user ${userId}: ${fingerprintId}`);

    return device;
  }

  /**
   * Get device information
   */
  async getDevice(userId: string, fingerprintId: string): Promise<DeviceFingerprint | null> {
    const key = `device:${userId}:${fingerprintId}`;
    const data = await redisCache.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<DeviceFingerprint[]> {
    const listKey = `devices:${userId}`;
    const deviceIds = await redisCache.getList(listKey);

    if (!deviceIds || deviceIds.length === 0) {
      return [];
    }

    const devices = await Promise.all(deviceIds.map((id) => this.getDevice(userId, id)));

    return devices.filter((d) => d !== null);
  }

  /**
   * Check if device is recognized
   */
  async isDeviceRecognized(userId: string, fingerprintId: string): Promise<boolean> {
    const device = await this.getDevice(userId, fingerprintId);
    return device !== null;
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(userId: string, fingerprintId: string): Promise<boolean> {
    const device = await this.getDevice(userId, fingerprintId);

    if (!device) {
      return false;
    }

    // Auto-trust devices after multiple successful logins
    if (device.loginCount >= 5 && !device.isTrusted) {
      await this.trustDevice(userId, fingerprintId);
      return true;
    }

    return device.isTrusted;
  }

  /**
   * Trust a device
   */
  async trustDevice(userId: string, fingerprintId: string): Promise<void> {
    const device = await this.getDevice(userId, fingerprintId);

    if (!device) {
      throw new Error('Device not found');
    }

    device.isTrusted = true;

    const key = `device:${userId}:${fingerprintId}`;
    await redisCache.set(key, JSON.stringify(device), this.FINGERPRINT_TTL);

    logger.info(`Device trusted: ${userId}:${fingerprintId}`);
  }

  /**
   * Revoke device trust
   */
  async revokeDeviceTrust(userId: string, fingerprintId: string): Promise<void> {
    const device = await this.getDevice(userId, fingerprintId);

    if (!device) {
      throw new Error('Device not found');
    }

    device.isTrusted = false;

    const key = `device:${userId}:${fingerprintId}`;
    await redisCache.set(key, JSON.stringify(device), this.FINGERPRINT_TTL);

    logger.info(`Device trust revoked: ${userId}:${fingerprintId}`);
  }

  /**
   * Remove device
   */
  async removeDevice(userId: string, fingerprintId: string): Promise<void> {
    const key = `device:${userId}:${fingerprintId}`;
    await redisCache.del(key);

    // Remove from user's device list
    const listKey = `devices:${userId}`;
    await redisCache.removeFromList(listKey, fingerprintId);

    logger.info(`Device removed: ${userId}:${fingerprintId}`);
  }

  /**
   * Clear all devices for a user
   */
  async clearUserDevices(userId: string): Promise<void> {
    const devices = await this.getUserDevices(userId);

    await Promise.all(devices.map((device) => this.removeDevice(userId, device.id)));

    logger.info(`All devices cleared for user: ${userId}`);
  }

  // Private helper methods

  private async addToUserDeviceList(userId: string, fingerprintId: string): Promise<void> {
    const listKey = `devices:${userId}`;
    await redisCache.addToList(listKey, fingerprintId);
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];

    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}

export const deviceFingerprintService = new DeviceFingerprintService();
export default deviceFingerprintService;
