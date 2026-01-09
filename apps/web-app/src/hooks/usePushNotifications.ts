/**
 * Push Notifications Hook
 * Manages push notification permissions and subscriptions
 */

import { authTokenService } from '@/services/auth-token.service';
import { useState, useEffect, useCallback } from 'react';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'default';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

    if (!isSupported) {
      setState(prev => ({
        ...prev,
        isSupported: false,
        isLoading: false,
      }));
      return;
    }

    const permission = Notification.permission;
    const isSubscribed = await checkSubscription();

    setState(prev => ({
      ...prev,
      isSupported: true,
      permission,
      isSubscribed,
      isLoading: false,
    }));
  };

  const checkSubscription = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications are not supported in this browser' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission, isLoading: false }));
      return permission === 'granted';
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to request notification permission',
      }));
      return false;
    }
  }, [state.isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || state.permission !== 'granted') {
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server (mock for now)
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        setState(prev => ({ ...prev, isLoading: false, isSubscribed: false }));
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Send subscription to server
      await sendSubscriptionToServer(subscription);

      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      return true;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to subscribe to push notifications',
      }));
      return false;
    }
  }, [state.isSupported, state.permission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await removeSubscriptionFromServer(subscription);
      }

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to unsubscribe from push notifications',
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    // Aliases for component compatibility
    isRegistered: state.isSubscribed,
    registerDevice: subscribe,
    unregisterDevice: unsubscribe,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Send subscription to backend
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: {
      ...authTokenService.getAuthorizationHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error('Failed to save subscription on server');
  }
}

// Remove subscription from backend
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/notifications/unsubscribe', {
    method: 'POST',
    headers: {
      ...authTokenService.getAuthorizationHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  if (!response.ok) {
    throw new Error('Failed to remove subscription from server');
  }
}

export default usePushNotifications;
