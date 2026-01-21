/**
 * Mobile App Notification Service
 * Handles push notification setup, permissions, and handling
 */

import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpClient } from '../api/httpClient';
import { navigationRef } from '../../navigation/NavigationService';

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
      console.log('Initializing notification service...');

      // Request permissions
      const hasPermission = await this.requestPermissions();

      if (!hasPermission) {
        console.warn('Notification permissions not granted');
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

      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
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
        console.log('Notification permissions granted');
        return true;
      } else {
        console.log('Notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
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
        console.log('FCM Token:', token);
        this.fcmToken = token;

        // Save token to AsyncStorage
        await AsyncStorage.setItem('fcmToken', token);

        // Register token with backend
        await this.registerTokenWithBackend(token);

        return token;
      }

      return null;
    } catch (error) {
      console.error('Error getting FCM token:', error);
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
        deviceModel: Platform.constants.Model || 'Unknown',
        osVersion: Platform.Version.toString(),
        appVersion: '1.0.0', // Get from app config
      };

      await httpClient.post('/notifications/devices/register', deviceInfo);

      console.log('Device token registered with backend');
    } catch (error) {
      console.error('Failed to register token with backend:', error);
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
      console.log('FCM Token refreshed:', token);
      this.fcmToken = token;
      await AsyncStorage.setItem('fcmToken', token);
      await this.registerTokenWithBackend(token);
    });

    // Listen for foreground messages
    this.unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground notification received:', remoteMessage);
      await this.handleForegroundNotification(remoteMessage);
    });

    // Listen for background message handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background notification received:', remoteMessage);
      await this.handleBackgroundNotification(remoteMessage);
    });

    // Listen for notification interactions
    notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('Notification pressed:', detail);
        await this.handleNotificationPress(detail);
      }
    });

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('Background notification pressed:', detail);
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
      console.log('Initial notification:', remoteMessage);
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

    console.log('Notification channels created');
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
        largeIcon: notification.android?.imageUrl || data?.imageUrl,
        pressAction: {
          id: 'default',
        },
        importance: AndroidImportance.HIGH,
      },
      ios: {
        attachments:
          notification.ios?.imageUrl || data?.imageUrl
            ? [{ url: notification.ios?.imageUrl || data?.imageUrl }]
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
    console.log('Background notification processed');
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
    console.log('Navigating by type:', type, data);

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
      navigationRef.current.navigate(navigation.screen as never, navigation.params as never);
    }
  }

  /**
   * Handle deep link
   */
  private handleDeepLink(deepLink: string): void {
    console.log('Handling deep link:', deepLink);

    // Parse deep link and navigate
    // Format: flamoral://screen/params
    const url = deepLink.replace('flamoral://', '');
    const [screen, ...paramsParts] = url.split('/');

    if (navigationRef.current) {
      navigationRef.current.navigate(screen as never);
    }
  }

  /**
   * Update badge count
   */
  async updateBadgeCount(): Promise<void> {
    try {
      const response = await httpClient.get('/notifications/unread-count');
      const count = response.data.count || 0;

      if (Platform.OS === 'ios') {
        notifee.setBadgeCount(count);
      }
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await httpClient.put(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
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
        await httpClient.delete('/notifications/devices/unregister', {
          data: { deviceToken: this.fcmToken },
        });
      } catch (error) {
        console.error('Failed to unregister device:', error);
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
