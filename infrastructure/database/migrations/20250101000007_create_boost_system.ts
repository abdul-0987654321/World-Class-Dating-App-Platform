import { Knex } from 'knex';

/**
 * Migration: Create Boost System Tables
 * Description: Profile boost functionality for increased visibility
 */
export async function up(knex: Knex): Promise<void> {
  // Create boost_products table
  await knex.schema.createTable('boost_products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Product details
    table.string('name', 100).notNullable();
    table.string('sku', 50).notNullable().unique();
    table.text('description').nullable();

    // Boost configuration
    table.enum('type', ['standard', 'prime_time', 'spotlight'])
      .notNullable()
      .defaultTo('standard');
    table.integer('duration_minutes').notNullable(); // Boost duration

    // Pricing
    table.integer('coin_cost').notNullable(); // Cost in coins
    table.decimal('usd_price', 10, 2).nullable(); // Direct USD price (optional)

    // Boost effectiveness
    table.integer('visibility_multiplier').notNullable().defaultTo(10);

    // Stripe integration (for direct purchase)
    table.string('stripe_price_id', 100).nullable();
    table.string('stripe_product_id', 100).nullable();

    // Product metadata
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_featured').defaultTo(false);
    table.integer('sort_order').defaultTo(0);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('sku');
    table.index('type');
    table.index('is_active');
  });

  // Create boosts table (user boost history and active boosts)
  await knex.schema.createTable('boosts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('product_id').notNullable()
      .references('id').inTable('boost_products');

    // Boost details
    table.enum('type', ['standard', 'prime_time', 'spotlight'])
      .notNullable()
      .defaultTo('standard');

    table.enum('status', [
      'pending',
      'active',
      'completed',
      'expired',
      'canceled'
    ]).notNullable().defaultTo('pending');

    // Timing
    table.integer('duration_minutes').notNullable();
    table.timestamp('start_time').nullable();
    table.timestamp('end_time').nullable();

    // Performance metrics
    table.integer('impressions_gained').notNullable().defaultTo(0);
    table.integer('profile_views').notNullable().defaultTo(0);
    table.integer('likes_gained').notNullable().defaultTo(0);
    table.integer('super_likes_gained').notNullable().defaultTo(0);
    table.integer('matches_gained').notNullable().defaultTo(0);

    // Purchase information
    table.uuid('transaction_id').nullable()
      .references('id').inTable('transactions');
    table.uuid('coin_transaction_id').nullable()
      .references('id').inTable('coin_transactions');

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index(['user_id', 'status']);
    table.index('end_time');
    table.index('start_time');
    table.index(['status', 'end_time']);
  });

  // Insert default boost products
  await knex('boost_products').insert([
    {
      name: 'Standard Boost',
      sku: 'BOOST_STANDARD_30',
      description: 'Boost your profile for 30 minutes to get 10x more views',
      type: 'standard',
      duration_minutes: 30,
      coin_cost: 5,
      usd_price: 3.99,
      visibility_multiplier: 10,
      is_featured: false,
      sort_order: 0,
    },
    {
      name: 'Prime Time Boost',
      sku: 'BOOST_PRIMETIME_60',
      description: 'Boost during peak hours (6-9 PM) for maximum visibility',
      type: 'prime_time',
      duration_minutes: 60,
      coin_cost: 10,
      usd_price: 7.99,
      visibility_multiplier: 15,
      is_featured: true,
      sort_order: 1,
    },
    {
      name: 'Spotlight',
      sku: 'BOOST_SPOTLIGHT_60',
      description: 'Get featured in the spotlight section for 1 hour',
      type: 'spotlight',
      duration_minutes: 60,
      coin_cost: 15,
      usd_price: 11.99,
      visibility_multiplier: 20,
      is_featured: false,
      sort_order: 2,
    },
  ]);

  // Create trigger to auto-expire boosts
  await knex.raw(`
    CREATE OR REPLACE FUNCTION auto_expire_boosts()
    RETURNS void AS $$
    BEGIN
      UPDATE boosts
      SET status = 'expired'
      WHERE status = 'active'
        AND end_time < NOW();
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to activate a boost
  await knex.raw(`
    CREATE OR REPLACE FUNCTION activate_boost()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status = 'active' AND OLD.status = 'pending' THEN
        NEW.start_time := NOW();
        NEW.end_time := NOW() + (NEW.duration_minutes || ' minutes')::INTERVAL;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_activate_boost
    BEFORE UPDATE ON boosts
    FOR EACH ROW
    WHEN (NEW.status = 'active' AND OLD.status = 'pending')
    EXECUTE FUNCTION activate_boost();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trigger_activate_boost ON boosts');
  await knex.raw('DROP FUNCTION IF EXISTS activate_boost');
  await knex.raw('DROP FUNCTION IF EXISTS auto_expire_boosts');
  await knex.schema.dropTableIfExists('boosts');
  await knex.schema.dropTableIfExists('boost_products');
}
