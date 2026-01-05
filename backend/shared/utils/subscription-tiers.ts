/**
 * Subscription Tier Definitions
 *
 * Single source of truth for subscription tiers across all services.
 * This ensures consistency between payment-service, user-service, and frontend.
 */

// Official tier names used across the platform
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PLUS: 'plus',
  PREMIUM: 'premium',
  PREMIUM_PLUS: 'premium_plus',
  ELITE: 'elite',
} as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS];

// Tier hierarchy (index = tier level, higher = more features)
export const TIER_HIERARCHY: SubscriptionTier[] = [
  SUBSCRIPTION_TIERS.FREE,
  SUBSCRIPTION_TIERS.BASIC,
  SUBSCRIPTION_TIERS.PLUS,
  SUBSCRIPTION_TIERS.PREMIUM,
  SUBSCRIPTION_TIERS.PREMIUM_PLUS,
  SUBSCRIPTION_TIERS.ELITE,
];

// Tier display names for UI
export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  [SUBSCRIPTION_TIERS.FREE]: 'Free',
  [SUBSCRIPTION_TIERS.BASIC]: 'Basic',
  [SUBSCRIPTION_TIERS.PLUS]: 'Plus',
  [SUBSCRIPTION_TIERS.PREMIUM]: 'Premium',
  [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: 'Premium+',
  [SUBSCRIPTION_TIERS.ELITE]: 'Elite',
};

// Tier pricing (monthly, in cents)
export const TIER_PRICING: Record<SubscriptionTier, { monthly: number; yearly: number }> = {
  [SUBSCRIPTION_TIERS.FREE]: { monthly: 0, yearly: 0 },
  [SUBSCRIPTION_TIERS.BASIC]: { monthly: 999, yearly: 9588 },
  [SUBSCRIPTION_TIERS.PLUS]: { monthly: 1499, yearly: 14388 },
  [SUBSCRIPTION_TIERS.PREMIUM]: { monthly: 1999, yearly: 19188 },
  [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: { monthly: 2999, yearly: 28788 },
  [SUBSCRIPTION_TIERS.ELITE]: { monthly: 4999, yearly: 47988 },
};

// Trial days per tier
export const TIER_TRIAL_DAYS: Record<SubscriptionTier, number> = {
  [SUBSCRIPTION_TIERS.FREE]: 0,
  [SUBSCRIPTION_TIERS.BASIC]: 7,
  [SUBSCRIPTION_TIERS.PLUS]: 7,
  [SUBSCRIPTION_TIERS.PREMIUM]: 14,
  [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: 14,
  [SUBSCRIPTION_TIERS.ELITE]: 14,
};

/**
 * Check if a tier is valid
 */
export function isValidTier(tier: string): tier is SubscriptionTier {
  return Object.values(SUBSCRIPTION_TIERS).includes(tier as SubscriptionTier);
}

/**
 * Get tier level (0-5, where 5 is highest)
 */
export function getTierLevel(tier: SubscriptionTier): number {
  return TIER_HIERARCHY.indexOf(tier);
}

/**
 * Check if tier1 has higher or equal access than tier2
 */
export function hasEqualOrHigherTier(
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): boolean {
  return getTierLevel(userTier) >= getTierLevel(requiredTier);
}

/**
 * Get the next higher tier (for upgrade prompts)
 */
export function getNextTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  const currentLevel = getTierLevel(currentTier);
  if (currentLevel >= TIER_HIERARCHY.length - 1) {
    return null; // Already at highest tier
  }
  return TIER_HIERARCHY[currentLevel + 1];
}

/**
 * Map legacy tier names to current tier names
 * Used for backward compatibility during migration
 */
export function mapLegacyTier(legacyTier: string): SubscriptionTier {
  const mapping: Record<string, SubscriptionTier> = {
    // Old 4-tier names
    mid: SUBSCRIPTION_TIERS.PREMIUM,
    ultra: SUBSCRIPTION_TIERS.ELITE,
    // Handle any other variations
    gold: SUBSCRIPTION_TIERS.PLUS,
    platinum: SUBSCRIPTION_TIERS.PREMIUM_PLUS,
    vip: SUBSCRIPTION_TIERS.ELITE,
  };

  if (isValidTier(legacyTier)) {
    return legacyTier;
  }

  return mapping[legacyTier.toLowerCase()] || SUBSCRIPTION_TIERS.FREE;
}

/**
 * Feature access by tier (minimum tier required for each feature)
 */
export const FEATURE_TIER_REQUIREMENTS: Record<string, SubscriptionTier> = {
  // Basic features available to all
  basic_matching: SUBSCRIPTION_TIERS.FREE,
  limited_swipes: SUBSCRIPTION_TIERS.FREE,
  basic_profile: SUBSCRIPTION_TIERS.FREE,

  // Basic tier features
  unlimited_swipes: SUBSCRIPTION_TIERS.BASIC,
  see_who_liked_you: SUBSCRIPTION_TIERS.BASIC,
  rewind: SUBSCRIPTION_TIERS.BASIC,
  ad_free: SUBSCRIPTION_TIERS.BASIC,

  // Plus tier features
  incognito_mode: SUBSCRIPTION_TIERS.PLUS,
  priority_likes: SUBSCRIPTION_TIERS.PLUS,
  read_receipts: SUBSCRIPTION_TIERS.PLUS,

  // Premium tier features
  unlimited_super_likes: SUBSCRIPTION_TIERS.PREMIUM,
  passport: SUBSCRIPTION_TIERS.PREMIUM,
  advanced_filters: SUBSCRIPTION_TIERS.PREMIUM,
  profile_controls: SUBSCRIPTION_TIERS.PREMIUM,

  // Premium+ tier features
  message_before_match: SUBSCRIPTION_TIERS.PREMIUM_PLUS,
  weekly_boost: SUBSCRIPTION_TIERS.PREMIUM_PLUS,
  see_profile_visitors: SUBSCRIPTION_TIERS.PREMIUM_PLUS,
  priority_support: SUBSCRIPTION_TIERS.PREMIUM_PLUS,

  // Elite tier features
  vip_badge: SUBSCRIPTION_TIERS.ELITE,
  elite_matches: SUBSCRIPTION_TIERS.ELITE,
  dedicated_account_manager: SUBSCRIPTION_TIERS.ELITE,
  unlimited_boosts: SUBSCRIPTION_TIERS.ELITE,
  early_access: SUBSCRIPTION_TIERS.ELITE,
};

/**
 * Check if user has access to a feature based on their tier
 */
export function hasFeatureAccess(userTier: SubscriptionTier, featureKey: string): boolean {
  const requiredTier = FEATURE_TIER_REQUIREMENTS[featureKey];
  if (!requiredTier) {
    // Feature not found, default to requiring elite (most restrictive)
    console.warn(`Unknown feature: ${featureKey}, defaulting to elite tier requirement`);
    return userTier === SUBSCRIPTION_TIERS.ELITE;
  }
  return hasEqualOrHigherTier(userTier, requiredTier);
}
