/**
 * Subscription Plans Screen
 * Shows available subscription tiers with pricing and features
 *
 * 6-Tier Subscription Model (matching web app and backend):
 * - free: Basic access
 * - basic: Entry-level paid tier ($9.99/month)
 * - plus: Enhanced features ($14.99/month)
 * - premium: Full feature access ($19.99/month)
 * - premium_plus: Power user tier ($29.99/month)
 * - elite: VIP tier ($49.99/month)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { paymentService, Product } from '../../services/payments/PaymentService';

interface Plan {
  id: string;
  name: string;
  tier: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  gradient: string[];
  icon: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    tier: 'basic',
    monthlyPrice: 9.99,
    yearlyPrice: 95.88, // 20% discount
    currency: 'USD',
    gradient: ['#10B981', '#059669'],
    icon: 'checkmark-circle',
    features: [
      'Unlimited swipes',
      '5 Super Likes/day',
      'See who likes you',
      'Rewind last swipe',
      'No ads',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    tier: 'plus',
    monthlyPrice: 14.99,
    yearlyPrice: 143.88,
    currency: 'USD',
    gradient: ['#3B82F6', '#2563EB'],
    icon: 'star',
    features: [
      'Everything in Basic',
      '10 Super Likes/day',
      'Incognito mode',
      'Priority likes',
      'Read receipts',
      '1 free boost/month',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tier: 'premium',
    monthlyPrice: 19.99,
    yearlyPrice: 191.88,
    currency: 'USD',
    gradient: ['#8B5CF6', '#7C3AED'],
    icon: 'ribbon',
    popular: true,
    features: [
      'Everything in Plus',
      'Unlimited Super Likes',
      'Passport - swipe anywhere',
      'Profile controls',
      'Advanced filters',
      '2 free boosts/month',
    ],
  },
  {
    id: 'premium_plus',
    name: 'Premium+',
    tier: 'premium_plus',
    monthlyPrice: 29.99,
    yearlyPrice: 287.88,
    currency: 'USD',
    gradient: ['#EC4899', '#DB2777'],
    icon: 'heart',
    features: [
      'Everything in Premium',
      'Message before matching',
      '1 weekly boost',
      'Unlimited rewinds',
      'See profile viewers',
      'Priority support',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tier: 'elite',
    monthlyPrice: 49.99,
    yearlyPrice: 479.88,
    currency: 'USD',
    gradient: ['#F59E0B', '#D97706'],
    icon: 'diamond',
    features: [
      'Everything in Premium+',
      'VIP badge on profile',
      '3 weekly boosts',
      'Exclusive Elite matches',
      'Dedicated account manager',
      '24/7 priority support',
      'Early access to new features',
    ],
  },
];

export const SubscriptionPlansScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);

      // Initialize payment service
      await paymentService.initialize();

      // Get available subscriptions
      const availableProducts = await paymentService.getSubscriptions();
      setProducts(availableProducts);

      // Get current subscription status
      const status = await paymentService.getSubscriptionStatus();
      setCurrentSubscription(status);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscription plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    try {
      setPurchasing(plan.id);

      // Determine product ID based on platform and interval
      const productId =
        Platform.OS === 'ios'
          ? `com.flamoral.${plan.id}.${selectedInterval === 'yearly' ? 'yearly' : 'monthly'}`
          : `${plan.id}_${selectedInterval === 'yearly' ? 'yearly' : 'monthly'}`;

      // Find the product
      const product = products.find((p) => p.productId === productId);

      if (!product) {
        Alert.alert('Error', 'Product not available. Please try again.');
        return;
      }

      // Purchase subscription
      const purchase = await paymentService.purchaseSubscription(productId);

      if (purchase) {
        Alert.alert(
          'Success',
          `${plan.name} subscription activated! Enjoy your premium features.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Subscription purchase failed:', error);

      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'Failed to complete purchase. Please try again.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      const purchases = await paymentService.restorePurchases();

      if (purchases.length > 0) {
        Alert.alert('Success', 'Your purchases have been restored!');
        await loadSubscriptions();
      } else {
        Alert.alert('Info', 'No purchases found to restore.');
      }
    } catch (error) {
      console.error('Restore purchases failed:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (plan: Plan): string => {
    if (selectedInterval === 'yearly') {
      return `$${plan.yearlyPrice.toFixed(2)}/year`;
    }
    return `$${plan.monthlyPrice.toFixed(2)}/month`;
  };

  const getSavings = (plan: Plan): string => {
    const monthlyCost = plan.monthlyPrice * 12;
    const savings = monthlyCost - plan.yearlyPrice;
    return `Save $${savings.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>Loading plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        <TouchableOpacity onPress={handleRestorePurchases} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Unlock Your Perfect Match</Text>
          <Text style={styles.heroSubtitle}>
            Upgrade to premium and discover more meaningful connections
          </Text>
        </View>

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
                styles.intervalText,
                selectedInterval === 'monthly' && styles.intervalTextActive,
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
                styles.intervalText,
                selectedInterval === 'yearly' && styles.intervalTextActive,
              ]}
            >
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 20%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Current Subscription Banner */}
        {currentSubscription?.isActive && (
          <View style={styles.currentBanner}>
            <LinearGradient colors={['#EC4899', '#9333EA']} style={styles.currentBannerGradient}>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
              <View style={styles.currentBannerText}>
                <Text style={styles.currentBannerTitle}>
                  Current Plan: {currentSubscription.tier}
                </Text>
                {currentSubscription.expiresAt && (
                  <Text style={styles.currentBannerSubtitle}>
                    Expires {new Date(currentSubscription.expiresAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Plans */}
        {PLANS.map((plan) => (
          <View key={plan.id} style={[styles.planCard, plan.popular && styles.planCardPopular]}>
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            )}

            <LinearGradient colors={plan.gradient} style={styles.planHeader}>
              <View style={styles.planHeaderContent}>
                <Ionicons name={plan.icon as any} size={32} color="#FFF" />
                <Text style={styles.planName}>{plan.name}</Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>{getPrice(plan)}</Text>
                {selectedInterval === 'yearly' && (
                  <Text style={styles.planSavings}>{getSavings(plan)}</Text>
                )}
              </View>
            </LinearGradient>

            <View style={styles.planBody}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  currentSubscription?.tier === plan.tier && styles.subscribeButtonDisabled,
                ]}
                onPress={() => handleSubscribe(plan)}
                disabled={purchasing !== null || currentSubscription?.tier === plan.tier}
              >
                {purchasing === plan.id ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.subscribeButtonText}>
                    {currentSubscription?.tier === plan.tier ? 'Current Plan' : 'Subscribe Now'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cancel anytime. Your subscription will renew automatically unless canceled at least 24
            hours before the end of the current period.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('TermsOfService')}
            style={styles.footerLink}
          >
            <Text style={styles.footerLinkText}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('PrivacyPolicy')}
            style={styles.footerLink}
          >
            <Text style={styles.footerLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  restoreButton: {
    padding: 8,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EC4899',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  intervalToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalButtonActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  intervalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  intervalTextActive: {
    color: '#1F2937',
  },
  saveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  currentBanner: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  currentBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  currentBannerText: {
    marginLeft: 12,
    flex: 1,
  },
  currentBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  currentBannerSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    marginTop: 2,
  },
  planCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  planCardPopular: {
    borderWidth: 2,
    borderColor: '#9333EA',
  },
  popularBadge: {
    backgroundColor: '#9333EA',
    paddingVertical: 8,
    alignItems: 'center',
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  planHeader: {
    padding: 24,
  },
  planHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 12,
  },
  planPricing: {
    alignItems: 'flex-start',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  planSavings: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    marginTop: 4,
  },
  planBody: {
    padding: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#EC4899',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  footerLink: {
    marginBottom: 8,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#EC4899',
    fontWeight: '600',
  },
});

export default SubscriptionPlansScreen;
