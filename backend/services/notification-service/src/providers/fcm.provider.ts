/**
 * Firebase Cloud Messaging (FCM) Provider
 * Handles push notifications for Android and iOS via Firebase
 *
 * @deprecated This provider uses Firebase which violates AWS-only constraints.
 * Use SNSPushProvider from './sns-push.provider' instead.
 * This file is maintained only for backward compatibility during migration.
 *
 * Migration: Replace all imports of this provider with:
 *   import { snsPushProvider } from './sns-push.provider';
 */

import path from 'path';

import * as admin from 'firebase-admin';

import logger from '../utils/logger';

export interface FCMMessage {
  token: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
  badge?: number;
  sound?: string;
  channelId?: string;
}

export interface FCMBatchMessage {
  tokens: string[];
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
}

export class FCMProvider {
  private initialized: boolean = false;
  private app?: admin.app.App;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initialize(): void {
    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.app = admin.app();
        this.initialized = true;
        logger.info('FCM Provider: Using existing Firebase app');
        return;
      }

      // Initialize from service account file
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

      if (serviceAccountPath) {
        const serviceAccount = require(path.resolve(serviceAccountPath));
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else {
        // Initialize from environment variables
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const projectId = process.env.FIREBASE_PROJECT_ID;

        if (!privateKey || !clientEmail || !projectId) {
          throw new Error(
            'Missing Firebase configuration. Set FIREBASE_SERVICE_ACCOUNT_PATH or environment variables.'
          );
        }

        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }

      this.initialized = true;
      logger.info('FCM Provider initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize FCM Provider', {
        error: error.message,
      });
      this.initialized = false;
    }
  }

  /**
   * Send push notification to a single device
   */
  async sendToDevice(message: FCMMessage): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.initialized || !this.app) {
      return {
        success: false,
        error: 'FCM Provider not initialized',
      };
    }

    try {
      const payload: admin.messaging.Message = {
        token: message.token,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data || {},
        android: {
          priority: message.priority === 'high' ? 'high' : 'normal',
          notification: {
            channelId: message.channelId || 'default',
            sound: message.sound || 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            priority: message.priority === 'high' ? 'high' : 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: message.title,
                body: message.body,
              },
              badge: message.badge,
              sound: message.sound || 'default',
              contentAvailable: true,
              mutableContent: true,
            },
          },
          headers: {
            'apns-priority': message.priority === 'high' ? '10' : '5',
          },
        },
        webpush: {
          notification: {
            title: message.title,
            body: message.body,
            icon: message.imageUrl,
            requireInteraction: message.priority === 'high',
          },
        },
      };

      const response = await admin.messaging().send(payload);

      logger.info('FCM notification sent successfully', {
        messageId: response,
        token: message.token.substring(0, 20) + '...',
      });

      return {
        success: true,
        messageId: response,
      };
    } catch (error: any) {
      logger.error('Failed to send FCM notification', {
        error: error.message,
        errorCode: error.code,
        token: message.token.substring(0, 20) + '...',
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send push notification to multiple devices (batch)
   */
  async sendToMultipleDevices(message: FCMBatchMessage): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
    results: Array<{ token: string; success: boolean; error?: string }>;
  }> {
    if (!this.initialized || !this.app) {
      return {
        success: false,
        successCount: 0,
        failureCount: message.tokens.length,
        results: message.tokens.map((token) => ({
          token,
          success: false,
          error: 'FCM Provider not initialized',
        })),
      };
    }

    try {
      const multicastMessage: admin.messaging.MulticastMessage = {
        tokens: message.tokens,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data || {},
        android: {
          priority: message.priority === 'high' ? 'high' : 'normal',
          notification: {
            channelId: 'default',
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: message.title,
                body: message.body,
              },
              sound: 'default',
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(multicastMessage);

      const results = message.tokens.map((token, index) => ({
        token,
        success: response.responses[index].success,
        error: response.responses[index].error?.message,
      }));

      logger.info('FCM batch notification sent', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: message.tokens.length,
      });

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        results,
      };
    } catch (error: any) {
      logger.error('Failed to send FCM batch notification', {
        error: error.message,
        tokenCount: message.tokens.length,
      });

      return {
        success: false,
        successCount: 0,
        failureCount: message.tokens.length,
        results: message.tokens.map((token) => ({
          token,
          success: false,
          error: error.message,
        })),
      };
    }
  }

  /**
   * Validate device token
   */
  async validateToken(token: string): Promise<boolean> {
    if (!this.initialized || !this.app) {
      return false;
    }

    try {
      // Try to send a dry-run message to validate the token
      await admin.messaging().send(
        {
          token,
          notification: {
            title: 'Test',
            body: 'Test',
          },
        },
        true
      ); // dry run

      return true;
    } catch (error: any) {
      logger.warn('Invalid FCM token', {
        error: error.message,
        token: token.substring(0, 20) + '...',
      });
      return false;
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(
    tokens: string[],
    topic: string
  ): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
  }> {
    if (!this.initialized || !this.app) {
      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length,
      };
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);

      logger.info('Tokens subscribed to topic', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      logger.error('Failed to subscribe tokens to topic', {
        error: error.message,
        topic,
      });

      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length,
      };
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(
    tokens: string[],
    topic: string
  ): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
  }> {
    if (!this.initialized || !this.app) {
      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length,
      };
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);

      logger.info('Tokens unsubscribed from topic', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      logger.error('Failed to unsubscribe tokens from topic', {
        error: error.message,
        topic,
      });

      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length,
      };
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    message: {
      title: string;
      body: string;
      imageUrl?: string;
      data?: Record<string, string>;
    }
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.initialized || !this.app) {
      return {
        success: false,
        error: 'FCM Provider not initialized',
      };
    }

    try {
      const payload: admin.messaging.Message = {
        topic,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data || {},
      };

      const response = await admin.messaging().send(payload);

      logger.info('FCM topic notification sent successfully', {
        messageId: response,
        topic,
      });

      return {
        success: true,
        messageId: response,
      };
    } catch (error: any) {
      logger.error('Failed to send FCM topic notification', {
        error: error.message,
        topic,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const fcmProvider = new FCMProvider();
