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
    { tier: 'basic', key: 'advanced_filters', value: 'true', value_type: 'boolean' },
    { tier: 'basic', key: 'incognito_mode', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'super_likes_per_day', value: '5', value_type: 'integer' },
    { tier: 'basic', key: 'rewinds_per_day', value: '0', value_type: 'integer' },
    { tier: 'basic', key: 'boosts_per_month', value: '0', value_type: 'integer' },
    { tier: 'basic', key: 'priority_likes', value: 'true', value_type: 'boolean' },
    { tier: 'basic', key: 'read_receipts', value: 'true', value_type: 'boolean' },
    { tier: 'basic', key: 'no_ads', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'profile_boost', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'vip_badge', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'unlimited_rewinds', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'unlimited_super_likes', value: 'false', value_type: 'boolean' },
    { tier: 'basic', key: 'early_access', value: 'false', value_type: 'boolean' },

    // MID TIER - $19.99/month
    { tier: 'mid', key: 'daily_swipes_limit', value: '-1', value_type: 'integer' },
    { tier: 'mid', key: 'daily_likes_limit', value: '-1', value_type: 'integer' },
    { tier: 'mid', key: 'see_who_liked_you', value: 'true', value_type: 'boolean' },
    { tier: 'mid', key: 'advanced_filters', value: 'true', value_type: 'boolean' },
    { tier: 'mid', key: 'incognito_mode', value: 'true', value_type: 'boolean' },
    { tier: 'mid', key: 'super_likes_per_day', value: '10', value_type: 'integer' },
    { tier: 'mid', key: 'rewinds_per_day', value: '3', value_type: 'integer' },
    { tier: 'mid', key: 'boosts_per_month', value: '1', value_type: 'integer' },
    { tier: 'mid', key: 'priority_likes', value: 'true', value_type: 'boolean' },
    { tier: 'mid', key: 'read_receipts', value: 'true', value_type: 'boolean' },
    { tier: 'mid', key: 'no_ads', value: 'true', value_type: 'boolean' },
    { tier: 'mid', key: 'profile_boost', value: 'false', value_type: 'boolean' },
    { tier: 'mid', key: 'vip_badge', value: 'false', value_type: 'boolean' },
    { tier: 'mid', key: 'unlimited_rewinds', value: 'false', value_type: 'boolean' },
    { tier: 'mid', key: 'unlimited_super_likes', value: 'false', value_type: 'boolean' },
    { tier: 'mid', key: 'early_access', value: 'false', value_type: 'boolean' },

    // ULTRA TIER - $29.99/month
    { tier: 'ultra', key: 'daily_swipes_limit', value: '-1', value_type: 'integer' },
    { tier: 'ultra', key: 'daily_likes_limit', value: '-1', value_type: 'integer' },
    { tier: 'ultra', key: 'see_who_liked_you', value: 'true', value_type: 'boolean' },
    { tier: 'ultra', key: 'advanced_filters', value: 'true', value_type: 'boolean' },
    { tier: 'ultra', key: 'incognito_mode', value: 'true', value_type: 'boolean' },
    { tier: 'ultra', key: 'super_likes_per_day', value: '-1', value_type: 'integer' },
    { tier: 'ultra', key: 'rewinds_per_day', value: '-1', value_type: 'integer' },
    { tier: 'ultra', key: 'boosts_per_month', value: '2', value_type: 'integer' },
    { tier: 'ultra', key: 'priority_likes', value: 'true', value_type: 'boolean' },
    { tier: 'ultra', key: 'read_receipts', value: 'true', value_type: 'boolean' },
    { tier: 'ultra', key: 'no_ads', value: 'true', value_type: 'boolean' },
    { tier: 'ultra', key: 'profile_boost', value: 'true', value_type: 'boolean' },
    { tier: 'ultra', key: 'vip_badge', value: 'true', value_type: 'boolean' },
    { tier: 'ultra', key: 'unlimited_rewinds', value: 'true', value_type: 'boolean' },
    { tier: 'ultra', key: 'unlimited_super_likes', value: 'true', value_type: 'boolean' },
    { tier: 'ultra', key: 'early_access', value: 'true', value_type: 'boolean' },
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

  console.log('✓ Seeded 64 subscription features (16 features × 4 tiers)');
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
