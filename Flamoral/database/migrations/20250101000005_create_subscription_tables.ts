import { Knex } from 'knex';

/**
 * Migration: Create Subscription and Payment Tables
 * Description: Subscription plans, user subscriptions, and payment tracking
 */
export async function up(knex: Knex): Promise<void> {
  // Create subscription_plans table
  await knex.schema.createTable('subscription_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Plan identification
    table.string('name', 50).notNullable().unique(); // free, basic, mid, ultra
    table.enum('tier', ['free', 'basic', 'mid', 'ultra']).notNullable();
    table.string('display_name', 100).notNullable();
    table.text('description').nullable();

    // Pricing
    table.decimal('price_monthly', 10, 2).notNullable().defaultTo(0);
    table.decimal('price_yearly', 10, 2).nullable();
    table.decimal('price_3_months', 10, 2).nullable();
    table.decimal('price_6_months', 10, 2).nullable();

    // Stripe integration
    table.string('stripe_price_id_monthly', 100).nullable();
    table.string('stripe_price_id_yearly', 100).nullable();
    table.string('stripe_price_id_3_months', 100).nullable();
    table.string('stripe_price_id_6_months', 100).nullable();
    table.string('stripe_product_id', 100).nullable();

    // Features (JSONB array)
    table.jsonb('features').defaultTo('[]');

    // Swipe and like limits
    table.integer('daily_swipes').defaultTo(50);
    table.integer('daily_super_likes').defaultTo(1);
    table.integer('monthly_boosts').defaultTo(0);

    // Premium features (boolean flags)
    table.boolean('unlimited_likes').defaultTo(false);
    table.boolean('see_who_likes_you').defaultTo(false);
    table.boolean('rewind_enabled').defaultTo(false);
    table.boolean('incognito_mode').defaultTo(false);
    table.boolean('passport_enabled').defaultTo(false);
    table.boolean('priority_likes').defaultTo(false);
    table.boolean('read_receipts').defaultTo(false);
    table.boolean('advanced_filters').defaultTo(false);
    table.boolean('unlimited_rewinds').defaultTo(false);

    // Plan status
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('tier');
    table.index('is_active');
  });

  // Create subscriptions table
  await knex.schema.createTable('subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('plan_id').notNullable()
      .references('id').inTable('subscription_plans');

    // Subscription status
    table.enum('status', [
      'active',
      'canceled',
      'expired',
      'past_due',
      'trialing',
      'incomplete',
      'paused'
    ]).notNullable().defaultTo('active');

    // Billing cycle
    table.enum('billing_cycle', ['monthly', 'yearly', '3_months', '6_months'])
      .defaultTo('monthly');

    // Stripe integration
    table.string('stripe_subscription_id', 100).nullable().unique();
    table.string('stripe_customer_id', 100).nullable();
    table.string('stripe_price_id', 100).nullable();

    // Billing period
    table.timestamp('current_period_start').nullable();
    table.timestamp('current_period_end').nullable();

    // Cancellation
    table.boolean('cancel_at_period_end').defaultTo(false);
    table.timestamp('canceled_at').nullable();
    table.timestamp('cancel_at').nullable();

    // Trial period
    table.timestamp('trial_start').nullable();
    table.timestamp('trial_end').nullable();

    // Metadata
    table.jsonb('metadata').defaultTo('{}');

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('plan_id');
    table.index('status');
    table.index('stripe_subscription_id');
    table.index('stripe_customer_id');
    table.index('current_period_end');
  });

  // Create payment_methods table
  await knex.schema.createTable('payment_methods', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Stripe integration
    table.string('stripe_payment_method_id', 100).unique().notNullable();
    table.string('stripe_customer_id', 100).nullable();

    // Payment method type
    table.enum('type', ['card', 'bank_account', 'apple_pay', 'google_pay'])
      .notNullable();

    // Card details (if applicable)
    table.string('card_brand', 20).nullable();
    table.string('card_last4', 4).nullable();
    table.integer('card_exp_month').nullable();
    table.integer('card_exp_year').nullable();
    table.string('card_funding', 20).nullable();

    // Billing details
    table.string('billing_name', 100).nullable();
    table.string('billing_email', 255).nullable();
    table.jsonb('billing_address').defaultTo('{}');

    // Default payment method flag
    table.boolean('is_default').defaultTo(false);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('stripe_customer_id');
    table.index(['user_id', 'is_default']);
  });

  // Create transactions table
  await knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('subscription_id').nullable()
      .references('id').inTable('subscriptions');

    // Stripe integration
    table.string('stripe_payment_intent_id', 100).nullable();
    table.string('stripe_invoice_id', 100).nullable();
    table.string('stripe_charge_id', 100).nullable();

    // Transaction details
    table.enum('type', [
      'subscription',
      'subscription_renewal',
      'one_time',
      'coin_purchase',
      'boost_purchase',
      'refund'
    ]).notNullable();

    table.enum('status', [
      'pending',
      'processing',
      'succeeded',
      'failed',
      'canceled',
      'refunded'
    ]).defaultTo('pending');

    // Amount
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');

    // Description
    table.text('description').nullable();
    table.jsonb('metadata').defaultTo('{}');

    // Failure information
    table.string('failure_code', 50).nullable();
    table.text('failure_message').nullable();

    // Timestamps
    table.timestamp('processed_at').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('subscription_id');
    table.index('stripe_payment_intent_id');
    table.index('stripe_invoice_id');
    table.index('status');
    table.index('type');
    table.index('created_at');
  });

  // Insert default subscription plans
  await knex('subscription_plans').insert([
    {
      name: 'free',
      tier: 'free',
      display_name: 'Free',
      description: 'Basic features to get started with dating',
      price_monthly: 0,
      price_yearly: 0,
      features: JSON.stringify([
        '50 daily swipes',
        '1 super like per day',
        'Basic matching algorithm'
      ]),
      daily_swipes: 50,
      daily_super_likes: 1,
      monthly_boosts: 0,
      unlimited_likes: false,
      see_who_likes_you: false,
      rewind_enabled: false,
      incognito_mode: false,
      passport_enabled: false,
      priority_likes: false,
      read_receipts: false,
      advanced_filters: false,
      unlimited_rewinds: false,
      sort_order: 0,
    },
    {
      name: 'basic',
      tier: 'basic',
      display_name: 'Flamoral Basic',
      description: 'Get more swipes and super likes',
      price_monthly: 9.99,
      price_yearly: 79.99,
      price_3_months: 24.99,
      features: JSON.stringify([
        'Unlimited swipes',
        '5 super likes per day',
        'See who likes you',
        '1 boost per month',
        'Rewind last swipe'
      ]),
      daily_swipes: 999999,
      daily_super_likes: 5,
      monthly_boosts: 1,
      unlimited_likes: true,
      see_who_likes_you: true,
      rewind_enabled: true,
      incognito_mode: false,
      passport_enabled: false,
      priority_likes: false,
      read_receipts: false,
      advanced_filters: false,
      unlimited_rewinds: false,
      sort_order: 1,
    },
    {
      name: 'mid',
      tier: 'mid',
      display_name: 'Flamoral Mid',
      description: 'Enhanced features for better matches',
      price_monthly: 19.99,
      price_yearly: 159.99,
      price_6_months: 89.99,
      features: JSON.stringify([
        'Everything in Basic',
        'Unlimited super likes',
        '3 boosts per month',
        'Advanced filters',
        'Priority likes',
        'Read receipts',
        'Unlimited rewinds'
      ]),
      daily_swipes: 999999,
      daily_super_likes: 999999,
      monthly_boosts: 3,
      unlimited_likes: true,
      see_who_likes_you: true,
      rewind_enabled: true,
      incognito_mode: false,
      passport_enabled: false,
      priority_likes: true,
      read_receipts: true,
      advanced_filters: true,
      unlimited_rewinds: true,
      sort_order: 2,
    },
    {
      name: 'ultra',
      tier: 'ultra',
      display_name: 'Flamoral Ultra',
      description: 'The ultimate dating experience',
      price_monthly: 34.99,
      price_yearly: 279.99,
      price_6_months: 149.99,
      features: JSON.stringify([
        'Everything in Mid',
        '5 boosts per month',
        'Incognito mode',
        'Passport (swipe anywhere)',
        'Priority customer support',
        'Profile boost',
        'Top picks daily'
      ]),
      daily_swipes: 999999,
      daily_super_likes: 999999,
      monthly_boosts: 5,
      unlimited_likes: true,
      see_who_likes_you: true,
      rewind_enabled: true,
      incognito_mode: true,
      passport_enabled: true,
      priority_likes: true,
      read_receipts: true,
      advanced_filters: true,
      unlimited_rewinds: true,
      sort_order: 3,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('payment_methods');
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('subscription_plans');
}
