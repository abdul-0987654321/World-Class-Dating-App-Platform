/**
 * Mobile App Notification Service
 * Handles push notification setup, permissions, and handling
 */

import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpClient } from '../api/httpClient';
import { CommonActions } from '@react-navigation/native';
import { navigationRef } from '../../navigation/NavigationService';
import logger from '../../utils/logger';

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, any>;
  deepLink?: string;
}

class NotificationService {
  private fcmToken: string | null = null;
  private unsubscribeTokenRefresh: (() => void) | null = null;
  private unsubscribeOnMessage: (() => void) | null = null;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing notification service...');

      // Request permissions
      const hasPermission = await this.requestPermissions();

      if (!hasPermission) {
        logger.warn('Notification permissions not granted');
        return;
      }

      // Create notification channels (Android)
      if (Platform.OS === 'android') {
        await this.createNotificationChannels();
      }

      // Get FCM token
      await this.getFCMToken();

      // Set up listeners
      this.setupListeners();

      // Handle initial notification (app opened from quit state)
      await this.handleInitialNotification();

      logger.info('Notification service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize notification service', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        logger.info('Notification permissions granted');
        return true;
      } else {
        logger.info('Notification permissions denied');
        return false;
      }
    } catch (error) {
      logger.error('Error requesting notification permissions', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Check if permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    const authStatus = await messaging().hasPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  /**
   * Open app settings for permissions
   */
  async openSettings(): Promise<void> {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  /**
   * Get FCM token
   */
  async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();

      if (token) {
        logger.debug('FCM Token obtained', { tokenLength: token.length });
        this.fcmToken = token;

        // Save token to AsyncStorage
        await AsyncStorage.setItem('fcmToken', token);

        // Register token with backend
        await this.registerTokenWithBackend(token);

        return token;
      }

      return null;
    } catch (error) {
      logger.error('Error getting FCM token', error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Register FCM token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const deviceInfo = {
        deviceToken: token,
        platform: Platform.OS as 'ios' | 'android',
        deviceId: await this.getDeviceId(),
        deviceModel: (Platform.constants as any)?.Model || 'Unknown',
        osVersion: Platform.Version.toString(),
        appVersion: '1.0.0', // Get from app config
      };

      await httpClient.post('/notifications/devices/register', deviceInfo);

      logger.info('Device token registered with backend');
    } catch (error) {
      logger.error('Failed to register token with backend', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Get device ID
   */
  private async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('deviceId');

    if (!deviceId) {
      deviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await AsyncStorage.setItem('deviceId', deviceId);
    }

    return deviceId;
  }

  /**
   * Setup notification listeners
   */
  private setupListeners(): void {
    // Listen for token refresh
    this.unsubscribeTokenRefresh = messaging().onTokenRefresh(async (token) => {
      logger.info('FCM Token refreshed', { tokenLength: token.length });
      this.fcmToken = token;
      await AsyncStorage.setItem('fcmToken', token);
      await this.registerTokenWithBackend(token);
    });

    // Listen for foreground messages
    this.unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      logger.debug('Foreground notification received', { messageId: remoteMessage.messageId });
      await this.handleForegroundNotification(remoteMessage);
    });

    // Listen for background message handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      logger.debug('Background notification received', { messageId: remoteMessage.messageId });
      await this.handleBackgroundNotification(remoteMessage);
    });

    // Listen for notification interactions
    notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        logger.debug('Notification pressed', { notificationId: detail.notification?.id });
        await this.handleNotificationPress(detail);
      }
    });

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        logger.debug('Background notification pressed', { notificationId: detail.notification?.id });
        await this.handleNotificationPress(detail);
      }
    });
  }

  /**
   * Handle initial notification (app opened from quit state)
   */
  private async handleInitialNotification(): Promise<void> {
    const remoteMessage = await messaging().getInitialNotification();

    if (remoteMessage) {
      logger.info('Initial notification', { messageId: remoteMessage.messageId });
      await this.handleNotificationOpen(remoteMessage);
    }
  }

  /**
   * Create notification channels (Android)
   */
  private async createNotificationChannels(): Promise<void> {
    const channels = [
      {
        id: 'default',
        name: 'General Notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      },
      {
        id: 'messages',
        name: 'Messages',
        importance: AndroidImportance.HIGH,
        sound: 'message_sound',
      },
      {
        id: 'matches',
        name: 'Matches',
        importance: AndroidImportance.HIGH,
        sound: 'match_sound',
      },
      {
        id: 'calls',
        name: 'Video Calls',
        importance: AndroidImportance.HIGH,
        sound: 'call_sound',
      },
      {
        id: 'social',
        name: 'Likes & Views',
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
      },
    ];

    for (const channel of channels) {
      await notifee.createChannel(channel);
    }

    logger.info('Notification channels created');
  }

  /**
   * Handle foreground notification
   */
  private async handleForegroundNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    const { notification, data } = remoteMessage;

    if (!notification) return;

    // Display notification using Notifee
    await notifee.displayNotification({
      title: notification.title,
      body: notification.body,
      android: {
        channelId: this.getChannelId(data?.type),
        smallIcon: 'ic_notification',
        largeIcon: (notification.android as any)?.imageUrl || data?.imageUrl as string,
        pressAction: {
          id: 'default',
        },
        importance: AndroidImportance.HIGH,
      },
      ios: {
        attachments:
          (notification.ios as any)?.imageUrl || data?.imageUrl
            ? [{ url: ((notification.ios as any)?.imageUrl || data?.imageUrl) as string }]
            : [],
        sound: 'default',
      },
      data,
    });

    // Update badge count
    await this.updateBadgeCount();
  }

  /**
   * Handle background notification
   */
  private async handleBackgroundNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    // Update badge count
    await this.updateBadgeCount();

    // You can perform background tasks here
    logger.debug('Background notification processed');
  }

  /**
   * Handle notification press/open
   */
  private async handleNotificationPress(detail: any): Promise<void> {
    const data = detail.notification?.data;

    if (!data) return;

    // Mark notification as read
    if (data.notificationId) {
      await this.markNotificationAsRead(data.notificationId);
    }

    // Handle deep link
    if (data.deepLink) {
      this.handleDeepLink(data.deepLink);
    } else {
      // Navigate based on notification type
      this.navigateByType(data.type, data);
    }

    // Update badge count
    await this.updateBadgeCount();
  }

  /**
   * Handle notification open from killed state
   */
  private async handleNotificationOpen(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    const data = remoteMessage.data;

    if (!data) return;

    // Wait for navigation to be ready
    setTimeout(() => {
      if (data.deepLink) {
        this.handleDeepLink(data.deepLink as string);
      } else {
        this.navigateByType(data.type as string, data);
      }
    }, 1000);
  }

  /**
   * Get appropriate channel ID based on notification type
   */
  private getChannelId(type?: string): string {
    if (!type) return 'default';

    const channelMap: Record<string, string> = {
      new_message: 'messages',
      new_match: 'matches',
      video_call_incoming: 'calls',
      super_like: 'social',
      profile_view: 'social',
      new_like: 'social',
    };

    return channelMap[type] || 'default';
  }

  /**
   * Navigate based on notification type
   */
  private navigateByType(type: string, data: any): void {
    logger.debug('Navigating by type', { type });

    const navigationMap: Record<string, { screen: string; params?: any }> = {
      new_message: {
        screen: 'Chat',
        params: { userId: data.senderId, chatId: data.chatId },
      },
      new_match: {
        screen: 'Chat',
        params: { userId: data.matchUserId, isNewMatch: true },
      },
      video_call_incoming: {
        screen: 'VideoCall',
        params: { callId: data.callId },
      },
      super_like: {
        screen: 'Profile',
        params: { userId: data.likerId },
      },
      profile_view: {
        screen: 'Profile',
        params: { userId: data.viewerId },
      },
      match_expiring: {
        screen: 'Chat',
        params: { userId: data.matchUserId },
      },
      daily_picks: {
        screen: 'Discover',
      },
    };

    const navigation = navigationMap[type];

    if (navigation && navigationRef.current) {
      navigationRef.current.dispatch(
        CommonActions.navigate({ name: navigation.screen, params: navigation.params })
      );
    }
  }

  /**
   * Handle deep link
   */
  private handleDeepLink(deepLink: string): void {
    logger.debug('Handling deep link', { deepLink });

    // Parse deep link and navigate
    // Format: flamoral://screen/params
    const url = deepLink.replace('flamoral://', '');
    const [screen, ...paramsParts] = url.split('/');

    if (navigationRef.current) {
      navigationRef.current.dispatch(
        CommonActions.navigate({ name: screen })
      );
    }
  }

  /**
   * Update badge count
   */
  async updateBadgeCount(): Promise<void> {
    try {
      const response = await httpClient.get<{ count: number }>('/notifications/unread-count');
      const count = response.data?.count || 0;

      if (Platform.OS === 'ios') {
        notifee.setBadgeCount(count);
      }
    } catch (error) {
      logger.error('Failed to update badge count', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await httpClient.put(`/notifications/${notificationId}/read`);
    } catch (error) {
      logger.error('Failed to mark notification as read', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await notifee.cancelAllNotifications();
    await this.updateBadgeCount();
  }

  /**
   * Unsubscribe from notifications
   */
  async unsubscribe(): Promise<void> {
    if (this.fcmToken) {
      try {
        await httpClient.post('/notifications/devices/unregister', {
          deviceToken: this.fcmToken,
        });
      } catch (error) {
        logger.error('Failed to unregister device', error instanceof Error ? error : undefined);
      }
    }

    if (this.unsubscribeTokenRefresh) {
      this.unsubscribeTokenRefresh();
    }

    if (this.unsubscribeOnMessage) {
      this.unsubscribeOnMessage();
    }
  }

  /**
   * Get notification permissions status
   */
  async getPermissionStatus(): Promise<{
    granted: boolean;
    canRequest: boolean;
  }> {
    const authStatus = await messaging().hasPermission();

    return {
      granted:
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL,
      canRequest: authStatus === messaging.AuthorizationStatus.NOT_DETERMINED,
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
