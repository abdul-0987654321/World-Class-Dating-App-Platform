import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Gem store items table - defines purchasable items
  await knex.schema.createTable('gem_store_items', (table) => {
    table.uuid('id').primary();
    table.string('name', 100).notNullable();
    table.text('description').notNullable();
    table.enum('type', ['boost', 'superlike', 'spotlight', 'gift', 'utility', 'cosmetic']).notNullable();
    table.integer('gem_cost').notNullable();
    table.integer('duration_minutes').nullable(); // For time-based items
    table.integer('quantity').nullable(); // For pack items (e.g., 5 super likes)
    table.string('image_url', 500).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('sort_order').notNullable().defaultTo(0);
    table.jsonb('metadata').nullable(); // Additional configuration
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('type');
    table.index('is_active');
    table.index('sort_order');
  });

  // Gem purchases table - tracks user purchases
  await knex.schema.createTable('gem_purchases', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('item_id').notNullable().references('id').inTable('gem_store_items').onDelete('RESTRICT');
    table.string('item_name', 100).notNullable(); // Snapshot at purchase time
    table.string('item_type', 50).notNullable(); // Snapshot at purchase time
    table.integer('gems_cost').notNullable();
    table.integer('quantity').notNullable().defaultTo(1);
    table.integer('quantity_remaining').notNullable().defaultTo(1);
    table.timestamp('purchased_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('activated_at').nullable();
    table.timestamp('expires_at').nullable();
    table.enum('status', ['pending', 'active', 'used', 'expired', 'refunded']).notNullable().defaultTo('active');
    table.uuid('recipient_id').nullable().references('id').inTable('users').onDelete('SET NULL'); // For gifts
    table.jsonb('metadata').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('item_id');
    table.index('item_type');
    table.index('status');
    table.index('expires_at');
    table.index('recipient_id');
    table.index(['user_id', 'status']);
    table.index(['user_id', 'item_type', 'status']);
    table.index(['recipient_id', 'created_at']);
  });

  // Seed default store items
  const now = new Date();
  const defaultItems = [
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Profile Boost',
      description: 'Get 10x more visibility for 30 minutes. Your profile appears at the top of discovery.',
      type: 'boost',
      gem_cost: 50,
      duration_minutes: 30,
      quantity: null,
      image_url: '/assets/store/boost.png',
      is_active: true,
      sort_order: 1,
      metadata: JSON.stringify({ multiplier: 10, feature: 'discovery_priority' }),
      created_at: now,
      updated_at: now,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Super Like Pack',
      description: 'Stand out from the crowd! Get 5 extra Super Likes to show special interest.',
      type: 'superlike',
      gem_cost: 30,
      duration_minutes: null,
      quantity: 5,
      image_url: '/assets/store/superlike.png',
      is_active: true,
      sort_order: 2,
      metadata: JSON.stringify({ feature: 'super_like' }),
      created_at: now,
      updated_at: now,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Spotlight',
      description: 'Be featured prominently in discovery for 1 hour. Get seen by up to 10x more people.',
      type: 'spotlight',
      gem_cost: 100,
      duration_minutes: 60,
      quantity: null,
      image_url: '/assets/store/spotlight.png',
      is_active: true,
      sort_order: 3,
      metadata: JSON.stringify({ feature: 'featured_placement' }),
      created_at: now,
      updated_at: now,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Read Receipts',
      description: 'See when your messages have been read for the next 7 days.',
      type: 'utility',
      gem_cost: 20,
      duration_minutes: 10080, // 7 days
      quantity: null,
      image_url: '/assets/store/read-receipts.png',
      is_active: true,
      sort_order: 4,
      metadata: JSON.stringify({ feature: 'read_receipts' }),
      created_at: now,
      updated_at: now,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Virtual Rose',
      description: 'Send a beautiful virtual rose to your match.',
      type: 'gift',
      gem_cost: 10,
      duration_minutes: null,
      quantity: 1,
      image_url: '/assets/store/gift-rose.png',
      is_active: true,
      sort_order: 5,
      metadata: JSON.stringify({ giftType: 'rose', emoji: '🌹' }),
      created_at: now,
      updated_at: now,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Virtual Heart',
      description: 'Show you care with a heartfelt virtual heart.',
      type: 'gift',
      gem_cost: 15,
      duration_minutes: null,
      quantity: 1,
      image_url: '/assets/store/gift-heart.png',
      is_active: true,
      sort_order: 6,
      metadata: JSON.stringify({ giftType: 'heart', emoji: '❤️' }),
      created_at: now,
      updated_at: now,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Virtual Star',
      description: 'Let them know they are your star with this special gift.',
      type: 'gift',
      gem_cost: 25,
      duration_minutes: null,
      quantity: 1,
      image_url: '/assets/store/gift-star.png',
      is_active: true,
      sort_order: 7,
      metadata: JSON.stringify({ giftType: 'star', emoji: '⭐' }),
      created_at: now,
      updated_at: now,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Virtual Diamond',
      description: 'The most prestigious gift - show them they are truly special.',
      type: 'gift',
      gem_cost: 50,
      duration_minutes: null,
      quantity: 1,
      image_url: '/assets/store/gift-diamond.png',
      is_active: true,
      sort_order: 8,
      metadata: JSON.stringify({ giftType: 'diamond', emoji: '💎' }),
      created_at: now,
      updated_at: now,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Undo Pass',
      description: 'Changed your mind? Undo your last pass and get another chance.',
      type: 'utility',
      gem_cost: 25,
      duration_minutes: null,
      quantity: 1,
      image_url: '/assets/store/undo.png',
      is_active: true,
      sort_order: 9,
      metadata: JSON.stringify({ feature: 'undo_pass' }),
      created_at: now,
      updated_at: now,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Profile Highlight',
      description: 'Get a gold border on your profile for 24 hours. Stand out in chat lists!',
      type: 'cosmetic',
      gem_cost: 75,
      duration_minutes: 1440, // 24 hours
      quantity: null,
      image_url: '/assets/store/highlight.png',
      is_active: true,
      sort_order: 10,
      metadata: JSON.stringify({ feature: 'gold_border' }),
      created_at: now,
      updated_at: now,
    },
  ];

  // Insert default items
  for (const item of defaultItems) {
    await knex('gem_store_items').insert(item);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('gem_purchases');
  await knex.schema.dropTableIfExists('gem_store_items');
}
