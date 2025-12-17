/**
 * Hook for managing notification permissions
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import notificationService from '../services/notifications/NotificationService';

interface NotificationPermissionState {
  granted: boolean;
  canRequest: boolean;
  loading: boolean;
}

export const useNotificationPermissions = () => {
  const [state, setState] = useState<NotificationPermissionState>({
    granted: false,
    canRequest: true,
    loading: true,
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const status = await notificationService.getPermissionStatus();

      setState({
        granted: status.granted,
        canRequest: status.canRequest,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.canRequest && !state.granted) {
        // User has denied permissions before - show settings prompt
        Alert.alert(
          'Enable Notifications',
          'Please enable notifications in your device settings to receive important updates.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => notificationService.openSettings(),
            },
          ]
        );
        return false;
      }

      const granted = await notificationService.requestPermissions();

      setState(prev => ({
        ...prev,
        granted,
        canRequest: !granted,
      }));

      if (granted) {
        // Get FCM token after permission granted
        await notificationService.getFCMToken();
      }

      return granted;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }, [state.canRequest, state.granted]);

  const openSettings = useCallback(async () => {
    await notificationService.openSettings();
  }, []);

  const showPermissionPrompt = useCallback(() => {
    Alert.alert(
      'Stay Updated',
      'Enable notifications to get instant updates about matches, messages, and more!',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: requestPermissions,
        },
      ]
    );
  }, [requestPermissions]);

  return {
    ...state,
    checkPermissions,
    requestPermissions,
    openSettings,
    showPermissionPrompt,
  };
};

export default useNotificationPermissions;
