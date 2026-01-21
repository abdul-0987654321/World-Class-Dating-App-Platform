/**
 * Banner Ad Component
 * Displays banner ads with placement-based styling and premium user detection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { BannerAd as GoogleBannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { BannerAdProps, BannerPlacement, DEFAULT_AD_CONFIG } from '../../services/ads/types';
import AdManager from '../../services/ads/AdManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Map our banner sizes to Google's banner sizes
const BANNER_SIZE_MAP: Record<string, BannerAdSize> = {
  banner: BannerAdSize.BANNER, // 320x50
  largeBanner: BannerAdSize.LARGE_BANNER, // 320x100
  mediumRectangle: BannerAdSize.MEDIUM_RECTANGLE, // 300x250
  fullBanner: BannerAdSize.FULL_BANNER, // 468x60
  leaderboard: BannerAdSize.LEADERBOARD, // 728x90
  smartBanner: BannerAdSize.ANCHORED_ADAPTIVE_BANNER, // Adaptive
};

// Height for each banner size
const BANNER_HEIGHTS: Record<string, number> = {
  banner: 50,
  largeBanner: 100,
  mediumRectangle: 250,
  fullBanner: 60,
  leaderboard: 90,
  smartBanner: 60, // Approximate for adaptive
};

// Placement-specific configurations
const PLACEMENT_CONFIG: Record<
  BannerPlacement,
  {
    size: BannerAdSize;
    containerStyle: object;
    preferredHeight: number;
  }
> = {
  discovery_bottom: {
    size: BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
    containerStyle: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    preferredHeight: 60,
  },
  messages_bottom: {
    size: BannerAdSize.BANNER,
    containerStyle: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    preferredHeight: 50,
  },
  profile_view: {
    size: BannerAdSize.MEDIUM_RECTANGLE,
    containerStyle: {
      alignSelf: 'center',
      marginVertical: 16,
    },
    preferredHeight: 250,
  },
  matches_list: {
    size: BannerAdSize.LARGE_BANNER,
    containerStyle: {
      alignSelf: 'center',
      marginVertical: 8,
    },
    preferredHeight: 100,
  },
  settings: {
    size: BannerAdSize.BANNER,
    containerStyle: {
      alignSelf: 'center',
      marginVertical: 16,
    },
    preferredHeight: 50,
  },
};

export const BannerAdComponent: React.FC<BannerAdProps> = ({
  placement,
  size,
  onAdLoaded,
  onAdFailed,
  onAdClicked,
  testID,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Check if ads should be shown
  useEffect(() => {
    const checkAdEligibility = async () => {
      await AdManager.initialize();
      const showAds = AdManager.shouldShowAds();
      setShouldShow(showAds);

      if (showAds) {
        AdManager.trackEvent({
          eventType: 'request',
          adType: 'banner',
          network: 'admob',
          placement,
          timestamp: Date.now(),
        });
      }
    };

    checkAdEligibility();
  }, [placement]);

  const handleAdLoaded = useCallback(() => {
    setIsLoading(false);
    setHasError(false);

    AdManager.trackEvent({
      eventType: 'impression',
      adType: 'banner',
      network: 'admob',
      placement,
      timestamp: Date.now(),
    });

    onAdLoaded?.();
  }, [placement, onAdLoaded]);

  const handleAdFailed = useCallback(
    (error: Error) => {
      setIsLoading(false);
      setHasError(true);

      AdManager.trackEvent({
        eventType: 'failed',
        adType: 'banner',
        network: 'admob',
        placement,
        timestamp: Date.now(),
        metadata: { error: error.message },
      });

      onAdFailed?.(error);
    },
    [placement, onAdFailed]
  );

  const handleAdClicked = useCallback(() => {
    AdManager.trackEvent({
      eventType: 'click',
      adType: 'banner',
      network: 'admob',
      placement,
      timestamp: Date.now(),
    });

    onAdClicked?.();
  }, [placement, onAdClicked]);

  // Don't render if ads shouldn't be shown
  if (!shouldShow) {
    return null;
  }

  // Get placement configuration
  const placementConfig = PLACEMENT_CONFIG[placement];
  const adSize = size ? BANNER_SIZE_MAP[size] : placementConfig.size;
  const containerHeight = size ? BANNER_HEIGHTS[size] : placementConfig.preferredHeight;

  // Get ad unit ID
  const adUnitId = DEFAULT_AD_CONFIG.testMode
    ? TestIds.BANNER
    : Platform.OS === 'ios'
      ? DEFAULT_AD_CONFIG.unitIds.ios.banner
      : DEFAULT_AD_CONFIG.unitIds.android.banner;

  return (
    <View
      style={[
        styles.container,
        placementConfig.containerStyle,
        { minHeight: containerHeight },
        hasError && styles.hidden,
      ]}
      testID={testID}
    >
      {isLoading && (
        <View style={[styles.loadingContainer, { height: containerHeight }]}>
          <ActivityIndicator size="small" color="#E91E63" />
        </View>
      )}

      {/* @ts-expect-error GoogleBannerAd has JSX element type incompatibility with React 18 types */}
      <GoogleBannerAd
        unitId={adUnitId}
        size={adSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !AdManager.hasPersonalizedAds(),
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailed}
        onAdOpened={handleAdClicked}
      />
    </View>
  );
};

// Banner ad wrapper for inline ads (e.g., in lists)
export const InlineBannerAd: React.FC<{
  placement?: BannerPlacement;
  style?: object;
}> = ({ placement = 'matches_list', style }) => {
  return (
    <View style={[styles.inlineContainer, style]}>
      <BannerAdComponent placement={placement} size="largeBanner" />
    </View>
  );
};

// Banner ad wrapper for fixed bottom position
export const BottomBannerAd: React.FC<{
  placement?: BannerPlacement;
}> = ({ placement = 'discovery_bottom' }) => {
  return <BannerAdComponent placement={placement} size="smartBanner" />;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  hidden: {
    display: 'none',
  },
  inlineContainer: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default BannerAdComponent;
