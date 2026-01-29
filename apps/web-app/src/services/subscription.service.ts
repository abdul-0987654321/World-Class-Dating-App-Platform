/**
 * Subscription Service
 * Handles subscription-related API calls
 *
 * 6-Tier Subscription Model:
 * - free: Basic access
 * - basic: Entry-level paid tier ($9.99/month)
 * - plus: Enhanced features ($14.99/month)
 * - premium: Full feature access ($19.99/month)
 * - premium_plus: Power user tier ($29.99/month)
 * - elite: VIP tier ($49.99/month)
 *
 * NOTE: Tier values are lowercase to match backend API contract
 */
import { authTokenService } from './auth-token.service';
import {
  normalizeSubscriptionTier,
  normalizeSubscriptionStatus,
  toArray,
  toBoolean,
  toDateString,
  SubscriptionTier as NormalizedTier,
  SubscriptionStatus as NormalizedStatus,
} from '../utils/api-transformers';

// Tier type - normalized to lowercase to match backend
export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';

// Legacy uppercase tier type for backward compatibility with existing UI code
export type SubscriptionTierUppercase =
  | 'FREE'
  | 'BASIC'
  | 'PLUS'
  | 'PREMIUM'
  | 'PREMIUM_PLUS'
  | 'ELITE';

export type BillingCycle = 'monthly' | '3_months' | '6_months' | 'yearly';

// Status type - normalized to US spelling ('canceled' not 'cancelled')
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'expired'
  | 'past_due'
  | 'trialing'
  | 'grace_period';

/**
 * Converts tier to uppercase for display purposes
 */
export function tierToUppercase(tier: SubscriptionTier): SubscriptionTierUppercase {
  return tier.toUpperCase() as SubscriptionTierUppercase;
}

/**
 * Converts tier to lowercase for API requests
 */
export function tierToLowercase(
  tier: SubscriptionTier | SubscriptionTierUppercase
): SubscriptionTier {
  return tier.toLowerCase() as SubscriptionTier;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startDate: string;
  endDate: string | null;
  gracePeriodEnd?: string | null;
  autoRenew: boolean;
  features: string[];
  trialEnd?: string | null;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  displayName: string;
  description: string;
  price: number;
  priceYearly: number;
  price3Months: number;
  price6Months: number;
  features: string[];
  trialDays: number;
  popular?: boolean;
}

// Feature lists for each tier (using lowercase tier names to match backend)
const getFeaturesByTier = (tier: SubscriptionTier | SubscriptionTierUppercase): string[] => {
  // Normalize to lowercase for lookup
  const normalizedTier = tier.toLowerCase() as SubscriptionTier;

  const features: Record<SubscriptionTier, string[]> = {
    free: [
      '50 daily swipes',
      '1 super like per day',
      'Basic matching algorithm',
      'Limited profile visibility',
    ],
    basic: [
      'Unlimited swipes',
      '5 super likes per day',
      'See who likes you',
      'Rewind last swipe',
      'No ads',
    ],
    plus: [
      'Everything in Basic',
      '10 super likes per day',
      'Incognito mode',
      'Priority likes',
      'Read receipts',
      '1 free boost per month',
    ],
    premium: [
      'Everything in Plus',
      'Unlimited super likes',
      'Passport - swipe anywhere',
      'Profile controls',
      'Advanced filters',
      '2 free boosts per month',
    ],
    premium_plus: [
      'Everything in Premium',
      'Message before matching',
      '1 weekly boost',
      'Unlimited rewinds',
      'See who viewed your profile',
      'Priority customer support',
    ],
    elite: [
      'Everything in Premium+',
      'VIP badge on profile',
      '3 weekly boosts',
      'Exclusive Elite matches',
      'Dedicated account manager',
      '24/7 priority support',
      'Early access to new features',
    ],
  };

  return features[normalizedTier] || features.free;
};

// Mock subscription data based on current user
const getMockSubscription = (): Subscription => {
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    const user = JSON.parse(storedUser);
    // Normalize tier to lowercase to match backend API contract
    const tier = normalizeSubscriptionTier(user.premium_tier || user.subscription_tier || 'free');
    return {
      id: `sub-${user.id}`,
      userId: user.id,
      tier,
      status: 'active',
      billingCycle: 'monthly',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      features: getFeaturesByTier(tier),
    };
  }

  return {
    id: 'sub-default',
    userId: 'unknown',
    tier: 'free',
    status: 'active',
    billingCycle: 'monthly',
    startDate: new Date().toISOString(),
    endDate: null,
    autoRenew: false,
    features: getFeaturesByTier('free'),
  };
};

class SubscriptionService {
  private baseUrl = '/api/subscriptions';

  async getCurrentSubscription(): Promise<Subscription> {
    // In mock mode, return mock data
    if (import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return getMockSubscription();
    }

    const response = await fetch(`${this.baseUrl}/current`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription');
    }

    return response.json();
  }

  async getPlans(): Promise<SubscriptionPlan[]> {
    // 6-tier subscription plans (using lowercase tier names to match backend)
    return [
      {
        tier: 'free',
        displayName: 'Free',
        description: 'Get started with basic features',
        price: 0,
        priceYearly: 0,
        price3Months: 0,
        price6Months: 0,
        features: getFeaturesByTier('free'),
        trialDays: 0,
      },
      {
        tier: 'basic',
        displayName: 'Basic',
        description: 'Unlock unlimited swipes and see who likes you',
        price: 9.99,
        priceYearly: 95.88,
        price3Months: 26.97,
        price6Months: 47.94,
        features: getFeaturesByTier('basic'),
        trialDays: 7,
      },
      {
        tier: 'plus',
        displayName: 'Plus',
        description: 'Enhanced visibility and privacy features',
        price: 14.99,
        priceYearly: 143.88,
        price3Months: 40.47,
        price6Months: 71.94,
        features: getFeaturesByTier('plus'),
        trialDays: 7,
        popular: true,
      },
      {
        tier: 'premium',
        displayName: 'Premium',
        description: 'Full feature access with Passport',
        price: 19.99,
        priceYearly: 191.88,
        price3Months: 53.97,
        price6Months: 95.94,
        features: getFeaturesByTier('premium'),
        trialDays: 14,
      },
      {
        tier: 'premium_plus',
        displayName: 'Premium+',
        description: 'Power user features with message before match',
        price: 29.99,
        priceYearly: 287.88,
        price3Months: 80.97,
        price6Months: 143.94,
        features: getFeaturesByTier('premium_plus'),
        trialDays: 14,
      },
      {
        tier: 'elite',
        displayName: 'Elite',
        description: 'The ultimate VIP dating experience',
        price: 49.99,
        priceYearly: 479.88,
        price3Months: 134.97,
        price6Months: 239.94,
        features: getFeaturesByTier('elite'),
        trialDays: 14,
      },
    ];
  }

  async upgradePlan(
    tier: SubscriptionTier,
    billingCycle: BillingCycle = 'monthly'
  ): Promise<Subscription> {
    // SECURITY: Always require API for subscription upgrades - no mock mode for payments
    if (import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      throw new Error('Payment service unavailable. Please try again later.');
    }

    const response = await fetch(`${this.baseUrl}/upgrade`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tier, billingCycle }),
    });

    if (!response.ok) {
      throw new Error('Failed to upgrade subscription');
    }

    return response.json();
  }

  async cancelSubscription(): Promise<void> {
    // SECURITY: Always require API for subscription cancellation
    if (import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      throw new Error('Payment service unavailable. Please try again later.');
    }

    const response = await fetch(`${this.baseUrl}/cancel`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Get price for a specific tier and billing cycle
   */
  getPriceForBillingCycle(plan: SubscriptionPlan, billingCycle: BillingCycle): number {
    switch (billingCycle) {
      case 'monthly':
        return plan.price;
      case '3_months':
        return plan.price3Months;
      case '6_months':
        return plan.price6Months;
      case 'yearly':
        return plan.priceYearly;
      default:
        return plan.price;
    }
  }

  /**
   * Calculate monthly cost for comparison
   */
  getMonthlyEquivalent(plan: SubscriptionPlan, billingCycle: BillingCycle): number {
    const total = this.getPriceForBillingCycle(plan, billingCycle);
    const months = this.getBillingCycleMonths(billingCycle);
    return total / months;
  }

  /**
   * Get number of months in billing cycle
   */
  getBillingCycleMonths(billingCycle: BillingCycle): number {
    switch (billingCycle) {
      case 'monthly':
        return 1;
      case '3_months':
        return 3;
      case '6_months':
        return 6;
      case 'yearly':
        return 12;
      default:
        return 1;
    }
  }

  /**
   * Calculate savings percentage for non-monthly cycles
   */
  getSavingsPercentage(plan: SubscriptionPlan, billingCycle: BillingCycle): number {
    if (billingCycle === 'monthly' || plan.price === 0) return 0;

    const monthlyTotal = plan.price * this.getBillingCycleMonths(billingCycle);
    const actualPrice = this.getPriceForBillingCycle(plan, billingCycle);
    const savings = ((monthlyTotal - actualPrice) / monthlyTotal) * 100;
    return Math.round(savings);
  }
}

export const subscriptionService = new SubscriptionService();
