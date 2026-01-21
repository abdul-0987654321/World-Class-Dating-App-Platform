/**
 * Notification Handler Component
 * Provides notification context and hooks for the app
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import notificationService from './NotificationService';

interface NotificationContextValue {
  hasPermission: boolean;
  unreadCount: number;
  requestPermissions: () => Promise<boolean>;
  openSettings: () => Promise<void>;
  updateBadgeCount: () => Promise<void>;
  clearNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);

  // Initialize notification service
  useEffect(() => {
    const initializeNotifications = async () => {
      await notificationService.initialize();
      const status = await notificationService.getPermissionStatus();
      setHasPermission(status.granted);

      if (status.granted) {
        await updateBadgeCount();
      }
    };

    initializeNotifications();

    // Cleanup
    return () => {
      notificationService.unsubscribe();
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - update badge count
      await updateBadgeCount();
    }
    setAppState(nextAppState);
  };

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermissions();
    setHasPermission(granted);

    if (granted) {
      await notificationService.getFCMToken();
      await updateBadgeCount();
    }

    return granted;
  }, []);

  const openSettings = useCallback(async () => {
    await notificationService.openSettings();
  }, []);

  const updateBadgeCount = useCallback(async () => {
    try {
      await notificationService.updateBadgeCount();
      // You can also update local state here if needed
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    await notificationService.clearAllNotifications();
    setUnreadCount(0);
  }, []);

  const value: NotificationContextValue = {
    hasPermission,
    unreadCount,
    requestPermissions,
    openSettings,
    updateBadgeCount,
    clearNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// Hook to use notification context
export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  return context;
};

export default NotificationProvider;
