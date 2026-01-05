/**
 * Migration: Create Ad Revenue Tables
 * - Ad impressions tracking
 * - Ad clicks tracking
 * - Reward fulfillments
 * - User ad state (for frequency capping)
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Ad impressions table - tracks every ad shown
  await knex.schema.createTable('ad_impressions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.string('ad_unit_id', 100).notNullable();
    table.enum('ad_type', ['banner', 'interstitial', 'rewarded']).notNullable();
    table.enum('network', ['admob', 'facebook', 'unity', 'applovin', 'custom']).notNullable();
    table.string('placement', 100).notNullable();
    table.enum('platform', ['ios', 'android', 'web']).notNullable();
    table.timestamp('impression_time').notNullable().defaultTo(knex.fn.now());
    table.boolean('clicked').notNullable().defaultTo(false);
    table.timestamp('click_time');
    table.decimal('revenue', 10, 6); // Revenue in USD (can be fractions of cents)
    table.string('currency', 3).defaultTo('USD');
    table.jsonb('device_info').defaultTo('{}');
    table.string('session_id', 100);

    // Indexes for analytics
    table.index('ad_type');
    table.index('network');
    table.index('placement');
    table.index('platform');
    table.index('impression_time');
    table.index(['user_id', 'impression_time']);
    table.index(['ad_type', 'impression_time']);
  });

  // Ad clicks table - tracks ad clicks
  await knex.schema.createTable('ad_clicks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('impression_id')
      .notNullable()
      .references('id')
      .inTable('ad_impressions')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable();
    table.enum('ad_type', ['banner', 'interstitial', 'rewarded']).notNullable();
    table.timestamp('click_time').notNullable().defaultTo(knex.fn.now());
    table.string('destination_url', 1000);

    table.index('impression_id');
    table.index('user_id');
    table.index('click_time');
    table.index(['user_id', 'click_time']);
  });

  // Reward fulfillments table - tracks rewards earned from video ads
  await knex.schema.createTable('reward_fulfillments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.string('reward_id', 50).notNullable();
    table
      .enum('reward_type', ['coins', 'super_likes', 'boosts', 'rewinds', 'premium_trial'])
      .notNullable();
    table.integer('amount').notNullable();
    table.string('transaction_id', 100).notNullable().unique();
    table.uuid('impression_id').references('id').inTable('ad_impressions');
    table.boolean('video_watched').notNullable().defaultTo(false);
    table.integer('video_completion_percent').notNullable().defaultTo(0);
    table.timestamp('earned_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('claimed_at');
    table.timestamp('expires_at');
    table
      .enum('status', ['pending', 'claimed', 'expired', 'failed'])
      .notNullable()
      .defaultTo('pending');

    table.index('reward_type');
    table.index('status');
    table.index('earned_at');
    table.index(['user_id', 'reward_id', 'earned_at']);
  });

  // User ad state table - tracks frequency capping state per user
  await knex.schema.createTable('user_ad_states', (table) => {
    table.uuid('user_id').primary();
    table.timestamp('last_interstitial_time');
    table.integer('interstitials_shown_today').notNullable().defaultTo(0);
    table.integer('interstitials_shown_session').notNullable().defaultTo(0);
    table.timestamp('last_rewarded_time');
    table.integer('rewarded_views_today').notNullable().defaultTo(0);
    table.timestamp('last_purchase_time');
    table.integer('actions_this_session').notNullable().defaultTo(0);
    table.date('last_reset_date').notNullable().defaultTo(knex.fn.now());
    table.timestamp('ad_free_until'); // For temporary ad-free periods
    table.timestamps(true, true);
  });

  // Ad performance metrics table - aggregated metrics for dashboards
  await knex.schema.createTable('ad_performance_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.date('date').notNullable();
    table.integer('hour').notNullable().defaultTo(0); // 0-23 for hourly granularity
    table.enum('ad_type', ['banner', 'interstitial', 'rewarded']).notNullable();
    table.enum('network', ['admob', 'facebook', 'unity', 'applovin', 'custom']).notNullable();
    table.string('placement', 100).notNullable();
    table.enum('platform', ['ios', 'android', 'web']).notNullable();
    table.integer('impressions').notNullable().defaultTo(0);
    table.integer('clicks').notNullable().defaultTo(0);
    table.decimal('revenue', 12, 4).notNullable().defaultTo(0);
    table.decimal('ecpm', 10, 4).notNullable().defaultTo(0);
    table.decimal('fill_rate', 5, 2).notNullable().defaultTo(100);
    table.timestamps(true, true);

    table.unique(['date', 'hour', 'ad_type', 'network', 'placement', 'platform']);
    table.index('date');
    table.index(['date', 'hour']);
    table.index(['date', 'ad_type']);
    table.index(['date', 'network']);
  });

  // Reward analytics table - aggregated reward metrics
  await knex.schema.createTable('reward_analytics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.date('date').notNullable();
    table
      .enum('reward_type', ['coins', 'super_likes', 'boosts', 'rewinds', 'premium_trial'])
      .notNullable();
    table.integer('total_earned').notNullable().defaultTo(0);
    table.integer('total_claimed').notNullable().defaultTo(0);
    table.decimal('total_value', 12, 2).notNullable().defaultTo(0);
    table.integer('unique_users').notNullable().defaultTo(0);
    table.decimal('video_completion_rate', 5, 2).notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.unique(['date', 'reward_type']);
    table.index('date');
    table.index(['date', 'reward_type']);
  });

  // Ad configurations table - stores ad unit configurations
  await knex.schema.createTable('ad_configurations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.enum('ad_type', ['banner', 'interstitial', 'rewarded']).notNullable();
    table.enum('network', ['admob', 'facebook', 'unity', 'applovin', 'custom']).notNullable();
    table.enum('status', ['active', 'paused', 'disabled']).notNullable().defaultTo('active');
    table.string('ios_ad_unit_id', 200);
    table.string('android_ad_unit_id', 200);
    table.string('ios_test_id', 200);
    table.string('android_test_id', 200);
    table.decimal('floor_price', 10, 4);
    table.jsonb('targeting').defaultTo('{}');
    table.jsonb('frequency_cap').defaultTo('{}');
    table.timestamps(true, true);

    table.index('ad_type');
    table.index('network');
    table.index('status');
  });

  // Reward configurations table - stores reward settings
  await knex.schema.createTable('reward_configurations', (table) => {
    table.string('id', 50).primary();
    table
      .enum('type', ['coins', 'super_likes', 'boosts', 'rewinds', 'premium_trial'])
      .notNullable();
    table.integer('amount').notNullable();
    table.string('display_name', 100).notNullable();
    table.text('description');
    table.string('icon', 50).notNullable();
    table.integer('max_per_day').notNullable().defaultTo(5);
    table.integer('cooldown_hours').notNullable().defaultTo(0);
    table.boolean('enabled').notNullable().defaultTo(true);
    table.decimal('premium_multiplier', 3, 2).defaultTo(1.0);
    table.timestamp('expires_at');
    table.timestamps(true, true);

    table.index('type');
    table.index('enabled');
  });

  // Daily user reward counts table - tracks daily reward claims per user
  await knex.schema.createTable('user_daily_reward_counts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.string('reward_id', 50).notNullable();
    table.date('date').notNullable();
    table.integer('count').notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.unique(['user_id', 'reward_id', 'date']);
    table.index('user_id');
    table.index(['user_id', 'date']);
  });

  // Insert default reward configurations
  await knex('reward_configurations').insert([
    {
      id: 'coins',
      type: 'coins',
      amount: 10,
      display_name: '10 Coins',
      description: 'Watch a video to earn 10 free coins',
      icon: 'coin',
      max_per_day: 5,
      cooldown_hours: 0,
      enabled: true,
    },
    {
      id: 'super_likes',
      type: 'super_likes',
      amount: 1,
      display_name: 'Free Super Like',
      description: 'Watch a video to get a free Super Like',
      icon: 'star',
      max_per_day: 3,
      cooldown_hours: 4,
      enabled: true,
    },
    {
      id: 'boosts',
      type: 'boosts',
      amount: 1,
      display_name: '30-Minute Boost',
      description: 'Watch a video to boost your profile for 30 minutes',
      icon: 'rocket',
      max_per_day: 2,
      cooldown_hours: 6,
      enabled: true,
    },
    {
      id: 'rewinds',
      type: 'rewinds',
      amount: 1,
      display_name: 'Free Rewind',
      description: 'Watch a video to get a free Rewind',
      icon: 'undo',
      max_per_day: 3,
      cooldown_hours: 0,
      enabled: true,
    },
    {
      id: 'premium_trial',
      type: 'premium_trial',
      amount: 60,
      display_name: '1-Hour Premium',
      description: 'Watch a video to try Premium features for 1 hour',
      icon: 'crown',
      max_per_day: 1,
      cooldown_hours: 24,
      enabled: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_daily_reward_counts');
  await knex.schema.dropTableIfExists('reward_configurations');
  await knex.schema.dropTableIfExists('ad_configurations');
  await knex.schema.dropTableIfExists('reward_analytics');
  await knex.schema.dropTableIfExists('ad_performance_metrics');
  await knex.schema.dropTableIfExists('user_ad_states');
  await knex.schema.dropTableIfExists('reward_fulfillments');
  await knex.schema.dropTableIfExists('ad_clicks');
  await knex.schema.dropTableIfExists('ad_impressions');
}
