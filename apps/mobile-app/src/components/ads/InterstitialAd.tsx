/**
 * Interstitial Ad Hook and Trigger Component
 * Provides hooks and components for showing interstitial ads with frequency capping
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { InterstitialTrigger, UseInterstitialAdReturn } from '../../services/ads/types';
import AdManager from '../../services/ads/AdManager';
import AdService from '../../services/ads/AdService';

/**
 * Hook for managing interstitial ads
 */
export function useInterstitialAd(): UseInterstitialAdReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canShow, setCanShow] = useState(false);
  const [timeUntilNextAd, setTimeUntilNextAd] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and check ad status
  useEffect(() => {
    const initialize = async () => {
      await AdManager.initialize();
      await AdService.initialize();
      updateStatus();
    };

    initialize();

    // Poll for status updates
    intervalRef.current = setInterval(updateStatus, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const updateStatus = useCallback(() => {
    const loaded = AdService.isInterstitialLoaded();
    const canDisplay = AdManager.canShowInterstitial();
    const timeRemaining = AdManager.getTimeUntilNextInterstitial();

    setIsLoaded(loaded);
    setCanShow(canDisplay && loaded);
    setTimeUntilNextAd(timeRemaining);
    setError(AdService.getLastError());
  }, []);

  const preload = useCallback(async () => {
    if (isLoading || isLoaded) return;

    setIsLoading(true);
    try {
      await AdService.loadInterstitialAd();
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
      updateStatus();
    }
  }, [isLoading, isLoaded, updateStatus]);

  const show = useCallback(async (): Promise<boolean> => {
    if (!canShow) {
      console.log('[useInterstitialAd] Cannot show - not ready or capped');
      return false;
    }

    try {
      const success = await AdService.showInterstitialAd();
      updateStatus();
      return success;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, [canShow, updateStatus]);

  return {
    isLoaded,
    isLoading,
    show,
    preload,
    canShow,
    timeUntilNextAd,
    error,
  };
}

/**
 * Props for interstitial trigger points
 */
interface InterstitialTriggerProps {
  trigger: InterstitialTrigger;
  actionCount?: number; // For 'after_swipes' trigger
  onBeforeShow?: () => void;
  onAfterShow?: (shown: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to trigger interstitial ads at specific points
 */
export function useInterstitialTrigger({
  trigger,
  actionCount = 10,
  onBeforeShow,
  onAfterShow,
  onError,
}: InterstitialTriggerProps) {
  const { show, canShow, preload, isLoaded } = useInterstitialAd();
  const actionCountRef = useRef(0);

  // Track action counts
  const recordAction = useCallback(() => {
    AdManager.recordAction();
    actionCountRef.current++;

    // Auto-show after N swipes
    if (trigger === 'after_swipes' && actionCountRef.current >= actionCount) {
      attemptShow();
      actionCountRef.current = 0;
    }
  }, [trigger, actionCount]);

  const attemptShow = useCallback(async () => {
    if (!canShow) {
      console.log('[InterstitialTrigger] Cannot show ad');
      return;
    }

    onBeforeShow?.();

    try {
      const shown = await show();
      onAfterShow?.(shown);
    } catch (err) {
      onError?.(err as Error);
    }
  }, [canShow, show, onBeforeShow, onAfterShow, onError]);

  // Trigger-specific logic
  const triggerAd = useCallback(async () => {
    switch (trigger) {
      case 'after_match':
      case 'before_chat':
      case 'after_session':
      case 'app_resume':
        await attemptShow();
        break;
      case 'after_swipes':
        // Handled in recordAction
        break;
    }
  }, [trigger, attemptShow]);

  // Preload on mount
  useEffect(() => {
    if (!isLoaded && canShow) {
      preload();
    }
  }, [isLoaded, canShow, preload]);

  return {
    recordAction,
    triggerAd,
    isReady: canShow && isLoaded,
  };
}

/**
 * Loading overlay shown while interstitial loads
 */
interface InterstitialLoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const InterstitialLoadingOverlay: React.FC<InterstitialLoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
}) => {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Component that triggers interstitial after swipes
 */
interface SwipeInterstitialTrackerProps {
  onSwipe: () => void;
  children: React.ReactNode;
  swipeThreshold?: number;
}

export const SwipeInterstitialTracker: React.FC<SwipeInterstitialTrackerProps> = ({
  onSwipe,
  children,
  swipeThreshold = 10,
}) => {
  const { recordAction, isReady } = useInterstitialTrigger({
    trigger: 'after_swipes',
    actionCount: swipeThreshold,
  });

  const handleSwipe = useCallback(() => {
    recordAction();
    onSwipe();
  }, [recordAction, onSwipe]);

  return (
    <View style={styles.trackerContainer}>
      {children}
    </View>
  );
};

/**
 * Session end interstitial trigger
 */
interface SessionEndInterstitialProps {
  onComplete: () => void;
  skipLabel?: string;
  continueLabel?: string;
}

export const SessionEndInterstitial: React.FC<SessionEndInterstitialProps> = ({
  onComplete,
  skipLabel = 'Skip',
  continueLabel = 'Continue',
}) => {
  const [showAd, setShowAd] = useState(false);
  const { show, canShow, isLoaded } = useInterstitialAd();

  useEffect(() => {
    // Show ad on mount if available
    if (canShow && isLoaded) {
      setShowAd(true);
      show().finally(() => {
        setShowAd(false);
        onComplete();
      });
    } else {
      onComplete();
    }
  }, []);

  if (showAd) {
    return (
      <View style={styles.sessionEndContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.sessionEndText}>Please wait...</Text>
      </View>
    );
  }

  return null;
};

/**
 * Ad frequency indicator (shows countdown to next ad)
 */
interface AdFrequencyIndicatorProps {
  showCountdown?: boolean;
  style?: object;
}

export const AdFrequencyIndicator: React.FC<AdFrequencyIndicatorProps> = ({
  showCountdown = false,
  style,
}) => {
  const { timeUntilNextAd, canShow } = useInterstitialAd();

  if (!showCountdown || canShow) return null;

  return (
    <View style={[styles.frequencyIndicator, style]}>
      <Text style={styles.frequencyText}>
        Next ad in: {timeUntilNextAd}s
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  trackerContainer: {
    flex: 1,
  },
  sessionEndContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  sessionEndText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  frequencyIndicator: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  frequencyText: {
    fontSize: 12,
    color: '#666',
  },
});

export default useInterstitialAd;
