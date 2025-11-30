import { Knex } from 'knex';

/**
 * Migration: Enhanced Multi-Gateway Payment System
 *
 * Extends the payment system with:
 * - Additional payment providers (Square, Adyen, Wise, Amazon Pay)
 * - Intelligent payment routing
 * - Transaction state machine
 * - Enhanced dispute handling
 * - Processor health monitoring
 * - Payout management (via Wise)
 * - Digital wallet support (Apple Pay, Google Pay)
 */
export async function up(knex: Knex): Promise<void> {
  // Update payment_provider enum to include new providers
  await knex.raw(`
    DO $$ BEGIN
      -- Add new providers to the enum
      ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'square';
      ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'adyen';
      ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'wise';
      ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'amazon_pay';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create transaction_state enum for state machine
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE transaction_state AS ENUM (
        'created',
        'pending',
        'requires_action',
        'processing',
        'authorized',
        'captured',
        'completed',
        'failed',
        'cancelled',
        'refund_pending',
        'partially_refunded',
        'refunded',
        'disputed',
        'chargeback_pending',
        'chargeback_won',
        'chargeback_lost'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create dispute_status enum
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE dispute_status AS ENUM (
        'warning_needs_response',
        'warning_under_review',
        'warning_closed',
        'needs_response',
        'under_review',
        'charge_refunded',
        'won',
        'lost'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create payout_status enum
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE payout_status AS ENUM (
        'created',
        'pending',
        'in_transit',
        'completed',
        'failed',
        'cancelled'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Processor Configuration table
  await knex.schema.createTable('processor_configs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('processor', 50).notNullable().unique();
    table.boolean('enabled').defaultTo(true);
    table.integer('priority').defaultTo(0);

    // Encrypted configuration (stored encrypted at rest)
    table.text('encrypted_config');

    // Supported features
    table.specificType('supported_currencies', 'varchar(3)[]').defaultTo('{}');
    table.specificType('supported_countries', 'varchar(2)[]').defaultTo('{}');
    table.specificType('supported_payment_methods', 'text[]').defaultTo('{}');

    // Load balancing
    table.integer('weight').defaultTo(100);
    table.integer('max_daily_transactions');
    table.integer('current_daily_transactions').defaultTo(0);

    // Health monitoring
    table.boolean('is_healthy').defaultTo(true);
    table.timestamp('last_health_check');
    table.decimal('success_rate', 5, 2).defaultTo(100.00);
    table.integer('avg_response_time_ms');
    table.integer('consecutive_failures').defaultTo(0);
    table.timestamp('last_failure');

    // Feature flags
    table.boolean('supports_3ds').defaultTo(true);
    table.boolean('supports_refunds').defaultTo(true);
    table.boolean('supports_partial_refunds').defaultTo(true);
    table.boolean('supports_subscriptions').defaultTo(true);
    table.boolean('supports_payouts').defaultTo(false);
    table.boolean('supports_apple_pay').defaultTo(false);
    table.boolean('supports_google_pay').defaultTo(false);

    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('processor');
    table.index('enabled');
    table.index(['enabled', 'priority']);
  });

  // Routing Rules table
  await knex.schema.createTable('routing_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description');
    table.integer('priority').notNullable().defaultTo(0);
    table.string('processor', 50).notNullable();
    table.boolean('enabled').defaultTo(true);

    // Conditions (stored as JSONB for flexibility)
    // Example: { "field": "currency", "operator": "equals", "value": "EUR" }
    table.jsonb('conditions').notNullable().defaultTo('[]');

    // Actions
    table.string('fallback_processor', 50);
    table.boolean('allow_fallback').defaultTo(true);

    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('priority');
    table.index(['enabled', 'priority']);
  });

  // Transaction State History (for state machine tracking)
  await knex.schema.createTable('transaction_state_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('transaction_id').notNullable().references('id').inTable('payment_transactions').onDelete('CASCADE');
    table.specificType('from_state', 'transaction_state');
    table.specificType('to_state', 'transaction_state').notNullable();
    table.string('event').notNullable();

    // Actor info
    table.enum('actor_type', ['system', 'user', 'webhook', 'admin', 'scheduler']).defaultTo('system');
    table.string('actor_id');

    // Additional context
    table.jsonb('details').defaultTo('{}');
    table.string('ip_address');
    table.string('user_agent');

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('transaction_id');
    table.index('created_at');
    table.index(['transaction_id', 'created_at']);
  });

  // Disputes/Chargebacks table
  await knex.schema.createTable('disputes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('transaction_id').notNullable().references('id').inTable('payment_transactions').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.string('processor', 50).notNullable();
    table.string('processor_dispute_id').notNullable();

    table.specificType('status', 'dispute_status').notNullable();
    table.string('reason');
    table.text('reason_description');

    table.integer('amount').notNullable();
    table.string('currency', 3).defaultTo('USD');

    // Evidence
    table.timestamp('evidence_due_by');
    table.boolean('evidence_submitted').defaultTo(false);
    table.timestamp('evidence_submitted_at');
    table.jsonb('evidence').defaultTo('{}');

    // Outcome
    table.string('outcome');
    table.integer('network_reason_code');
    table.text('outcome_details');

    table.jsonb('processor_response').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');

    table.timestamp('resolved_at');
    table.timestamps(true, true);

    table.unique(['processor', 'processor_dispute_id']);
    table.index('transaction_id');
    table.index('user_id');
    table.index('status');
    table.index('evidence_due_by');
  });

  // Payouts table (for creator payouts, refunds to bank, etc.)
  await knex.schema.createTable('payouts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');

    table.string('processor', 50).notNullable();
    table.string('processor_payout_id');
    table.string('processor_transfer_id'); // For Wise transfers

    table.specificType('status', 'payout_status').defaultTo('created');

    // Amount
    table.integer('amount').notNullable();
    table.string('source_currency', 3).notNullable();
    table.integer('target_amount');
    table.string('target_currency', 3);
    table.decimal('exchange_rate', 12, 6);
    table.integer('fee_amount').defaultTo(0);

    // Recipient details
    table.string('recipient_type').defaultTo('individual'); // individual, business
    table.string('recipient_id'); // Wise recipient ID
    table.jsonb('recipient_details').defaultTo('{}'); // Bank details, etc.

    // Reference
    table.string('reference');
    table.text('description');

    // Timing
    table.timestamp('initiated_at');
    table.timestamp('estimated_arrival');
    table.timestamp('completed_at');
    table.timestamp('failed_at');
    table.string('failure_reason');

    table.jsonb('processor_response').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('processor');
    table.index('status');
    table.index('created_at');
  });

  // Payout Recipients (for recurring payouts)
  await knex.schema.createTable('payout_recipients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.string('processor', 50).notNullable(); // wise, stripe_connect, etc.
    table.string('processor_recipient_id').notNullable();

    table.string('type').defaultTo('bank'); // bank, wise_account, paypal, etc.
    table.string('currency', 3).notNullable();

    // Display info
    table.string('name');
    table.string('bank_name');
    table.string('account_last4');
    table.string('account_type'); // checking, savings

    // Verification
    table.boolean('is_verified').defaultTo(false);
    table.boolean('is_default').defaultTo(false);

    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.unique(['processor', 'processor_recipient_id']);
    table.index('user_id');
    table.index(['user_id', 'is_default']);
  });

  // Digital Wallet Sessions (for Apple Pay, Google Pay merchant validation)
  await knex.schema.createTable('digital_wallet_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');

    table.enum('wallet_type', ['apple_pay', 'google_pay', 'amazon_pay']).notNullable();
    table.string('processor', 50).notNullable();

    table.string('session_id').notNullable();
    table.string('domain');

    table.jsonb('merchant_session').defaultTo('{}'); // Apple Pay merchant session
    table.jsonb('payment_data').defaultTo('{}'); // Tokenized payment data

    table.enum('status', ['created', 'validated', 'completed', 'failed', 'expired']).defaultTo('created');

    table.timestamp('expires_at');
    table.timestamps(true, true);

    table.index('session_id');
    table.index('user_id');
    table.index(['wallet_type', 'status']);
  });

  // Idempotency Keys table (for preventing duplicate operations)
  await knex.schema.createTable('idempotency_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key', 255).notNullable().unique();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');

    table.string('operation').notNullable(); // create_payment, create_subscription, etc.
    table.jsonb('request_hash').notNullable(); // Hash of request params

    table.jsonb('response').defaultTo('{}');
    table.integer('http_status');
    table.boolean('is_completed').defaultTo(false);

    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);

    table.index('key');
    table.index('expires_at');
  });

  // Add additional columns to payment_transactions
  await knex.schema.alterTable('payment_transactions', (table) => {
    // Idempotency
    table.string('idempotency_key', 255).unique();

    // Enhanced state tracking
    table.specificType('state', 'transaction_state').defaultTo('created');

    // Capture handling
    table.enum('capture_method', ['automatic', 'manual']).defaultTo('automatic');
    table.timestamp('captured_at');
    table.integer('captured_amount');

    // 3DS handling
    table.boolean('requires_3ds').defaultTo(false);
    table.string('three_ds_status');
    table.jsonb('three_ds_result').defaultTo('{}');

    // Routing info
    table.string('routing_rule_id');
    table.boolean('used_fallback').defaultTo(false);
    table.string('original_processor');

    // Statement descriptor
    table.string('statement_descriptor', 22);
    table.string('statement_descriptor_suffix', 22);
  });

  // Add additional columns to user_subscriptions
  await knex.schema.alterTable('user_subscriptions', (table) => {
    // Pause handling
    table.timestamp('paused_at');
    table.timestamp('resume_at');
    table.integer('pause_duration_days');

    // Grace period
    table.timestamp('grace_period_ends');
    table.boolean('in_grace_period').defaultTo(false);

    // Billing
    table.string('billing_anchor'); // day of month
    table.boolean('prorate_changes').defaultTo(true);
  });

  // Insert default processor configurations
  await knex('processor_configs').insert([
    {
      processor: 'stripe',
      enabled: true,
      priority: 100,
      supported_currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NOK', 'SEK', 'DKK', 'NZD', 'SGD', 'HKD', 'INR', 'BRL', 'MXN'],
      supported_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'ES', 'IT', 'JP', 'SG', 'HK'],
      supported_payment_methods: ['card', 'apple_pay', 'google_pay', 'bank_account', 'ach'],
      weight: 100,
      supports_3ds: true,
      supports_refunds: true,
      supports_partial_refunds: true,
      supports_subscriptions: true,
      supports_apple_pay: true,
      supports_google_pay: true,
    },
    {
      processor: 'square',
      enabled: true,
      priority: 90,
      supported_currencies: ['USD', 'CAD', 'AUD', 'GBP', 'EUR', 'JPY'],
      supported_countries: ['US', 'CA', 'AU', 'GB', 'JP'],
      supported_payment_methods: ['card', 'apple_pay', 'google_pay'],
      weight: 80,
      supports_3ds: true,
      supports_refunds: true,
      supports_partial_refunds: true,
      supports_subscriptions: true,
      supports_apple_pay: true,
      supports_google_pay: true,
    },
    {
      processor: 'adyen',
      enabled: true,
      priority: 85,
      supported_currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK'],
      supported_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'ES', 'IT', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ'],
      supported_payment_methods: ['card', 'apple_pay', 'google_pay', 'ideal', 'sepa', 'klarna', 'sofort', 'giropay', 'bancontact'],
      weight: 70,
      supports_3ds: true,
      supports_refunds: true,
      supports_partial_refunds: true,
      supports_subscriptions: true,
      supports_apple_pay: true,
      supports_google_pay: true,
    },
    {
      processor: 'wise',
      enabled: true,
      priority: 50,
      supported_currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'JPY', 'CHF', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'INR', 'PHP', 'THB', 'MYR', 'IDR', 'BRL', 'MXN'],
      supported_countries: ['US', 'CA', 'GB', 'AU', 'NZ', 'SG', 'HK', 'JP', 'CH', 'NO', 'SE', 'DK', 'PL', 'CZ', 'HU', 'RO', 'BG', 'IN', 'PH', 'TH', 'MY', 'ID', 'BR', 'MX'],
      supported_payment_methods: ['bank_transfer'],
      weight: 50,
      supports_3ds: false,
      supports_refunds: false,
      supports_partial_refunds: false,
      supports_subscriptions: false,
      supports_payouts: true,
    },
    {
      processor: 'amazon_pay',
      enabled: true,
      priority: 75,
      supported_currencies: ['USD', 'EUR', 'GBP', 'JPY'],
      supported_countries: ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'JP'],
      supported_payment_methods: ['amazon_pay'],
      weight: 60,
      supports_3ds: true,
      supports_refunds: true,
      supports_partial_refunds: true,
      supports_subscriptions: true,
    },
  ]);

  // Insert default routing rules
  await knex('routing_rules').insert([
    {
      name: 'EU customers via Adyen',
      description: 'Route European customers through Adyen for better local payment method support',
      priority: 100,
      processor: 'adyen',
      enabled: true,
      conditions: JSON.stringify([
        { field: 'country', operator: 'in', value: ['DE', 'FR', 'NL', 'ES', 'IT', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ'] }
      ]),
      fallback_processor: 'stripe',
      allow_fallback: true,
    },
    {
      name: 'High-value transactions via Stripe',
      description: 'Route transactions over $500 through Stripe for better fraud protection',
      priority: 90,
      processor: 'stripe',
      enabled: true,
      conditions: JSON.stringify([
        { field: 'amount', operator: 'greaterThan', value: 50000 }
      ]),
      fallback_processor: 'adyen',
      allow_fallback: true,
    },
    {
      name: 'JPY transactions via Square',
      description: 'Route Japanese Yen transactions through Square',
      priority: 85,
      processor: 'square',
      enabled: true,
      conditions: JSON.stringify([
        { field: 'currency', operator: 'equals', value: 'JPY' }
      ]),
      fallback_processor: 'stripe',
      allow_fallback: true,
    },
    {
      name: 'Amazon Pay for Amazon customers',
      description: 'Use Amazon Pay when customer prefers Amazon',
      priority: 80,
      processor: 'amazon_pay',
      enabled: true,
      conditions: JSON.stringify([
        { field: 'payment_method', operator: 'equals', value: 'amazon_pay' }
      ]),
      fallback_processor: 'stripe',
      allow_fallback: true,
    },
    {
      name: 'Default to Stripe',
      description: 'Default routing rule - use Stripe as primary processor',
      priority: 0,
      processor: 'stripe',
      enabled: true,
      conditions: JSON.stringify([]),
      allow_fallback: false,
    },
  ]);

  // Add new feature flags for new providers
  await knex('payment_feature_flags').insert([
    {
      key: 'square_enabled',
      enabled: true,
      description: 'Enable Square payment provider',
      countries: ['US', 'CA', 'AU', 'GB', 'JP'],
    },
    {
      key: 'adyen_enabled',
      enabled: true,
      description: 'Enable Adyen payment provider',
      countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'ES', 'IT', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ'],
    },
    {
      key: 'wise_enabled',
      enabled: true,
      description: 'Enable Wise for international payouts',
    },
    {
      key: 'amazon_pay_enabled',
      enabled: true,
      description: 'Enable Amazon Pay',
      countries: ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'JP'],
    },
    {
      key: 'intelligent_routing_enabled',
      enabled: true,
      description: 'Enable intelligent payment routing',
    },
    {
      key: 'automatic_failover_enabled',
      enabled: true,
      description: 'Enable automatic failover to backup processor',
    },
  ]).onConflict('key').ignore();

  // Create indexes for performance
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_transactions_state ON payment_transactions (state);
    CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON payment_transactions (idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_disputes_due_by ON disputes (evidence_due_by) WHERE status IN ('needs_response', 'warning_needs_response');
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove added columns from existing tables
  await knex.schema.alterTable('payment_transactions', (table) => {
    table.dropColumn('idempotency_key');
    table.dropColumn('state');
    table.dropColumn('capture_method');
    table.dropColumn('captured_at');
    table.dropColumn('captured_amount');
    table.dropColumn('requires_3ds');
    table.dropColumn('three_ds_status');
    table.dropColumn('three_ds_result');
    table.dropColumn('routing_rule_id');
    table.dropColumn('used_fallback');
    table.dropColumn('original_processor');
    table.dropColumn('statement_descriptor');
    table.dropColumn('statement_descriptor_suffix');
  });

  await knex.schema.alterTable('user_subscriptions', (table) => {
    table.dropColumn('paused_at');
    table.dropColumn('resume_at');
    table.dropColumn('pause_duration_days');
    table.dropColumn('grace_period_ends');
    table.dropColumn('in_grace_period');
    table.dropColumn('billing_anchor');
    table.dropColumn('prorate_changes');
  });

  // Drop new tables
  await knex.schema.dropTableIfExists('idempotency_keys');
  await knex.schema.dropTableIfExists('digital_wallet_sessions');
  await knex.schema.dropTableIfExists('payout_recipients');
  await knex.schema.dropTableIfExists('payouts');
  await knex.schema.dropTableIfExists('disputes');
  await knex.schema.dropTableIfExists('transaction_state_history');
  await knex.schema.dropTableIfExists('routing_rules');
  await knex.schema.dropTableIfExists('processor_configs');

  // Remove feature flags
  await knex('payment_feature_flags')
    .whereIn('key', [
      'square_enabled',
      'adyen_enabled',
      'wise_enabled',
      'amazon_pay_enabled',
      'intelligent_routing_enabled',
      'automatic_failover_enabled',
    ])
    .delete();

  // Drop enum types
  await knex.raw('DROP TYPE IF EXISTS payout_status');
  await knex.raw('DROP TYPE IF EXISTS dispute_status');
  await knex.raw('DROP TYPE IF EXISTS transaction_state');
}
