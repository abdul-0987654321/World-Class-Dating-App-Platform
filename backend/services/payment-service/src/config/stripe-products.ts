/**
 * Stripe Products & Prices Configuration
 *
 * This file maps Flamoral subscription tiers to Stripe product/price IDs.
 * Each tier has specific entitlements that are enforced throughout the platform.
 */

export interface SubscriptionTier {
  key: string;
  name: string;
  priceMonthly: number;
  stripePriceId: string;
  stripeProductId: string;
  entitlements: TierEntitlements;
}

export interface TierEntitlements {
  dailySwipes: number;
  superLikesPerDay: number;
  boostsPerMonth: number;
  canSeeWhoLikesYou: boolean;
  advancedFilters: boolean;
  readReceipts: boolean;
  incognitoMode: boolean;
  unlimitedSuperLikes: boolean;
  videoDating: boolean;
  aiMatchmaking: boolean;
  passport: boolean;
  messageBeforeMatch: boolean;
  prioritySupport: boolean;
  vipBadge: boolean;
  dedicatedCoach: boolean;
  backgroundVerified: boolean;
  aiIcebreakers: boolean;
}

// Default free tier entitlements
const FREE_ENTITLEMENTS: TierEntitlements = {
  dailySwipes: 50,
  superLikesPerDay: 1,
  boostsPerMonth: 0,
  canSeeWhoLikesYou: false,
  advancedFilters: false,
  readReceipts: false,
  incognitoMode: false,
  unlimitedSuperLikes: false,
  videoDating: false,
  aiMatchmaking: false,
  passport: false,
  messageBeforeMatch: false,
  prioritySupport: false,
  vipBadge: false,
  dedicatedCoach: false,
  backgroundVerified: false,
  aiIcebreakers: false,
};

// Subscription tiers with Stripe IDs
// NOTE: These IDs should be replaced with actual Stripe product/price IDs from your Stripe dashboard
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    key: 'free',
    name: 'Free',
    priceMonthly: 0,
    stripePriceId: 'price_free', // No actual price - free tier
    stripeProductId: 'prod_free',
    entitlements: FREE_ENTITLEMENTS,
  },
  {
    key: 'basic',
    name: 'Basic',
    priceMonthly: 999, // $9.99 in cents
    stripePriceId: process.env.STRIPE_PRICE_BASIC || 'price_basic_monthly',
    stripeProductId: process.env.STRIPE_PRODUCT_BASIC || 'prod_basic',
    entitlements: {
      ...FREE_ENTITLEMENTS,
      dailySwipes: -1, // -1 = unlimited
      superLikesPerDay: 5,
      boostsPerMonth: 1,
      canSeeWhoLikesYou: true,
    },
  },
  {
    key: 'plus',
    name: 'Plus',
    priceMonthly: 1999, // $19.99 in cents
    stripePriceId: process.env.STRIPE_PRICE_PLUS || 'price_plus_monthly',
    stripeProductId: process.env.STRIPE_PRODUCT_PLUS || 'prod_plus',
    entitlements: {
      ...FREE_ENTITLEMENTS,
      dailySwipes: -1,
      superLikesPerDay: 10,
      boostsPerMonth: 3,
      canSeeWhoLikesYou: true,
      advancedFilters: true,
      readReceipts: true,
      incognitoMode: true,
    },
  },
  {
    key: 'premium',
    name: 'Premium',
    priceMonthly: 2999, // $29.99 in cents
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_monthly',
    stripeProductId: process.env.STRIPE_PRODUCT_PREMIUM || 'prod_premium',
    entitlements: {
      ...FREE_ENTITLEMENTS,
      dailySwipes: -1,
      superLikesPerDay: -1, // unlimited
      boostsPerMonth: 5,
      canSeeWhoLikesYou: true,
      advancedFilters: true,
      readReceipts: true,
      incognitoMode: true,
      unlimitedSuperLikes: true,
      videoDating: true,
      aiMatchmaking: true,
      aiIcebreakers: true,
    },
  },
  {
    key: 'premium_plus',
    name: 'Premium+',
    priceMonthly: 3999, // $39.99 in cents
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM_PLUS || 'price_premium_plus_monthly',
    stripeProductId: process.env.STRIPE_PRODUCT_PREMIUM_PLUS || 'prod_premium_plus',
    entitlements: {
      ...FREE_ENTITLEMENTS,
      dailySwipes: -1,
      superLikesPerDay: -1,
      boostsPerMonth: 10,
      canSeeWhoLikesYou: true,
      advancedFilters: true,
      readReceipts: true,
      incognitoMode: true,
      unlimitedSuperLikes: true,
      videoDating: true,
      aiMatchmaking: true,
      aiIcebreakers: true,
      passport: true,
      messageBeforeMatch: true,
      prioritySupport: true,
    },
  },
  {
    key: 'elite',
    name: 'Elite',
    priceMonthly: 5999, // $59.99 in cents
    stripePriceId: process.env.STRIPE_PRICE_ELITE || 'price_elite_monthly',
    stripeProductId: process.env.STRIPE_PRODUCT_ELITE || 'prod_elite',
    entitlements: {
      ...FREE_ENTITLEMENTS,
      dailySwipes: -1,
      superLikesPerDay: -1,
      boostsPerMonth: -1, // unlimited
      canSeeWhoLikesYou: true,
      advancedFilters: true,
      readReceipts: true,
      incognitoMode: true,
      unlimitedSuperLikes: true,
      videoDating: true,
      aiMatchmaking: true,
      aiIcebreakers: true,
      passport: true,
      messageBeforeMatch: true,
      prioritySupport: true,
      vipBadge: true,
      dedicatedCoach: true,
      backgroundVerified: true,
    },
  },
];

/**
 * Get tier by key
 */
export function getTierByKey(key: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS.find((tier) => tier.key === key);
}

/**
 * Get tier by Stripe price ID
 */
export function getTierByPriceId(priceId: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS.find((tier) => tier.stripePriceId === priceId);
}

/**
 * Get tier by Stripe product ID
 */
export function getTierByProductId(productId: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS.find((tier) => tier.stripeProductId === productId);
}

/**
 * Get entitlements for a tier key
 */
export function getEntitlements(tierKey: string): TierEntitlements {
  const tier = getTierByKey(tierKey);
  return tier?.entitlements || FREE_ENTITLEMENTS;
}

/**
 * Check if a tier has a specific entitlement
 */
export function hasEntitlement(tierKey: string, entitlement: keyof TierEntitlements): boolean {
  const entitlements = getEntitlements(tierKey);
  const value = entitlements[entitlement];

  // For number values, check if > 0 or unlimited (-1)
  if (typeof value === 'number') {
    return value !== 0;
  }

  return Boolean(value);
}

/**
 * Validate that all required Stripe IDs are configured
 */
export function validateStripeConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Skip free tier, validate paid tiers
  const paidTiers = SUBSCRIPTION_TIERS.filter((t) => t.key !== 'free');

  for (const tier of paidTiers) {
    if (!tier.stripePriceId || tier.stripePriceId.startsWith('price_')) {
      // Check if it's a placeholder
      if (!process.env[`STRIPE_PRICE_${tier.key.toUpperCase()}`]) {
        errors.push(`Missing Stripe price ID for ${tier.name} tier`);
      }
    }
    if (!tier.stripeProductId || tier.stripeProductId.startsWith('prod_')) {
      if (!process.env[`STRIPE_PRODUCT_${tier.key.toUpperCase()}`]) {
        errors.push(`Missing Stripe product ID for ${tier.name} tier`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default SUBSCRIPTION_TIERS;
