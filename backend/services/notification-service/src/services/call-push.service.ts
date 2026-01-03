/**
 * Call Push Notification Service
 * Handles VoIP push notifications for incoming calls
 * Supports iOS VoIP Push (CallKit), Android high-priority notifications
 */

import admin from 'firebase-admin';
import { db } from '../config/database';
import { createLogger } from '@flamoral/backend-shared';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('call-push-service');

export enum CallNotificationType {
  INCOMING_CALL = 'incoming_call',
  MISSED_CALL = 'missed_call',
  CALL_ENDED = 'call_ended',
  CALL_CANCELLED = 'call_cancelled',
}

export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'audio';
  timestamp: number;
}

export interface MissedCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'audio';
  timestamp: number;
}

export class CallPushService {
  private firebaseApp: admin.app.App | null = null;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      if (admin.apps.length === 0) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : null;

        if (serviceAccount) {
          this.firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          logger.info('Firebase initialized for call push service');
        } else {
          logger.warn('Firebase not configured - call push notifications disabled');
        }
      } else {
        this.firebaseApp = admin.app();
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
    }
  }

  /**
   * Send incoming call push notification
   * This is a high-priority notification that should wake up the device
   */
  async sendIncomingCallNotification(
    recipientId: string,
    data: IncomingCallData
  ): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
    try {
      if (!this.firebaseApp) {
        return { success: false, sent: 0, failed: 0, error: 'Firebase not initialized' };
      }

      // Get user's FCM tokens
      const tokens = await this.getUserTokens(recipientId);
      if (tokens.length === 0) {
        return { success: false, sent: 0, failed: 0, error: 'No registered devices' };
      }

      // Separate tokens by platform for optimized notifications
      const iosTokens = tokens.filter(t => t.device_type === 'ios');
      const androidTokens = tokens.filter(t => t.device_type === 'android');
      const webTokens = tokens.filter(t => t.device_type === 'web');

      let totalSent = 0;
      let totalFailed = 0;

      // Send to iOS devices (VoIP-style notification)
      if (iosTokens.length > 0) {
        const iosResult = await this.sendIOSCallNotification(iosTokens, data);
        totalSent += iosResult.sent;
        totalFailed += iosResult.failed;
      }

      // Send to Android devices (high priority)
      if (androidTokens.length > 0) {
        const androidResult = await this.sendAndroidCallNotification(androidTokens, data);
        totalSent += androidResult.sent;
        totalFailed += androidResult.failed;
      }

      // Send to Web (standard notification)
      if (webTokens.length > 0) {
        const webResult = await this.sendWebCallNotification(webTokens, data);
        totalSent += webResult.sent;
        totalFailed += webResult.failed;
      }

      // Save notification record
      await this.saveCallNotificationRecord(recipientId, data);

      return {
        success: totalSent > 0,
        sent: totalSent,
        failed: totalFailed,
      };
    } catch (error: any) {
      logger.error('Error sending incoming call notification:', error);
      return { success: false, sent: 0, failed: 0, error: error.message };
    }
  }

  /**
   * Send iOS call notification (VoIP-style)
   */
  private async sendIOSCallNotification(
    tokens: any[],
    data: IncomingCallData
  ): Promise<{ sent: number; failed: number }> {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: tokens.map(t => t.token),
        data: {
          type: CallNotificationType.INCOMING_CALL,
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar || '',
          callType: data.callType,
          timestamp: data.timestamp.toString(),
        },
        apns: {
          headers: {
            'apns-priority': '10', // Critical priority
            'apns-push-type': 'voip', // VoIP push type
            'apns-expiration': '0', // Immediate delivery
          },
          payload: {
            aps: {
              alert: {
                title: data.callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call',
                body: `${data.callerName} is calling you`,
              },
              sound: 'default',
              badge: 1,
              'content-available': 1,
              'mutable-content': 1,
              category: 'INCOMING_CALL',
            },
            callData: {
              callId: data.callId,
              callerId: data.callerId,
              callerName: data.callerName,
              callerAvatar: data.callerAvatar,
              callType: data.callType,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      await this.handleFailedTokens(tokens, response);

      return {
        sent: response.successCount,
        failed: response.failureCount,
      };
    } catch (error) {
      logger.error('Error sending iOS call notification:', error);
      return { sent: 0, failed: tokens.length };
    }
  }

  /**
   * Send Android call notification (high priority)
   */
  private async sendAndroidCallNotification(
    tokens: any[],
    data: IncomingCallData
  ): Promise<{ sent: number; failed: number }> {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: tokens.map(t => t.token),
        data: {
          type: CallNotificationType.INCOMING_CALL,
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar || '',
          callType: data.callType,
          timestamp: data.timestamp.toString(),
        },
        android: {
          priority: 'high',
          ttl: 60000, // 60 seconds
          notification: {
            channelId: 'incoming_calls',
            priority: 'max',
            visibility: 'public',
            sound: 'ringtone',
            vibrateTimingsMillis: [0, 500, 200, 500, 200, 500],
            defaultVibrateTimings: false,
            defaultSound: false,
            title: data.callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call',
            body: `${data.callerName} is calling you`,
            icon: '@mipmap/ic_launcher',
            color: '#EC4899', // Pink color
            tag: `call_${data.callId}`,
          },
          // Data-only message for background handling
          data: {
            type: CallNotificationType.INCOMING_CALL,
            callId: data.callId,
            callerId: data.callerId,
            callerName: data.callerName,
            callerAvatar: data.callerAvatar || '',
            callType: data.callType,
            timestamp: data.timestamp.toString(),
            fullScreenIntent: 'true',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      await this.handleFailedTokens(tokens, response);

      return {
        sent: response.successCount,
        failed: response.failureCount,
      };
    } catch (error) {
      logger.error('Error sending Android call notification:', error);
      return { sent: 0, failed: tokens.length };
    }
  }

  /**
   * Send Web call notification
   */
  private async sendWebCallNotification(
    tokens: any[],
    data: IncomingCallData
  ): Promise<{ sent: number; failed: number }> {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: tokens.map(t => t.token),
        notification: {
          title: data.callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call',
          body: `${data.callerName} is calling you`,
        },
        data: {
          type: CallNotificationType.INCOMING_CALL,
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar || '',
          callType: data.callType,
          timestamp: data.timestamp.toString(),
          clickAction: '/call',
        },
        webpush: {
          headers: {
            Urgency: 'high',
            TTL: '60',
          },
          notification: {
            title: data.callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call',
            body: `${data.callerName} is calling you`,
            icon: '/logo192.png',
            badge: '/logo192.png',
            tag: `call_${data.callId}`,
            requireInteraction: true,
            renotify: true,
            vibrate: [200, 100, 200, 100, 200],
            actions: [
              { action: 'accept', title: 'Accept' },
              { action: 'reject', title: 'Decline' },
            ],
          },
          fcmOptions: {
            link: `/call?callId=${data.callId}`,
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      await this.handleFailedTokens(tokens, response);

      return {
        sent: response.successCount,
        failed: response.failureCount,
      };
    } catch (error) {
      logger.error('Error sending Web call notification:', error);
      return { sent: 0, failed: tokens.length };
    }
  }

  /**
   * Send missed call notification
   */
  async sendMissedCallNotification(
    recipientId: string,
    data: MissedCallData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.firebaseApp) {
        return { success: false, error: 'Firebase not initialized' };
      }

      const tokens = await this.getUserTokens(recipientId);
      if (tokens.length === 0) {
        return { success: false, error: 'No registered devices' };
      }

      const message: admin.messaging.MulticastMessage = {
        tokens: tokens.map(t => t.token),
        notification: {
          title: 'Missed Call',
          body: `You missed a ${data.callType} call from ${data.callerName}`,
        },
        data: {
          type: CallNotificationType.MISSED_CALL,
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar || '',
          callType: data.callType,
          timestamp: data.timestamp.toString(),
        },
        android: {
          notification: {
            channelId: 'missed_calls',
            priority: 'high',
            tag: `missed_call_${data.callId}`,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      await this.handleFailedTokens(tokens, response);

      return { success: response.successCount > 0 };
    } catch (error: any) {
      logger.error('Error sending missed call notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel pending call notification (when call is answered/rejected elsewhere)
   */
  async cancelCallNotification(
    recipientId: string,
    callId: string
  ): Promise<{ success: boolean }> {
    try {
      if (!this.firebaseApp) {
        return { success: false };
      }

      const tokens = await this.getUserTokens(recipientId);
      if (tokens.length === 0) {
        return { success: true }; // No devices to cancel on
      }

      // Send a silent notification to dismiss the incoming call notification
      const message: admin.messaging.MulticastMessage = {
        tokens: tokens.map(t => t.token),
        data: {
          type: CallNotificationType.CALL_CANCELLED,
          callId: callId,
          action: 'dismiss',
        },
        android: {
          priority: 'high',
          notification: {
            tag: `call_${callId}`,
            // Empty notification will dismiss the previous one with same tag
          },
        },
        apns: {
          payload: {
            aps: {
              'content-available': 1,
              sound: '',
            },
            callId: callId,
            action: 'dismiss',
          },
        },
        webpush: {
          notification: {
            tag: `call_${callId}`,
          },
        },
      };

      await admin.messaging().sendEachForMulticast(message);
      return { success: true };
    } catch (error) {
      logger.error('Error cancelling call notification:', error);
      return { success: false };
    }
  }

  /**
   * Get user's FCM tokens
   */
  private async getUserTokens(userId: string): Promise<any[]> {
    try {
      const tokens = await db('fcm_tokens')
        .where({ user_id: userId })
        .orderBy('last_used_at', 'desc');

      return tokens;
    } catch (error) {
      logger.error('Error fetching user tokens:', error);
      return [];
    }
  }

  /**
   * Handle failed tokens (remove invalid ones)
   */
  private async handleFailedTokens(
    tokens: any[],
    response: admin.messaging.BatchResponse
  ): Promise<void> {
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx].token);
          }
        }
      });

      if (failedTokens.length > 0) {
        await db('fcm_tokens').whereIn('token', failedTokens).delete();
        logger.info(`Removed ${failedTokens.length} invalid FCM tokens`);
      }
    }
  }

  /**
   * Save call notification record
   */
  private async saveCallNotificationRecord(
    userId: string,
    data: IncomingCallData
  ): Promise<void> {
    try {
      await db('notifications').insert({
        id: uuidv4(),
        user_id: userId,
        type: CallNotificationType.INCOMING_CALL,
        title: data.callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call',
        body: `${data.callerName} is calling you`,
        data: JSON.stringify({
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar,
          callType: data.callType,
        }),
        read: false,
        created_at: new Date(),
      });
    } catch (error) {
      logger.error('Error saving call notification record:', error);
    }
  }
}

export const callPushService = new CallPushService();
export default CallPushService;
