import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries
  await knex('coin_products').del();

  // Insert coin product packages
  await knex('coin_products').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      sku: 'COIN_PACK_SMALL',
      name: 'Small Coin Pack',
      description: 'Perfect for trying out premium features',
      amount: 100,
      bonus_coins: 0,
      price: 4.99,
      currency: 'USD',
      stripe_price_id: 'price_coin_pack_small', // Replace with actual Stripe price ID
      is_active: true,
      is_popular: false,
      display_order: 1,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: knex.raw('gen_random_uuid()'),
      sku: 'COIN_PACK_MEDIUM',
      name: 'Medium Coin Pack',
      description: 'Great value for regular users',
      amount: 500,
      bonus_coins: 50,
      price: 19.99,
      currency: 'USD',
      stripe_price_id: 'price_coin_pack_medium', // Replace with actual Stripe price ID
      is_active: true,
      is_popular: false,
      display_order: 2,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: knex.raw('gen_random_uuid()'),
      sku: 'COIN_PACK_LARGE',
      name: 'Large Coin Pack',
      description: 'Most popular choice with 20% bonus',
      amount: 1200,
      bonus_coins: 300,
      price: 39.99,
      currency: 'USD',
      stripe_price_id: 'price_coin_pack_large', // Replace with actual Stripe price ID
      is_active: true,
      is_popular: true,
      display_order: 3,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: knex.raw('gen_random_uuid()'),
      sku: 'COIN_PACK_XL',
      name: 'XL Coin Pack',
      description: 'Best value with 25% bonus coins',
      amount: 2500,
      bonus_coins: 625,
      price: 74.99,
      currency: 'USD',
      stripe_price_id: 'price_coin_pack_xl', // Replace with actual Stripe price ID
      is_active: true,
      is_popular: false,
      display_order: 4,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);

  console.log('✓ Seeded 4 coin products');
}
