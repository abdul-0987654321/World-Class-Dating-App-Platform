/**
 * Pricing Configuration
 * Centralized configuration for subscription tiers, coin packages, and boost pricing
 */

export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';
export type BillingCycle = 'monthly' | '3_months' | '6_months' | 'yearly';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  threeMonthPrice?: number;
  sixMonthPrice?: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  stripePriceId3Months?: string;
  stripePriceId6Months?: string;
  stripeProductId?: string;
  features: string[];
  limits: {
    dailySwipes: number;
    dailySuperLikes: number;
    dailyBoosts: number;
    unlimitedLikes: boolean;
    seeWhoLikesYou: boolean;
    rewindEnabled: boolean;
    incognitoMode: boolean;
    passportEnabled: boolean;
    priorityLikes: boolean;
    readReceipts: boolean;
  };
}

export interface CoinPackage {
  id: string;
  name: string;
  coinAmount: number;
  bonusCoins: number;
  price: number;
  currency: string;
  stripePriceId?: string;
  isPopular: boolean;
  savings?: string;
}

export interface BoostProduct {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  currency: string;
  stripePriceId?: string;
}

/**
 * Subscription Plans Configuration
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: 'free',
    name: 'free',
    displayName: 'Free',
    description: 'Basic features to get started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '50 daily swipes',
      '1 super like per day',
      'Basic matching',
    ],
    limits: {
      dailySwipes: 50,
      dailySuperLikes: 1,
      dailyBoosts: 0,
      unlimitedLikes: false,
      seeWhoLikesYou: false,
      rewindEnabled: false,
      incognitoMode: false,
      passportEnabled: false,
      priorityLikes: false,
      readReceipts: false,
    },
  },
  basic: {
    tier: 'basic',
    name: 'basic',
    displayName: 'Basic',
    description: 'More swipes and essential features',
    monthlyPrice: 9.99,
    yearlyPrice: 79.99,
    threeMonthPrice: 24.99,
    sixMonthPrice: 44.99,
    features: [
      '100 daily swipes',
      '3 super likes per day',
      'Rewind last swipe',
      'See who likes you',
    ],
    limits: {
      dailySwipes: 100,
      dailySuperLikes: 3,
      dailyBoosts: 0,
      unlimitedLikes: false,
      seeWhoLikesYou: true,
      rewindEnabled: true,
      incognitoMode: false,
      passportEnabled: false,
      priorityLikes: false,
      readReceipts: false,
    },
  },
  plus: {
    tier: 'plus',
    name: 'plus',
    displayName: 'Plus',
    description: 'Enhanced features for better connections',
    monthlyPrice: 14.99,
    yearlyPrice: 119.99,
    threeMonthPrice: 39.99,
    sixMonthPrice: 69.99,
    features: [
      'Unlimited swipes',
      '5 super likes per day',
      '1 boost per month',
      'See who likes you',
      'Rewind last swipe',
      'Priority likes',
    ],
    limits: {
      dailySwipes: 999,
      dailySuperLikes: 5,
      dailyBoosts: 1,
      unlimitedLikes: true,
      seeWhoLikesYou: true,
      rewindEnabled: true,
      incognitoMode: false,
      passportEnabled: false,
      priorityLikes: true,
      readReceipts: false,
    },
  },
  premium: {
    tier: 'premium',
    name: 'premium',
    displayName: 'Premium',
    description: 'Advanced features for serious daters',
    monthlyPrice: 19.99,
    yearlyPrice: 159.99,
    threeMonthPrice: 54.99,
    sixMonthPrice: 94.99,
    features: [
      'Everything in Plus',
      '10 super likes per day',
      '3 boosts per month',
      'Read receipts',
      'Incognito mode',
      'Passport (swipe anywhere)',
    ],
    limits: {
      dailySwipes: 999,
      dailySuperLikes: 10,
      dailyBoosts: 3,
      unlimitedLikes: true,
      seeWhoLikesYou: true,
      rewindEnabled: true,
      incognitoMode: true,
      passportEnabled: true,
      priorityLikes: true,
      readReceipts: true,
    },
  },
  premium_plus: {
    tier: 'premium_plus',
    name: 'premium_plus',
    displayName: 'Premium+',
    description: 'Premium features with extra perks',
    monthlyPrice: 29.99,
    yearlyPrice: 239.99,
    threeMonthPrice: 79.99,
    sixMonthPrice: 139.99,
    features: [
      'Everything in Premium',
      'Unlimited super likes',
      '5 boosts per month',
      'Priority customer support',
      'Early access to new features',
    ],
    limits: {
      dailySwipes: 999,
      dailySuperLikes: 999,
      dailyBoosts: 5,
      unlimitedLikes: true,
      seeWhoLikesYou: true,
      rewindEnabled: true,
      incognitoMode: true,
      passportEnabled: true,
      priorityLikes: true,
      readReceipts: true,
    },
  },
  elite: {
    tier: 'elite',
    name: 'elite',
    displayName: 'Elite',
    description: 'The ultimate dating experience',
    monthlyPrice: 49.99,
    yearlyPrice: 399.99,
    threeMonthPrice: 129.99,
    sixMonthPrice: 229.99,
    features: [
      'Everything in Premium+',
      'Unlimited boosts',
      'Verified badge',
      'VIP profile visibility',
      'Concierge support',
      'Exclusive events access',
    ],
    limits: {
      dailySwipes: 999,
      dailySuperLikes: 999,
      dailyBoosts: 999,
      unlimitedLikes: true,
      seeWhoLikesYou: true,
      rewindEnabled: true,
      incognitoMode: true,
      passportEnabled: true,
      priorityLikes: true,
      readReceipts: true,
    },
  },
};

/**
 * Coin Packages Configuration
 */
export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'COIN_PACK_SMALL',
    name: '100 Coins',
    coinAmount: 100,
    bonusCoins: 0,
    price: 4.99,
    currency: 'USD',
    isPopular: false,
  },
  {
    id: 'COIN_PACK_MEDIUM',
    name: '500 Coins',
    coinAmount: 500,
    bonusCoins: 50,
    price: 19.99,
    currency: 'USD',
    isPopular: false,
    savings: '10% bonus',
  },
  {
    id: 'COIN_PACK_LARGE',
    name: '1200 Coins',
    coinAmount: 1200,
    bonusCoins: 200,
    price: 39.99,
    currency: 'USD',
    isPopular: true,
    savings: '17% bonus',
  },
  {
    id: 'COIN_PACK_XL',
    name: '2500 Coins',
    coinAmount: 2500,
    bonusCoins: 500,
    price: 79.99,
    currency: 'USD',
    isPopular: false,
    savings: '20% bonus',
  },
];

/**
 * Boost Products Configuration
 */
export const BOOST_PRODUCTS: BoostProduct[] = [
  {
    id: 'BOOST_30MIN',
    name: '30 Minute Boost',
    durationMinutes: 30,
    price: 3.99,
    currency: 'USD',
  },
  {
    id: 'BOOST_1HR',
    name: '1 Hour Boost',
    durationMinutes: 60,
    price: 5.99,
    currency: 'USD',
  },
  {
    id: 'BOOST_3HR',
    name: '3 Hour Boost',
    durationMinutes: 180,
    price: 12.99,
    currency: 'USD',
  },
];

/**
 * Pricing Helper Functions
 */
export class PricingService {
  /**
   * Get subscription plan by tier
   */
  static getPlan(tier: SubscriptionTier): SubscriptionPlan {
    return SUBSCRIPTION_PLANS[tier];
  }

  /**
   * Get all subscription plans
   */
  static getAllPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  /**
   * Get paid subscription plans (excluding free)
   */
  static getPaidPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS).filter((plan) => plan.tier !== 'free');
  }

  /**
   * Get plan price for billing cycle
   */
  static getPlanPrice(tier: SubscriptionTier, billingCycle: BillingCycle): number {
    const plan = SUBSCRIPTION_PLANS[tier];

    switch (billingCycle) {
      case 'monthly':
        return plan.monthlyPrice;
      case 'yearly':
        return plan.yearlyPrice;
      case '3_months':
        return plan.threeMonthPrice || plan.monthlyPrice * 3;
      case '6_months':
        return plan.sixMonthPrice || plan.monthlyPrice * 6;
      default:
        return plan.monthlyPrice;
    }
  }

  /**
   * Calculate yearly savings
   */
  static getYearlySavings(tier: SubscriptionTier): number {
    const plan = SUBSCRIPTION_PLANS[tier];
    const monthlyCost = plan.monthlyPrice * 12;
    const yearlyCost = plan.yearlyPrice;
    return monthlyCost - yearlyCost;
  }

  /**
   * Calculate savings percentage
   */
  static getSavingsPercentage(tier: SubscriptionTier, billingCycle: BillingCycle): number {
    if (billingCycle === 'monthly') return 0;

    const plan = SUBSCRIPTION_PLANS[tier];
    const monthlyTotal = plan.monthlyPrice * this.getBillingCycleMonths(billingCycle);
    const cyclePrice = this.getPlanPrice(tier, billingCycle);

    return Math.round(((monthlyTotal - cyclePrice) / monthlyTotal) * 100);
  }

  /**
   * Get number of months for billing cycle
   */
  static getBillingCycleMonths(billingCycle: BillingCycle): number {
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
   * Get coin package by ID
   */
  static getCoinPackage(packageId: string): CoinPackage | undefined {
    return COIN_PACKAGES.find((pkg) => pkg.id === packageId);
  }

  /**
   * Get total coins (amount + bonus) for package
   */
  static getTotalCoins(packageId: string): number {
    const pkg = this.getCoinPackage(packageId);
    return pkg ? pkg.coinAmount + pkg.bonusCoins : 0;
  }

  /**
   * Get boost product by ID
   */
  static getBoostProduct(productId: string): BoostProduct | undefined {
    return BOOST_PRODUCTS.find((product) => product.id === productId);
  }

  /**
   * Validate subscription tier
   */
  static isValidTier(tier: string): tier is SubscriptionTier {
    return tier in SUBSCRIPTION_PLANS;
  }

  /**
   * Validate billing cycle
   */
  static isValidBillingCycle(cycle: string): cycle is BillingCycle {
    return ['monthly', '3_months', '6_months', 'yearly'].includes(cycle);
  }

  /**
   * Get tier comparison (for upgrades/downgrades)
   */
  static compareTiers(currentTier: SubscriptionTier, newTier: SubscriptionTier): 'upgrade' | 'downgrade' | 'same' {
    const tierOrder: SubscriptionTier[] = ['free', 'basic', 'plus', 'premium', 'premium_plus', 'elite'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const newIndex = tierOrder.indexOf(newTier);

    if (currentIndex === newIndex) return 'same';
    return currentIndex < newIndex ? 'upgrade' : 'downgrade';
  }
}

export default PricingService;
