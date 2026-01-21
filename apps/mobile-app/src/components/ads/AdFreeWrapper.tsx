/**
 * Ad-Free Wrapper Component
 * Wraps content and conditionally shows/hides ads based on user subscription
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AdManager from '../../services/ads/AdManager';
import { AD_FREE_TIERS, REDUCED_ADS_TIERS } from '../../services/ads/types';

interface AdFreeWrapperProps {
  children: ReactNode;
  adComponent?: ReactNode;
  fallbackComponent?: ReactNode;
  showUpgradePrompt?: boolean;
  adPlacement?: 'top' | 'bottom' | 'inline';
  onUpgradePress?: () => void;
}

/**
 * Wrapper that conditionally renders ads based on user subscription
 */
export const AdFreeWrapper: React.FC<AdFreeWrapperProps> = ({
  children,
  adComponent,
  fallbackComponent,
  showUpgradePrompt = false,
  adPlacement = 'bottom',
  onUpgradePress,
}) => {
  const [shouldShowAds, setShouldShowAds] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkAdStatus = async () => {
      await AdManager.initialize();
      const showAds = AdManager.shouldShowAds();
      setShouldShowAds(showAds);
      setIsInitialized(true);
    };

    checkAdStatus();
  }, []);

  // Render ad component in correct position
  const renderAd = () => {
    if (!isInitialized) return null;

    if (shouldShowAds && adComponent) {
      return adComponent;
    }

    if (!shouldShowAds && fallbackComponent) {
      return fallbackComponent;
    }

    return null;
  };

  // Render upgrade prompt for free users
  const renderUpgradePrompt = () => {
    if (!showUpgradePrompt || !shouldShowAds) return null;

    return (
      <TouchableOpacity style={styles.upgradePrompt} onPress={onUpgradePress}>
        <Text style={styles.upgradeIcon}>Premium</Text>
        <View style={styles.upgradeContent}>
          <Text style={styles.upgradeTitle}>Remove Ads</Text>
          <Text style={styles.upgradeSubtitle}>Upgrade to Premium</Text>
        </View>
        <Text style={styles.upgradeArrow}>Upgrade</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {adPlacement === 'top' && renderAd()}
      {adPlacement === 'top' && renderUpgradePrompt()}

      <View style={styles.contentContainer}>{children}</View>

      {adPlacement === 'bottom' && renderUpgradePrompt()}
      {adPlacement === 'bottom' && renderAd()}
    </View>
  );
};

/**
 * Hook to check if user should see ads
 */
export function useAdFreeStatus() {
  const [status, setStatus] = useState({
    isAdFree: false,
    hasReducedAds: false,
    tier: null as string | null,
    isLoading: true,
  });

  useEffect(() => {
    const checkStatus = async () => {
      await AdManager.initialize();
      const shouldShow = AdManager.shouldShowAds();
      const reducedAds = AdManager.hasReducedAds();
      const adState = AdManager.getAdState();

      setStatus({
        isAdFree: !shouldShow,
        hasReducedAds: reducedAds,
        tier: null, // Would come from user preferences
        isLoading: false,
      });
    };

    checkStatus();
  }, []);

  return status;
}

/**
 * Premium badge for ad-free users
 */
interface PremiumBadgeProps {
  tier: string;
  size?: 'small' | 'medium' | 'large';
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ tier, size = 'small' }) => {
  const isAdFree = AD_FREE_TIERS.includes(tier);

  if (!isAdFree) return null;

  const sizeStyles = {
    small: { padding: 4, fontSize: 10 },
    medium: { padding: 8, fontSize: 12 },
    large: { padding: 12, fontSize: 14 },
  };

  return (
    <View style={[styles.premiumBadge, { padding: sizeStyles[size].padding }]}>
      <Text style={[styles.premiumBadgeText, { fontSize: sizeStyles[size].fontSize }]}>
        AD-FREE
      </Text>
    </View>
  );
};

/**
 * Ad-free subscription status card
 */
interface AdFreeStatusCardProps {
  tier: string | null;
  expiresAt?: Date;
  onManagePress?: () => void;
}

export const AdFreeStatusCard: React.FC<AdFreeStatusCardProps> = ({
  tier,
  expiresAt,
  onManagePress,
}) => {
  const isAdFree = tier && AD_FREE_TIERS.includes(tier);

  if (!isAdFree) {
    return (
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusIcon}>Ads</Text>
          <Text style={styles.statusTitle}>Ads Enabled</Text>
        </View>
        <Text style={styles.statusDescription}>
          Upgrade to Premium to remove all ads and enjoy an uninterrupted experience.
        </Text>
        <TouchableOpacity style={styles.upgradeButton} onPress={onManagePress}>
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.statusCard, styles.statusCardPremium]}>
      <View style={styles.statusHeader}>
        <Text style={styles.statusIcon}>No Ads</Text>
        <Text style={styles.statusTitle}>Ad-Free Experience</Text>
      </View>
      <Text style={styles.statusDescription}>
        You're enjoying an ad-free experience with your {tier} subscription.
      </Text>
      {expiresAt && (
        <Text style={styles.expiresText}>Renews on {expiresAt.toLocaleDateString()}</Text>
      )}
      <TouchableOpacity style={styles.manageButton} onPress={onManagePress}>
        <Text style={styles.manageButtonText}>Manage Subscription</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Conditional render based on ad-free status
 */
interface ShowIfAdsProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ShowIfAds: React.FC<ShowIfAdsProps> = ({ children, fallback }) => {
  const { isAdFree, isLoading } = useAdFreeStatus();

  if (isLoading) return null;

  if (isAdFree) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

export const ShowIfAdFree: React.FC<ShowIfAdsProps> = ({ children, fallback }) => {
  const { isAdFree, isLoading } = useAdFreeStatus();

  if (isLoading) return null;

  if (!isAdFree) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  upgradeIcon: {
    fontSize: 14,
    marginRight: 12,
    color: '#FF9800',
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  upgradeSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  upgradeArrow: {
    fontSize: 12,
    color: '#E91E63',
    fontWeight: '600',
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  premiumBadgeText: {
    color: '#333',
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusCardPremium: {
    backgroundColor: '#F3E5F5',
    borderWidth: 1,
    borderColor: '#E91E63',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  expiresText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manageButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  manageButtonText: {
    color: '#E91E63',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdFreeWrapper;
