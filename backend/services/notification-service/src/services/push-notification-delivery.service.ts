/**
 * Enhanced Push Notification Delivery Service
 * Handles FCM (Android/Web) and APNs (iOS) with retry logic and batch sending
 */

import apn from '@parse/node-apn';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../config';
import { db } from '../config/database';
import logger from '../utils/logger';

// Notification Types
export enum NotificationType {
  NEW_MATCH = 'new_match',
  NEW_MESSAGE = 'new_message',
  NEW_LIKE = 'new_like',
  SUPER_LIKE = 'super_like',
  MESSAGE_READ = 'message_read',
  PROFILE_VIEW = 'profile_view',
  REMINDER = 'reminder',
  PROMO = 'promo',
  BOOST_ACTIVE = 'boost_active',
  BOOST_EXPIRING = 'boost_expiring',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  SECURITY_ALERT = 'security_alert',
}

export interface PushNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  deepLink?: string;
  badge?: number;
  sound?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface DeviceToken {
  id: string;
  user_id: string;
  device_token: string;
  platform: 'ios' | 'android' | 'web';
  device_id?: string;
  device_model?: string;
  os_version?: string;
  app_version?: string;
  is_active: boolean;
  last_active_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: Array<{ token: string; error: string; platform: string }>;
}

export interface BatchNotificationJob {
  userIds: string[];
  payload: PushNotificationPayload;
}

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;
let apnsProvider: apn.Provider | null = null;

export const initializeFirebase = (): void => {
  if (firebaseApp) return;

  try {
    const serviceAccount = config.firebase.serviceAccountPath
      ? require(config.firebase.serviceAccountPath)
      : config.firebase.serviceAccountJson
        ? JSON.parse(config.firebase.serviceAccountJson)
        : null;

    if (!serviceAccount) {
      logger.warn('Firebase service account not configured. FCM disabled.');
      return;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error: any) {
    logger.error('Failed to initialize Firebase', { error: error.message });
  }
};

export const initializeAPNs = (): void => {
  if (apnsProvider) return;

  try {
    const apnsConfig = config.apns;

    if (!apnsConfig.keyId || !apnsConfig.teamId) {
      logger.warn('APNs credentials not configured. APNs disabled.');
      return;
    }

    const options: apn.ProviderOptions = {
      token: {
        key: apnsConfig.keyPath || apnsConfig.key,
        keyId: apnsConfig.keyId,
        teamId: apnsConfig.teamId,
      },
      production: config.nodeEnv === 'production',
    };

    apnsProvider = new apn.Provider(options);
    logger.info('APNs Provider initialized successfully');
  } catch (error: any) {
    logger.error('Failed to initialize APNs', { error: error.message });
  }
};

export class PushNotificationDeliveryService {
  constructor() {
    initializeFirebase();
    initializeAPNs();
  }

  /**
   * Register device token for push notifications
   */
  async registerDevice(
    userId: string,
    deviceToken: string,
    platform: 'ios' | 'android' | 'web',
    deviceInfo?: {
      deviceId?: string;
      deviceModel?: string;
      osVersion?: string;
      appVersion?: string;
    }
  ): Promise<{ success: boolean; deviceId?: string; error?: string }> {
    try {
      // Check if device token already exists
      const existing = await db('user_devices')
        .where({ user_id: userId, device_token: deviceToken })
        .first();

      if (existing) {
        // Update existing device
        await db('user_devices')
          .where({ id: existing.id })
          .update({
            is_active: true,
            last_active_at: new Date(),
            os_version: deviceInfo?.osVersion || existing.os_version,
            app_version: deviceInfo?.appVersion || existing.app_version,
            updated_at: new Date(),
          });

        return { success: true, deviceId: existing.id };
      }

      // Insert new device
      const deviceId = uuidv4();
      await db('user_devices').insert({
        id: deviceId,
        user_id: userId,
        device_token: deviceToken,
        platform,
        device_id: deviceInfo?.deviceId,
        device_model: deviceInfo?.deviceModel,
        os_version: deviceInfo?.osVersion,
        app_version: deviceInfo?.appVersion,
        is_active: true,
        last_active_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      logger.info('Device registered successfully', { userId, deviceId, platform });

      return { success: true, deviceId };
    } catch (error: any) {
      logger.error('Error registering device', { error: error.message, userId });
      return { success: false, error: 'Failed to register device' };
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDevice(
    userId: string,
    deviceToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db('user_devices').where({ user_id: userId, device_token: deviceToken }).update({
        is_active: false,
        updated_at: new Date(),
      });

      logger.info('Device unregistered successfully', { userId, deviceToken });

      return { success: true };
    } catch (error: any) {
      logger.error('Error unregistering device', { error: error.message, userId });
      return { success: false, error: 'Failed to unregister device' };
    }
  }

  /**
   * Get all active devices for a user
   */
  async getUserDevices(userId: string): Promise<DeviceToken[]> {
    try {
      const devices = await db('user_devices')
        .where({ user_id: userId, is_active: true })
        .orderBy('last_active_at', 'desc');

      return devices;
    } catch (error: any) {
      logger.error('Error fetching user devices', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Check if user is in quiet hours
   */
  private async isInQuietHours(userId: string): Promise<boolean> {
    try {
      const prefs = await db('notification_preferences').where({ user_id: userId }).first();

      if (!prefs || !prefs.quiet_hours_enabled) {
        return false;
      }

      const now = new Date();
      const timezone = prefs.timezone || 'UTC';

      // Get current time in user's timezone
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
      });

      const start = prefs.quiet_hours_start;
      const end = prefs.quiet_hours_end;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (start > end) {
        return currentTime >= start || currentTime < end;
      }

      return currentTime >= start && currentTime < end;
    } catch (error: any) {
      logger.error('Error checking quiet hours', { error: error.message, userId });
      return false;
    }
  }

  /**
   * Check if notification type is enabled for user
   */
  private async isNotificationTypeEnabled(
    userId: string,
    type: NotificationType
  ): Promise<boolean> {
    try {
      const prefs = await db('notification_preferences').where({ user_id: userId }).first();

      if (!prefs || !prefs.push_enabled) {
        return false;
      }

      switch (type) {
        case NotificationType.NEW_MATCH:
          return prefs.push_new_match !== false;
        case NotificationType.NEW_MESSAGE:
          return prefs.push_new_message !== false;
        case NotificationType.NEW_LIKE:
          return prefs.push_new_like !== false;
        case NotificationType.SUPER_LIKE:
          return prefs.push_super_like !== false;
        case NotificationType.PROFILE_VIEW:
          return prefs.push_profile_view !== false;
        case NotificationType.BOOST_ACTIVE:
        case NotificationType.BOOST_EXPIRING:
          return prefs.push_boost_expiring !== false;
        case NotificationType.PAYMENT_SUCCESS:
        case NotificationType.PAYMENT_FAILED:
        case NotificationType.SECURITY_ALERT:
          return true; // Always send critical notifications
        default:
          return prefs.push_marketing !== false;
      }
    } catch (error: any) {
      logger.error('Error checking notification preferences', { error: error.message, userId });
      return true; // Default to enabled on error
    }
  }

  /**
   * Send push notification to a single user
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
    options?: {
      skipQuietHours?: boolean;
      skipPreferences?: boolean;
    }
  ): Promise<DeliveryResult> {
    try {
      // Check quiet hours unless skipped
      if (!options?.skipQuietHours) {
        const inQuietHours = await this.isInQuietHours(userId);
        if (inQuietHours) {
          logger.info('User in quiet hours, skipping notification', { userId });
          return { success: false, sent: 0, failed: 0 };
        }
      }

      // Check preferences unless skipped
      if (!options?.skipPreferences) {
        const enabled = await this.isNotificationTypeEnabled(userId, payload.type);
        if (!enabled) {
          logger.info('Notification type disabled for user', { userId, type: payload.type });
          return { success: false, sent: 0, failed: 0 };
        }
      }

      // Get user's active devices
      const devices = await this.getUserDevices(userId);
      if (devices.length === 0) {
        logger.warn('No active devices found for user', { userId });
        return { success: false, sent: 0, failed: 0 };
      }

      // Send to devices with retry logic
      return await this.sendToDevices(devices, payload);
    } catch (error: any) {
      logger.error('Error sending notification to user', { error: error.message, userId });
      return { success: false, sent: 0, failed: 0 };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  private async sendToDevices(
    devices: DeviceToken[],
    payload: PushNotificationPayload
  ): Promise<DeliveryResult> {
    const iosDevices = devices.filter((d) => d.platform === 'ios');
    const androidDevices = devices.filter((d) => d.platform === 'android' || d.platform === 'web');

    const results: DeliveryResult = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [],
    };

    // Send to iOS devices via APNs
    if (iosDevices.length > 0) {
      const apnsResult = await this.sendViaAPNs(iosDevices, payload);
      results.sent += apnsResult.sent;
      results.failed += apnsResult.failed;
      if (apnsResult.errors) {
        results.errors.push(...apnsResult.errors);
      }
    }

    // Send to Android/Web devices via FCM
    if (androidDevices.length > 0) {
      const fcmResult = await this.sendViaFCM(androidDevices, payload);
      results.sent += fcmResult.sent;
      results.failed += fcmResult.failed;
      if (fcmResult.errors) {
        results.errors.push(...fcmResult.errors);
      }
    }

    results.success = results.sent > 0;

    // Clean up failed tokens
    if (results.errors && results.errors.length > 0) {
      await this.cleanupFailedTokens(results.errors);
    }

    return results;
  }

  /**
   * Send via Firebase Cloud Messaging (Android/Web)
   */
  private async sendViaFCM(
    devices: DeviceToken[],
    payload: PushNotificationPayload
  ): Promise<DeliveryResult> {
    if (!firebaseApp) {
      logger.warn('Firebase not initialized, skipping FCM delivery');
      return { success: false, sent: 0, failed: devices.length };
    }

    try {
      const tokens = devices.map((d) => d.device_token);

      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          type: payload.type,
          deepLink: payload.deepLink || '',
          ...(payload.data || {}),
        },
        tokens,
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: payload.sound || 'default',
            channelId: 'flamoral_notifications',
            priority: payload.priority === 'high' ? 'high' : 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            imageUrl: payload.imageUrl,
          },
          ttl: 86400000, // 24 hours
        },
        webpush: {
          notification: {
            icon: '/logo192.png',
            badge: '/logo192.png',
            image: payload.imageUrl,
            requireInteraction: payload.priority === 'high',
          },
          fcmOptions: {
            link: payload.deepLink,
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      const errors: Array<{ token: string; error: string; platform: string }> = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          errors.push({
            token: tokens[idx],
            error: resp.error.code || resp.error.message,
            platform: devices[idx].platform,
          });
        }
      });

      logger.info('FCM delivery completed', {
        sent: response.successCount,
        failed: response.failureCount,
      });

      return {
        success: response.successCount > 0,
        sent: response.successCount,
        failed: response.failureCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      logger.error('Error sending via FCM', { error: error.message });
      return { success: false, sent: 0, failed: devices.length };
    }
  }

  /**
   * Send via Apple Push Notification Service (iOS)
   */
  private async sendViaAPNs(
    devices: DeviceToken[],
    payload: PushNotificationPayload
  ): Promise<DeliveryResult> {
    if (!apnsProvider) {
      logger.warn('APNs not initialized, skipping APNs delivery');
      return { success: false, sent: 0, failed: devices.length };
    }

    try {
      const notification = new apn.Notification({
        alert: {
          title: payload.title,
          body: payload.body,
        },
        sound: payload.sound || 'default',
        badge: payload.badge,
        topic: config.apns.bundleId,
        payload: {
          type: payload.type,
          deepLink: payload.deepLink || '',
          ...(payload.data || {}),
        },
        contentAvailable: true,
        mutableContent: 1,
        pushType: 'alert',
        priority: payload.priority === 'high' ? 10 : 5,
        expiry: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      });

      // Add image URL if present
      if (payload.imageUrl) {
        notification.urlArgs = [payload.imageUrl];
      }

      const tokens = devices.map((d) => d.device_token);
      const response = await apnsProvider.send(notification, tokens);

      const errors: Array<{ token: string; error: string; platform: string }> = [];
      let sent = 0;
      let failed = 0;

      response.sent.forEach((result) => {
        sent++;
      });

      response.failed.forEach((failure) => {
        failed++;
        errors.push({
          token: failure.device,
          error: failure.response?.reason || failure.error?.message || 'Unknown error',
          platform: 'ios',
        });
      });

      logger.info('APNs delivery completed', { sent, failed });

      return {
        success: sent > 0,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      logger.error('Error sending via APNs', { error: error.message });
      return { success: false, sent: 0, failed: devices.length };
    }
  }

  /**
   * Send notification to multiple users (batch)
   */
  async sendBatch(job: BatchNotificationJob): Promise<{
    success: boolean;
    totalSent: number;
    totalFailed: number;
    results: Array<{ userId: string; sent: number; failed: number }>;
  }> {
    const results: Array<{ userId: string; sent: number; failed: number }> = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Process in batches to avoid overwhelming the service
    const batchSize = config.notification.batchSize;

    for (let i = 0; i < job.userIds.length; i += batchSize) {
      const batch = job.userIds.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (userId) => {
          const result = await this.sendToUser(userId, job.payload, {
            skipQuietHours: false,
            skipPreferences: false,
          });

          return {
            userId,
            sent: result.sent,
            failed: result.failed,
          };
        })
      );

      results.push(...batchResults);
      totalSent += batchResults.reduce((sum, r) => sum + r.sent, 0);
      totalFailed += batchResults.reduce((sum, r) => sum + r.failed, 0);

      logger.info('Batch processed', {
        batchIndex: Math.floor(i / batchSize) + 1,
        sent: batchResults.reduce((sum, r) => sum + r.sent, 0),
        failed: batchResults.reduce((sum, r) => sum + r.failed, 0),
      });
    }

    return {
      success: totalSent > 0,
      totalSent,
      totalFailed,
      results,
    };
  }

  /**
   * Send with retry logic for failed deliveries
   */
  async sendWithRetry(
    userId: string,
    payload: PushNotificationPayload,
    maxRetries: number = config.notification.maxRetries
  ): Promise<DeliveryResult> {
    let lastResult: DeliveryResult = { success: false, sent: 0, failed: 0 };
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      logger.info('Attempting to send notification', { userId, attempt, maxRetries });

      const result = await this.sendToUser(userId, payload);

      if (result.success) {
        logger.info('Notification sent successfully', { userId, attempt });
        return result;
      }

      lastResult = result;

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = config.notification.retryDelay * Math.pow(2, attempt - 1);
        logger.info('Retrying after delay', { userId, attempt, delay });
        await this.sleep(delay);
      }
    }

    logger.error('Failed to send notification after retries', {
      userId,
      attempts: maxRetries,
    });

    return lastResult;
  }

  /**
   * Clean up invalid or inactive device tokens
   */
  private async cleanupFailedTokens(
    errors: Array<{ token: string; error: string; platform: string }>
  ): Promise<void> {
    const invalidErrors = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'InvalidRegistration',
      'NotRegistered',
      'Unregistered',
      'BadDeviceToken',
      'DeviceTokenNotForTopic',
    ];

    const tokensToDeactivate = errors
      .filter((e) => invalidErrors.some((err) => e.error.includes(err)))
      .map((e) => e.token);

    if (tokensToDeactivate.length > 0) {
      try {
        await db('user_devices').whereIn('device_token', tokensToDeactivate).update({
          is_active: false,
          updated_at: new Date(),
        });

        logger.info('Deactivated invalid device tokens', {
          count: tokensToDeactivate.length,
        });
      } catch (error: any) {
        logger.error('Error deactivating tokens', { error: error.message });
      }
    }
  }

  /**
   * Clean up old inactive devices
   */
  async cleanupInactiveDevices(daysInactive: number = 90): Promise<{
    success: boolean;
    deleted: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const deleted = await db('user_devices')
        .where('is_active', false)
        .where('updated_at', '<', cutoffDate)
        .delete();

      logger.info('Cleaned up inactive devices', { deleted });

      return { success: true, deleted };
    } catch (error: any) {
      logger.error('Error cleaning up devices', { error: error.message });
      return { success: false, deleted: 0 };
    }
  }

  /**
   * Get delivery statistics
   */
  async getStats(userId?: string): Promise<{
    totalDevices: number;
    activeDevices: number;
    devicesByPlatform: { ios: number; android: number; web: number };
  }> {
    try {
      let query = db('user_devices');

      if (userId) {
        query = query.where({ user_id: userId });
      }

      const [totalDevices, activeDevices, iosCount, androidCount, webCount] = await Promise.all([
        query.clone().count('* as count').first(),
        query.clone().where({ is_active: true }).count('* as count').first(),
        query.clone().where({ platform: 'ios', is_active: true }).count('* as count').first(),
        query.clone().where({ platform: 'android', is_active: true }).count('* as count').first(),
        query.clone().where({ platform: 'web', is_active: true }).count('* as count').first(),
      ]);

      return {
        totalDevices: parseInt((totalDevices as any).count),
        activeDevices: parseInt((activeDevices as any).count),
        devicesByPlatform: {
          ios: parseInt((iosCount as any).count),
          android: parseInt((androidCount as any).count),
          web: parseInt((webCount as any).count),
        },
      };
    } catch (error: any) {
      logger.error('Error getting stats', { error: error.message });
      return {
        totalDevices: 0,
        activeDevices: 0,
        devicesByPlatform: { ios: 0, android: 0, web: 0 },
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const pushNotificationDeliveryService = new PushNotificationDeliveryService();
