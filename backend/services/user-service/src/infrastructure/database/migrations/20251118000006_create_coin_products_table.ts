import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('coin_products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('sku', 50).notNullable().unique();
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.integer('coin_amount').notNullable();
    table.integer('bonus_coins').notNullable().defaultTo(0);
    table.decimal('price_usd', 10, 2).notNullable();
    table.string('stripe_price_id', 100).nullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.integer('display_order').notNullable().defaultTo(0);
    table.string('badge_text', 50).nullable(); // e.g., "BEST VALUE", "POPULAR"
    table.timestamps(true, true);

    // Indexes
    table.index('sku');
    table.index('active');
    table.index('display_order');
  });

  // Seed default coin packages
  await knex('coin_products').insert([
    {
      sku: 'coins_10',
      name: 'Starter Pack',
      description: '10 coins to get started',
      coin_amount: 10,
      bonus_coins: 0,
      price_usd: 0.99,
      display_order: 1,
      active: true,
    },
    {
      sku: 'coins_50',
      name: 'Small Pack',
      description: '50 coins + 5 bonus',
      coin_amount: 50,
      bonus_coins: 5,
      price_usd: 4.99,
      display_order: 2,
      badge_text: 'POPULAR',
      active: true,
    },
    {
      sku: 'coins_100',
      name: 'Medium Pack',
      description: '100 coins + 15 bonus',
      coin_amount: 100,
      bonus_coins: 15,
      price_usd: 9.99,
      display_order: 3,
      active: true,
    },
    {
      sku: 'coins_250',
      name: 'Large Pack',
      description: '250 coins + 50 bonus',
      coin_amount: 250,
      bonus_coins: 50,
      price_usd: 24.99,
      display_order: 4,
      badge_text: 'BEST VALUE',
      active: true,
    },
    {
      sku: 'coins_500',
      name: 'Mega Pack',
      description: '500 coins + 125 bonus',
      coin_amount: 500,
      bonus_coins: 125,
      price_usd: 49.99,
      display_order: 5,
      active: true,
    },
    {
      sku: 'coins_1000',
      name: 'Ultimate Pack',
      description: '1000 coins + 300 bonus',
      coin_amount: 1000,
      bonus_coins: 300,
      price_usd: 99.99,
      display_order: 6,
      active: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('coin_products');
}
