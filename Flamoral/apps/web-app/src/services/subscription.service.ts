/**
 * Subscription Service
 * Handles subscription-related API calls
 *
 * 6-Tier Subscription Model:
 * - FREE: Basic access
 * - BASIC: Entry-level paid tier ($9.99/month)
 * - PLUS: Enhanced features ($14.99/month)
 * - PREMIUM: Full feature access ($19.99/month)
 * - PREMIUM_PLUS: Power user tier ($29.99/month)
 * - ELITE: VIP tier ($49.99/month)
 */

export type SubscriptionTier = 'FREE' | 'BASIC' | 'PLUS' | 'PREMIUM' | 'PREMIUM_PLUS' | 'ELITE';
export type BillingCycle = 'monthly' | '3_months' | '6_months' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing' | 'grace_period';

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

// Feature lists for each tier
const getFeaturesByTier = (tier: SubscriptionTier): string[] => {
  const features: Record<SubscriptionTier, string[]> = {
    FREE: [
      '50 daily swipes',
      '1 super like per day',
      'Basic matching algorithm',
      'Limited profile visibility',
    ],
    BASIC: [
      'Unlimited swipes',
      '5 super likes per day',
      'See who likes you',
      'Rewind last swipe',
      'No ads',
    ],
    PLUS: [
      'Everything in Basic',
      '10 super likes per day',
      'Incognito mode',
      'Priority likes',
      'Read receipts',
      '1 free boost per month',
    ],
    PREMIUM: [
      'Everything in Plus',
      'Unlimited super likes',
      'Passport - swipe anywhere',
      'Profile controls',
      'Advanced filters',
      '2 free boosts per month',
    ],
    PREMIUM_PLUS: [
      'Everything in Premium',
      'Message before matching',
      '1 weekly boost',
      'Unlimited rewinds',
      'See who viewed your profile',
      'Priority customer support',
    ],
    ELITE: [
      'Everything in Premium+',
      'VIP badge on profile',
      '3 weekly boosts',
      'Exclusive Elite matches',
      'Dedicated account manager',
      '24/7 priority support',
      'Early access to new features',
    ],
  };

  return features[tier] || features.FREE;
};

// Mock subscription data based on current user
const getMockSubscription = (): Subscription => {
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    const user = JSON.parse(storedUser);
    const tier = (user.premium_tier?.toUpperCase() || 'FREE') as SubscriptionTier;
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
    tier: 'FREE',
    status: 'active',
    billingCycle: 'monthly',
    startDate: new Date().toISOString(),
    endDate: null,
    autoRenew: false,
    features: getFeaturesByTier('FREE'),
  };
};

class SubscriptionService {
  private baseUrl = '/api/v1/subscriptions';

  async getCurrentSubscription(): Promise<Subscription> {
    // PRODUCTION: Never use mock data
    const useMocks = import.meta.env.MODE === 'development' &&
                     import.meta.env.VITE_USE_MOCKS === 'true' &&
                     !import.meta.env.VITE_API_URL;

    if (useMocks) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return getMockSubscription();
    }

    const response = await fetch(`${this.baseUrl}/current`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription');
    }

    return response.json();
  }

  async getPlans(): Promise<SubscriptionPlan[]> {
    // 6-tier subscription plans
    return [
      {
        tier: 'FREE',
        displayName: 'Free',
        description: 'Get started with basic features',
        price: 0,
        priceYearly: 0,
        price3Months: 0,
        price6Months: 0,
        features: getFeaturesByTier('FREE'),
        trialDays: 0,
      },
      {
        tier: 'BASIC',
        displayName: 'Basic',
        description: 'Unlock unlimited swipes and see who likes you',
        price: 9.99,
        priceYearly: 95.88,
        price3Months: 26.97,
        price6Months: 47.94,
        features: getFeaturesByTier('BASIC'),
        trialDays: 7,
      },
      {
        tier: 'PLUS',
        displayName: 'Plus',
        description: 'Enhanced visibility and privacy features',
        price: 14.99,
        priceYearly: 143.88,
        price3Months: 40.47,
        price6Months: 71.94,
        features: getFeaturesByTier('PLUS'),
        trialDays: 7,
        popular: true,
      },
      {
        tier: 'PREMIUM',
        displayName: 'Premium',
        description: 'Full feature access with Passport',
        price: 19.99,
        priceYearly: 191.88,
        price3Months: 53.97,
        price6Months: 95.94,
        features: getFeaturesByTier('PREMIUM'),
        trialDays: 14,
      },
      {
        tier: 'PREMIUM_PLUS',
        displayName: 'Premium+',
        description: 'Power user features with message before match',
        price: 29.99,
        priceYearly: 287.88,
        price3Months: 80.97,
        price6Months: 143.94,
        features: getFeaturesByTier('PREMIUM_PLUS'),
        trialDays: 14,
      },
      {
        tier: 'ELITE',
        displayName: 'Elite',
        description: 'The ultimate VIP dating experience',
        price: 49.99,
        priceYearly: 479.88,
        price3Months: 134.97,
        price6Months: 239.94,
        features: getFeaturesByTier('ELITE'),
        trialDays: 14,
      },
    ];
  }

  async upgradePlan(tier: SubscriptionTier, billingCycle: BillingCycle = 'monthly'): Promise<Subscription> {
    // PRODUCTION: Never use mock data
    const useMocks = import.meta.env.MODE === 'development' &&
                     import.meta.env.VITE_USE_MOCKS === 'true' &&
                     !import.meta.env.VITE_API_URL;

    if (useMocks) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.premium_tier = tier.toLowerCase();
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      return getMockSubscription();
    }

    const response = await fetch(`${this.baseUrl}/upgrade`, {
      method: 'POST',
      credentials: 'include',
      headers: {
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
    // PRODUCTION: Never use mock data
    const useMocks = import.meta.env.MODE === 'development' &&
                     import.meta.env.VITE_USE_MOCKS === 'true' &&
                     !import.meta.env.VITE_API_URL;

    if (useMocks) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return;
    }

    const response = await fetch(`${this.baseUrl}/cancel`, {
      method: 'POST',
      credentials: 'include',
      headers: {
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
