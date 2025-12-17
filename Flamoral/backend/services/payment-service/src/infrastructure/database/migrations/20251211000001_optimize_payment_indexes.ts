import { Knex } from 'knex';

/**
 * Payment Service Database Performance Optimization
 *
 * This migration creates optimized indexes for payment processing,
 * subscription management, and financial analytics.
 */

export async function up(knex: Knex): Promise<void> {
  console.log('Starting payment service index optimization...');

  // ============================================================================
  // SUBSCRIPTION PLANS TABLE OPTIMIZATION
  // ============================================================================

  // Index for active plans lookup
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_plans_active
    ON subscription_plans(is_active, sort_order ASC)
    WHERE is_active = true;
  `);

  // Index for Stripe product mapping
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_plans_stripe
    ON subscription_plans(stripe_product_id, stripe_price_id_monthly, stripe_price_id_yearly);
  `);

  // Index for plan pricing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_plans_pricing
    ON subscription_plans(price_monthly, price_yearly, is_active)
    WHERE is_active = true;
  `);

  // ============================================================================
  // USER SUBSCRIPTIONS TABLE OPTIMIZATION
  // ============================================================================

  // Covering index for active user subscriptions
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_active_full
    ON user_subscriptions(user_id, status, current_period_end DESC)
    INCLUDE (plan_id, billing_cycle, stripe_subscription_id)
    WHERE status IN ('active', 'trialing');
  `);

  // Index for subscription renewal processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_renewal
    ON user_subscriptions(current_period_end ASC, status)
    WHERE status IN ('active', 'trialing')
      AND current_period_end >= CURRENT_DATE
      AND current_period_end <= CURRENT_DATE + INTERVAL '7 days';
  `);

  // Index for past due subscriptions
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_past_due
    ON user_subscriptions(status, current_period_end DESC)
    WHERE status IN ('past_due', 'unpaid');
  `);

  // Index for Stripe customer lookups
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_customer
    ON user_subscriptions(stripe_customer_id, status)
    INCLUDE (user_id, stripe_subscription_id);
  `);

  // Index for trial subscriptions
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_trial
    ON user_subscriptions(trial_end ASC, status)
    WHERE status = 'trialing' AND trial_end IS NOT NULL;
  `);

  // Index for cancellation tracking
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_cancelled
    ON user_subscriptions(user_id, canceled_at DESC, status)
    WHERE canceled_at IS NOT NULL;
  `);

  // Index for churn analysis
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_churn
    ON user_subscriptions(cancel_at_period_end, current_period_end, status)
    WHERE cancel_at_period_end = true;
  `);

  // ============================================================================
  // PAYMENT METHODS TABLE OPTIMIZATION
  // ============================================================================

  // Covering index for user payment methods
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_user
    ON payment_methods(user_id, is_default DESC, created_at DESC)
    INCLUDE (type, card_brand, card_last4, stripe_payment_method_id);
  `);

  // Index for default payment method lookup
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_default
    ON payment_methods(user_id, is_default)
    WHERE is_default = true;
  `);

  // Index for Stripe payment method lookup
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_stripe
    ON payment_methods(stripe_payment_method_id, stripe_customer_id);
  `);

  // Index for expired card detection
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_expiring
    ON payment_methods(user_id, card_exp_year, card_exp_month)
    WHERE card_exp_year IS NOT NULL AND card_exp_month IS NOT NULL;
  `);

  // ============================================================================
  // TRANSACTIONS TABLE OPTIMIZATION
  // ============================================================================

  // Covering index for user transaction history
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_history
    ON transactions(user_id, created_at DESC)
    INCLUDE (type, status, amount, currency, description);
  `);

  // Index for successful transactions
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_successful
    ON transactions(user_id, status, processed_at DESC)
    WHERE status = 'succeeded';
  `);

  // Index for failed transactions
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_failed
    ON transactions(user_id, status, created_at DESC)
    WHERE status IN ('failed', 'canceled');
  `);

  // Index for pending transactions processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_pending
    ON transactions(status, created_at ASC)
    WHERE status IN ('pending', 'processing');
  `);

  // Index for Stripe payment intent lookup
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_stripe_intent
    ON transactions(stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;
  `);

  // Index for invoice transactions
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_invoice
    ON transactions(stripe_invoice_id, user_id)
    WHERE stripe_invoice_id IS NOT NULL;
  `);

  // Index for transaction type analytics
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type_analytics
    ON transactions(type, status, created_at DESC);
  `);

  // Index for refund processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_refunds
    ON transactions(type, status, created_at DESC)
    WHERE type = 'refund';
  `);

  // Index for revenue reporting
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_revenue
    ON transactions(DATE(processed_at), status, amount)
    WHERE status = 'succeeded' AND processed_at IS NOT NULL;
  `);

  // ============================================================================
  // COIN PACKAGES TABLE OPTIMIZATION
  // ============================================================================

  // Index for active coin packages
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coin_packages_active
    ON coin_packages(is_active, sort_order ASC, is_popular DESC)
    WHERE is_active = true;
  `);

  // Index for Stripe price lookup
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coin_packages_stripe
    ON coin_packages(stripe_price_id)
    WHERE stripe_price_id IS NOT NULL;
  `);

  // ============================================================================
  // COIN TRANSACTIONS TABLE OPTIMIZATION
  // ============================================================================

  // Covering index for user coin history
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coin_transactions_user_full
    ON coin_transactions(user_id, created_at DESC)
    INCLUDE (type, amount, balance_after, description);
  `);

  // Index for coin balance calculation
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coin_transactions_balance
    ON coin_transactions(user_id, created_at DESC, balance_after);
  `);

  // Index for coin transaction types
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coin_transactions_type
    ON coin_transactions(type, created_at DESC);
  `);

  // Index for coin purchases
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coin_transactions_purchases
    ON coin_transactions(user_id, transaction_id, package_id)
    WHERE type = 'purchase';
  `);

  // Index for coin spending analytics
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coin_transactions_spent
    ON coin_transactions(reference_type, reference_id, created_at DESC)
    WHERE type = 'spent';
  `);

  // ============================================================================
  // STRIPE WEBHOOK EVENTS TABLE OPTIMIZATION
  // ============================================================================

  // Index for event idempotency
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_idempotency
    ON stripe_webhook_events(stripe_event_id, status);
  `);

  // Index for pending webhook processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_pending
    ON stripe_webhook_events(status, created_at ASC, retry_count)
    WHERE status IN ('pending', 'failed');
  `);

  // Index for webhook event types
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_type
    ON stripe_webhook_events(event_type, created_at DESC);
  `);

  // Index for failed webhook analysis
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_failed
    ON stripe_webhook_events(status, retry_count, created_at DESC)
    WHERE status IN ('failed', 'permanently_failed');
  `);

  // ============================================================================
  // FINANCIAL ANALYTICS VIEWS
  // ============================================================================

  // Create materialized view for revenue analytics
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue AS
    SELECT
      DATE(processed_at) as date,
      type,
      currency,
      COUNT(*) as transaction_count,
      SUM(amount) as total_revenue,
      AVG(amount) as avg_transaction,
      COUNT(DISTINCT user_id) as unique_customers
    FROM transactions
    WHERE status = 'succeeded'
      AND processed_at >= CURRENT_DATE - INTERVAL '365 days'
    GROUP BY DATE(processed_at), type, currency;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_revenue
    ON mv_daily_revenue(date DESC, type, currency);
  `);

  // Create materialized view for subscription metrics
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_subscription_metrics AS
    SELECT
      DATE_TRUNC('day', created_at) as date,
      plan_id,
      status,
      billing_cycle,
      COUNT(*) as subscription_count,
      COUNT(DISTINCT user_id) as unique_subscribers
    FROM user_subscriptions
    WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'
    GROUP BY DATE_TRUNC('day', created_at), plan_id, status, billing_cycle;

    CREATE INDEX IF NOT EXISTS idx_mv_subscription_metrics
    ON mv_subscription_metrics(date DESC, plan_id, status);
  `);

  // Create materialized view for payment method statistics
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_payment_method_stats AS
    SELECT
      type,
      card_brand,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
    FROM payment_methods
    GROUP BY type, card_brand;

    CREATE INDEX IF NOT EXISTS idx_mv_payment_method_stats
    ON mv_payment_method_stats(type, count DESC);
  `);

  // ============================================================================
  // CLEANUP AND OPTIMIZATION
  // ============================================================================

  // Update table statistics
  await knex.raw('ANALYZE subscription_plans;');
  await knex.raw('ANALYZE user_subscriptions;');
  await knex.raw('ANALYZE payment_methods;');
  await knex.raw('ANALYZE transactions;');
  await knex.raw('ANALYZE coin_packages;');
  await knex.raw('ANALYZE coin_transactions;');
  await knex.raw('ANALYZE stripe_webhook_events;');

  console.log('Payment service index optimization completed!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Rolling back payment service optimization...');

  // Drop materialized views
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_payment_method_stats;');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_subscription_metrics;');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_daily_revenue;');

  // Drop all created indexes
  const indexes = [
    'idx_subscription_plans_active',
    'idx_subscription_plans_stripe',
    'idx_subscription_plans_pricing',
    'idx_user_subscriptions_active_full',
    'idx_subscriptions_renewal',
    'idx_subscriptions_past_due',
    'idx_subscriptions_stripe_customer',
    'idx_subscriptions_trial',
    'idx_subscriptions_cancelled',
    'idx_subscriptions_churn',
    'idx_payment_methods_user',
    'idx_payment_methods_default',
    'idx_payment_methods_stripe',
    'idx_payment_methods_expiring',
    'idx_transactions_user_history',
    'idx_transactions_successful',
    'idx_transactions_failed',
    'idx_transactions_pending',
    'idx_transactions_stripe_intent',
    'idx_transactions_invoice',
    'idx_transactions_type_analytics',
    'idx_transactions_refunds',
    'idx_transactions_revenue',
    'idx_coin_packages_active',
    'idx_coin_packages_stripe',
    'idx_coin_transactions_user_full',
    'idx_coin_transactions_balance',
    'idx_coin_transactions_type',
    'idx_coin_transactions_purchases',
    'idx_coin_transactions_spent',
    'idx_webhook_events_idempotency',
    'idx_webhook_events_pending',
    'idx_webhook_events_type',
    'idx_webhook_events_failed',
  ];

  for (const index of indexes) {
    await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS ${index};`);
  }

  console.log('Payment service optimization rollback completed!');
}
