import { Knex } from 'knex';

/**
 * Migration: Create Entitlements Table
 * Description: Define feature entitlements per subscription tier
 */
export async function up(knex: Knex): Promise<void> {
  // Create entitlements table
  await knex.schema.createTable('entitlements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Subscription tier
    table.enum('tier', ['free', 'basic', 'mid', 'ultra']).notNullable();

    // Feature key (what feature this entitlement grants)
    table.string('feature_key', 100).notNullable();
    table.string('feature_name', 255).notNullable();
    table.text('description').nullable();

    // Value type and value
    table.enum('value_type', [
      'boolean',        // true/false
      'integer',        // numeric value
      'string',         // text value
      'unlimited',      // special type for unlimited access
      'quota'           // limited quantity
    ]).notNullable();

    table.string('value', 255).notNullable(); // Store as string, cast as needed

    // Category for grouping
    table.string('category', 50).nullable(); // 'matching', 'messaging', 'discovery', 'premium_features'

    // Metadata
    table.jsonb('metadata').defaultTo('{}');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('sort_order').defaultTo(0);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('tier');
    table.index('feature_key');
    table.index(['tier', 'feature_key']);
    table.index('category');
    table.index('is_active');

    // Unique constraint: One entitlement per tier per feature
    table.unique(['tier', 'feature_key']);
  });

  // Insert default entitlements for all tiers
  await knex('entitlements').insert([
    // FREE TIER
    // Matching features
    {
      tier: 'free',
      feature_key: 'daily_swipes',
      feature_name: 'Daily Swipes',
      description: 'Number of swipes allowed per day',
      value_type: 'integer',
      value: '50',
      category: 'matching',
      sort_order: 1,
    },
    {
      tier: 'free',
      feature_key: 'daily_super_likes',
      feature_name: 'Daily Super Likes',
      description: 'Number of super likes allowed per day',
      value_type: 'integer',
      value: '1',
      category: 'matching',
      sort_order: 2,
    },
    {
      tier: 'free',
      feature_key: 'monthly_boosts',
      feature_name: 'Monthly Boosts',
      description: 'Number of profile boosts per month',
      value_type: 'integer',
      value: '0',
      category: 'discovery',
      sort_order: 3,
    },
    {
      tier: 'free',
      feature_key: 'see_who_likes_you',
      feature_name: 'See Who Likes You',
      description: 'View users who have liked your profile',
      value_type: 'boolean',
      value: 'false',
      category: 'discovery',
      sort_order: 10,
    },
    {
      tier: 'free',
      feature_key: 'rewind',
      feature_name: 'Rewind',
      description: 'Undo last swipe',
      value_type: 'boolean',
      value: 'false',
      category: 'matching',
      sort_order: 11,
    },
    {
      tier: 'free',
      feature_key: 'video_call_minutes',
      feature_name: 'Video Call Minutes Per Day',
      description: 'Daily video call limit in minutes',
      value_type: 'integer',
      value: '30',
      category: 'messaging',
      sort_order: 20,
    },

    // BASIC TIER
    {
      tier: 'basic',
      feature_key: 'daily_swipes',
      feature_name: 'Daily Swipes',
      description: 'Unlimited swipes',
      value_type: 'unlimited',
      value: 'unlimited',
      category: 'matching',
      sort_order: 1,
    },
    {
      tier: 'basic',
      feature_key: 'daily_super_likes',
      feature_name: 'Daily Super Likes',
      description: 'Number of super likes allowed per day',
      value_type: 'integer',
      value: '5',
      category: 'matching',
      sort_order: 2,
    },
    {
      tier: 'basic',
      feature_key: 'monthly_boosts',
      feature_name: 'Monthly Boosts',
      description: 'Number of profile boosts per month',
      value_type: 'integer',
      value: '1',
      category: 'discovery',
      sort_order: 3,
    },
    {
      tier: 'basic',
      feature_key: 'see_who_likes_you',
      feature_name: 'See Who Likes You',
      description: 'View users who have liked your profile',
      value_type: 'boolean',
      value: 'true',
      category: 'discovery',
      sort_order: 10,
    },
    {
      tier: 'basic',
      feature_key: 'rewind',
      feature_name: 'Rewind',
      description: 'Undo last swipe',
      value_type: 'boolean',
      value: 'true',
      category: 'matching',
      sort_order: 11,
    },
    {
      tier: 'basic',
      feature_key: 'read_receipts',
      feature_name: 'Read Receipts',
      description: 'See when messages are read',
      value_type: 'boolean',
      value: 'false',
      category: 'messaging',
      sort_order: 15,
    },
    {
      tier: 'basic',
      feature_key: 'video_call_minutes',
      feature_name: 'Video Call Minutes Per Day',
      description: 'Unlimited video calls',
      value_type: 'unlimited',
      value: 'unlimited',
      category: 'messaging',
      sort_order: 20,
    },

    // MID TIER
    {
      tier: 'mid',
      feature_key: 'daily_swipes',
      feature_name: 'Daily Swipes',
      description: 'Unlimited swipes',
      value_type: 'unlimited',
      value: 'unlimited',
      category: 'matching',
      sort_order: 1,
    },
    {
      tier: 'mid',
      feature_key: 'daily_super_likes',
      feature_name: 'Daily Super Likes',
      description: 'Unlimited super likes',
      value_type: 'unlimited',
      value: 'unlimited',
      category: 'matching',
      sort_order: 2,
    },
    {
      tier: 'mid',
      feature_key: 'monthly_boosts',
      feature_name: 'Monthly Boosts',
      description: 'Number of profile boosts per month',
      value_type: 'integer',
      value: '3',
      category: 'discovery',
      sort_order: 3,
    },
    {
      tier: 'mid',
      feature_key: 'see_who_likes_you',
      feature_name: 'See Who Likes You',
      description: 'View users who have liked your profile',
      value_type: 'boolean',
      value: 'true',
      category: 'discovery',
      sort_order: 10,
    },
    {
      tier: 'mid',
      feature_key: 'rewind',
      feature_name: 'Rewind',
      description: 'Undo last swipe',
      value_type: 'boolean',
      value: 'true',
      category: 'matching',
      sort_order: 11,
    },
    {
      tier: 'mid',
      feature_key: 'unlimited_rewinds',
      feature_name: 'Unlimited Rewinds',
      description: 'Unlimited rewinds',
      value_type: 'boolean',
      value: 'true',
      category: 'matching',
      sort_order: 12,
    },
    {
      tier: 'mid',
      feature_key: 'advanced_filters',
      feature_name: 'Advanced Filters',
      description: 'Access to advanced search filters',
      value_type: 'boolean',
      value: 'true',
      category: 'discovery',
      sort_order: 13,
    },
    {
      tier: 'mid',
      feature_key: 'priority_likes',
      feature_name: 'Priority Likes',
      description: 'Your likes are shown first',
      value_type: 'boolean',
      value: 'true',
      category: 'matching',
      sort_order: 14,
    },
    {
      tier: 'mid',
      feature_key: 'read_receipts',
      feature_name: 'Read Receipts',
      description: 'See when messages are read',
      value_type: 'boolean',
      value: 'true',
      category: 'messaging',
      sort_order: 15,
    },
    {
      tier: 'mid',
      feature_key: 'video_call_minutes',
      feature_name: 'Video Call Minutes Per Day',
      description: 'Unlimited video calls',
      value_type: 'unlimited',
      value: 'unlimited',
      category: 'messaging',
      sort_order: 20,
    },
    {
      tier: 'mid',
      feature_key: 'hd_video_calls',
      feature_name: 'HD Video Calls',
      description: 'High definition video quality',
      value_type: 'boolean',
      value: 'true',
      category: 'messaging',
      sort_order: 21,
    },

    // ULTRA TIER
    {
      tier: 'ultra',
      feature_key: 'daily_swipes',
      feature_name: 'Daily Swipes',
      description: 'Unlimited swipes',
      value_type: 'unlimited',
      value: 'unlimited',
      category: 'matching',
      sort_order: 1,
    },
    {
      tier: 'ultra',
      feature_key: 'daily_super_likes',
      feature_name: 'Daily Super Likes',
      description: 'Unlimited super likes',
      value_type: 'unlimited',
      value: 'unlimited',
      category: 'matching',
      sort_order: 2,
    },
    {
      tier: 'ultra',
      feature_key: 'monthly_boosts',
      feature_name: 'Monthly Boosts',
      description: 'Number of profile boosts per month',
      value_type: 'integer',
      value: '5',
      category: 'discovery',
      sort_order: 3,
    },
    {
      tier: 'ultra',
      feature_key: 'see_who_likes_you',
      feature_name: 'See Who Likes You',
      description: 'View users who have liked your profile',
      value_type: 'boolean',
      value: 'true',
      category: 'discovery',
      sort_order: 10,
    },
    {
      tier: 'ultra',
      feature_key: 'rewind',
      feature_name: 'Rewind',
      description: 'Undo last swipe',
      value_type: 'boolean',
      value: 'true',
      category: 'matching',
      sort_order: 11,
    },
    {
      tier: 'ultra',
      feature_key: 'unlimited_rewinds',
      feature_name: 'Unlimited Rewinds',
      description: 'Unlimited rewinds',
      value_type: 'boolean',
      value: 'true',
      category: 'matching',
      sort_order: 12,
    },
    {
      tier: 'ultra',
      feature_key: 'advanced_filters',
      feature_name: 'Advanced Filters',
      description: 'Access to advanced search filters',
      value_type: 'boolean',
      value: 'true',
      category: 'discovery',
      sort_order: 13,
    },
    {
      tier: 'ultra',
      feature_key: 'priority_likes',
      feature_name: 'Priority Likes',
      description: 'Your likes are shown first',
      value_type: 'boolean',
      value: 'true',
      category: 'matching',
      sort_order: 14,
    },
    {
      tier: 'ultra',
      feature_key: 'read_receipts',
      feature_name: 'Read Receipts',
      description: 'See when messages are read',
      value_type: 'boolean',
      value: 'true',
      category: 'messaging',
      sort_order: 15,
    },
    {
      tier: 'ultra',
      feature_key: 'incognito_mode',
      feature_name: 'Incognito Mode',
      description: 'Browse profiles privately',
      value_type: 'boolean',
      value: 'true',
      category: 'premium_features',
      sort_order: 16,
    },
    {
      tier: 'ultra',
      feature_key: 'passport',
      feature_name: 'Passport',
      description: 'Swipe in any location worldwide',
      value_type: 'boolean',
      value: 'true',
      category: 'premium_features',
      sort_order: 17,
    },
    {
      tier: 'ultra',
      feature_key: 'video_call_minutes',
      feature_name: 'Video Call Minutes Per Day',
      description: 'Unlimited video calls',
      value_type: 'unlimited',
      value: 'unlimited',
      category: 'messaging',
      sort_order: 20,
    },
    {
      tier: 'ultra',
      feature_key: 'hd_video_calls',
      feature_name: 'HD Video Calls',
      description: 'High definition video quality',
      value_type: 'boolean',
      value: 'true',
      category: 'messaging',
      sort_order: 21,
    },
    {
      tier: 'ultra',
      feature_key: 'video_recording',
      feature_name: 'Video Call Recording',
      description: 'Record video calls',
      value_type: 'boolean',
      value: 'true',
      category: 'messaging',
      sort_order: 22,
    },
  ]);

  // Create helper function to check if user has entitlement
  await knex.raw(`
    CREATE OR REPLACE FUNCTION user_has_entitlement(
      p_user_id UUID,
      p_feature_key VARCHAR
    )
    RETURNS BOOLEAN AS $$
    DECLARE
      user_tier user_subscription_tier_enum;
      has_feature BOOLEAN;
    BEGIN
      -- Get user's subscription tier
      SELECT subscription_tier INTO user_tier
      FROM users
      WHERE id = p_user_id;

      -- Check if entitlement exists for this tier and feature
      SELECT EXISTS(
        SELECT 1
        FROM entitlements
        WHERE tier = user_tier::text::entitlements_tier_enum
          AND feature_key = p_feature_key
          AND is_active = true
          AND (
            value_type = 'boolean' AND value = 'true'
            OR value_type = 'unlimited'
            OR value_type IN ('integer', 'string', 'quota')
          )
      ) INTO has_feature;

      RETURN has_feature;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create helper function to get entitlement value
  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_entitlement_value(
      p_user_id UUID,
      p_feature_key VARCHAR
    )
    RETURNS VARCHAR AS $$
    DECLARE
      user_tier user_subscription_tier_enum;
      feature_value VARCHAR;
    BEGIN
      -- Get user's subscription tier
      SELECT subscription_tier INTO user_tier
      FROM users
      WHERE id = p_user_id;

      -- Get entitlement value
      SELECT value INTO feature_value
      FROM entitlements
      WHERE tier = user_tier::text::entitlements_tier_enum
        AND feature_key = p_feature_key
        AND is_active = true
      LIMIT 1;

      RETURN feature_value;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop helper functions
  await knex.raw('DROP FUNCTION IF EXISTS get_entitlement_value');
  await knex.raw('DROP FUNCTION IF EXISTS user_has_entitlement');

  // Drop table
  await knex.schema.dropTableIfExists('entitlements');
}
