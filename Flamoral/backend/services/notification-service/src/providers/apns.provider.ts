/**
 * Apple Push Notification Service (APNs) Provider
 * Handles push notifications for iOS devices using JWT authentication
 */

import apn from '@parse/node-apn';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

export interface APNsMessage {
  token: string;
  title: string;
  body: string;
  subtitle?: string;
  badge?: number;
  sound?: string;
  category?: string;
  threadId?: string;
  imageUrl?: string;
  data?: Record<string, any>;
  priority?: 'high' | 'normal';
  contentAvailable?: boolean;
  mutableContent?: boolean;
}

export interface APNsBatchMessage {
  tokens: string[];
  title: string;
  body: string;
  subtitle?: string;
  badge?: number;
  sound?: string;
  imageUrl?: string;
  data?: Record<string, any>;
}

export class APNsProvider {
  private provider: apn.Provider | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize APNs Provider with JWT authentication
   */
  private initialize(): void {
    try {
      const options: apn.ProviderOptions = {
        production: process.env.APNS_PRODUCTION === 'true',
      };

      // JWT-based authentication (recommended)
      const keyId = process.env.APNS_KEY_ID;
      const teamId = process.env.APNS_TEAM_ID;
      const keyPath = process.env.APNS_KEY_PATH;

      if (keyId && teamId && keyPath) {
        const resolvedPath = path.resolve(keyPath);

        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`APNs key file not found at: ${resolvedPath}`);
        }

        options.token = {
          key: resolvedPath,
          keyId,
          teamId,
        };

        logger.info('APNs Provider: Using JWT authentication');
      } else {
        // Certificate-based authentication (legacy)
        const certPath = process.env.APNS_CERT_PATH;
        const keyPath = process.env.APNS_CERT_KEY_PATH;

        if (certPath && keyPath) {
          options.cert = path.resolve(certPath);
          options.key = path.resolve(keyPath);
          logger.info('APNs Provider: Using certificate authentication');
        } else {
          throw new Error('Missing APNs configuration. Provide either JWT (APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_PATH) or Certificate (APNS_CERT_PATH, APNS_CERT_KEY_PATH)');
        }
      }

      this.provider = new apn.Provider(options);
      this.initialized = true;

      logger.info('APNs Provider initialized successfully', {
        production: options.production,
      });
    } catch (error: any) {
      logger.error('Failed to initialize APNs Provider', {
        error: error.message,
      });
      this.initialized = false;
    }
  }

  /**
   * Send push notification to a single iOS device
   */
  async sendToDevice(message: APNsMessage): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.initialized || !this.provider) {
      return {
        success: false,
        error: 'APNs Provider not initialized',
      };
    }

    try {
      const notification = new apn.Notification();

      // Alert configuration
      notification.alert = {
        title: message.title,
        body: message.body,
        subtitle: message.subtitle,
      };

      // Badge and sound
      if (message.badge !== undefined) {
        notification.badge = message.badge;
      }
      notification.sound = message.sound || 'default';

      // Category for actionable notifications
      if (message.category) {
        if (!notification.aps) {
          notification.aps = {};
        }
        notification.aps.category = message.category;
      }

      // Thread ID for grouping notifications
      if (message.threadId) {
        notification.threadId = message.threadId;
      }

      // Content available for silent notifications
      if (message.contentAvailable) {
        notification.contentAvailable = true;
      }

      // Mutable content for notification service extensions
      if (message.mutableContent !== false && message.imageUrl) {
        notification.mutableContent = true;
      }

      // Custom data
      if (message.data) {
        notification.payload = {
          ...notification.payload,
          ...message.data,
        };
      }

      // Image URL for rich notifications
      if (message.imageUrl) {
        notification.payload = {
          ...notification.payload,
          imageUrl: message.imageUrl,
        };
      }

      // Priority
      notification.priority = message.priority === 'high' ? 10 : 5;

      // Topic (bundle ID) - required for JWT auth
      const bundleId = process.env.APNS_BUNDLE_ID;
      if (bundleId) {
        notification.topic = bundleId;
      }

      // Expiry (1 day)
      notification.expiry = Math.floor(Date.now() / 1000) + 86400;

      // Send notification
      const result = await this.provider.send(notification, message.token);

      // Check for failures
      if (result.failed && result.failed.length > 0) {
        const failure = result.failed[0];
        logger.error('APNs notification failed', {
          status: failure.status,
          response: failure.response,
          token: message.token.substring(0, 20) + '...',
        });

        return {
          success: false,
          error: failure.response?.reason || 'Unknown error',
        };
      }

      logger.info('APNs notification sent successfully', {
        token: message.token.substring(0, 20) + '...',
      });

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error('Failed to send APNs notification', {
        error: error.message,
        token: message.token.substring(0, 20) + '...',
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send push notification to multiple iOS devices (batch)
   */
  async sendToMultipleDevices(message: APNsBatchMessage): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
    results: Array<{ token: string; success: boolean; error?: string }>;
  }> {
    if (!this.initialized || !this.provider) {
      return {
        success: false,
        successCount: 0,
        failureCount: message.tokens.length,
        results: message.tokens.map(token => ({
          token,
          success: false,
          error: 'APNs Provider not initialized',
        })),
      };
    }

    try {
      const notification = new apn.Notification();

      // Alert configuration
      notification.alert = {
        title: message.title,
        body: message.body,
        subtitle: message.subtitle,
      };

      // Badge and sound
      if (message.badge !== undefined) {
        notification.badge = message.badge;
      }
      notification.sound = message.sound || 'default';

      // Custom data and image
      if (message.data || message.imageUrl) {
        notification.payload = {
          ...message.data,
          ...(message.imageUrl && { imageUrl: message.imageUrl }),
        };
      }

      if (message.imageUrl) {
        notification.mutableContent = true;
      }

      // Topic (bundle ID)
      const bundleId = process.env.APNS_BUNDLE_ID;
      if (bundleId) {
        notification.topic = bundleId;
      }

      // Expiry
      notification.expiry = Math.floor(Date.now() / 1000) + 86400;

      // Send to multiple devices
      const result = await this.provider.send(notification, message.tokens);

      const results = message.tokens.map((token, index) => {
        const failed = result.failed.find(f => f.device === token);

        return {
          token,
          success: !failed,
          error: failed?.response?.reason,
        };
      });

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      logger.info('APNs batch notification sent', {
        successCount,
        failureCount,
        totalTokens: message.tokens.length,
      });

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        results,
      };
    } catch (error: any) {
      logger.error('Failed to send APNs batch notification', {
        error: error.message,
        tokenCount: message.tokens.length,
      });

      return {
        success: false,
        successCount: 0,
        failureCount: message.tokens.length,
        results: message.tokens.map(token => ({
          token,
          success: false,
          error: error.message,
        })),
      };
    }
  }

  /**
   * Send silent notification for background updates
   */
  async sendSilentNotification(
    token: string,
    data: Record<string, any>
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.initialized || !this.provider) {
      return {
        success: false,
        error: 'APNs Provider not initialized',
      };
    }

    try {
      const notification = new apn.Notification();

      notification.contentAvailable = true;
      notification.priority = 5; // Low priority for background updates
      notification.payload = data;

      const bundleId = process.env.APNS_BUNDLE_ID;
      if (bundleId) {
        notification.topic = bundleId;
      }

      const result = await this.provider.send(notification, token);

      if (result.failed && result.failed.length > 0) {
        const failure = result.failed[0];
        return {
          success: false,
          error: failure.response?.reason || 'Unknown error',
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error('Failed to send silent APNs notification', {
        error: error.message,
        token: token.substring(0, 20) + '...',
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send notification with action buttons
   */
  async sendActionableNotification(
    token: string,
    message: {
      title: string;
      body: string;
      category: string;
      data?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.sendToDevice({
      token,
      title: message.title,
      body: message.body,
      category: message.category,
      data: message.data,
      mutableContent: true,
    });
  }

  /**
   * Shutdown the provider
   */
  async shutdown(): Promise<void> {
    if (this.provider) {
      this.provider.shutdown();
      logger.info('APNs Provider shut down');
    }
  }
}

export const apnsProvider = new APNsProvider();
