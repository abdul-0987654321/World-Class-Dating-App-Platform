import { Knex } from 'knex';

/**
 * Migration: Create Coin System Tables
 * Description: Virtual currency system for in-app purchases
 */
export async function up(knex: Knex): Promise<void> {
  // Create coins table (user coin balances)
  await knex.schema.createTable('coins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');

    // Balance tracking
    table.integer('balance').notNullable().defaultTo(0);
    table.integer('total_earned').notNullable().defaultTo(0);
    table.integer('total_spent').notNullable().defaultTo(0);
    table.integer('total_purchased').notNullable().defaultTo(0);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('balance');

    // Check constraint: balance must be non-negative
    table.check('balance >= 0', undefined, 'coins_balance_non_negative');
  });

  // Create coin_packages table (available coin packages for purchase)
  await knex.schema.createTable('coin_packages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Package details
    table.string('name', 50).notNullable();
    table.string('sku', 50).notNullable().unique(); // Product SKU
    table.integer('coins').notNullable(); // Base coins amount
    table.integer('bonus_coins').defaultTo(0); // Bonus coins

    // Pricing
    table.decimal('price', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');

    // Stripe integration
    table.string('stripe_price_id', 100).nullable();
    table.string('stripe_product_id', 100).nullable();

    // Package metadata
    table.boolean('is_popular').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.text('description').nullable();

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('sku');
    table.index('is_active');
    table.index('sort_order');
  });

  // Create coin_transactions table
  await knex.schema.createTable('coin_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Transaction type
    table.enum('type', [
      'purchase',
      'spent',
      'earned',
      'refund',
      'bonus',
      'gift',
      'admin_adjustment'
    ]).notNullable();

    // Amount (positive for credits, negative for debits)
    table.integer('amount').notNullable();
    table.integer('balance_after').notNullable();

    // Description and references
    table.text('description').nullable();
    table.string('reference_type', 50).nullable(); // 'super_like', 'boost', 'package', etc.
    table.uuid('reference_id').nullable(); // ID of the related item

    // Related records
    table.uuid('transaction_id').nullable()
      .references('id').inTable('transactions');
    table.uuid('package_id').nullable()
      .references('id').inTable('coin_packages');

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('type');
    table.index(['user_id', 'created_at']);
    table.index('reference_type');
    table.index('created_at');
  });

  // Insert default coin packages
  await knex('coin_packages').insert([
    {
      name: '10 Coins',
      sku: 'COIN_10',
      coins: 10,
      bonus_coins: 0,
      price: 4.99,
      description: 'Perfect for trying out premium features',
      is_popular: false,
      sort_order: 0,
    },
    {
      name: '25 Coins',
      sku: 'COIN_25',
      coins: 25,
      bonus_coins: 2,
      price: 9.99,
      description: 'Get 2 bonus coins!',
      is_popular: false,
      sort_order: 1,
    },
    {
      name: '50 Coins',
      sku: 'COIN_50',
      coins: 50,
      bonus_coins: 5,
      price: 17.99,
      description: 'Most popular! Get 5 bonus coins!',
      is_popular: true,
      sort_order: 2,
    },
    {
      name: '100 Coins',
      sku: 'COIN_100',
      coins: 100,
      bonus_coins: 15,
      price: 29.99,
      description: 'Best value! Get 15 bonus coins!',
      is_popular: false,
      sort_order: 3,
    },
    {
      name: '250 Coins',
      sku: 'COIN_250',
      coins: 250,
      bonus_coins: 50,
      price: 59.99,
      description: 'Ultimate package! Get 50 bonus coins!',
      is_popular: false,
      sort_order: 4,
    },
  ]);

  // Create trigger to update coin balance
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_coin_balance()
    RETURNS TRIGGER AS $$
    DECLARE
      current_balance INTEGER;
    BEGIN
      -- Get current balance
      SELECT balance INTO current_balance
      FROM coins
      WHERE user_id = NEW.user_id;

      -- Calculate new balance
      NEW.balance_after := current_balance + NEW.amount;

      -- Update coins table
      UPDATE coins
      SET
        balance = NEW.balance_after,
        total_earned = CASE
          WHEN NEW.type IN ('purchase', 'earned', 'bonus', 'gift', 'refund') THEN total_earned + NEW.amount
          ELSE total_earned
        END,
        total_spent = CASE
          WHEN NEW.type = 'spent' THEN total_spent + ABS(NEW.amount)
          ELSE total_spent
        END,
        total_purchased = CASE
          WHEN NEW.type = 'purchase' THEN total_purchased + NEW.amount
          ELSE total_purchased
        END,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_coin_balance
    BEFORE INSERT ON coin_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_coin_balance();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trigger_update_coin_balance ON coin_transactions');
  await knex.raw('DROP FUNCTION IF EXISTS update_coin_balance');
  await knex.schema.dropTableIfExists('coin_transactions');
  await knex.schema.dropTableIfExists('coin_packages');
  await knex.schema.dropTableIfExists('coins');
}
