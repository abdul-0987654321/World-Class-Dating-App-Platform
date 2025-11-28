/**
 * SubscriptionScreen
 * Mobile subscription management with Apple IAP / Google Play Billing
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { paymentService, Product, SubscriptionStatus } from '../../services/payments/PaymentService';

interface Plan {
  productId: string;
  tier: string;
  name: string;
  monthlyPrice?: string;
  yearlyPrice?: string;
  monthlyProductId?: string;
  yearlyProductId?: string;
  features: string[];
  color: string[];
  icon: string;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    productId: 'free',
    tier: 'FREE',
    name: 'Free',
    features: [
      'Basic matching',
      '10 daily likes',
      'Basic filters',
      'View profiles',
    ],
    color: ['#9CA3AF', '#6B7280'],
    icon: 'account',
  },
  {
    productId: 'gold',
    tier: 'GOLD',
    name: 'Gold',
    monthlyProductId: Platform.OS === 'ios'
      ? 'com.flamoral.gold.monthly'
      : 'gold_monthly',
    yearlyProductId: Platform.OS === 'ios'
      ? 'com.flamoral.gold.yearly'
      : 'gold_yearly',
    features: [
      'Unlimited likes',
      'See who likes you',
      '5 Super Likes/day',
      '1 Boost/week',
      'Rewind last swipe',
    ],
    color: ['#FBBF24', '#F59E0B'],
    icon: 'star',
  },
  {
    productId: 'platinum',
    tier: 'PLATINUM',
    name: 'Platinum',
    monthlyProductId: Platform.OS === 'ios'
      ? 'com.flamoral.platinum.monthly'
      : 'platinum_monthly',
    yearlyProductId: Platform.OS === 'ios'
      ? 'com.flamoral.platinum.yearly'
      : 'platinum_yearly',
    features: [
      'Everything in Gold',
      'Message before matching',
      'Priority in Discovery',
      '10 Super Likes/day',
      'Incognito mode',
    ],
    color: ['#8B5CF6', '#6366F1'],
    icon: 'crown',
    highlighted: true,
  },
  {
    productId: 'diamond',
    tier: 'DIAMOND',
    name: 'Diamond',
    monthlyProductId: Platform.OS === 'ios'
      ? 'com.flamoral.diamond.monthly'
      : 'diamond_monthly',
    yearlyProductId: Platform.OS === 'ios'
      ? 'com.flamoral.diamond.yearly'
      : 'diamond_yearly',
    features: [
      'Everything in Platinum',
      'Unlimited Boosts',
      'Exclusive events',
      'Verified badge',
      'Personal concierge',
    ],
    color: ['#06B6D4', '#3B82F6'],
    icon: 'diamond-stone',
  },
];

export const SubscriptionScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadData();
    return () => {
      paymentService.cleanup();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await paymentService.initialize();

      const [subs, status] = await Promise.all([
        paymentService.getSubscriptions(),
        paymentService.getSubscriptionStatus(),
      ]);

      setProducts(subs);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handlePurchase = async (plan: Plan) => {
    if (plan.tier === 'FREE') return;
    if (subscriptionStatus?.tier === plan.tier) return;

    const productId = selectedInterval === 'monthly'
      ? plan.monthlyProductId
      : plan.yearlyProductId;

    if (!productId) {
      Alert.alert('Error', 'This product is not available.');
      return;
    }

    setPurchasing(productId);

    try {
      const purchase = await paymentService.purchaseSubscription(productId);

      if (purchase) {
        Alert.alert(
          'Success',
          `You're now subscribed to ${plan.name}!`,
          [{ text: 'OK', onPress: loadData }]
        );
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      Alert.alert('Purchase Failed', error.message || 'Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      const restored = await paymentService.restorePurchases();

      if (restored.length > 0) {
        Alert.alert('Success', 'Your purchases have been restored.');
        await loadData();
      } else {
        Alert.alert('No Purchases', 'No previous purchases were found.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to restore purchases.');
    } finally {
      setLoading(false);
    }
  };

  const getProductPrice = (plan: Plan, interval: 'monthly' | 'yearly'): string => {
    const productId = interval === 'monthly' ? plan.monthlyProductId : plan.yearlyProductId;
    if (!productId) return '';
    const product = products.find(p => p.productId === productId);
    return product?.localizedPrice || '';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC4899" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Unlock Premium</Text>
          <Text style={styles.headerSubtitle}>
            Get more matches and stand out
          </Text>
        </View>

        {/* Current Subscription */}
        {subscriptionStatus?.isActive && subscriptionStatus.tier !== 'free' && (
          <LinearGradient
            colors={['#EC4899', '#8B5CF6']}
            style={styles.currentPlanBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View>
              <Text style={styles.currentPlanLabel}>Current Plan</Text>
              <Text style={styles.currentPlanName}>{subscriptionStatus.tier}</Text>
              {subscriptionStatus.expiresAt && (
                <Text style={styles.currentPlanExpiry}>
                  {subscriptionStatus.willRenew ? 'Renews' : 'Expires'}{' '}
                  {subscriptionStatus.expiresAt.toLocaleDateString()}
                </Text>
              )}
            </View>
            <Icon name="check-circle" size={40} color="white" />
          </LinearGradient>
        )}

        {/* Interval Toggle */}
        <View style={styles.intervalToggle}>
          <TouchableOpacity
            style={[
              styles.intervalButton,
              selectedInterval === 'monthly' && styles.intervalButtonActive,
            ]}
            onPress={() => setSelectedInterval('monthly')}
          >
            <Text
              style={[
                styles.intervalButtonText,
                selectedInterval === 'monthly' && styles.intervalButtonTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.intervalButton,
              selectedInterval === 'yearly' && styles.intervalButtonActive,
            ]}
            onPress={() => setSelectedInterval('yearly')}
          >
            <Text
              style={[
                styles.intervalButtonText,
                selectedInterval === 'yearly' && styles.intervalButtonTextActive,
              ]}
            >
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 20%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Plans */}
        {PLANS.map((plan) => {
          const isCurrentPlan = subscriptionStatus?.tier === plan.tier;
          const price = getProductPrice(plan, selectedInterval);
          const isPurchasing = purchasing === (selectedInterval === 'monthly'
            ? plan.monthlyProductId
            : plan.yearlyProductId);

          return (
            <View
              key={plan.productId}
              style={[
                styles.planCard,
                plan.highlighted && styles.planCardHighlighted,
              ]}
            >
              {plan.highlighted && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}

              <LinearGradient
                colors={plan.color}
                style={styles.planHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.planHeaderContent}>
                  <Icon name={plan.icon} size={32} color="white" />
                  <Text style={styles.planName}>{plan.name}</Text>
                </View>
                {plan.tier !== 'FREE' && price && (
                  <View style={styles.planPricing}>
                    <Text style={styles.planPrice}>{price}</Text>
                    <Text style={styles.planInterval}>
                      /{selectedInterval === 'yearly' ? 'year' : 'month'}
                    </Text>
                  </View>
                )}
              </LinearGradient>

              <View style={styles.planFeatures}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Icon name="check" size={20} color="#10B981" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.planButton,
                  isCurrentPlan && styles.planButtonDisabled,
                  plan.tier === 'FREE' && styles.planButtonFree,
                ]}
                onPress={() => handlePurchase(plan)}
                disabled={isCurrentPlan || isPurchasing || plan.tier === 'FREE'}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={[
                    styles.planButtonText,
                    plan.tier === 'FREE' && styles.planButtonTextFree,
                  ]}>
                    {isCurrentPlan
                      ? 'Current Plan'
                      : plan.tier === 'FREE'
                      ? 'Free Plan'
                      : 'Subscribe'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Legal */}
        <View style={styles.legalSection}>
          <Text style={styles.legalText}>
            Subscriptions will be charged to your {Platform.OS === 'ios' ? 'iTunes' : 'Google Play'} account.
            Subscriptions auto-renew unless canceled at least 24 hours before the end of the current period.
          </Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalDivider}>•</Text>
            <TouchableOpacity>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  currentPlanBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  currentPlanLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  currentPlanExpiry: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  intervalToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  intervalButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  intervalButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  intervalButtonTextActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  saveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  saveBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  planCardHighlighted: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#8B5CF6',
    paddingVertical: 6,
    alignItems: 'center',
    zIndex: 1,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
  },
  planHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  planInterval: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  planFeatures: {
    padding: 20,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
  },
  planButton: {
    backgroundColor: '#EC4899',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  planButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  planButtonFree: {
    backgroundColor: '#F3F4F6',
  },
  planButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  planButtonTextFree: {
    color: '#6B7280',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restoreButtonText: {
    color: '#6B7280',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  legalSection: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  legalText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  legalLink: {
    color: '#6B7280',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalDivider: {
    color: '#9CA3AF',
    marginHorizontal: 8,
  },
});

export default SubscriptionScreen;
