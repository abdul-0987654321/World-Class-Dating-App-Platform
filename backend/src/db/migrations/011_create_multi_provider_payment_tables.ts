import { Knex } from 'knex';

/**
 * Migration: Multi-Provider Payment System
 *
 * This migration extends the payment system to support multiple payment providers:
 * - Stripe (primary)
 * - PayPal
 * - Flutterwave (Africa)
 * - Paystack (Africa)
 * - Apple IAP (iOS)
 * - Google Play Billing (Android)
 */
export async function up(knex: Knex): Promise<void> {
  // Create payment_providers enum type
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE payment_provider AS ENUM (
        'stripe', 'paypal', 'flutterwave', 'paystack', 'apple_iap', 'google_play'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create payment_method_type enum
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE payment_method_type AS ENUM (
        'card', 'bank_transfer', 'mobile_money', 'ussd', 'paypal_wallet',
        'venmo', 'apple_pay', 'google_pay', 'iap'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create transaction_type enum
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE transaction_type_v2 AS ENUM (
        'subscription', 'coin_purchase', 'boost_purchase', 'super_like_purchase',
        'gift_purchase', 'refund', 'chargeback', 'payout'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create subscription_status enum
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE subscription_status AS ENUM (
        'active', 'cancelled', 'past_due', 'paused', 'expired', 'trialing'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Payment Customers - Links users to provider customer IDs
  await knex.schema.createTable('payment_customers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.specificType('provider', 'payment_provider').notNullable();
    table.string('provider_customer_id').notNullable();
    table.string('email');
    table.string('name');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.unique(['user_id', 'provider']);
    table.unique(['provider', 'provider_customer_id']);
    table.index('user_id');
    table.index('provider');
  });

  // Payment Methods - Stored payment methods per provider
  await knex.schema.createTable('payment_methods', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('payment_customer_id').notNullable().references('id').inTable('payment_customers').onDelete('CASCADE');
    table.specificType('provider', 'payment_provider').notNullable();
    table.string('provider_payment_method_id').notNullable();
    table.specificType('type', 'payment_method_type').notNullable();
    table.boolean('is_default').defaultTo(false);

    // Card details (if applicable)
    table.string('card_brand');
    table.string('card_last4');
    table.integer('card_exp_month');
    table.integer('card_exp_year');

    // Bank/Mobile money details (if applicable)
    table.string('bank_name');
    table.string('account_last4');
    table.string('mobile_number_last4');
    table.string('mobile_network');

    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.unique(['provider', 'provider_payment_method_id']);
    table.index('user_id');
    table.index('payment_customer_id');
    table.index(['user_id', 'is_default']);
  });

  // User Subscriptions - Enhanced with multi-provider support
  await knex.schema.createTable('user_subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.specificType('provider', 'payment_provider').notNullable();
    table.string('provider_subscription_id').notNullable();
    table.string('plan_id').notNullable();
    table.string('plan_name');
    table.specificType('status', 'subscription_status').defaultTo('active');

    // Subscription period
    table.timestamp('current_period_start');
    table.timestamp('current_period_end');
    table.timestamp('trial_start');
    table.timestamp('trial_end');

    // Cancellation
    table.boolean('cancel_at_period_end').defaultTo(false);
    table.timestamp('canceled_at');
    table.string('cancellation_reason');

    // Billing
    table.integer('amount'); // in smallest currency unit
    table.string('currency').defaultTo('USD');
    table.string('interval'); // month, year
    table.integer('interval_count').defaultTo(1);

    // IAP specific
    table.string('original_transaction_id'); // For Apple/Google
    table.string('purchase_token'); // For Google Play
    table.string('environment'); // sandbox, production

    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.unique(['provider', 'provider_subscription_id']);
    table.index('user_id');
    table.index('status');
    table.index('current_period_end');
    table.index(['user_id', 'status']);
  });

  // Transactions V2 - Enhanced transaction tracking
  await knex.schema.createTable('payment_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.specificType('provider', 'payment_provider').notNullable();
    table.string('provider_transaction_id').notNullable();
    table.specificType('type', 'transaction_type_v2').notNullable();

    // Amount
    table.integer('amount').notNullable(); // in smallest currency unit
    table.integer('amount_refunded').defaultTo(0);
    table.string('currency').defaultTo('USD');
    table.decimal('exchange_rate', 10, 6); // If converted from local currency
    table.string('original_currency'); // Original currency if converted
    table.integer('original_amount'); // Original amount if converted

    // Status
    table.enum('status', ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'disputed']).defaultTo('pending');
    table.string('failure_reason');
    table.string('failure_code');

    // References
    table.uuid('subscription_id').references('id').inTable('user_subscriptions').onDelete('SET NULL');
    table.string('product_id'); // coin package, boost package, etc.
    table.uuid('related_transaction_id'); // For refunds, link to original

    // Payment method
    table.uuid('payment_method_id').references('id').inTable('payment_methods').onDelete('SET NULL');
    table.specificType('payment_method_type', 'payment_method_type');

    // Additional data
    table.text('description');
    table.jsonb('metadata').defaultTo('{}');
    table.jsonb('provider_response').defaultTo('{}'); // Store raw provider response

    // Timestamps
    table.timestamp('completed_at');
    table.timestamp('refunded_at');
    table.timestamps(true, true);

    table.unique(['provider', 'provider_transaction_id']);
    table.index('user_id');
    table.index('status');
    table.index('type');
    table.index('created_at');
    table.index(['user_id', 'type']);
    table.index(['provider', 'status']);
  });

  // User Wallets - Coin/gem balance
  await knex.schema.createTable('user_wallets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.integer('coins').defaultTo(0);
    table.integer('gems').defaultTo(0); // Premium currency
    table.integer('bonus_coins').defaultTo(0); // Non-withdrawable promotional coins
    table.timestamps(true, true);
  });

  // Wallet Transactions - Detailed coin/gem transactions
  await knex.schema.createTable('wallet_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('wallet_id').notNullable().references('id').inTable('user_wallets').onDelete('CASCADE');

    table.enum('currency_type', ['coins', 'gems', 'bonus_coins']).notNullable();
    table.enum('type', [
      'purchase', 'spend', 'refund', 'bonus', 'gift_received', 'gift_sent',
      'daily_reward', 'achievement_reward', 'referral_reward', 'admin_adjustment',
      'expiration', 'transfer_in', 'transfer_out'
    ]).notNullable();
    table.integer('amount').notNullable(); // Positive for credit, negative for debit
    table.integer('balance_after').notNullable();

    table.text('description');
    table.string('reference_id'); // Payment transaction ID or other reference
    table.string('reference_type'); // payment, boost, super_like, gift, etc.

    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('wallet_id');
    table.index('type');
    table.index('created_at');
    table.index('reference_id');
  });

  // Webhook Events - Idempotency tracking
  await knex.schema.createTable('webhook_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.specificType('provider', 'payment_provider').notNullable();
    table.string('event_id').notNullable();
    table.string('event_type').notNullable();
    table.jsonb('payload').notNullable();

    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
    table.text('error');
    table.integer('retry_count').defaultTo(0);

    table.timestamp('processed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['provider', 'event_id']);
    table.index('status');
    table.index('created_at');
    table.index(['provider', 'status']);
  });

  // IAP Receipts - Store validated IAP receipts
  await knex.schema.createTable('iap_receipts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.specificType('provider', 'payment_provider').notNullable(); // apple_iap or google_play

    // Apple specific
    table.text('receipt_data'); // Base64 encoded receipt
    table.string('original_transaction_id');
    table.string('bundle_id');

    // Google specific
    table.string('purchase_token');
    table.string('package_name');
    table.string('order_id');

    // Common
    table.string('product_id').notNullable();
    table.string('transaction_id');
    table.enum('product_type', ['consumable', 'non_consumable', 'subscription']).notNullable();

    table.boolean('is_valid').defaultTo(false);
    table.boolean('is_acknowledged').defaultTo(false);
    table.string('environment'); // sandbox, production

    table.timestamp('purchase_date');
    table.timestamp('expires_date'); // For subscriptions
    table.timestamp('validated_at');

    table.jsonb('validation_response').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('user_id');
    table.index(['provider', 'original_transaction_id']);
    table.index(['provider', 'purchase_token']);
    table.index('product_id');
    table.index(['user_id', 'product_type']);
  });

  // Products - Catalog of purchasable items
  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('sku').notNullable().unique();
    table.string('name').notNullable();
    table.text('description');
    table.enum('type', ['subscription', 'coins', 'boost', 'super_like', 'gift', 'other']).notNullable();

    // Pricing
    table.integer('price').notNullable(); // in cents
    table.string('currency').defaultTo('USD');
    table.integer('coin_amount'); // For coin packages
    table.integer('boost_count'); // For boost packages
    table.integer('boost_duration_minutes'); // Boost duration

    // Provider product IDs
    table.string('stripe_price_id');
    table.string('paypal_plan_id');
    table.string('apple_product_id');
    table.string('google_product_id');
    table.string('flutterwave_plan_id');
    table.string('paystack_plan_code');

    // Status
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_featured').defaultTo(false);
    table.integer('sort_order').defaultTo(0);

    // Regional pricing
    table.jsonb('regional_prices').defaultTo('{}'); // { "NG": { "amount": 5000, "currency": "NGN" } }

    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('type');
    table.index('is_active');
    table.index(['type', 'is_active']);
  });

  // Subscription Plans - Detailed plan info
  await knex.schema.createTable('subscription_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('slug').notNullable().unique(); // free, gold, platinum, diamond
    table.string('name').notNullable();
    table.text('description');

    // Pricing
    table.integer('monthly_price'); // in cents
    table.integer('yearly_price'); // in cents (discounted)
    table.string('currency').defaultTo('USD');

    // Trial
    table.integer('trial_days').defaultTo(0);

    // Features
    table.jsonb('features').defaultTo('[]'); // Array of feature strings
    table.integer('daily_likes').defaultTo(50);
    table.integer('daily_super_likes').defaultTo(0);
    table.integer('daily_boosts').defaultTo(0);
    table.integer('rewind_count').defaultTo(0);
    table.boolean('see_who_likes_you').defaultTo(false);
    table.boolean('read_receipts').defaultTo(false);
    table.boolean('priority_likes').defaultTo(false);
    table.boolean('incognito_mode').defaultTo(false);
    table.boolean('advanced_filters').defaultTo(false);
    table.boolean('travel_mode').defaultTo(false);
    table.boolean('top_picks').defaultTo(false);
    table.boolean('spotlight').defaultTo(false);

    // Provider plan IDs
    table.string('stripe_monthly_price_id');
    table.string('stripe_yearly_price_id');
    table.string('paypal_monthly_plan_id');
    table.string('paypal_yearly_plan_id');
    table.string('apple_monthly_product_id');
    table.string('apple_yearly_product_id');
    table.string('google_monthly_product_id');
    table.string('google_yearly_product_id');

    // Status
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);

    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('slug');
    table.index('is_active');
  });

  // Payment Audit Log - For compliance and debugging
  await knex.schema.createTable('payment_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.specificType('provider', 'payment_provider');

    table.string('action').notNullable(); // create_customer, charge, refund, webhook_received, etc.
    table.string('entity_type'); // customer, subscription, transaction, etc.
    table.string('entity_id');

    table.jsonb('request_data').defaultTo('{}');
    table.jsonb('response_data').defaultTo('{}');
    table.boolean('success').defaultTo(true);
    table.text('error_message');

    table.string('ip_address');
    table.string('user_agent');

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('provider');
    table.index('action');
    table.index('created_at');
    table.index(['entity_type', 'entity_id']);
  });

  // Feature Flags for payment providers
  await knex.schema.createTable('payment_feature_flags', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key').notNullable().unique();
    table.boolean('enabled').defaultTo(false);
    table.text('description');

    // Targeting
    table.specificType('countries', 'text[]').defaultTo('{}'); // Enable for specific countries
    table.specificType('excluded_countries', 'text[]').defaultTo('{}');
    table.integer('percentage_rollout').defaultTo(100); // 0-100

    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('key');
    table.index('enabled');
  });

  // Insert default feature flags
  await knex('payment_feature_flags').insert([
    {
      key: 'stripe_enabled',
      enabled: true,
      description: 'Enable Stripe payment provider',
      countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'ES', 'IT'],
    },
    {
      key: 'paypal_enabled',
      enabled: true,
      description: 'Enable PayPal payment provider',
      countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'ES', 'IT'],
    },
    {
      key: 'flutterwave_enabled',
      enabled: true,
      description: 'Enable Flutterwave payment provider (Africa)',
      countries: ['NG', 'GH', 'KE', 'UG', 'TZ', 'ZA', 'RW'],
    },
    {
      key: 'paystack_enabled',
      enabled: true,
      description: 'Enable Paystack payment provider (Africa)',
      countries: ['NG', 'GH', 'ZA', 'KE'],
    },
    {
      key: 'apple_iap_enabled',
      enabled: true,
      description: 'Enable Apple In-App Purchases',
    },
    {
      key: 'google_play_enabled',
      enabled: true,
      description: 'Enable Google Play Billing',
    },
  ]);

  // Insert default subscription plans
  await knex('subscription_plans').insert([
    {
      slug: 'free',
      name: 'Free',
      description: 'Basic features to get started',
      monthly_price: 0,
      yearly_price: 0,
      trial_days: 0,
      features: JSON.stringify([
        'Limited daily likes',
        'Basic matching',
        'Send messages to matches',
      ]),
      daily_likes: 50,
      daily_super_likes: 0,
      daily_boosts: 0,
      is_active: true,
      sort_order: 0,
    },
    {
      slug: 'gold',
      name: 'Gold',
      description: 'Unlock more features and increase your chances',
      monthly_price: 1499, // $14.99
      yearly_price: 9999, // $99.99
      trial_days: 7,
      features: JSON.stringify([
        'Unlimited likes',
        '5 Super Likes per day',
        '1 Boost per month',
        'See who likes you',
        'Rewind last swipe',
        'No ads',
      ]),
      daily_likes: -1, // Unlimited
      daily_super_likes: 5,
      daily_boosts: 0,
      rewind_count: -1,
      see_who_likes_you: true,
      is_active: true,
      sort_order: 1,
    },
    {
      slug: 'platinum',
      name: 'Platinum',
      description: 'Premium features for serious daters',
      monthly_price: 2499, // $24.99
      yearly_price: 14999, // $149.99
      trial_days: 7,
      features: JSON.stringify([
        'Everything in Gold',
        'Unlimited Super Likes',
        '1 Boost per week',
        'Message before matching',
        'Priority likes',
        'Read receipts',
        'Advanced filters',
      ]),
      daily_likes: -1,
      daily_super_likes: -1,
      daily_boosts: 0,
      rewind_count: -1,
      see_who_likes_you: true,
      read_receipts: true,
      priority_likes: true,
      advanced_filters: true,
      is_active: true,
      sort_order: 2,
    },
    {
      slug: 'diamond',
      name: 'Diamond',
      description: 'The ultimate dating experience',
      monthly_price: 3999, // $39.99
      yearly_price: 23999, // $239.99
      trial_days: 14,
      features: JSON.stringify([
        'Everything in Platinum',
        '5 Boosts per week',
        'Incognito mode',
        'Travel mode',
        'Top picks',
        'Spotlight feature',
        'Priority support',
      ]),
      daily_likes: -1,
      daily_super_likes: -1,
      daily_boosts: 1,
      rewind_count: -1,
      see_who_likes_you: true,
      read_receipts: true,
      priority_likes: true,
      advanced_filters: true,
      incognito_mode: true,
      travel_mode: true,
      top_picks: true,
      spotlight: true,
      is_active: true,
      sort_order: 3,
    },
  ]);

  // Insert default coin packages
  await knex('products').insert([
    {
      sku: 'coins_100',
      name: '100 Coins',
      type: 'coins',
      price: 499, // $4.99
      coin_amount: 100,
      is_active: true,
      sort_order: 0,
    },
    {
      sku: 'coins_500',
      name: '500 Coins',
      description: 'Best value!',
      type: 'coins',
      price: 1999, // $19.99 (save 20%)
      coin_amount: 500,
      is_active: true,
      is_featured: true,
      sort_order: 1,
    },
    {
      sku: 'coins_1000',
      name: '1000 Coins',
      type: 'coins',
      price: 3499, // $34.99 (save 30%)
      coin_amount: 1000,
      is_active: true,
      sort_order: 2,
    },
    {
      sku: 'boost_1',
      name: '1 Boost',
      description: 'Get seen by more people for 30 minutes',
      type: 'boost',
      price: 599, // $5.99
      boost_count: 1,
      boost_duration_minutes: 30,
      is_active: true,
      sort_order: 0,
    },
    {
      sku: 'boost_5',
      name: '5 Boosts',
      description: 'Save 15%',
      type: 'boost',
      price: 2499, // $24.99
      boost_count: 5,
      boost_duration_minutes: 30,
      is_active: true,
      is_featured: true,
      sort_order: 1,
    },
    {
      sku: 'super_like_5',
      name: '5 Super Likes',
      type: 'super_like',
      price: 499, // $4.99
      is_active: true,
      sort_order: 0,
    },
    {
      sku: 'super_like_25',
      name: '25 Super Likes',
      description: 'Save 20%',
      type: 'super_like',
      price: 1999, // $19.99
      is_active: true,
      is_featured: true,
      sort_order: 1,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('payment_audit_log');
  await knex.schema.dropTableIfExists('payment_feature_flags');
  await knex.schema.dropTableIfExists('subscription_plans');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('iap_receipts');
  await knex.schema.dropTableIfExists('webhook_events');
  await knex.schema.dropTableIfExists('wallet_transactions');
  await knex.schema.dropTableIfExists('user_wallets');
  await knex.schema.dropTableIfExists('payment_transactions');
  await knex.schema.dropTableIfExists('user_subscriptions');
  await knex.schema.dropTableIfExists('payment_methods');
  await knex.schema.dropTableIfExists('payment_customers');

  // Drop enum types
  await knex.raw('DROP TYPE IF EXISTS subscription_status');
  await knex.raw('DROP TYPE IF EXISTS transaction_type_v2');
  await knex.raw('DROP TYPE IF EXISTS payment_method_type');
  await knex.raw('DROP TYPE IF EXISTS payment_provider');
}
