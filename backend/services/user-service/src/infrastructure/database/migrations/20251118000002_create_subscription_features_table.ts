import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('subscription_features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('tier', ['free', 'basic', 'plus', 'premium', 'premium_plus', 'elite']).notNullable();
    table.string('feature_key', 100).notNullable();
    table.jsonb('feature_value').notNullable();
    table.text('description').nullable();
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('tier');
    table.index('feature_key');

    // Unique constraint: one feature per tier
    table.unique(['tier', 'feature_key']);
  });

  // Seed default feature configurations
  await knex('subscription_features').insert([
    // FREE TIER
    {
      tier: 'free',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: 50 }),
      description: 'Maximum swipes per day'
    },
    {
      tier: 'free',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: 50 }),
      description: 'Maximum likes per day'
    },
    {
      tier: 'free',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: 1 }),
      description: 'Maximum super likes per day'
    },
    {
      tier: 'free',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 24 }),
      description: 'Cooldown between rewinds in hours'
    },
    {
      tier: 'free',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'Can see who liked them'
    },
    {
      tier: 'free',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'Access to advanced filters'
    },
    {
      tier: 'free',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'Can see read receipts'
    },
    {
      tier: 'free',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'Can browse in incognito mode'
    },
    {
      tier: 'free',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'Ad-free experience'
    },

    // BASIC TIER ($9.99-14.99/month)
    {
      tier: 'basic',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited swipes'
    },
    {
      tier: 'basic',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited likes'
    },
    {
      tier: 'basic',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: 5 }),
      description: '5 super likes per day'
    },
    {
      tier: 'basic',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 0 }),
      description: 'Unlimited rewinds'
    },
    {
      tier: 'basic',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can see who liked them'
    },
    {
      tier: 'basic',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: true, max_filters: 7 }),
      description: 'Access to 7 advanced filters'
    },
    {
      tier: 'basic',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can see read receipts'
    },
    {
      tier: 'basic',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: 1 }),
      description: '1 free boost per month'
    },
    {
      tier: 'basic',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Ad-free experience'
    },
    {
      tier: 'basic',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: false }),
      description: 'Incognito mode not available'
    },

    // MID TIER ($19.99-29.99/month)
    {
      tier: 'mid',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited swipes'
    },
    {
      tier: 'mid',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited likes'
    },
    {
      tier: 'mid',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited super likes'
    },
    {
      tier: 'mid',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 0 }),
      description: 'Unlimited rewinds'
    },
    {
      tier: 'mid',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can see who liked them'
    },
    {
      tier: 'mid',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: true, max_filters: -1 }),
      description: 'All advanced filters'
    },
    {
      tier: 'mid',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can see read receipts'
    },
    {
      tier: 'mid',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can browse in incognito mode'
    },
    {
      tier: 'mid',
      feature_key: 'priority_likes',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Likes appear first to others'
    },
    {
      tier: 'mid',
      feature_key: 'message_before_match',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can message before matching'
    },
    {
      tier: 'mid',
      feature_key: 'travel_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can change location'
    },
    {
      tier: 'mid',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: 3 }),
      description: '3 free boosts per month'
    },
    {
      tier: 'mid',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Ad-free experience'
    },

    // ULTRA TIER ($39.99-59.99/month)
    {
      tier: 'ultra',
      feature_key: 'daily_swipes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited swipes'
    },
    {
      tier: 'ultra',
      feature_key: 'daily_likes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited likes'
    },
    {
      tier: 'ultra',
      feature_key: 'daily_super_likes_limit',
      feature_value: JSON.stringify({ limit: -1 }),
      description: 'Unlimited super likes'
    },
    {
      tier: 'ultra',
      feature_key: 'rewind_cooldown_hours',
      feature_value: JSON.stringify({ hours: 0 }),
      description: 'Unlimited rewinds'
    },
    {
      tier: 'ultra',
      feature_key: 'see_who_liked_you',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can see who liked them'
    },
    {
      tier: 'ultra',
      feature_key: 'advanced_filters',
      feature_value: JSON.stringify({ enabled: true, max_filters: -1 }),
      description: 'All advanced filters'
    },
    {
      tier: 'ultra',
      feature_key: 'read_receipts',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can see read receipts'
    },
    {
      tier: 'ultra',
      feature_key: 'incognito_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can browse in incognito mode'
    },
    {
      tier: 'ultra',
      feature_key: 'priority_likes',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Likes appear first to others'
    },
    {
      tier: 'ultra',
      feature_key: 'message_before_match',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can message before matching'
    },
    {
      tier: 'ultra',
      feature_key: 'travel_mode',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Can change location'
    },
    {
      tier: 'ultra',
      feature_key: 'monthly_boosts',
      feature_value: JSON.stringify({ count: -1 }),
      description: 'Unlimited boosts'
    },
    {
      tier: 'ultra',
      feature_key: 'priority_support',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Priority customer support'
    },
    {
      tier: 'ultra',
      feature_key: 'profile_verification_priority',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Priority verification'
    },
    {
      tier: 'ultra',
      feature_key: 'exclusive_badges',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Exclusive profile badges'
    },
    {
      tier: 'ultra',
      feature_key: 'ad_free',
      feature_value: JSON.stringify({ enabled: true }),
      description: 'Ad-free experience'
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('subscription_features');
}
