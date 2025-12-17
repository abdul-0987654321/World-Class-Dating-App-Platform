import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // First, update the enum to include all 6 tiers
  await knex.raw(`
    ALTER TYPE subscription_features_tier_enum RENAME TO subscription_features_tier_enum_old;
  `);

  await knex.raw(`
    CREATE TYPE subscription_features_tier_enum AS ENUM ('free', 'basic', 'plus', 'premium', 'premium_plus', 'elite');
  `);

  // Update existing records to use new tier names (map old to new)
  // mid -> plus, ultra -> elite
  await knex.raw(`
    ALTER TABLE subscription_features
    ALTER COLUMN tier TYPE subscription_features_tier_enum
    USING (
      CASE tier::text
        WHEN 'mid' THEN 'plus'::subscription_features_tier_enum
        WHEN 'ultra' THEN 'elite'::subscription_features_tier_enum
        ELSE tier::text::subscription_features_tier_enum
      END
    );
  `);

  await knex.raw(`
    DROP TYPE subscription_features_tier_enum_old;
  `);

  // Delete old feature data to insert fresh mappings
  await knex('subscription_features').del();

  // Insert comprehensive feature mappings for all 6 tiers
  await knex('subscription_features').insert([
    // ==================== FREE TIER ====================
    {
      tier: 'free',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: 50, enabled: true }),
      description: '50 swipes per day',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: 50, enabled: true }),
      description: '50 likes per day',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: 1, enabled: true }),
      description: '1 super like per day',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 24, enabled: false }),
      description: 'No rewind feature',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'Cannot see who liked them',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'video_calls',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'No video calls',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: false, max_filters: 0 }),
      description: 'Basic filters only',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'No read receipts',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'No incognito mode',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'travel_mode',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'No travel mode (passport)',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'Ads shown',
      active: true
    },
    {
      tier: 'free',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: 0, enabled: false }),
      description: 'No free boosts',
      active: true
    },

    // ==================== BASIC TIER ($9.99/month) ====================
    {
      tier: 'basic',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited swipes',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited likes',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: 5, enabled: true }),
      description: '5 super likes per day',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 0, enabled: true }),
      description: 'Unlimited rewinds',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'See who liked you',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'video_calls',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Video calls enabled',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: true, max_filters: 5 }),
      description: 'Access to 5 advanced filters',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Read receipts enabled',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'No incognito mode',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'travel_mode',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'No travel mode',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: 1, enabled: true }),
      description: '1 free boost per month',
      active: true
    },
    {
      tier: 'basic',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Ad-free experience',
      active: true
    },

    // ==================== PLUS TIER ($14.99/month) ====================
    {
      tier: 'plus',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited swipes',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited likes',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: 10, enabled: true }),
      description: '10 super likes per day',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 0, enabled: true }),
      description: 'Unlimited rewinds',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'See who liked you',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'video_calls',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Video calls enabled',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: true, max_filters: 10 }),
      description: 'Access to 10 advanced filters',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Read receipts enabled',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Incognito mode enabled',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'travel_mode',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'No travel mode',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'priority_likes',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Your likes appear first',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: 2, enabled: true }),
      description: '2 free boosts per month',
      active: true
    },
    {
      tier: 'plus',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Ad-free experience',
      active: true
    },

    // ==================== PREMIUM TIER ($19.99/month) ====================
    {
      tier: 'premium',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited swipes',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited likes',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited super likes',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 0, enabled: true }),
      description: 'Unlimited rewinds',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'See who liked you',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'video_calls',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Video calls enabled',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: true, max_filters: -1 }),
      description: 'All advanced filters',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Read receipts enabled',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Incognito mode enabled',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'travel_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Travel mode (passport) enabled',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'priority_likes',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Your likes appear first',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'message_before_match',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Message before matching',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: 3, enabled: true }),
      description: '3 free boosts per month',
      active: true
    },
    {
      tier: 'premium',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Ad-free experience',
      active: true
    },

    // ==================== PREMIUM_PLUS TIER ($29.99/month) ====================
    {
      tier: 'premium_plus',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited swipes',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited likes',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited super likes',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 0, enabled: true }),
      description: 'Unlimited rewinds',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'See who liked you',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'video_calls',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Video calls enabled',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: true, max_filters: -1 }),
      description: 'All advanced filters',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Read receipts enabled',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Incognito mode enabled',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'travel_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Travel mode (passport) enabled',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'priority_likes',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Your likes appear first',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'message_before_match',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Message before matching',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: 5, enabled: true }),
      description: '5 free boosts per month',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'priority_support',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Priority customer support',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'profile_verification_priority',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Fast-track verification',
      active: true
    },
    {
      tier: 'premium_plus',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Ad-free experience',
      active: true
    },

    // ==================== ELITE TIER ($49.99/month) ====================
    {
      tier: 'elite',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited swipes',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited likes',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: -1, enabled: true }),
      description: 'Unlimited super likes',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 0, enabled: true }),
      description: 'Unlimited rewinds',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'See who liked you',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'video_calls',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Video calls enabled',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: true, max_filters: -1 }),
      description: 'All advanced filters',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Read receipts enabled',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Incognito mode enabled',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'travel_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Travel mode (passport) enabled',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'priority_likes',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Your likes appear first',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'message_before_match',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Message before matching',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: -1, enabled: true }),
      description: 'Unlimited boosts',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'priority_support',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Priority customer support',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'profile_verification_priority',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Instant verification',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'exclusive_badges',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Exclusive Elite badges',
      active: true
    },
    {
      tier: 'elite',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Ad-free experience',
      active: true
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  // Revert to old tier structure
  await knex('subscription_features').del();

  await knex.raw(`
    ALTER TYPE subscription_features_tier_enum RENAME TO subscription_features_tier_enum_new;
  `);

  await knex.raw(`
    CREATE TYPE subscription_features_tier_enum AS ENUM ('free', 'basic', 'mid', 'ultra');
  `);

  await knex.raw(`
    ALTER TABLE subscription_features
    ALTER COLUMN tier TYPE subscription_features_tier_enum
    USING tier::text::subscription_features_tier_enum;
  `);

  await knex.raw(`
    DROP TYPE subscription_features_tier_enum_new;
  `);
}
