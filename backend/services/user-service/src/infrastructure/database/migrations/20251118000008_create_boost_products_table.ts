import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('boost_products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('sku', 50).notNullable().unique();
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.enum('type', ['standard', 'prime_time', 'spotlight']).notNullable();
    table.integer('duration_minutes').notNullable();
    table.integer('visibility_multiplier').notNullable();
    table.integer('quantity').notNullable().defaultTo(1); // For packs
    table.integer('coin_price').notNullable();
    table.decimal('usd_price', 10, 2).notNullable();
    table.string('stripe_price_id', 100).nullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.integer('display_order').notNullable().defaultTo(0);
    table.string('badge_text', 50).nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('sku');
    table.index('type');
    table.index('active');
  });

  // Seed default boost products
  await knex('boost_products').insert([
    {
      sku: 'boost_single',
      name: 'Single Boost',
      description: '30 minutes of 10x visibility',
      type: 'standard',
      duration_minutes: 30,
      visibility_multiplier: 10,
      quantity: 1,
      coin_price: 30,
      usd_price: 3.99,
      display_order: 1,
      active: true,
    },
    {
      sku: 'boost_pack_3',
      name: '3 Boost Pack',
      description: 'Get 3 boosts, save 20%',
      type: 'standard',
      duration_minutes: 30,
      visibility_multiplier: 10,
      quantity: 3,
      coin_price: 72,
      usd_price: 9.99,
      display_order: 2,
      badge_text: 'POPULAR',
      active: true,
    },
    {
      sku: 'boost_pack_10',
      name: '10 Boost Pack',
      description: 'Get 10 boosts, save 40%',
      type: 'standard',
      duration_minutes: 30,
      visibility_multiplier: 10,
      quantity: 10,
      coin_price: 180,
      usd_price: 24.99,
      display_order: 3,
      badge_text: 'BEST VALUE',
      active: true,
    },
    {
      sku: 'boost_prime_time',
      name: 'Prime Time Boost',
      description: '60 minutes of 15x visibility during peak hours',
      type: 'prime_time',
      duration_minutes: 60,
      visibility_multiplier: 15,
      quantity: 1,
      coin_price: 50,
      usd_price: 5.99,
      display_order: 4,
      active: true,
    },
    {
      sku: 'boost_spotlight',
      name: 'Spotlight Boost',
      description: '120 minutes of 20x visibility with featured placement',
      type: 'spotlight',
      duration_minutes: 120,
      visibility_multiplier: 20,
      quantity: 1,
      coin_price: 100,
      usd_price: 9.99,
      display_order: 5,
      active: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('boost_products');
}
