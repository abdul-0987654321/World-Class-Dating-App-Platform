import { Knex } from 'knex';

/**
 * Migration: Expand Subscription Tiers from 3 to 6
 *
 * This migration expands the subscription model to support 6 tiers:
 * - Free: $0/month - Basic features
 * - Basic: $9.99/month - Entry-level paid tier
 * - Plus: $14.99/month - Enhanced features
 * - Premium: $19.99/month - Full feature access
 * - Premium+: $29.99/month - Power user tier
 * - Elite: $49.99/month - VIP tier with exclusive features
 *
 * Also adds columns for:
 * - Multi-month billing (3-month, 6-month)
 * - Trial and grace period configuration
 * - Additional premium features (message_before_match, weekly_boosts, etc.)
 */

export async function up(knex: Knex): Promise<void> {
  // Add new columns to subscription_plans table
  await knex.schema.alterTable('subscription_plans', (table) => {
    // Multi-month pricing
    table.decimal('price_3_months', 10, 2).nullable();
    table.decimal('price_6_months', 10, 2).nullable();
    table.string('stripe_price_id_3_months', 100).nullable();
    table.string('stripe_price_id_6_months', 100).nullable();

    // Trial and grace period
    table.integer('trial_days').defaultTo(0);
    table.integer('grace_period_days').defaultTo(3);

    // Additional premium features
    table.boolean('message_before_match').defaultTo(false);
    table.integer('weekly_boosts').defaultTo(0);
    table.boolean('advanced_filters').defaultTo(false);
    table.boolean('unlimited_rewinds').defaultTo(false);
    table.boolean('profile_controls').defaultTo(false);
    table.boolean('vip_badge').defaultTo(false);
    table.boolean('priority_support').defaultTo(false);

    // Tier identifier for code mapping
    table.string('tier_code', 20).nullable();
  });

  // Delete existing plans (we'll re-insert with new structure)
  await knex('subscription_plans').del();

  // Insert the new 6-tier subscription model
  await knex('subscription_plans').insert([
    // Tier 1: Free
    {
      name: 'free',
      display_name: 'Free',
      tier_code: 'free',
      description: 'Get started with basic features',
      price_monthly: 0,
      price_yearly: 0,
      price_3_months: 0,
      price_6_months: 0,
      features: JSON.stringify([
        '50 daily swipes',
        '1 super like per day',
        'Basic matching algorithm',
        'Limited profile visibility',
      ]),
      daily_swipes: 50,
      daily_super_likes: 1,
      daily_boosts: 0,
      weekly_boosts: 0,
      unlimited_likes: false,
      see_who_likes_you: false,
      rewind_enabled: false,
      unlimited_rewinds: false,
      incognito_mode: false,
      passport_enabled: false,
      priority_likes: false,
      read_receipts: false,
      message_before_match: false,
      advanced_filters: false,
      profile_controls: false,
      vip_badge: false,
      priority_support: false,
      trial_days: 0,
      grace_period_days: 0,
      sort_order: 0,
    },
    // Tier 2: Basic ($9.99/month)
    {
      name: 'basic',
      display_name: 'Basic',
      tier_code: 'basic',
      description: 'Unlock unlimited swipes and see who likes you',
      price_monthly: 9.99,
      price_yearly: 95.88, // $7.99/month
      price_3_months: 26.97, // $8.99/month
      price_6_months: 47.94, // $7.99/month
      stripe_price_id_monthly: 'price_basic_monthly',
      stripe_price_id_yearly: 'price_basic_yearly',
      stripe_price_id_3_months: 'price_basic_3months',
      stripe_price_id_6_months: 'price_basic_6months',
      stripe_product_id: 'prod_basic',
      features: JSON.stringify([
        'Unlimited swipes',
        '5 super likes per day',
        'See who likes you',
        'Rewind last swipe',
        'No ads',
      ]),
      daily_swipes: 9999,
      daily_super_likes: 5,
      daily_boosts: 0,
      weekly_boosts: 0,
      unlimited_likes: true,
      see_who_likes_you: true,
      rewind_enabled: true,
      unlimited_rewinds: false,
      incognito_mode: false,
      passport_enabled: false,
      priority_likes: false,
      read_receipts: false,
      message_before_match: false,
      advanced_filters: false,
      profile_controls: false,
      vip_badge: false,
      priority_support: false,
      trial_days: 7,
      grace_period_days: 3,
      sort_order: 1,
    },
    // Tier 3: Plus ($14.99/month)
    {
      name: 'plus',
      display_name: 'Plus',
      tier_code: 'plus',
      description: 'Enhanced visibility and privacy features',
      price_monthly: 14.99,
      price_yearly: 143.88, // $11.99/month
      price_3_months: 40.47, // $13.49/month
      price_6_months: 71.94, // $11.99/month
      stripe_price_id_monthly: 'price_plus_monthly',
      stripe_price_id_yearly: 'price_plus_yearly',
      stripe_price_id_3_months: 'price_plus_3months',
      stripe_price_id_6_months: 'price_plus_6months',
      stripe_product_id: 'prod_plus',
      features: JSON.stringify([
        'Everything in Basic',
        '10 super likes per day',
        'Incognito mode',
        'Priority likes',
        'Read receipts',
        '1 free boost per month',
      ]),
      daily_swipes: 9999,
      daily_super_likes: 10,
      daily_boosts: 1,
      weekly_boosts: 0,
      unlimited_likes: true,
      see_who_likes_you: true,
      rewind_enabled: true,
      unlimited_rewinds: false,
      incognito_mode: true,
      passport_enabled: false,
      priority_likes: true,
      read_receipts: true,
      message_before_match: false,
      advanced_filters: false,
      profile_controls: false,
      vip_badge: false,
      priority_support: false,
      trial_days: 7,
      grace_period_days: 3,
      sort_order: 2,
    },
    // Tier 4: Premium ($19.99/month)
    {
      name: 'premium',
      display_name: 'Premium',
      tier_code: 'premium',
      description: 'Full feature access with Passport',
      price_monthly: 19.99,
      price_yearly: 191.88, // $15.99/month
      price_3_months: 53.97, // $17.99/month
      price_6_months: 95.94, // $15.99/month
      stripe_price_id_monthly: 'price_premium_monthly',
      stripe_price_id_yearly: 'price_premium_yearly',
      stripe_price_id_3_months: 'price_premium_3months',
      stripe_price_id_6_months: 'price_premium_6months',
      stripe_product_id: 'prod_premium',
      features: JSON.stringify([
        'Everything in Plus',
        'Unlimited super likes',
        'Passport - swipe anywhere',
        'Profile controls',
        'Advanced filters',
        '2 free boosts per month',
      ]),
      daily_swipes: 9999,
      daily_super_likes: 9999,
      daily_boosts: 2,
      weekly_boosts: 0,
      unlimited_likes: true,
      see_who_likes_you: true,
      rewind_enabled: true,
      unlimited_rewinds: true,
      incognito_mode: true,
      passport_enabled: true,
      priority_likes: true,
      read_receipts: true,
      message_before_match: false,
      advanced_filters: true,
      profile_controls: true,
      vip_badge: false,
      priority_support: false,
      trial_days: 14,
      grace_period_days: 3,
      sort_order: 3,
    },
    // Tier 5: Premium+ ($29.99/month)
    {
      name: 'premium_plus',
      display_name: 'Premium+',
      tier_code: 'premium_plus',
      description: 'Power user features with message before match',
      price_monthly: 29.99,
      price_yearly: 287.88, // $23.99/month
      price_3_months: 80.97, // $26.99/month
      price_6_months: 143.94, // $23.99/month
      stripe_price_id_monthly: 'price_premium_plus_monthly',
      stripe_price_id_yearly: 'price_premium_plus_yearly',
      stripe_price_id_3_months: 'price_premium_plus_3months',
      stripe_price_id_6_months: 'price_premium_plus_6months',
      stripe_product_id: 'prod_premium_plus',
      features: JSON.stringify([
        'Everything in Premium',
        'Message before matching',
        '1 weekly boost',
        'Unlimited rewinds',
        'See who viewed your profile',
        'Priority customer support',
      ]),
      daily_swipes: 9999,
      daily_super_likes: 9999,
      daily_boosts: 4,
      weekly_boosts: 1,
      unlimited_likes: true,
      see_who_likes_you: true,
      rewind_enabled: true,
      unlimited_rewinds: true,
      incognito_mode: true,
      passport_enabled: true,
      priority_likes: true,
      read_receipts: true,
      message_before_match: true,
      advanced_filters: true,
      profile_controls: true,
      vip_badge: false,
      priority_support: true,
      trial_days: 14,
      grace_period_days: 3,
      sort_order: 4,
    },
    // Tier 6: Elite ($49.99/month)
    {
      name: 'elite',
      display_name: 'Elite',
      tier_code: 'elite',
      description: 'The ultimate VIP dating experience',
      price_monthly: 49.99,
      price_yearly: 479.88, // $39.99/month
      price_3_months: 134.97, // $44.99/month
      price_6_months: 239.94, // $39.99/month
      stripe_price_id_monthly: 'price_elite_monthly',
      stripe_price_id_yearly: 'price_elite_yearly',
      stripe_price_id_3_months: 'price_elite_3months',
      stripe_price_id_6_months: 'price_elite_6months',
      stripe_product_id: 'prod_elite',
      features: JSON.stringify([
        'Everything in Premium+',
        'VIP badge on profile',
        '3 weekly boosts',
        'Exclusive Elite matches',
        'Dedicated account manager',
        '24/7 priority support',
        'Early access to new features',
      ]),
      daily_swipes: 9999,
      daily_super_likes: 9999,
      daily_boosts: 12,
      weekly_boosts: 3,
      unlimited_likes: true,
      see_who_likes_you: true,
      rewind_enabled: true,
      unlimited_rewinds: true,
      incognito_mode: true,
      passport_enabled: true,
      priority_likes: true,
      read_receipts: true,
      message_before_match: true,
      advanced_filters: true,
      profile_controls: true,
      vip_badge: true,
      priority_support: true,
      trial_days: 14,
      grace_period_days: 3,
      sort_order: 5,
    },
  ]);

  // Add billing_cycle options to user_subscriptions
  await knex.schema.alterTable('user_subscriptions', (table) => {
    // Drop the existing enum constraint and recreate with new values
    // Note: This approach works for PostgreSQL
  });

  // Use raw SQL to alter the enum type for billing_cycle
  await knex.raw(`
    ALTER TABLE user_subscriptions
    DROP CONSTRAINT IF EXISTS user_subscriptions_billing_cycle_check;
  `);

  await knex.raw(`
    ALTER TABLE user_subscriptions
    ADD CONSTRAINT user_subscriptions_billing_cycle_check
    CHECK (billing_cycle IN ('monthly', '3_months', '6_months', 'yearly'));
  `);

  // Add grace_period_end column to user_subscriptions
  await knex.schema.alterTable('user_subscriptions', (table) => {
    table.timestamp('grace_period_end').nullable();
  });

  // Create webhook_events table for Paystack and Flutterwave (stubs)
  await knex.schema.createTable('paystack_webhook_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('paystack_event_id', 100).unique().notNullable();
    table.string('event_type', 100).notNullable();
    table.jsonb('payload').notNullable();
    table
      .enum('status', ['pending', 'processed', 'failed', 'permanently_failed'])
      .defaultTo('pending');
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('processed_at');
    table.timestamps(true, true);

    table.index('paystack_event_id');
    table.index('event_type');
    table.index('status');
  });

  await knex.schema.createTable('flutterwave_webhook_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('flutterwave_event_id', 100).unique().notNullable();
    table.string('event_type', 100).notNullable();
    table.jsonb('payload').notNullable();
    table
      .enum('status', ['pending', 'processed', 'failed', 'permanently_failed'])
      .defaultTo('pending');
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('processed_at');
    table.timestamps(true, true);

    table.index('flutterwave_event_id');
    table.index('event_type');
    table.index('status');
  });

  // Add payment_provider column to transactions table
  await knex.schema.alterTable('transactions', (table) => {
    table.enum('payment_provider', ['stripe', 'paystack', 'flutterwave']).defaultTo('stripe');
    table.string('external_transaction_id', 100).nullable(); // For Paystack/Flutterwave transaction IDs
  });

  // Add index for external_transaction_id
  await knex.schema.alterTable('transactions', (table) => {
    table.index('external_transaction_id');
    table.index('payment_provider');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove indexes first
  await knex.schema.alterTable('transactions', (table) => {
    table.dropIndex('external_transaction_id');
    table.dropIndex('payment_provider');
  });

  // Remove columns from transactions
  await knex.schema.alterTable('transactions', (table) => {
    table.dropColumn('payment_provider');
    table.dropColumn('external_transaction_id');
  });

  // Drop Paystack and Flutterwave webhook tables
  await knex.schema.dropTableIfExists('flutterwave_webhook_events');
  await knex.schema.dropTableIfExists('paystack_webhook_events');

  // Remove grace_period_end from user_subscriptions
  await knex.schema.alterTable('user_subscriptions', (table) => {
    table.dropColumn('grace_period_end');
  });

  // Revert billing_cycle enum
  await knex.raw(`
    ALTER TABLE user_subscriptions
    DROP CONSTRAINT IF EXISTS user_subscriptions_billing_cycle_check;
  `);

  await knex.raw(`
    ALTER TABLE user_subscriptions
    ADD CONSTRAINT user_subscriptions_billing_cycle_check
    CHECK (billing_cycle IN ('monthly', 'yearly'));
  `);

  // Delete new plans and restore original 3-tier model
  await knex('subscription_plans').del();

  // Restore original plans
  await knex('subscription_plans').insert([
    {
      name: 'free',
      display_name: 'Free',
      description: 'Basic features to get started',
      price_monthly: 0,
      price_yearly: 0,
      features: JSON.stringify(['50 daily swipes', '1 super like per day', 'Basic matching']),
      daily_swipes: 50,
      daily_super_likes: 1,
      daily_boosts: 0,
      unlimited_likes: false,
      see_who_likes_you: false,
      rewind_enabled: false,
      incognito_mode: false,
      passport_enabled: false,
      priority_likes: false,
      read_receipts: false,
      sort_order: 0,
    },
    {
      name: 'premium',
      display_name: 'Premium',
      description: 'Unlock more features and get more matches',
      price_monthly: 14.99,
      price_yearly: 119.99,
      features: JSON.stringify([
        'Unlimited swipes',
        '5 super likes per day',
        '1 boost per month',
        'See who likes you',
        'Rewind last swipe',
        'Priority likes',
      ]),
      daily_swipes: 999,
      daily_super_likes: 5,
      daily_boosts: 1,
      unlimited_likes: true,
      see_who_likes_you: true,
      rewind_enabled: true,
      incognito_mode: false,
      passport_enabled: false,
      priority_likes: true,
      read_receipts: false,
      sort_order: 1,
    },
    {
      name: 'premium_plus',
      display_name: 'Premium+',
      description: 'The ultimate dating experience',
      price_monthly: 29.99,
      price_yearly: 239.99,
      features: JSON.stringify([
        'Everything in Premium',
        'Unlimited super likes',
        '5 boosts per month',
        'Incognito mode',
        'Passport (swipe anywhere)',
        'Read receipts',
        'Priority customer support',
      ]),
      daily_swipes: 999,
      daily_super_likes: 999,
      daily_boosts: 5,
      unlimited_likes: true,
      see_who_likes_you: true,
      rewind_enabled: true,
      incognito_mode: true,
      passport_enabled: true,
      priority_likes: true,
      read_receipts: true,
      sort_order: 2,
    },
  ]);

  // Remove new columns from subscription_plans
  await knex.schema.alterTable('subscription_plans', (table) => {
    table.dropColumn('price_3_months');
    table.dropColumn('price_6_months');
    table.dropColumn('stripe_price_id_3_months');
    table.dropColumn('stripe_price_id_6_months');
    table.dropColumn('trial_days');
    table.dropColumn('grace_period_days');
    table.dropColumn('message_before_match');
    table.dropColumn('weekly_boosts');
    table.dropColumn('advanced_filters');
    table.dropColumn('unlimited_rewinds');
    table.dropColumn('profile_controls');
    table.dropColumn('vip_badge');
    table.dropColumn('priority_support');
    table.dropColumn('tier_code');
  });
}
