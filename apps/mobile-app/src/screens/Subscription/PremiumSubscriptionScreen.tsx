/**
 * Premium Subscription Screen
 * Displays subscription tiers with feature comparison
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { InAppPurchaseService, SUBSCRIPTION_SKUS } from '@services/iap/InAppPurchaseService';
import { Subscription } from 'react-native-iap';

const { width } = Dimensions.get('window');

interface SubscriptionTier {
  id: 'basic' | 'premium' | 'platinum';
  name: string;
  tagline: string;
  color: string;
  icon: string;
  popular?: boolean;
  features: string[];
  skus: {
    monthly: string;
    sixMonths: string;
    yearly: string;
  };
}

const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'Start Your Journey',
    color: '#999999',
    icon: 'account',
    features: [
      'View profiles',
      'Send likes',
      '5 Super Likes per day',
      'Match with people nearby',
      'Send messages to matches',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Upgrade Your Experience',
    color: '#FF6B6B',
    icon: 'crown',
    popular: true,
    features: [
      'Everything in Basic',
      'Unlimited likes',
      'Unlimited Super Likes',
      '5 Boosts per month',
      'See who liked you',
      'Advanced filters',
      'Rewind unlimited swipes',
      'Turn off ads',
      'Read receipts',
      'Priority likes (shown first)',
    ],
    skus: {
      monthly: SUBSCRIPTION_SKUS.PREMIUM_MONTHLY,
      sixMonths: SUBSCRIPTION_SKUS.PREMIUM_6_MONTHS,
      yearly: SUBSCRIPTION_SKUS.PREMIUM_YEARLY,
    },
  },
  {
    id: 'platinum',
    name: 'Platinum',
    tagline: 'The Ultimate Experience',
    color: '#7C4DFF',
    icon: 'diamond-stone',
    features: [
      'Everything in Premium',
      'Message before matching',
      'Priority messages',
      'Priority customer support',
      'See message read status',
      'Advanced incognito mode',
      'Unlimited rewinds',
      'Travel Mode',
      'Who viewed your profile',
      'Monthly profile boost',
      'Exclusive badge',
    ],
    skus: {
      monthly: SUBSCRIPTION_SKUS.PLATINUM_MONTHLY,
      sixMonths: SUBSCRIPTION_SKUS.PLATINUM_6_MONTHS,
      yearly: SUBSCRIPTION_SKUS.PLATINUM_YEARLY,
    },
  },
];

type BillingPeriod = 'monthly' | 'sixMonths' | 'yearly';

const PremiumSubscriptionScreen: React.FC = () => {
  const navigation = useNavigation();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'premium' | 'platinum'>('premium');
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('monthly');
  const [currentSubscription, setCurrentSubscription] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      await InAppPurchaseService.initialize();
      const availableSubscriptions = await InAppPurchaseService.getSubscriptionProducts();
      setSubscriptions(availableSubscriptions);

      // Check current subscription status from available purchases
      const purchases = await InAppPurchaseService.getAvailablePurchases();
      if (purchases.length > 0) {
        const activeSubscription = purchases.find(p =>
          Object.values(SUBSCRIPTION_SKUS).includes(p.productId)
        );
        if (activeSubscription) {
          setCurrentSubscription(activeSubscription.productId);
        }
      }
    } catch (error) {
      console.error('Failed to initialize subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === selectedTier);
    if (!tier || !tier.skus) return;

    const skuMap = {
      monthly: tier.skus.monthly,
      sixMonths: tier.skus.sixMonths,
      yearly: tier.skus.yearly,
    };

    const sku = skuMap[selectedPeriod];

    try {
      setPurchasing(true);

      const result = await InAppPurchaseService.purchaseSubscription(sku);

      if (result.success) {
        Alert.alert(
          'Subscription Activated',
          `Welcome to Flamoral ${tier.name}! Enjoy all premium features.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (result.error && !result.error.includes('cancelled')) {
        Alert.alert('Subscription Failed', result.error);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Subscription Failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const getPrice = (tier: SubscriptionTier, period: BillingPeriod): string => {
    if (!tier.skus) return 'Free';

    const skuMap = {
      monthly: tier.skus.monthly,
      sixMonths: tier.skus.sixMonths,
      yearly: tier.skus.yearly,
    };

    const sku = skuMap[period];
    const subscription = subscriptions.find(s => s.productId === sku);

    return subscription?.localizedPrice || '...';
  };

  const getSavingsText = (period: BillingPeriod): string | null => {
    if (period === 'monthly') return null;
    if (period === 'sixMonths') return 'Save 15%';
    if (period === 'yearly') return 'Save 40%';
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  const selectedTierData = SUBSCRIPTION_TIERS.find(t => t.id === selectedTier)!;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tier Selection */}
        <View style={styles.tierSelector}>
          {SUBSCRIPTION_TIERS.filter(t => t.id !== 'basic').map((tier) => (
            <TouchableOpacity
              key={tier.id}
              style={[
                styles.tierCard,
                selectedTier === tier.id && styles.tierCardSelected,
                { borderColor: tier.color },
              ]}
              onPress={() => setSelectedTier(tier.id as 'premium' | 'platinum')}
            >
              {tier.popular && (
                <View style={[styles.popularBadge, { backgroundColor: tier.color }]}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}

              <Icon name={tier.icon} size={48} color={tier.color} />
              <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
              <Text style={styles.tierTagline}>{tier.tagline}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Billing Period Selection */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodOption,
              selectedPeriod === 'monthly' && styles.periodOptionSelected,
            ]}
            onPress={() => setSelectedPeriod('monthly')}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'monthly' && styles.periodTextSelected,
              ]}
            >
              1 Month
            </Text>
            <Text
              style={[
                styles.periodPrice,
                selectedPeriod === 'monthly' && styles.periodPriceSelected,
              ]}
            >
              {getPrice(selectedTierData, 'monthly')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodOption,
              selectedPeriod === 'sixMonths' && styles.periodOptionSelected,
            ]}
            onPress={() => setSelectedPeriod('sixMonths')}
          >
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>{getSavingsText('sixMonths')}</Text>
            </View>
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'sixMonths' && styles.periodTextSelected,
              ]}
            >
              6 Months
            </Text>
            <Text
              style={[
                styles.periodPrice,
                selectedPeriod === 'sixMonths' && styles.periodPriceSelected,
              ]}
            >
              {getPrice(selectedTierData, 'sixMonths')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodOption,
              selectedPeriod === 'yearly' && styles.periodOptionSelected,
            ]}
            onPress={() => setSelectedPeriod('yearly')}
          >
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>{getSavingsText('yearly')}</Text>
            </View>
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'yearly' && styles.periodTextSelected,
              ]}
            >
              1 Year
            </Text>
            <Text
              style={[
                styles.periodPrice,
                selectedPeriod === 'yearly' && styles.periodPriceSelected,
              ]}
            >
              {getPrice(selectedTierData, 'yearly')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>
            {selectedTierData.name} Features
          </Text>

          {selectedTierData.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Icon name="check-circle" size={24} color={selectedTierData.color} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Feature Comparison Table */}
        <View style={styles.comparisonSection}>
          <Text style={styles.comparisonTitle}>Compare Plans</Text>

          <View style={styles.comparisonTable}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonHeaderText}>Feature</Text>
              <Text style={styles.comparisonHeaderText}>Basic</Text>
              <Text style={styles.comparisonHeaderText}>Premium</Text>
              <Text style={styles.comparisonHeaderText}>Platinum</Text>
            </View>

            {[
              { label: 'Unlimited Likes', basic: false, premium: true, platinum: true },
              { label: 'Unlimited Super Likes', basic: false, premium: true, platinum: true },
              { label: 'See Who Liked You', basic: false, premium: true, platinum: true },
              { label: 'Rewind Swipes', basic: false, premium: true, platinum: true },
              { label: 'Message Before Matching', basic: false, premium: false, platinum: true },
              { label: 'Priority Messages', basic: false, premium: false, platinum: true },
              { label: 'Travel Mode', basic: false, premium: false, platinum: true },
              { label: 'Advanced Incognito', basic: false, premium: false, platinum: true },
            ].map((row, index) => (
              <View key={index} style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>{row.label}</Text>
                <Icon
                  name={row.basic ? 'check' : 'close'}
                  size={20}
                  color={row.basic ? '#00C853' : '#CCCCCC'}
                />
                <Icon
                  name={row.premium ? 'check' : 'close'}
                  size={20}
                  color={row.premium ? '#00C853' : '#CCCCCC'}
                />
                <Icon
                  name={row.platinum ? 'check' : 'close'}
                  size={20}
                  color={row.platinum ? '#00C853' : '#CCCCCC'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          Subscriptions automatically renew unless auto-renew is turned off at least
          24 hours before the end of the current period. Payment will be charged to
          your App Store or Google Play account.
        </Text>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: selectedTierData.color }]}
          onPress={handleSubscribe}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              Continue with {selectedTierData.name}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => InAppPurchaseService.restorePurchases()}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
  },
  tierSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tierCard: {
    flex: 1,
    borderWidth: 3,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tierCardSelected: {
    backgroundColor: '#F5F5F5',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tierName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  tierTagline: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  periodSelector: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  periodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 12,
  },
  periodOptionSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  periodTextSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  periodPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  periodPriceSelected: {
    color: '#FF6B6B',
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#00C853',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  featuresSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
    flex: 1,
  },
  comparisonSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  comparisonTable: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  comparisonHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  comparisonLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
  },
  terms: {
    fontSize: 12,
    color: '#999999',
    paddingHorizontal: 16,
    marginBottom: 24,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  restoreText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});

export default PremiumSubscriptionScreen;
