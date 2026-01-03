/**
 * Ad Placement Component
 * Strategic ad placement management for different screens
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BannerAdComponent, BottomBannerAd, InlineBannerAd } from './BannerAd';
import { QuickRewardButton } from './RewardedAd';
import { AdFreeWrapper, ShowIfAds } from './AdFreeWrapper';
import { BannerPlacement, RewardEarned } from '../../services/ads/types';

/**
 * Props for the AdPlacement component
 */
interface AdPlacementProps {
  screen: 'discovery' | 'messages' | 'profile' | 'matches' | 'settings' | 'shop';
  position?: 'top' | 'bottom' | 'inline';
  showRewardButton?: boolean;
  onRewardEarned?: (reward: RewardEarned) => void;
  style?: ViewStyle;
}

/**
 * Screen-specific ad configurations
 */
const SCREEN_AD_CONFIG: Record<string, {
  placement: BannerPlacement;
  showBanner: boolean;
  showRewardButton: boolean;
  bannerPosition: 'top' | 'bottom';
}> = {
  discovery: {
    placement: 'discovery_bottom',
    showBanner: true,
    showRewardButton: true,
    bannerPosition: 'bottom',
  },
  messages: {
    placement: 'messages_bottom',
    showBanner: true,
    showRewardButton: false,
    bannerPosition: 'bottom',
  },
  profile: {
    placement: 'profile_view',
    showBanner: true,
    showRewardButton: false,
    bannerPosition: 'bottom',
  },
  matches: {
    placement: 'matches_list',
    showBanner: true,
    showRewardButton: true,
    bannerPosition: 'bottom',
  },
  settings: {
    placement: 'settings',
    showBanner: false,
    showRewardButton: false,
    bannerPosition: 'bottom',
  },
  shop: {
    placement: 'discovery_bottom',
    showBanner: false,
    showRewardButton: true,
    bannerPosition: 'bottom',
  },
};

/**
 * Unified ad placement component for consistent ad display across screens
 */
export const AdPlacement: React.FC<AdPlacementProps> = ({
  screen,
  position,
  showRewardButton,
  onRewardEarned,
  style,
}) => {
  const config = SCREEN_AD_CONFIG[screen] || SCREEN_AD_CONFIG.discovery;
  const shouldShowReward = showRewardButton ?? config.showRewardButton;
  const bannerPosition = position || config.bannerPosition;

  return (
    <ShowIfAds>
      <View style={[styles.container, style]}>
        {config.showBanner && bannerPosition === 'top' && (
          <BannerAdComponent placement={config.placement} />
        )}

        {shouldShowReward && (
          <QuickRewardButton
            onRewardEarned={onRewardEarned}
            position="bottom-right"
          />
        )}

        {config.showBanner && bannerPosition === 'bottom' && (
          <BottomBannerAd placement={config.placement} />
        )}
      </View>
    </ShowIfAds>
  );
};

/**
 * Discovery screen ad layout
 * - Bottom banner ad
 * - Quick reward button
 */
interface DiscoveryAdLayoutProps {
  children: React.ReactNode;
  onRewardEarned?: (reward: RewardEarned) => void;
}

export const DiscoveryAdLayout: React.FC<DiscoveryAdLayoutProps> = ({
  children,
  onRewardEarned,
}) => {
  return (
    <View style={styles.fullScreen}>
      <View style={styles.contentArea}>
        {children}
      </View>

      <ShowIfAds>
        <QuickRewardButton
          onRewardEarned={onRewardEarned}
          position="bottom-right"
        />
        <BottomBannerAd placement="discovery_bottom" />
      </ShowIfAds>
    </View>
  );
};

/**
 * Messages screen ad layout
 * - Bottom banner ad (smaller to not interfere with keyboard)
 */
interface MessagesAdLayoutProps {
  children: React.ReactNode;
}

export const MessagesAdLayout: React.FC<MessagesAdLayoutProps> = ({
  children,
}) => {
  return (
    <View style={styles.fullScreen}>
      <View style={styles.contentArea}>
        {children}
      </View>

      <ShowIfAds>
        <BannerAdComponent
          placement="messages_bottom"
          size="banner"
        />
      </ShowIfAds>
    </View>
  );
};

/**
 * Matches list ad layout
 * - Inline banner ads between match cards
 */
interface MatchesAdLayoutProps {
  children: React.ReactNode;
  onRewardEarned?: (reward: RewardEarned) => void;
}

export const MatchesAdLayout: React.FC<MatchesAdLayoutProps> = ({
  children,
  onRewardEarned,
}) => {
  return (
    <View style={styles.fullScreen}>
      <View style={styles.contentArea}>
        {children}
      </View>

      <ShowIfAds>
        <QuickRewardButton
          onRewardEarned={onRewardEarned}
          position="bottom-left"
        />
        <BottomBannerAd placement="matches_list" />
      </ShowIfAds>
    </View>
  );
};

/**
 * Inline ad for FlatList/ScrollView
 * Insert between items at regular intervals
 */
interface InlineAdProps {
  index: number;
  interval?: number; // Show ad every N items
}

export const InlineAd: React.FC<InlineAdProps> = ({
  index,
  interval = 5,
}) => {
  // Only show at specified intervals
  if ((index + 1) % interval !== 0) {
    return null;
  }

  return (
    <ShowIfAds>
      <InlineBannerAd placement="matches_list" />
    </ShowIfAds>
  );
};

/**
 * Profile view ad section
 * - Medium rectangle ad
 */
interface ProfileAdSectionProps {
  style?: ViewStyle;
}

export const ProfileAdSection: React.FC<ProfileAdSectionProps> = ({
  style,
}) => {
  return (
    <ShowIfAds>
      <View style={[styles.profileAdContainer, style]}>
        <BannerAdComponent
          placement="profile_view"
          size="mediumRectangle"
        />
      </View>
    </ShowIfAds>
  );
};

/**
 * Coin shop ad section
 * - Rewarded video integration
 */
interface CoinShopAdSectionProps {
  onRewardEarned?: (reward: RewardEarned) => void;
}

export const CoinShopAdSection: React.FC<CoinShopAdSectionProps> = ({
  onRewardEarned,
}) => {
  return (
    <View style={styles.shopAdContainer}>
      <QuickRewardButton
        onRewardEarned={onRewardEarned}
        position="bottom-right"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  fullScreen: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  profileAdContainer: {
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  shopAdContainer: {
    marginVertical: 16,
  },
});

export default AdPlacement;
