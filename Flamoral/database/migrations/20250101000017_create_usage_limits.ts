import { Knex } from 'knex';

/**
 * Migration: Create Usage Limits Table
 * Description: Tracks daily usage limits for swipes, super likes, and boosts
 */
export async function up(knex: Knex): Promise<void> {
  // Create usage_limits table
  await knex.schema.createTable('usage_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Daily usage tracking
    table.integer('swipes_today').notNullable().defaultTo(0);
    table.integer('likes_today').notNullable().defaultTo(0);
    table.integer('super_likes_today').notNullable().defaultTo(0);
    table.integer('boosts_today').notNullable().defaultTo(0);
    table.integer('rewinds_today').notNullable().defaultTo(0);

    // Monthly tracking
    table.integer('boosts_this_month').notNullable().defaultTo(0);
    table.integer('super_likes_this_month').notNullable().defaultTo(0);

    // Usage limits (from subscription tier)
    table.integer('daily_swipe_limit').notNullable().defaultTo(50);
    table.integer('daily_super_like_limit').notNullable().defaultTo(1);
    table.integer('monthly_boost_limit').notNullable().defaultTo(0);
    table.integer('daily_rewind_limit').notNullable().defaultTo(0);

    // Premium features
    table.boolean('unlimited_swipes').notNullable().defaultTo(false);
    table.boolean('unlimited_likes').notNullable().defaultTo(false);
    table.boolean('unlimited_rewinds').notNullable().defaultTo(false);

    // Reset timestamps
    table.timestamp('daily_reset_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('monthly_reset_at').notNullable().defaultTo(knex.fn.now());
    table.date('reset_date').notNullable().defaultTo(knex.fn.now());

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('reset_date');
    table.index(['user_id', 'reset_date']);
    table.index('daily_reset_at');

    // Unique constraint: One record per user per day
    table.unique(['user_id', 'reset_date']);
  });

  // Create function to reset daily limits
  await knex.raw(`
    CREATE OR REPLACE FUNCTION reset_daily_limits()
    RETURNS void AS $$
    BEGIN
      -- Reset daily counters for records older than today
      UPDATE usage_limits
      SET
        swipes_today = 0,
        likes_today = 0,
        super_likes_today = 0,
        boosts_today = 0,
        rewinds_today = 0,
        daily_reset_at = CURRENT_TIMESTAMP,
        reset_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
      WHERE reset_date < CURRENT_DATE;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to reset monthly limits
  await knex.raw(`
    CREATE OR REPLACE FUNCTION reset_monthly_limits()
    RETURNS void AS $$
    BEGIN
      -- Reset monthly counters for records older than this month
      UPDATE usage_limits
      SET
        boosts_this_month = 0,
        super_likes_this_month = 0,
        monthly_reset_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE DATE_TRUNC('month', monthly_reset_at) < DATE_TRUNC('month', CURRENT_TIMESTAMP);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to sync limits from subscription plans
  await knex.raw(`
    CREATE OR REPLACE FUNCTION sync_usage_limits_from_subscription()
    RETURNS TRIGGER AS $$
    DECLARE
      plan_record RECORD;
    BEGIN
      -- Get subscription plan details
      SELECT
        sp.daily_swipes,
        sp.daily_super_likes,
        sp.monthly_boosts,
        sp.unlimited_likes,
        sp.unlimited_rewinds
      INTO plan_record
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.user_id = NEW.id
        AND s.status = 'active'
      LIMIT 1;

      -- Update or insert usage limits
      INSERT INTO usage_limits (
        user_id,
        daily_swipe_limit,
        daily_super_like_limit,
        monthly_boost_limit,
        unlimited_swipes,
        unlimited_likes,
        unlimited_rewinds,
        reset_date,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        COALESCE(plan_record.daily_swipes, 50),
        COALESCE(plan_record.daily_super_likes, 1),
        COALESCE(plan_record.monthly_boosts, 0),
        COALESCE(plan_record.daily_swipes >= 999999, false),
        COALESCE(plan_record.unlimited_likes, false),
        COALESCE(plan_record.unlimited_rewinds, false),
        CURRENT_DATE,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, reset_date)
      DO UPDATE SET
        daily_swipe_limit = COALESCE(plan_record.daily_swipes, 50),
        daily_super_like_limit = COALESCE(plan_record.daily_super_likes, 1),
        monthly_boost_limit = COALESCE(plan_record.monthly_boosts, 0),
        unlimited_swipes = COALESCE(plan_record.daily_swipes >= 999999, false),
        unlimited_likes = COALESCE(plan_record.unlimited_likes, false),
        unlimited_rewinds = COALESCE(plan_record.unlimited_rewinds, false),
        updated_at = NOW();

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger to sync limits when subscription changes
  await knex.raw(`
    CREATE TRIGGER trigger_sync_usage_limits_on_subscription_change
    AFTER UPDATE OF subscription_tier ON users
    FOR EACH ROW
    WHEN (OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier)
    EXECUTE FUNCTION sync_usage_limits_from_subscription();
  `);

  // Initialize usage limits for all existing users
  await knex.raw(`
    INSERT INTO usage_limits (
      user_id,
      daily_swipe_limit,
      daily_super_like_limit,
      monthly_boost_limit,
      unlimited_swipes,
      unlimited_likes,
      unlimited_rewinds,
      reset_date,
      created_at,
      updated_at
    )
    SELECT
      u.id,
      COALESCE(sp.daily_swipes, 50),
      COALESCE(sp.daily_super_likes, 1),
      COALESCE(sp.monthly_boosts, 0),
      COALESCE(sp.daily_swipes >= 999999, false),
      COALESCE(sp.unlimited_likes, false),
      COALESCE(sp.unlimited_rewinds, false),
      CURRENT_DATE,
      NOW(),
      NOW()
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
    LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
    ON CONFLICT (user_id, reset_date) DO NOTHING;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop trigger
  await knex.raw('DROP TRIGGER IF EXISTS trigger_sync_usage_limits_on_subscription_change ON users');

  // Drop functions
  await knex.raw('DROP FUNCTION IF EXISTS sync_usage_limits_from_subscription');
  await knex.raw('DROP FUNCTION IF EXISTS reset_monthly_limits');
  await knex.raw('DROP FUNCTION IF EXISTS reset_daily_limits');

  // Drop table
  await knex.schema.dropTableIfExists('usage_limits');
}
