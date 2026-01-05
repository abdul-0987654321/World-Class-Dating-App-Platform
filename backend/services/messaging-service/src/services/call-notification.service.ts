/**
 * Call Notification Service
 * Sends push notifications for incoming calls
 */

import axios from 'axios';

import config from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('call-notification-service');

export interface IncomingCallNotification {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'audio';
  timestamp: number;
}

export interface MissedCallNotification {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'audio';
  timestamp: number;
}

export interface CallEndedNotification {
  callId: string;
  duration: number;
  otherUserId: string;
  otherUserName: string;
}

export class CallNotificationService {
  private notificationServiceUrl: string;
  private serviceToken: string;

  constructor() {
    this.notificationServiceUrl =
      config.services?.notificationServiceUrl || 'http://localhost:3005';
    this.serviceToken = config.serviceToken;
  }

  /**
   * Send push notification for incoming call
   */
  async sendIncomingCallNotification(
    recipientId: string,
    data: IncomingCallNotification
  ): Promise<boolean> {
    try {
      const payload = {
        userId: recipientId,
        type: 'INCOMING_CALL',
        title: data.callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call',
        body: `${data.callerName} is calling you`,
        data: {
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar,
          callType: data.callType,
          timestamp: data.timestamp,
          action: 'INCOMING_CALL',
        },
        // High priority for calls - bypass quiet hours
        priority: 'high',
        ttl: 60, // 60 seconds - call will timeout anyway
        // Use VoIP push for iOS if available
        voipPush: true,
        // Custom sound for calls
        sound: 'ringtone.mp3',
        // Category for actionable notification
        category: 'INCOMING_CALL',
        // iOS specific
        aps: {
          alert: {
            title: data.callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call',
            body: `${data.callerName} is calling you`,
          },
          sound: 'ringtone.caf',
          badge: 1,
          'content-available': 1,
          'mutable-content': 1,
          category: 'INCOMING_CALL',
        },
        // Android specific
        android: {
          priority: 'high',
          ttl: '60s',
          notification: {
            channelId: 'incoming_calls',
            priority: 'max',
            visibility: 'public',
            sound: 'ringtone',
            vibrate: [0, 500, 200, 500],
            fullScreenIntent: true,
            category: 'call',
          },
        },
      };

      const response = await axios.post(
        `${this.notificationServiceUrl}/api/v1/internal/notifications/send`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.serviceToken}`,
            'X-Service-Name': 'messaging-service',
          },
          timeout: 5000, // 5 second timeout for calls
        }
      );

      if (response.status === 200 || response.status === 201) {
        logger.info('Incoming call notification sent', {
          recipientId,
          callId: data.callId,
          callType: data.callType,
        });
        return true;
      }

      logger.warn('Failed to send incoming call notification', {
        recipientId,
        callId: data.callId,
        status: response.status,
      });
      return false;
    } catch (error: any) {
      logger.error('Error sending incoming call notification', {
        error: error.message,
        recipientId,
        callId: data.callId,
      });
      return false;
    }
  }

  /**
   * Send push notification for missed call
   */
  async sendMissedCallNotification(
    recipientId: string,
    data: MissedCallNotification
  ): Promise<boolean> {
    try {
      const payload = {
        userId: recipientId,
        type: 'MISSED_CALL',
        title: 'Missed Call',
        body: `You missed a ${data.callType} call from ${data.callerName}`,
        data: {
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar,
          callType: data.callType,
          timestamp: data.timestamp,
          action: 'MISSED_CALL',
        },
        priority: 'normal',
        deepLink: `/chat/${data.callerId}`,
        imageUrl: data.callerAvatar,
      };

      const response = await axios.post(
        `${this.notificationServiceUrl}/api/v1/internal/notifications/send`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.serviceToken}`,
            'X-Service-Name': 'messaging-service',
          },
          timeout: 10000,
        }
      );

      if (response.status === 200 || response.status === 201) {
        logger.info('Missed call notification sent', {
          recipientId,
          callId: data.callId,
        });
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('Error sending missed call notification', {
        error: error.message,
        recipientId,
        callId: data.callId,
      });
      return false;
    }
  }

  /**
   * Send push notification for call ended (summary)
   */
  async sendCallEndedNotification(
    recipientId: string,
    data: CallEndedNotification
  ): Promise<boolean> {
    // Only send if call was long enough (more than 10 seconds)
    if (data.duration < 10) {
      return true;
    }

    try {
      const durationFormatted = this.formatDuration(data.duration);

      const payload = {
        userId: recipientId,
        type: 'CALL_ENDED',
        title: 'Call Ended',
        body: `Your call with ${data.otherUserName} lasted ${durationFormatted}`,
        data: {
          callId: data.callId,
          duration: data.duration,
          otherUserId: data.otherUserId,
          action: 'CALL_ENDED',
        },
        priority: 'low',
        deepLink: `/chat/${data.otherUserId}`,
      };

      const response = await axios.post(
        `${this.notificationServiceUrl}/api/v1/internal/notifications/send`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.serviceToken}`,
            'X-Service-Name': 'messaging-service',
          },
          timeout: 10000,
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (error: any) {
      logger.error('Error sending call ended notification', {
        error: error.message,
        recipientId,
        callId: data.callId,
      });
      return false;
    }
  }

  /**
   * Cancel pending call notifications (when call is answered or rejected)
   */
  async cancelCallNotification(recipientId: string, callId: string): Promise<boolean> {
    try {
      const response = await axios.delete(
        `${this.notificationServiceUrl}/api/v1/internal/notifications/cancel`,
        {
          data: {
            userId: recipientId,
            notificationId: `call_${callId}`,
            category: 'INCOMING_CALL',
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.serviceToken}`,
            'X-Service-Name': 'messaging-service',
          },
          timeout: 5000,
        }
      );

      return response.status === 200;
    } catch (error: any) {
      // Don't log as error - notification might already be dismissed
      logger.debug('Could not cancel call notification', {
        recipientId,
        callId,
      });
      return false;
    }
  }

  /**
   * Format duration in human readable format
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      if (remainingSeconds === 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
      return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}

export const callNotificationService = new CallNotificationService();
export default CallNotificationService;
