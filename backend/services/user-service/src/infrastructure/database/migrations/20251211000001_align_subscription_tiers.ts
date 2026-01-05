import { Knex } from 'knex';

/**
 * Migration: Align subscription tiers between user-service and payment-service
 *
 * Payment service uses: free, basic, plus, premium, premium_plus, elite
 * User service was using: free, basic, mid, ultra
 *
 * This migration:
 * 1. Updates the tier enum to match payment service
 * 2. Migrates existing data from old tiers to new tiers
 * 3. Seeds features for all 6 tiers
 */

export async function up(knex: Knex): Promise<void> {
  // First, check if new tiers already exist
  const existingTable = await knex.schema.hasTable('subscription_features');
  if (!existingTable) {
    console.log('subscription_features table does not exist, skipping tier alignment');
    return;
  }

  // Create a temporary column for the new tier values
  await knex.schema.alterTable('subscription_features', (table) => {
    table.string('tier_new', 20).nullable();
  });

  // Map old tiers to new tiers
  // free -> free
  // basic -> basic
  // mid -> premium (mapping mid-tier features to premium)
  // ultra -> elite (mapping top-tier features to elite)
  await knex.raw(`
    UPDATE subscription_features SET tier_new =
      CASE tier
        WHEN 'free' THEN 'free'
        WHEN 'basic' THEN 'basic'
        WHEN 'mid' THEN 'premium'
        WHEN 'ultra' THEN 'elite'
        ELSE tier::text
      END
  `);

  // Drop the old column and constraint
  await knex.raw(
    `ALTER TABLE subscription_features DROP CONSTRAINT IF EXISTS subscription_features_tier_check`
  );

  // Update the tier column
  await knex.raw(`ALTER TABLE subscription_features ALTER COLUMN tier TYPE varchar(20)`);

  // Copy new tier values
  await knex.raw(`UPDATE subscription_features SET tier = tier_new`);

  // Drop temporary column
  await knex.schema.alterTable('subscription_features', (table) => {
    table.dropColumn('tier_new');
  });

  // Add check constraint for new tiers
  await knex.raw(`
    ALTER TABLE subscription_features
    ADD CONSTRAINT subscription_features_tier_check
    CHECK (tier IN ('free', 'basic', 'plus', 'premium', 'premium_plus', 'elite'))
  `);

  // Insert features for plus tier (between basic and premium)
  const plusFeatures = [
    {
      tier: 'plus',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited swipes',
    },
    {
      tier: 'plus',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited likes',
    },
    {
      tier: 'plus',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: 10 }),
      description: '10 super likes per day',
    },
    {
      tier: 'plus',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 0 }),
      description: 'Unlimited rewinds',
    },
    {
      tier: 'plus',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can see who liked them',
    },
    {
      tier: 'plus',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: true, max_filters: 10 }),
      description: 'Access to 10 advanced filters',
    },
    {
      tier: 'plus',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can see read receipts',
    },
    {
      tier: 'plus',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can browse in incognito mode',
    },
    {
      tier: 'plus',
      feature_key: 'priority_likes',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Likes appear first to others',
    },
    {
      tier: 'plus',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: 1 }),
      description: '1 free boost per month',
    },
    {
      tier: 'plus',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Ad-free experience',
    },
    {
      tier: 'plus',
      feature_key: 'message_before_match',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'Cannot message before matching',
    },
    {
      tier: 'plus',
      feature_key: 'travel_mode',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'Travel mode not available',
    },
  ];

  // Insert features for premium_plus tier (between premium and elite)
  const premiumPlusFeatures = [
    {
      tier: 'premium_plus',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited swipes',
    },
    {
      tier: 'premium_plus',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited likes',
    },
    {
      tier: 'premium_plus',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited super likes',
    },
    {
      tier: 'premium_plus',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 0 }),
      description: 'Unlimited rewinds',
    },
    {
      tier: 'premium_plus',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can see who liked them',
    },
    {
      tier: 'premium_plus',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: true, max_filters: -1 }),
      description: 'All advanced filters',
    },
    {
      tier: 'premium_plus',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can see read receipts',
    },
    {
      tier: 'premium_plus',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can browse in incognito mode',
    },
    {
      tier: 'premium_plus',
      feature_key: 'priority_likes',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Likes appear first to others',
    },
    {
      tier: 'premium_plus',
      feature_key: 'message_before_match',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can message before matching',
    },
    {
      tier: 'premium_plus',
      feature_key: 'travel_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can change location',
    },
    {
      tier: 'premium_plus',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: 5 }),
      description: '5 free boosts per month',
    },
    {
      tier: 'premium_plus',
      feature_key: 'priority_support',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Priority customer support',
    },
    {
      tier: 'premium_plus',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Ad-free experience',
    },
    {
      tier: 'premium_plus',
      feature_key: 'see_profile_visitors',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'See who viewed your profile',
    },
  ];

  // Insert new tier features (ignore conflicts)
  for (const feature of [...plusFeatures, ...premiumPlusFeatures]) {
    const exists = await knex('subscription_features')
      .where({ tier: feature.tier, feature_key: feature.feature_key })
      .first();

    if (!exists) {
      await knex('subscription_features').insert(feature);
    }
  }

  console.log(
    'Successfully aligned subscription tiers: free, basic, plus, premium, premium_plus, elite'
  );
}

export async function down(knex: Knex): Promise<void> {
  // Revert to old tier structure
  await knex.raw(
    `ALTER TABLE subscription_features DROP CONSTRAINT IF EXISTS subscription_features_tier_check`
  );

  // Delete features for new tiers
  await knex('subscription_features').whereIn('tier', ['plus', 'premium_plus']).delete();

  // Map back to old tiers
  await knex.raw(`
    UPDATE subscription_features SET tier =
      CASE tier
        WHEN 'premium' THEN 'mid'
        WHEN 'elite' THEN 'ultra'
        ELSE tier
      END
  `);

  // Add old check constraint
  await knex.raw(`
    ALTER TABLE subscription_features
    ADD CONSTRAINT subscription_features_tier_check
    CHECK (tier IN ('free', 'basic', 'mid', 'ultra'))
  `);
}
