export interface SubscriptionFeature {
  id: string;
  tier: 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';
  featureKey: string;
  featureValue: Record<string, any>;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureAccess {
  enabled: boolean;
  limit?: number;
  metadata?: Record<string, any>;
}

// Feature keys constants
export const FEATURE_KEYS = {
  DAILY_SWIPES_LIMIT: 'daily_swipes_limit',
  DAILY_LIKES_LIMIT: 'daily_likes_limit',
  DAILY_SUPER_LIKES_LIMIT: 'daily_super_likes_limit',
  REWIND_COOLDOWN_HOURS: 'rewind_cooldown_hours',
  SEE_WHO_LIKED_YOU: 'see_who_liked_you',
  ADVANCED_FILTERS: 'advanced_filters',
  READ_RECEIPTS: 'read_receipts',
  INCOGNITO_MODE: 'incognito_mode',
  PRIORITY_LIKES: 'priority_likes',
  MESSAGE_BEFORE_MATCH: 'message_before_match',
  TRAVEL_MODE: 'travel_mode',
  MONTHLY_BOOSTS: 'monthly_boosts',
  PRIORITY_SUPPORT: 'priority_support',
  AD_FREE: 'ad_free',
  PROFILE_VERIFICATION_PRIORITY: 'profile_verification_priority',
  EXCLUSIVE_BADGES: 'exclusive_badges',
} as const;

// Helper function to check feature access
export function hasFeatureAccess(
  features: SubscriptionFeature[],
  featureKey: string
): FeatureAccess {
  const feature = features.find(f => f.featureKey === featureKey && f.active);

  if (!feature) {
    return { enabled: false };
  }

  return {
    enabled: feature.featureValue.enabled !== false,
    limit: feature.featureValue.limit,
    metadata: feature.featureValue,
  };
}

// Helper to get numeric limits
export function getFeatureLimit(
  features: SubscriptionFeature[],
  featureKey: string,
  defaultValue: number = 0
): number {
  const feature = features.find(f => f.featureKey === featureKey && f.active);

  if (!feature || !feature.featureValue.limit) {
    return defaultValue;
  }

  // -1 means unlimited
  return feature.featureValue.limit === -1 ? Infinity : feature.featureValue.limit;
}
