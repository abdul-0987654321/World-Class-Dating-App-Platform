import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries
  await knex('subscription_features').del();

  // Insert subscription features for all tiers
  const features = [
    // FREE TIER
    { tier: 'free', key: 'daily_swipes_limit', value: '10', value_type: 'integer' },
    { tier: 'free', key: 'daily_likes_limit', value: '5', value_type: 'integer' },
    { tier: 'free', key: 'see_who_liked_you', value: 'false', value_type: 'boolean' },
    { tier: 'free', key: 'advanced_filters', value: 'false', value_type: 'boolean' },
    { tier: 'free', key: 'incognito_mode', value: 'false', value_type: 'boolean' },
    { tier: 'free', key: 'super_likes_per_day', value: '0', value_type: 'integer' },
    { tier: 'free', key: 'rewinds_per_day', value: '0', value_type: 'integer' },
    { tier: 'free', key: 'boosts_per_month', value: '0', value_type: 'integer' },
    { tier: 'free', key: 'priority_likes', value: 'false', value_type: 'boolean' },
    { tier: 'free', key: 'read_receipts', value: 'false', value_type: 'boolean' },
    { tier: 'free', key: 'no_ads', value: 'false', value_type: 'boolean' },
    { tier: 'free', key: 'profile_boost', value: 'false', value_type: 'boolean' },
    { tier: 'free', key: 'vip_badge', value: 'false', value_type: 'boolean' },
    { tier: 'free', key: 'unlimited_rewinds', value: 'false', value_type: 'boolean' },
    { tier: 'free', key: 'unlimited_super_likes', value: 'false', value_type: 'boolean' },
    { tier: 'free', key: 'early_access', value: 'false', value_type: 'boolean' },

    // BASIC TIER - $9.99/month
    { tier: 'basic', key: 'daily_swipes_limit', value: '-1', value_type: 'integer' },
    { tier: 'basic', key: 'daily_likes_limit', value: '-1', value_type: 'integer' },
    { tier: 'basic', key: 'see_who_liked_you', value: 'true', value_type: 'boolean' },
    { tier: 'basic', key: 'advanced_filters', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'incognito_mode', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'super_likes_per_day', value: '5', value_type: 'integer' },
    { tier: 'basic', key: 'rewinds_per_day', value: '5', value_type: 'integer' },
    { tier: 'basic', key: 'boosts_per_month', value: '0', value_type: 'integer' },
    { tier: 'basic', key: 'priority_likes', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'read_receipts', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'no_ads', value: 'true', value_type: 'boolean' },
    { tier: 'basic', key: 'profile_boost', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'vip_badge', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'unlimited_rewinds', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'unlimited_super_likes', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'early_access', value: 'false', value_type: 'boolean' },

    // PLUS TIER - $14.99/month
    { tier: 'plus', key: 'daily_swipes_limit', value: '-1', value_type: 'integer' },
    { tier: 'plus', key: 'daily_likes_limit', value: '-1', value_type: 'integer' },
    { tier: 'plus', key: 'see_who_liked_you', value: 'true', value_type: 'boolean' },
    { tier: 'plus', key: 'advanced_filters', value: 'true', value_type: 'boolean' },
    { tier: 'plus', key: 'incognito_mode', value: 'true', value_type: 'boolean' },
    { tier: 'plus', key: 'super_likes_per_day', value: '10', value_type: 'integer' },
    { tier: 'plus', key: 'rewinds_per_day', value: '-1', value_type: 'integer' },
    { tier: 'plus', key: 'boosts_per_month', value: '1', value_type: 'integer' },
    { tier: 'plus', key: 'priority_likes', value: 'true', value_type: 'boolean' },
    { tier: 'plus', key: 'read_receipts', value: 'true', value_type: 'boolean' },
    { tier: 'plus', key: 'no_ads', value: 'true', value_type: 'boolean' },
    { tier: 'plus', key: 'profile_boost', value: 'false', value_type: 'boolean' },
    { tier: 'plus', key: 'vip_badge', value: 'false', value_type: 'boolean' },
    { tier: 'plus', key: 'unlimited_rewinds', value: 'true', value_type: 'boolean' },
    { tier: 'plus', key: 'unlimited_super_likes', value: 'false', value_type: 'boolean' },
    { tier: 'plus', key: 'early_access', value: 'false', value_type: 'boolean' },

    // PREMIUM TIER - $19.99/month
    { tier: 'premium', key: 'daily_swipes_limit', value: '-1', value_type: 'integer' },
    { tier: 'premium', key: 'daily_likes_limit', value: '-1', value_type: 'integer' },
    { tier: 'premium', key: 'see_who_liked_you', value: 'true', value_type: 'boolean' },
    { tier: 'premium', key: 'advanced_filters', value: 'true', value_type: 'boolean' },
    { tier: 'premium', key: 'incognito_mode', value: 'true', value_type: 'boolean' },
    { tier: 'premium', key: 'super_likes_per_day', value: '-1', value_type: 'integer' },
    { tier: 'premium', key: 'rewinds_per_day', value: '-1', value_type: 'integer' },
    { tier: 'premium', key: 'boosts_per_month', value: '2', value_type: 'integer' },
    { tier: 'premium', key: 'priority_likes', value: 'true', value_type: 'boolean' },
    { tier: 'premium', key: 'read_receipts', value: 'true', value_type: 'boolean' },
    { tier: 'premium', key: 'no_ads', value: 'true', value_type: 'boolean' },
    { tier: 'premium', key: 'profile_boost', value: 'false', value_type: 'boolean' },
    { tier: 'premium', key: 'vip_badge', value: 'false', value_type: 'boolean' },
    { tier: 'premium', key: 'unlimited_rewinds', value: 'true', value_type: 'boolean' },
    { tier: 'premium', key: 'unlimited_super_likes', value: 'true', value_type: 'boolean' },
    { tier: 'premium', key: 'early_access', value: 'false', value_type: 'boolean' },

    // PREMIUM PLUS TIER - $29.99/month
    { tier: 'premium_plus', key: 'daily_swipes_limit', value: '-1', value_type: 'integer' },
    { tier: 'premium_plus', key: 'daily_likes_limit', value: '-1', value_type: 'integer' },
    { tier: 'premium_plus', key: 'see_who_liked_you', value: 'true', value_type: 'boolean' },
    { tier: 'premium_plus', key: 'advanced_filters', value: 'true', value_type: 'boolean' },
    { tier: 'premium_plus', key: 'incognito_mode', value: 'true', value_type: 'boolean' },
    { tier: 'premium_plus', key: 'super_likes_per_day', value: '-1', value_type: 'integer' },
    { tier: 'premium_plus', key: 'rewinds_per_day', value: '-1', value_type: 'integer' },
    { tier: 'premium_plus', key: 'boosts_per_month', value: '4', value_type: 'integer' },
    { tier: 'premium_plus', key: 'priority_likes', value: 'true', value_type: 'boolean' },
    { tier: 'premium_plus', key: 'read_receipts', value: 'true', value_type: 'boolean' },
    { tier: 'premium_plus', key: 'no_ads', value: 'true', value_type: 'boolean' },
    { tier: 'premium_plus', key: 'profile_boost', value: 'true', value_type: 'boolean' },
    { tier: 'premium_plus', key: 'vip_badge', value: 'false', value_type: 'boolean' },
    { tier: 'premium_plus', key: 'unlimited_rewinds', value: 'true', value_type: 'boolean' },
    { tier: 'premium_plus', key: 'unlimited_super_likes', value: 'true', value_type: 'boolean' },
    { tier: 'premium_plus', key: 'early_access', value: 'true', value_type: 'boolean' },

    // ELITE TIER - $49.99/month
    { tier: 'elite', key: 'daily_swipes_limit', value: '-1', value_type: 'integer' },
    { tier: 'elite', key: 'daily_likes_limit', value: '-1', value_type: 'integer' },
    { tier: 'elite', key: 'see_who_liked_you', value: 'true', value_type: 'boolean' },
    { tier: 'elite', key: 'advanced_filters', value: 'true', value_type: 'boolean' },
    { tier: 'elite', key: 'incognito_mode', value: 'true', value_type: 'boolean' },
    { tier: 'elite', key: 'super_likes_per_day', value: '-1', value_type: 'integer' },
    { tier: 'elite', key: 'rewinds_per_day', value: '-1', value_type: 'integer' },
    { tier: 'elite', key: 'boosts_per_month', value: '-1', value_type: 'integer' },
    { tier: 'elite', key: 'priority_likes', value: 'true', value_type: 'boolean' },
    { tier: 'elite', key: 'read_receipts', value: 'true', value_type: 'boolean' },
    { tier: 'elite', key: 'no_ads', value: 'true', value_type: 'boolean' },
    { tier: 'elite', key: 'profile_boost', value: 'true', value_type: 'boolean' },
    { tier: 'elite', key: 'vip_badge', value: 'true', value_type: 'boolean' },
    { tier: 'elite', key: 'unlimited_rewinds', value: 'true', value_type: 'boolean' },
    { tier: 'elite', key: 'unlimited_super_likes', value: 'true', value_type: 'boolean' },
    { tier: 'elite', key: 'early_access', value: 'true', value_type: 'boolean' },
  ];

  // Insert all features with generated UUIDs and timestamps
  await knex('subscription_features').insert(
    features.map((feature) => ({
      id: knex.raw('gen_random_uuid()'),
      tier: feature.tier,
      feature_key: feature.key,
      feature_value: feature.value,
      value_type: feature.value_type,
      description: getFeatureDescription(feature.key),
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    }))
  );

  console.log('✓ Seeded 96 subscription features (16 features × 6 tiers)');
}

function getFeatureDescription(key: string): string {
  const descriptions: Record<string, string> = {
    daily_swipes_limit: 'Number of swipes allowed per day (-1 = unlimited)',
    daily_likes_limit: 'Number of likes allowed per day (-1 = unlimited)',
    see_who_liked_you: 'Ability to see who liked your profile',
    advanced_filters: 'Access to advanced search filters',
    incognito_mode: 'Browse profiles anonymously',
    super_likes_per_day: 'Number of super likes per day (-1 = unlimited)',
    rewinds_per_day: 'Number of rewinds per day (-1 = unlimited)',
    boosts_per_month: 'Free profile boosts per month',
    priority_likes: 'Your likes are shown first to others',
    read_receipts: 'See when messages are read',
    no_ads: 'Ad-free experience',
    profile_boost: 'Automatic profile visibility boost',
    vip_badge: 'VIP badge on your profile',
    unlimited_rewinds: 'Unlimited rewind swipes',
    unlimited_super_likes: 'Unlimited super likes',
    early_access: 'Early access to new features',
  };

  return descriptions[key] || '';
}
