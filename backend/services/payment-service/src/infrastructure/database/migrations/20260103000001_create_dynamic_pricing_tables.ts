import { Knex } from 'knex';

/**
 * Migration: Create Dynamic Pricing Tables
 *
 * This migration creates the complete dynamic pricing system including:
 * - Regional pricing based on country/region purchasing power
 * - Promotional pricing with time-limited discounts
 * - Personalized pricing based on user behavior
 * - A/B testing for price experiments
 * - Bundle pricing for multiple features
 * - Pricing audit logs for compliance
 */

export async function up(knex: Knex): Promise<void> {
  // =============================================================================
  // 1. REGIONAL PRICING TABLE
  // Stores country/region-specific pricing adjustments based on purchasing power
  // =============================================================================
  await knex.schema.createTable('regional_pricing', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('country_code', 2).notNullable(); // ISO 3166-1 alpha-2
    table.string('region_code', 10).nullable(); // Optional region/state code
    table.string('currency_code', 3).notNullable().defaultTo('USD');
    table.decimal('purchasing_power_index', 5, 4).notNullable().defaultTo(1.0); // PPP index relative to US
    table.decimal('price_multiplier', 5, 4).notNullable().defaultTo(1.0); // Final price multiplier
    table.decimal('min_price_multiplier', 5, 4).notNullable().defaultTo(0.3); // Floor (30% of base)
    table.decimal('max_price_multiplier', 5, 4).notNullable().defaultTo(1.5); // Ceiling (150% of base)
    table.decimal('currency_conversion_rate', 12, 6).notNullable().defaultTo(1.0); // To local currency
    table.boolean('is_active').defaultTo(true);
    table.jsonb('tier_overrides').defaultTo('{}'); // Per-tier price overrides
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('effective_from').notNullable().defaultTo(knex.fn.now());
    table.timestamp('effective_until').nullable();
    table.timestamps(true, true);

    table.unique(['country_code', 'region_code', 'effective_from']);
    table.index('country_code');
    table.index('is_active');
    table.index(['effective_from', 'effective_until']);
  });

  // =============================================================================
  // 2. PROMOTIONAL PRICING TABLE
  // Stores time-limited discounts, seasonal offers, and promotional campaigns
  // =============================================================================
  await knex.schema.createTable('promotions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 50).unique().notNullable(); // Promo code (e.g., 'SUMMER2025')
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table
      .enum('discount_type', ['percentage', 'fixed_amount', 'free_trial_days', 'tier_upgrade'])
      .notNullable();
    table.decimal('discount_value', 10, 2).notNullable(); // Amount or percentage
    table.decimal('min_purchase_amount', 10, 2).nullable(); // Minimum cart/purchase value
    table.decimal('max_discount_amount', 10, 2).nullable(); // Cap for percentage discounts
    table.jsonb('applicable_plans').defaultTo('[]'); // Which plans can use this promo
    table.jsonb('applicable_billing_cycles').defaultTo('[]'); // monthly, yearly, etc.
    table.jsonb('excluded_plans').defaultTo('[]'); // Plans excluded from promo
    table.integer('max_uses').nullable(); // Total uses allowed (null = unlimited)
    table.integer('max_uses_per_user').defaultTo(1); // Uses per user
    table.integer('current_uses').defaultTo(0); // Track usage
    table.boolean('first_time_only').defaultTo(false); // Only for new subscribers
    table.boolean('requires_payment_method').defaultTo(true);
    table.boolean('stackable').defaultTo(false); // Can combine with other promos
    table.integer('priority').defaultTo(0); // Higher = applied first when stacking
    table.timestamp('starts_at').notNullable();
    table.timestamp('ends_at').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.jsonb('targeting_rules').defaultTo('{}'); // User targeting criteria
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by').nullable(); // Admin who created
    table.timestamps(true, true);

    table.index('code');
    table.index(['starts_at', 'ends_at']);
    table.index('is_active');
    table.index('discount_type');
  });

  // =============================================================================
  // 3. USER PROMOTION USAGE TABLE
  // Tracks which promotions each user has used
  // =============================================================================
  await knex.schema.createTable('user_promotion_usage', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table
      .uuid('promotion_id')
      .notNullable()
      .references('id')
      .inTable('promotions')
      .onDelete('CASCADE');
    table
      .uuid('subscription_id')
      .nullable()
      .references('id')
      .inTable('user_subscriptions')
      .onDelete('SET NULL');
    table
      .uuid('transaction_id')
      .nullable()
      .references('id')
      .inTable('transactions')
      .onDelete('SET NULL');
    table.decimal('discount_amount', 10, 2).notNullable();
    table.decimal('original_amount', 10, 2).notNullable();
    table.decimal('final_amount', 10, 2).notNullable();
    table.timestamp('applied_at').notNullable().defaultTo(knex.fn.now());
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('promotion_id');
    table.index('applied_at');
  });

  // =============================================================================
  // 4. PERSONALIZED PRICING TABLE
  // Stores user-specific pricing based on engagement and conversion likelihood
  // =============================================================================
  await knex.schema.createTable('personalized_pricing', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.decimal('engagement_score', 5, 2).notNullable().defaultTo(50); // 0-100 engagement
    table.decimal('conversion_likelihood', 5, 4).notNullable().defaultTo(0.5); // 0-1 probability
    table.decimal('price_sensitivity', 5, 4).notNullable().defaultTo(0.5); // 0-1 (1 = very sensitive)
    table.decimal('lifetime_value_prediction', 12, 2).nullable(); // Predicted LTV
    table.decimal('recommended_discount', 5, 2).nullable(); // AI-recommended discount %
    table.string('user_segment', 50).nullable(); // e.g., 'high_value', 'at_risk', 'new_user'
    table.jsonb('tier_recommendations').defaultTo('{}'); // Recommended tiers with prices
    table.jsonb('behavior_factors').defaultTo('{}'); // Factors used in calculation
    table.integer('days_since_signup').defaultTo(0);
    table.integer('total_sessions').defaultTo(0);
    table.integer('matches_count').defaultTo(0);
    table.integer('messages_sent').defaultTo(0);
    table.timestamp('last_active_at').nullable();
    table.boolean('has_ever_subscribed').defaultTo(false);
    table.timestamp('last_subscription_end').nullable();
    table.timestamp('calculated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable(); // When to recalculate
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.unique('user_id');
    table.index('engagement_score');
    table.index('conversion_likelihood');
    table.index('user_segment');
    table.index('calculated_at');
  });

  // =============================================================================
  // 5. PRICE EXPERIMENTS TABLE (A/B Testing)
  // Stores configuration for price experiments
  // =============================================================================
  await knex.schema.createTable('price_experiments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.string('hypothesis', 500).nullable();
    table
      .enum('status', ['draft', 'running', 'paused', 'completed', 'cancelled'])
      .defaultTo('draft');
    table.decimal('traffic_percentage', 5, 2).notNullable().defaultTo(10); // % of users in experiment
    table.jsonb('targeting_rules').defaultTo('{}'); // Who can be in experiment
    table.jsonb('exclusion_rules').defaultTo('{}'); // Who is excluded
    table.timestamp('starts_at').nullable();
    table.timestamp('ends_at').nullable();
    table.integer('min_sample_size').defaultTo(1000); // Minimum participants
    table.decimal('statistical_significance_target', 5, 4).defaultTo(0.95); // 95% confidence
    table.jsonb('success_metrics').defaultTo('[]'); // What we're measuring
    table.uuid('created_by').nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('status');
    table.index(['starts_at', 'ends_at']);
  });

  // =============================================================================
  // 6. PRICE EXPERIMENT VARIANTS TABLE
  // Stores different price variants for each experiment
  // =============================================================================
  await knex.schema.createTable('price_experiment_variants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('experiment_id')
      .notNullable()
      .references('id')
      .inTable('price_experiments')
      .onDelete('CASCADE');
    table.string('name', 50).notNullable(); // e.g., 'control', 'variant_a', 'variant_b'
    table.boolean('is_control').defaultTo(false);
    table.decimal('traffic_weight', 5, 2).notNullable().defaultTo(50); // % of experiment traffic
    table.string('plan_id', 50).notNullable(); // Which plan this variant affects
    table.decimal('price_monthly', 10, 2).nullable();
    table.decimal('price_yearly', 10, 2).nullable();
    table.decimal('price_3_months', 10, 2).nullable();
    table.decimal('price_6_months', 10, 2).nullable();
    table.string('stripe_price_id_monthly', 100).nullable();
    table.string('stripe_price_id_yearly', 100).nullable();
    table.string('stripe_price_id_3_months', 100).nullable();
    table.string('stripe_price_id_6_months', 100).nullable();
    table.jsonb('custom_features').defaultTo('{}'); // Any feature changes
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('experiment_id');
    table.index('plan_id');
  });

  // =============================================================================
  // 7. USER EXPERIMENT ASSIGNMENTS TABLE
  // Tracks which users are assigned to which experiments/variants
  // =============================================================================
  await knex.schema.createTable('user_experiment_assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table
      .uuid('experiment_id')
      .notNullable()
      .references('id')
      .inTable('price_experiments')
      .onDelete('CASCADE');
    table
      .uuid('variant_id')
      .notNullable()
      .references('id')
      .inTable('price_experiment_variants')
      .onDelete('CASCADE');
    table.timestamp('assigned_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('has_converted').defaultTo(false);
    table.timestamp('converted_at').nullable();
    table.decimal('revenue_generated', 12, 2).defaultTo(0);
    table.jsonb('events').defaultTo('[]'); // Track user events during experiment
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.unique(['user_id', 'experiment_id']);
    table.index('experiment_id');
    table.index('variant_id');
    table.index('assigned_at');
    table.index('has_converted');
  });

  // =============================================================================
  // 8. BUNDLE PRICING TABLE
  // Stores bundles of features/add-ons that can be purchased together
  // =============================================================================
  await knex.schema.createTable('pricing_bundles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.string('slug', 50).unique().notNullable(); // URL-friendly identifier
    table.text('description').nullable();
    table.jsonb('included_items').notNullable(); // Array of items in bundle
    table.decimal('base_price', 10, 2).notNullable(); // Full price if bought separately
    table.decimal('bundle_price', 10, 2).notNullable(); // Discounted bundle price
    table.decimal('savings_amount', 10, 2).notNullable(); // base_price - bundle_price
    table.decimal('savings_percentage', 5, 2).notNullable(); // Percentage saved
    table.string('stripe_price_id', 100).nullable();
    table.string('stripe_product_id', 100).nullable();
    table.jsonb('compatible_plans').defaultTo('[]'); // Which subscription plans can buy this
    table.boolean('requires_subscription').defaultTo(false);
    table.integer('max_purchases_per_user').nullable(); // null = unlimited
    table.timestamp('available_from').nullable();
    table.timestamp('available_until').nullable();
    table.boolean('is_featured').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('slug');
    table.index('is_active');
    table.index('is_featured');
    table.index(['available_from', 'available_until']);
  });

  // =============================================================================
  // 9. PRICING RULES TABLE
  // Admin-configurable pricing rules that can be combined
  // =============================================================================
  await knex.schema.createTable('pricing_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table
      .enum('rule_type', [
        'time_based', // Happy hour, weekend specials
        'quantity_based', // Buy more save more
        'user_attribute', // Based on user properties
        'referral', // Referral discounts
        'loyalty', // Long-term subscriber rewards
        'win_back', // Lapsed subscriber offers
        'flash_sale', // Limited time offers
        'early_bird', // Early adopter pricing
      ])
      .notNullable();
    table.jsonb('conditions').notNullable(); // Rule conditions
    table.jsonb('actions').notNullable(); // What happens when rule matches
    table.integer('priority').defaultTo(0); // Higher = evaluated first
    table.boolean('stackable').defaultTo(false);
    table.integer('max_applications').nullable(); // Max times rule can apply
    table.timestamp('starts_at').nullable();
    table.timestamp('ends_at').nullable();
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by').nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('rule_type');
    table.index('is_active');
    table.index('priority');
    table.index(['starts_at', 'ends_at']);
  });

  // =============================================================================
  // 10. PRICING AUDIT LOG TABLE
  // Complete audit trail for all pricing decisions and changes
  // =============================================================================
  await knex.schema.createTable('pricing_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable();
    table.string('action', 50).notNullable(); // e.g., 'price_calculated', 'promo_applied', 'experiment_assigned'
    table.string('entity_type', 50).notNullable(); // e.g., 'subscription', 'promotion', 'experiment'
    table.uuid('entity_id').nullable();
    table.string('plan_id', 50).nullable();
    table.string('billing_cycle', 20).nullable();
    table.decimal('base_price', 10, 2).nullable();
    table.decimal('final_price', 10, 2).nullable();
    table.jsonb('adjustments_applied').defaultTo('[]'); // List of adjustments
    table.jsonb('promotions_applied').defaultTo('[]');
    table.jsonb('regional_adjustment').defaultTo('{}');
    table.jsonb('personalized_adjustment').defaultTo('{}');
    table.jsonb('experiment_info').defaultTo('{}');
    table.string('country_code', 2).nullable();
    table.string('currency_code', 3).nullable();
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.uuid('performed_by').nullable(); // Admin user if manual change
    table.text('reason').nullable();
    table.jsonb('request_context').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('action');
    table.index('entity_type');
    table.index('created_at');
    table.index(['entity_type', 'entity_id']);
  });

  // =============================================================================
  // INSERT DEFAULT DATA
  // =============================================================================

  // Insert common regional pricing configurations
  await knex('regional_pricing').insert([
    // Tier 1: Full price countries (High income)
    {
      country_code: 'US',
      currency_code: 'USD',
      purchasing_power_index: 1.0,
      price_multiplier: 1.0,
      currency_conversion_rate: 1.0,
    },
    {
      country_code: 'GB',
      currency_code: 'GBP',
      purchasing_power_index: 0.95,
      price_multiplier: 0.95,
      currency_conversion_rate: 0.79,
    },
    {
      country_code: 'DE',
      currency_code: 'EUR',
      purchasing_power_index: 0.92,
      price_multiplier: 0.95,
      currency_conversion_rate: 0.92,
    },
    {
      country_code: 'FR',
      currency_code: 'EUR',
      purchasing_power_index: 0.9,
      price_multiplier: 0.95,
      currency_conversion_rate: 0.92,
    },
    {
      country_code: 'AU',
      currency_code: 'AUD',
      purchasing_power_index: 0.93,
      price_multiplier: 0.95,
      currency_conversion_rate: 1.53,
    },
    {
      country_code: 'CA',
      currency_code: 'CAD',
      purchasing_power_index: 0.94,
      price_multiplier: 0.95,
      currency_conversion_rate: 1.36,
    },
    {
      country_code: 'JP',
      currency_code: 'JPY',
      purchasing_power_index: 0.85,
      price_multiplier: 0.9,
      currency_conversion_rate: 149.5,
    },
    {
      country_code: 'SG',
      currency_code: 'SGD',
      purchasing_power_index: 0.88,
      price_multiplier: 0.9,
      currency_conversion_rate: 1.34,
    },
    {
      country_code: 'CH',
      currency_code: 'CHF',
      purchasing_power_index: 1.05,
      price_multiplier: 1.0,
      currency_conversion_rate: 0.88,
    },

    // Tier 2: Moderate discount countries (Upper-middle income)
    {
      country_code: 'ES',
      currency_code: 'EUR',
      purchasing_power_index: 0.75,
      price_multiplier: 0.8,
      currency_conversion_rate: 0.92,
    },
    {
      country_code: 'IT',
      currency_code: 'EUR',
      purchasing_power_index: 0.78,
      price_multiplier: 0.8,
      currency_conversion_rate: 0.92,
    },
    {
      country_code: 'KR',
      currency_code: 'KRW',
      purchasing_power_index: 0.72,
      price_multiplier: 0.75,
      currency_conversion_rate: 1320.0,
    },
    {
      country_code: 'TW',
      currency_code: 'TWD',
      purchasing_power_index: 0.7,
      price_multiplier: 0.75,
      currency_conversion_rate: 31.5,
    },
    {
      country_code: 'PL',
      currency_code: 'PLN',
      purchasing_power_index: 0.55,
      price_multiplier: 0.65,
      currency_conversion_rate: 4.05,
    },
    {
      country_code: 'CZ',
      currency_code: 'CZK',
      purchasing_power_index: 0.58,
      price_multiplier: 0.65,
      currency_conversion_rate: 23.2,
    },

    // Tier 3: Significant discount countries (Middle income)
    {
      country_code: 'MX',
      currency_code: 'MXN',
      purchasing_power_index: 0.45,
      price_multiplier: 0.55,
      currency_conversion_rate: 17.2,
    },
    {
      country_code: 'BR',
      currency_code: 'BRL',
      purchasing_power_index: 0.42,
      price_multiplier: 0.5,
      currency_conversion_rate: 4.95,
    },
    {
      country_code: 'AR',
      currency_code: 'ARS',
      purchasing_power_index: 0.35,
      price_multiplier: 0.45,
      currency_conversion_rate: 850.0,
    },
    {
      country_code: 'CO',
      currency_code: 'COP',
      purchasing_power_index: 0.38,
      price_multiplier: 0.5,
      currency_conversion_rate: 3950.0,
    },
    {
      country_code: 'CL',
      currency_code: 'CLP',
      purchasing_power_index: 0.48,
      price_multiplier: 0.55,
      currency_conversion_rate: 890.0,
    },
    {
      country_code: 'TH',
      currency_code: 'THB',
      purchasing_power_index: 0.4,
      price_multiplier: 0.5,
      currency_conversion_rate: 35.5,
    },
    {
      country_code: 'MY',
      currency_code: 'MYR',
      purchasing_power_index: 0.45,
      price_multiplier: 0.55,
      currency_conversion_rate: 4.7,
    },
    {
      country_code: 'TR',
      currency_code: 'TRY',
      purchasing_power_index: 0.38,
      price_multiplier: 0.45,
      currency_conversion_rate: 32.0,
    },
    {
      country_code: 'ZA',
      currency_code: 'ZAR',
      purchasing_power_index: 0.4,
      price_multiplier: 0.5,
      currency_conversion_rate: 18.8,
    },

    // Tier 4: Maximum discount countries (Lower income)
    {
      country_code: 'IN',
      currency_code: 'INR',
      purchasing_power_index: 0.28,
      price_multiplier: 0.35,
      currency_conversion_rate: 83.2,
    },
    {
      country_code: 'PH',
      currency_code: 'PHP',
      purchasing_power_index: 0.32,
      price_multiplier: 0.4,
      currency_conversion_rate: 56.0,
    },
    {
      country_code: 'ID',
      currency_code: 'IDR',
      purchasing_power_index: 0.3,
      price_multiplier: 0.4,
      currency_conversion_rate: 15750.0,
    },
    {
      country_code: 'VN',
      currency_code: 'VND',
      purchasing_power_index: 0.28,
      price_multiplier: 0.35,
      currency_conversion_rate: 24500.0,
    },
    {
      country_code: 'EG',
      currency_code: 'EGP',
      purchasing_power_index: 0.25,
      price_multiplier: 0.35,
      currency_conversion_rate: 30.9,
    },
    {
      country_code: 'NG',
      currency_code: 'NGN',
      purchasing_power_index: 0.22,
      price_multiplier: 0.3,
      currency_conversion_rate: 1550.0,
    },
    {
      country_code: 'PK',
      currency_code: 'PKR',
      purchasing_power_index: 0.2,
      price_multiplier: 0.3,
      currency_conversion_rate: 280.0,
    },
    {
      country_code: 'BD',
      currency_code: 'BDT',
      purchasing_power_index: 0.22,
      price_multiplier: 0.3,
      currency_conversion_rate: 110.0,
    },
  ]);

  // Insert sample promotions
  await knex('promotions').insert([
    {
      code: 'WELCOME50',
      name: 'Welcome Discount',
      description: 'Get 50% off your first month of any paid subscription',
      discount_type: 'percentage',
      discount_value: 50,
      applicable_plans: JSON.stringify(['basic', 'plus', 'premium', 'premium_plus', 'elite']),
      applicable_billing_cycles: JSON.stringify(['monthly']),
      max_uses_per_user: 1,
      first_time_only: true,
      starts_at: knex.fn.now(),
      ends_at: knex.raw("NOW() + INTERVAL '1 year'"),
      targeting_rules: JSON.stringify({ new_user: true }),
    },
    {
      code: 'ANNUAL20',
      name: 'Annual Savings',
      description: 'Extra 20% off when you commit to a yearly plan',
      discount_type: 'percentage',
      discount_value: 20,
      applicable_plans: JSON.stringify(['basic', 'plus', 'premium', 'premium_plus', 'elite']),
      applicable_billing_cycles: JSON.stringify(['yearly']),
      max_uses_per_user: 1,
      starts_at: knex.fn.now(),
      ends_at: knex.raw("NOW() + INTERVAL '2 years'"),
    },
    {
      code: 'FREETRIAL14',
      name: 'Extended Free Trial',
      description: 'Get a 14-day free trial of Premium',
      discount_type: 'free_trial_days',
      discount_value: 14,
      applicable_plans: JSON.stringify(['premium']),
      applicable_billing_cycles: JSON.stringify(['monthly', 'yearly']),
      max_uses_per_user: 1,
      first_time_only: true,
      requires_payment_method: true,
      starts_at: knex.fn.now(),
      ends_at: knex.raw("NOW() + INTERVAL '6 months'"),
    },
  ]);

  // Insert sample pricing rules
  await knex('pricing_rules').insert([
    {
      name: 'Loyalty Reward - 1 Year',
      description: 'Subscribers with 1+ year get 10% renewal discount',
      rule_type: 'loyalty',
      conditions: JSON.stringify({
        min_subscription_months: 12,
        current_status: 'active',
      }),
      actions: JSON.stringify({
        discount_type: 'percentage',
        discount_value: 10,
        apply_to: 'renewal',
      }),
      priority: 10,
      stackable: true,
      is_active: true,
    },
    {
      name: 'Win Back - 30 Day Lapse',
      description: 'Special offer for users who cancelled 30-90 days ago',
      rule_type: 'win_back',
      conditions: JSON.stringify({
        days_since_cancellation_min: 30,
        days_since_cancellation_max: 90,
        previous_tier: ['premium', 'premium_plus', 'elite'],
      }),
      actions: JSON.stringify({
        discount_type: 'percentage',
        discount_value: 30,
        valid_days: 7,
        message: 'We miss you! Come back with 30% off',
      }),
      priority: 20,
      is_active: true,
    },
    {
      name: 'Weekend Special',
      description: 'Extra 15% off subscriptions purchased on weekends',
      rule_type: 'time_based',
      conditions: JSON.stringify({
        days_of_week: [0, 6], // Sunday, Saturday
        timezone: 'user_local',
      }),
      actions: JSON.stringify({
        discount_type: 'percentage',
        discount_value: 15,
      }),
      priority: 5,
      stackable: true,
      is_active: true,
    },
  ]);

  // Insert sample bundles
  await knex('pricing_bundles').insert([
    {
      name: 'Super Boost Bundle',
      slug: 'super-boost-bundle',
      description: 'Get 5 Super Likes + 3 Boosts at a discounted price',
      included_items: JSON.stringify([
        { type: 'super_likes', quantity: 5, individual_price: 4.99 },
        { type: 'boosts', quantity: 3, individual_price: 5.99 },
      ]),
      base_price: 42.92,
      bundle_price: 29.99,
      savings_amount: 12.93,
      savings_percentage: 30.13,
      compatible_plans: JSON.stringify([
        'free',
        'basic',
        'plus',
        'premium',
        'premium_plus',
        'elite',
      ]),
      is_featured: true,
      is_active: true,
      sort_order: 1,
    },
    {
      name: 'Power User Pack',
      slug: 'power-user-pack',
      description: '10 Super Likes + 5 Boosts + 1 Month Premium',
      included_items: JSON.stringify([
        { type: 'super_likes', quantity: 10, individual_price: 4.99 },
        { type: 'boosts', quantity: 5, individual_price: 5.99 },
        {
          type: 'subscription_upgrade',
          tier: 'premium',
          duration_months: 1,
          individual_price: 19.99,
        },
      ]),
      base_price: 99.84,
      bundle_price: 69.99,
      savings_amount: 29.85,
      savings_percentage: 29.9,
      compatible_plans: JSON.stringify(['free', 'basic', 'plus']),
      requires_subscription: false,
      is_featured: true,
      is_active: true,
      sort_order: 2,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order to respect foreign key constraints
  await knex.schema.dropTableIfExists('pricing_audit_log');
  await knex.schema.dropTableIfExists('pricing_rules');
  await knex.schema.dropTableIfExists('pricing_bundles');
  await knex.schema.dropTableIfExists('user_experiment_assignments');
  await knex.schema.dropTableIfExists('price_experiment_variants');
  await knex.schema.dropTableIfExists('price_experiments');
  await knex.schema.dropTableIfExists('personalized_pricing');
  await knex.schema.dropTableIfExists('user_promotion_usage');
  await knex.schema.dropTableIfExists('promotions');
  await knex.schema.dropTableIfExists('regional_pricing');
}
