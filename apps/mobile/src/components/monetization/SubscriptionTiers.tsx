import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Button } from '../common/Button';

export type SubscriptionTier = 'free' | 'premium' | 'premium_plus';
export type BillingPeriod = 'monthly' | 'annual';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popular?: boolean;
  badge?: string;
}

interface SubscriptionTiersProps {
  currentTier: SubscriptionTier;
  onSubscribe: (tier: SubscriptionTier, billingPeriod: BillingPeriod) => Promise<void>;
  onRestorePurchases: () => Promise<void>;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'free',
    name: 'Free',
    tagline: 'Get started with basic features',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      '50 likes per day',
      '1 super like per day',
      'Limited rewinds',
      'See who likes you (blurred)',
      'Match with people nearby',
      'Send unlimited messages',
    ],
  },
  {
    tier: 'premium',
    name: 'Premium',
    tagline: 'The full dating experience',
    monthlyPrice: 19.99,
    annualPrice: 99.99,
    popular: true,
    badge: 'Most Popular',
    features: [
      'Unlimited likes',
      '5 super likes per day',
      'Unlimited rewinds',
      'See who likes you',
      'Control your profile visibility',
      '1 free boost per month',
      'Advanced filters',
      'Read receipts',
      'No ads',
      'Priority support',
    ],
  },
  {
    tier: 'premium_plus',
    name: 'Premium+',
    tagline: 'Maximum visibility and features',
    monthlyPrice: 29.99,
    annualPrice: 149.99,
    badge: 'Best Value',
    features: [
      'Everything in Premium',
      'Unlimited super likes',
      '2 free boosts per month',
      'Priority likes (appear first)',
      'Message before matching',
      'See who read your messages',
      'Advanced conversation insights',
      'VIP badge on profile',
      'Exclusive events access',
      'Dedicated concierge support',
    ],
  },
];

export const SubscriptionTiers: React.FC<SubscriptionTiersProps> = ({
  currentTier,
  onSubscribe,
  onRestorePurchases,
}) => {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (tier === 'free' || tier === currentTier) return;

    setIsLoading(tier);
    try {
      await onSubscribe(tier, billingPeriod);
      Alert.alert(
        'Success!',
        `You're now subscribed to ${
          SUBSCRIPTION_PLANS.find((p) => p.tier === tier)?.name
        }!`
      );
    } catch (error: any) {
      Alert.alert(
        'Subscription Failed',
        error.message || 'Unable to process subscription. Please try again.'
      );
      console.error('Subscription error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleRestore = async () => {
    setIsLoading('restore');
    try {
      await onRestorePurchases();
      Alert.alert('Restored', 'Your purchases have been restored successfully.');
    } catch (error: any) {
      Alert.alert(
        'Restore Failed',
        error.message || 'Unable to restore purchases. Please try again.'
      );
      console.error('Restore error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const calculateSavings = (plan: SubscriptionPlan): number => {
    if (plan.monthlyPrice === 0) return 0;
    const monthlyTotal = plan.monthlyPrice * 12;
    const savings = monthlyTotal - plan.annualPrice;
    return Math.round((savings / monthlyTotal) * 100);
  };

  const getPrice = (plan: SubscriptionPlan): number => {
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  };

  const getPricePerMonth = (plan: SubscriptionPlan): string => {
    if (plan.monthlyPrice === 0) return 'Free';
    if (billingPeriod === 'monthly') {
      return `$${plan.monthlyPrice}/month`;
    }
    const monthlyEquivalent = plan.annualPrice / 12;
    return `$${monthlyEquivalent.toFixed(2)}/month`;
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = plan.tier === currentTier;
    const isDowngrade = currentTier === 'premium_plus' && plan.tier === 'premium';
    const savings = calculateSavings(plan);
    const isLoadingThis = isLoading === plan.tier;

    return (
      <View
        key={plan.tier}
        style={[
          styles.planCard,
          plan.popular && styles.planCardPopular,
          isCurrentPlan && styles.planCardCurrent,
        ]}
      >
        {plan.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{plan.badge}</Text>
          </View>
        )}

        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planTagline}>{plan.tagline}</Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{getPricePerMonth(plan)}</Text>
          {plan.monthlyPrice > 0 && billingPeriod === 'annual' && (
            <Text style={styles.billedAnnually}>
              Billed ${plan.annualPrice} annually
            </Text>
          )}
          {plan.monthlyPrice > 0 && billingPeriod === 'annual' && savings > 0 && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Save {savings}%</Text>
            </View>
          )}
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {plan.tier !== 'free' && (
          <Button
            title={
              isCurrentPlan
                ? 'Current Plan'
                : isDowngrade
                ? 'Downgrade'
                : 'Upgrade'
            }
            onPress={() => handleSubscribe(plan.tier)}
            variant={isCurrentPlan ? 'outline' : 'primary'}
            disabled={isCurrentPlan || isLoadingThis}
            loading={isLoadingThis}
            fullWidth
            style={styles.subscribeButton}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Unlock more features and increase your matches
        </Text>
      </View>

      <View style={styles.billingToggle}>
        <TouchableOpacity
          style={[
            styles.billingOption,
            billingPeriod === 'monthly' && styles.billingOptionActive,
          ]}
          onPress={() => setBillingPeriod('monthly')}
        >
          <Text
            style={[
              styles.billingOptionText,
              billingPeriod === 'monthly' && styles.billingOptionTextActive,
            ]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.billingOption,
            billingPeriod === 'annual' && styles.billingOptionActive,
          ]}
          onPress={() => setBillingPeriod('annual')}
        >
          <Text
            style={[
              styles.billingOptionText,
              billingPeriod === 'annual' && styles.billingOptionTextActive,
            ]}
          >
            Annual
          </Text>
          <View style={styles.savingsPill}>
            <Text style={styles.savingsPillText}>Save up to 50%</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.plansContainer}
        showsVerticalScrollIndicator={false}
      >
        {SUBSCRIPTION_PLANS.map((plan) => renderPlanCard(plan))}

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isLoading === 'restore'}
        >
          {isLoading === 'restore' ? (
            <ActivityIndicator size="small" color="#E91E63" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            • Subscriptions automatically renew unless canceled at least 24 hours
            before the end of the current period.
          </Text>
          <Text style={styles.footerText}>
            • You can manage or cancel your subscription in your App Store account
            settings.
          </Text>
          <Text style={styles.footerText}>
            • Payment will be charged to your Apple ID/Google Play account.
          </Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingOptionActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  billingOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  billingOptionTextActive: {
    color: '#E91E63',
  },
  savingsPill: {
    backgroundColor: '#E91E63',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  savingsPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  plansContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardPopular: {
    borderColor: '#E91E63',
  },
  planCardCurrent: {
    borderColor: '#4CAF50',
  },
  badge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#E91E63',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  planTagline: {
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E91E63',
    marginBottom: 4,
  },
  billedAnnually: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  savingsBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  savingsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureCheck: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  subscribeButton: {
    marginTop: 8,
  },
  restoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 12,
    color: '#E91E63',
    fontWeight: '600',
    marginTop: 8,
  },
});
