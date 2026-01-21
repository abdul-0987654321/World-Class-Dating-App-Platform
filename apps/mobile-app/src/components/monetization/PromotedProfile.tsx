import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Button } from '../common/Button';

export type PromotionTier = 'basic' | 'advanced' | 'premium';

export interface PromotionPackage {
  id: string;
  tier: PromotionTier;
  name: string;
  duration: number; // in hours
  price: number;
  originalPrice?: number;
  features: string[];
  estimatedViews: string;
  priority: number;
  discount?: number;
}

export interface ActivePromotion {
  id: string;
  packageId: string;
  tier: PromotionTier;
  startedAt: Date;
  expiresAt: Date;
  viewsReceived: number;
  likesReceived: number;
  matchesReceived: number;
}

interface PromotedProfileProps {
  activePromotion?: ActivePromotion;
  availableCoins: number;
  onPurchasePromotion: (packageId: string) => Promise<void>;
  onBuyCoins: () => void;
  onViewAnalytics?: () => void;
}

export const PromotedProfile: React.FC<PromotedProfileProps> = ({
  activePromotion,
  availableCoins,
  onPurchasePromotion,
  onBuyCoins,
  onViewAnalytics,
}) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PromotionPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const promotionPackages: PromotionPackage[] = [
    {
      id: 'basic_3h',
      tier: 'basic',
      name: 'Visibility Boost',
      duration: 3,
      price: 100,
      features: [
        '3 hours of promotion',
        '2x profile visibility',
        'Appear in top results',
        'Priority in discovery',
      ],
      estimatedViews: '100-200',
      priority: 1,
    },
    {
      id: 'advanced_6h',
      tier: 'advanced',
      name: 'Popular Profile',
      duration: 6,
      price: 180,
      originalPrice: 200,
      discount: 10,
      features: [
        '6 hours of promotion',
        '3x profile visibility',
        'Featured in top results',
        'Priority matching',
        'Boost notification badge',
      ],
      estimatedViews: '250-400',
      priority: 2,
    },
    {
      id: 'premium_12h',
      tier: 'premium',
      name: 'Superstar Promotion',
      duration: 12,
      price: 300,
      originalPrice: 360,
      discount: 17,
      features: [
        '12 hours of promotion',
        '5x profile visibility',
        'Premium featured placement',
        'Priority matching algorithm',
        'Gold boost badge',
        'Analytics dashboard',
      ],
      estimatedViews: '500-800',
      priority: 3,
    },
  ];

  // Update countdown timer
  useEffect(() => {
    if (!activePromotion) return;

    const updateTimer = () => {
      const now = new Date();
      const expiresAt = new Date(activePromotion.expiresAt);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activePromotion]);

  const handlePurchasePackage = async (pkg: PromotionPackage) => {
    if (availableCoins < pkg.price) {
      Alert.alert(
        'Insufficient Coins',
        `You need ${pkg.price} coins but only have ${availableCoins}. Would you like to buy more coins?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Coins', onPress: onBuyCoins },
        ]
      );
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Promote your profile with ${pkg.name} for ${pkg.price} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsLoading(true);
            try {
              await onPurchasePromotion(pkg.id);
              Alert.alert(
                'Success!',
                `Your profile is now being promoted for ${pkg.duration} hours!`
              );
            } catch (error: any) {
              Alert.alert(
                'Purchase Failed',
                error.message || 'Something went wrong. Please try again.'
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getTierColor = (tier: PromotionTier): string => {
    switch (tier) {
      case 'basic':
        return '#2196F3';
      case 'advanced':
        return '#9C27B0';
      case 'premium':
        return '#FFD700';
      default:
        return '#666';
    }
  };

  const getTierIcon = (tier: PromotionTier): string => {
    switch (tier) {
      case 'basic':
        return '📈';
      case 'advanced':
        return '🚀';
      case 'premium':
        return '⭐';
      default:
        return '💫';
    }
  };

  const renderActivePromotion = () => {
    if (!activePromotion) return null;

    const tierColor = getTierColor(activePromotion.tier);
    const tierIcon = getTierIcon(activePromotion.tier);

    return (
      <View style={styles.activePromotionCard}>
        <View style={styles.activePromotionHeader}>
          <View style={[styles.activePromotionBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.activePromotionBadgeIcon}>{tierIcon}</Text>
            <Text style={styles.activePromotionBadgeText}>Active</Text>
          </View>
        </View>

        <Text style={styles.activePromotionTitle}>Your Profile is Being Promoted!</Text>
        <Text style={styles.activePromotionSubtitle}>Time remaining: {timeRemaining}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activePromotion.viewsReceived}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activePromotion.likesReceived}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activePromotion.matchesReceived}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
        </View>

        {onViewAnalytics && (
          <Button
            title="View Detailed Analytics"
            onPress={onViewAnalytics}
            variant="outline"
            fullWidth
            style={styles.analyticsButton}
          />
        )}

        <View style={styles.activePromotionInfo}>
          <Text style={styles.activePromotionInfoIcon}>💡</Text>
          <Text style={styles.activePromotionInfoText}>
            Your profile is currently being shown to more people. Keep your app open to respond to
            new matches quickly!
          </Text>
        </View>
      </View>
    );
  };

  const renderPackageCard = (pkg: PromotionPackage) => {
    const tierColor = getTierColor(pkg.tier);
    const tierIcon = getTierIcon(pkg.tier);
    const isPopular = pkg.tier === 'advanced';
    const hasDiscount = pkg.discount && pkg.discount > 0;
    const canAfford = availableCoins >= pkg.price;

    return (
      <TouchableOpacity
        key={pkg.id}
        style={[
          styles.packageCard,
          isPopular && styles.packageCardPopular,
          pkg.tier === 'premium' && styles.packageCardPremium,
        ]}
        onPress={() => setSelectedPackage(pkg)}
        activeOpacity={0.9}
      >
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}

        {hasDiscount && (
          <View style={[styles.discountBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.discountBadgeText}>-{pkg.discount}%</Text>
          </View>
        )}

        <View style={styles.packageHeader}>
          <Text style={styles.packageIcon}>{tierIcon}</Text>
          <View style={styles.packageTitleContainer}>
            <Text style={styles.packageName}>{pkg.name}</Text>
            <Text style={styles.packageDuration}>{pkg.duration} hours</Text>
          </View>
        </View>

        <View style={styles.packagePricing}>
          {pkg.originalPrice && (
            <Text style={styles.packageOriginalPrice}>{pkg.originalPrice} coins</Text>
          )}
          <View style={styles.packagePriceRow}>
            <Text style={[styles.packagePrice, { color: tierColor }]}>{pkg.price}</Text>
            <Text style={styles.packagePriceCurrency}>coins</Text>
          </View>
        </View>

        <View style={styles.packageEstimate}>
          <Text style={styles.packageEstimateLabel}>Estimated views:</Text>
          <Text style={[styles.packageEstimateValue, { color: tierColor }]}>
            {pkg.estimatedViews}
          </Text>
        </View>

        <View style={styles.packageFeatures}>
          {pkg.features.map((feature, index) => (
            <View key={index} style={styles.packageFeature}>
              <Text style={[styles.packageFeatureIcon, { color: tierColor }]}>✓</Text>
              <Text style={styles.packageFeatureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <Button
          title={canAfford ? 'Boost Now' : 'Buy Coins'}
          onPress={() => (canAfford ? handlePurchasePackage(pkg) : onBuyCoins())}
          fullWidth
          loading={isLoading}
          disabled={isLoading}
          style={[styles.packageButton, !canAfford && styles.packageButtonDisabled]}
        />

        {!canAfford && (
          <Text style={styles.insufficientCoinsText}>
            Need {pkg.price - availableCoins} more coins
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Promote Your Profile</Text>
          <Text style={styles.subtitle}>
            Get more visibility and increase your chances of finding matches
          </Text>

          <View style={styles.coinsBalance}>
            <Text style={styles.coinsIcon}>💰</Text>
            <Text style={styles.coinsText}>{availableCoins} coins</Text>
            <TouchableOpacity onPress={onBuyCoins} style={styles.buyCoinsButton}>
              <Text style={styles.buyCoinsButtonText}>+ Buy More</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Promotion */}
        {activePromotion && renderActivePromotion()}

        {/* Promotion Packages */}
        {!activePromotion && (
          <>
            <View style={styles.packagesSection}>
              <Text style={styles.sectionTitle}>Choose Your Boost</Text>
              <Text style={styles.sectionSubtitle}>
                Select the promotion that works best for you
              </Text>
            </View>

            <View style={styles.packages}>{promotionPackages.map(renderPackageCard)}</View>

            {/* How It Works */}
            <View style={styles.howItWorksSection}>
              <Text style={styles.howItWorksTitle}>How Profile Promotion Works</Text>

              <View style={styles.howItWorksSteps}>
                <View style={styles.howItWorksStep}>
                  <View style={styles.howItWorksStepNumber}>
                    <Text style={styles.howItWorksStepNumberText}>1</Text>
                  </View>
                  <View style={styles.howItWorksStepContent}>
                    <Text style={styles.howItWorksStepTitle}>Choose a promotion package</Text>
                    <Text style={styles.howItWorksStepText}>
                      Select the duration and visibility level that fits your needs
                    </Text>
                  </View>
                </View>

                <View style={styles.howItWorksStep}>
                  <View style={styles.howItWorksStepNumber}>
                    <Text style={styles.howItWorksStepNumberText}>2</Text>
                  </View>
                  <View style={styles.howItWorksStepContent}>
                    <Text style={styles.howItWorksStepTitle}>Your profile gets boosted</Text>
                    <Text style={styles.howItWorksStepText}>
                      You'll appear higher in search results and discovery feeds
                    </Text>
                  </View>
                </View>

                <View style={styles.howItWorksStep}>
                  <View style={styles.howItWorksStepNumber}>
                    <Text style={styles.howItWorksStepNumberText}>3</Text>
                  </View>
                  <View style={styles.howItWorksStepContent}>
                    <Text style={styles.howItWorksStepTitle}>Get more matches</Text>
                    <Text style={styles.howItWorksStepText}>
                      Increased visibility leads to more views, likes, and matches
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 Tips for Best Results</Text>
              <Text style={styles.tipText}>• Update your photos before promoting your profile</Text>
              <Text style={styles.tipText}>• Write an engaging bio to capture attention</Text>
              <Text style={styles.tipText}>
                • Promote during peak hours (evenings and weekends)
              </Text>
              <Text style={styles.tipText}>
                • Stay active during promotion to respond to new matches
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  coinsBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  coinsIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  coinsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    flex: 1,
  },
  buyCoinsButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  buyCoinsButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Active Promotion
  activePromotionCard: {
    margin: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  activePromotionHeader: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  activePromotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activePromotionBadgeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  activePromotionBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  activePromotionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  activePromotionSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  analyticsButton: {
    marginBottom: 16,
  },
  activePromotionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  activePromotionInfoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  activePromotionInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  // Packages Section
  packagesSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  packages: {
    paddingHorizontal: 20,
    gap: 16,
  },
  packageCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  packageCardPopular: {
    borderColor: '#9C27B0',
  },
  packageCardPremium: {
    borderColor: '#FFD700',
    backgroundColor: '#FFFEF7',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#9C27B0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  packageIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  packageTitleContainer: {
    flex: 1,
  },
  packageName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  packageDuration: {
    fontSize: 14,
    color: '#999',
  },
  packagePricing: {
    marginBottom: 12,
  },
  packageOriginalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  packagePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  packagePrice: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  packagePriceCurrency: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  packageEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  packageEstimateLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  packageEstimateValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  packageFeatures: {
    marginBottom: 16,
  },
  packageFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  packageFeatureIcon: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  packageFeatureText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  packageButton: {
    marginBottom: 8,
  },
  packageButtonDisabled: {
    opacity: 0.6,
  },
  insufficientCoinsText: {
    fontSize: 12,
    color: '#FF5722',
    textAlign: 'center',
  },
  // How It Works
  howItWorksSection: {
    margin: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  howItWorksSteps: {
    gap: 20,
  },
  howItWorksStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  howItWorksStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  howItWorksStepNumberText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  howItWorksStepContent: {
    flex: 1,
  },
  howItWorksStepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  howItWorksStepText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  // Tips Section
  tipsSection: {
    margin: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 22,
    marginBottom: 4,
  },
});
