import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries
  await knex('boost_products').del();

  // Insert boost product packages
  await knex('boost_products').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      sku: 'BOOST_30MIN',
      name: '30 Minute Boost',
      description: 'Quick profile boost to get noticed',
      duration_minutes: 30,
      price: 4.99,
      coin_cost: 50,
      currency: 'USD',
      stripe_price_id: 'price_boost_30min', // Replace with actual Stripe price ID
      is_active: true,
      is_popular: false,
      display_order: 1,
      features: JSON.stringify([
        'Be the top profile in your area for 30 minutes',
        'Up to 10x more profile views',
        'Increased match chances',
      ]),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: knex.raw('gen_random_uuid()'),
      sku: 'BOOST_1HR',
      name: '1 Hour Boost',
      description: 'Extended visibility for better results',
      duration_minutes: 60,
      price: 7.99,
      coin_cost: 80,
      currency: 'USD',
      stripe_price_id: 'price_boost_1hr', // Replace with actual Stripe price ID
      is_active: true,
      is_popular: true,
      display_order: 2,
      features: JSON.stringify([
        'Be the top profile in your area for 1 hour',
        'Up to 10x more profile views',
        'Increased match chances',
        'Best value for time',
      ]),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: knex.raw('gen_random_uuid()'),
      sku: 'BOOST_3HR',
      name: '3 Hour Boost',
      description: 'Maximum exposure for serious daters',
      duration_minutes: 180,
      price: 14.99,
      coin_cost: 150,
      currency: 'USD',
      stripe_price_id: 'price_boost_3hr', // Replace with actual Stripe price ID
      is_active: true,
      is_popular: false,
      display_order: 3,
      features: JSON.stringify([
        'Be the top profile in your area for 3 hours',
        'Up to 10x more profile views',
        'Increased match chances',
        'Perfect for evening prime time',
        'Best overall value',
      ]),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);

  console.log('✓ Seeded 3 boost products');
}
