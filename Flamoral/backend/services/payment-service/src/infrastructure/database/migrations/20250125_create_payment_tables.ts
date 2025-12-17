import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Subscription Plans table
  await knex.schema.createTable('subscription_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 50).notNullable(); // free, premium, premium_plus
    table.string('display_name', 100).notNullable();
    table.text('description');
    table.decimal('price_monthly', 10, 2).notNullable();
    table.decimal('price_yearly', 10, 2);
    table.string('stripe_price_id_monthly', 100);
    table.string('stripe_price_id_yearly', 100);
    table.string('stripe_product_id', 100);
    table.jsonb('features').defaultTo('[]');
    table.integer('daily_swipes').defaultTo(50);
    table.integer('daily_super_likes').defaultTo(1);
    table.integer('daily_boosts').defaultTo(0);
    table.boolean('unlimited_likes').defaultTo(false);
    table.boolean('see_who_likes_you').defaultTo(false);
    table.boolean('rewind_enabled').defaultTo(false);
    table.boolean('incognito_mode').defaultTo(false);
    table.boolean('passport_enabled').defaultTo(false);
    table.boolean('priority_likes').defaultTo(false);
    table.boolean('read_receipts').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  });

  // User Subscriptions table
  await knex.schema.createTable('user_subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('plan_id').notNullable().references('id').inTable('subscription_plans');
    table.string('stripe_subscription_id', 100).unique();
    table.string('stripe_customer_id', 100);
    table.enum('status', ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired']).defaultTo('active');
    table.enum('billing_cycle', ['monthly', 'yearly']).defaultTo('monthly');
    table.timestamp('current_period_start');
    table.timestamp('current_period_end');
    table.timestamp('canceled_at');
    table.timestamp('cancel_at');
    table.boolean('cancel_at_period_end').defaultTo(false);
    table.timestamp('trial_start');
    table.timestamp('trial_end');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('stripe_subscription_id');
    table.index('stripe_customer_id');
    table.index('status');
  });

  // Payment Methods table
  await knex.schema.createTable('payment_methods', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.string('stripe_payment_method_id', 100).unique().notNullable();
    table.string('stripe_customer_id', 100);
    table.enum('type', ['card', 'bank_account', 'apple_pay', 'google_pay']).notNullable();
    table.string('card_brand', 20);
    table.string('card_last4', 4);
    table.integer('card_exp_month');
    table.integer('card_exp_year');
    table.string('card_funding', 20);
    table.string('billing_name', 100);
    table.string('billing_email', 255);
    table.jsonb('billing_address').defaultTo('{}');
    table.boolean('is_default').defaultTo(false);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('stripe_customer_id');
  });

  // Transactions table
  await knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('subscription_id').references('id').inTable('user_subscriptions');
    table.string('stripe_payment_intent_id', 100);
    table.string('stripe_invoice_id', 100);
    table.string('stripe_charge_id', 100);
    table.enum('type', ['subscription', 'one_time', 'coin_purchase', 'boost_purchase', 'refund']).notNullable();
    table.enum('status', ['pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded', 'disputed']).defaultTo('pending');
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.text('description');
    table.jsonb('metadata').defaultTo('{}');
    table.string('failure_code', 50);
    table.text('failure_message');
    table.timestamp('processed_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('stripe_payment_intent_id');
    table.index('stripe_invoice_id');
    table.index('status');
    table.index('type');
  });

  // Coin Packages table
  await knex.schema.createTable('coin_packages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 50).notNullable();
    table.integer('coin_amount').notNullable();
    table.decimal('price', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.string('stripe_price_id', 100);
    table.integer('bonus_coins').defaultTo(0);
    table.boolean('is_popular').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  });

  // Coin Transactions table
  await knex.schema.createTable('coin_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('transaction_id').references('id').inTable('transactions');
    table.uuid('package_id').references('id').inTable('coin_packages');
    table.enum('type', ['purchase', 'spent', 'earned', 'refund', 'bonus', 'gift']).notNullable();
    table.integer('amount').notNullable();
    table.integer('balance_after').notNullable();
    table.text('description');
    table.string('reference_type', 50);
    table.uuid('reference_id');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('type');
  });

  // Webhook Events table (for idempotency)
  await knex.schema.createTable('stripe_webhook_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('stripe_event_id', 100).unique().notNullable();
    table.string('event_type', 100).notNullable();
    table.jsonb('payload').notNullable();
    table.enum('status', ['pending', 'processed', 'failed', 'permanently_failed']).defaultTo('pending');
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('processed_at');
    table.timestamps(true, true);

    table.index('stripe_event_id');
    table.index('event_type');
    table.index('status');
  });

  // Insert default subscription plans
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

  // Insert default coin packages
  await knex('coin_packages').insert([
    { name: '10 Coins', coin_amount: 10, price: 4.99, bonus_coins: 0, sort_order: 0 },
    { name: '25 Coins', coin_amount: 25, price: 9.99, bonus_coins: 2, sort_order: 1 },
    { name: '50 Coins', coin_amount: 50, price: 17.99, bonus_coins: 5, is_popular: true, sort_order: 2 },
    { name: '100 Coins', coin_amount: 100, price: 29.99, bonus_coins: 15, sort_order: 3 },
    { name: '250 Coins', coin_amount: 250, price: 59.99, bonus_coins: 50, sort_order: 4 },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('stripe_webhook_events');
  await knex.schema.dropTableIfExists('coin_transactions');
  await knex.schema.dropTableIfExists('coin_packages');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('payment_methods');
  await knex.schema.dropTableIfExists('user_subscriptions');
  await knex.schema.dropTableIfExists('subscription_plans');
}
