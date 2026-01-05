import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Partners table - stores all partner integrations
  await knex.schema.createTable('partners', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.enum('type', ['restaurant', 'events', 'gifts', 'experiences']).notNullable();
    table
      .enum('integration_type', [
        'opentable',
        'resy',
        'ticketmaster',
        'eventbrite',
        'flowers',
        'custom',
      ])
      .notNullable();
    table.enum('status', ['active', 'inactive', 'pending', 'suspended']).defaultTo('pending');
    table.text('api_key');
    table.text('api_secret');
    table.text('webhook_secret');
    table.string('base_url', 500);
    table.string('affiliate_id', 100);
    table.decimal('commission_rate', 5, 2).notNullable().defaultTo(10);
    table.jsonb('metadata').defaultTo('{}');
    table.string('contact_email', 255).notNullable();
    table.string('contact_phone', 50);
    table.string('logo_url', 500);
    table.text('description');
    table.string('terms_url', 500);
    table.timestamps(true, true);

    table.index('type');
    table.index('status');
    table.index('integration_type');
  });

  // Restaurants table - cached restaurant data from partners
  await knex.schema.createTable('restaurants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('partner_id').notNullable().references('id').inTable('partners').onDelete('CASCADE');
    table.string('external_id', 100).notNullable();
    table.string('name', 200).notNullable();
    table.text('description');
    table.specificType('cuisine', 'text[]').defaultTo('{}');
    table.integer('price_range').notNullable().defaultTo(2);
    table.decimal('rating', 3, 2);
    table.integer('review_count').defaultTo(0);
    table.string('street1', 200);
    table.string('street2', 200);
    table.string('city', 100);
    table.string('state', 50);
    table.string('postal_code', 20);
    table.string('country', 50).defaultTo('US');
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);
    table.string('phone', 50);
    table.string('website', 500);
    table.specificType('image_urls', 'text[]').defaultTo('{}');
    table.specificType('amenities', 'text[]').defaultTo('{}');
    table.string('dress_code', 100);
    table.boolean('is_date_night').defaultTo(false);
    table.integer('romantic_score');
    table.jsonb('operating_hours').defaultTo('[]');
    table.timestamps(true, true);

    table.unique(['partner_id', 'external_id']);
    table.index('partner_id');
    table.index(['latitude', 'longitude']);
    table.index('is_date_night');
    table.index('rating');
  });

  // Reservations table
  await knex.schema.createTable('reservations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('match_id');
    table.uuid('partner_id').notNullable().references('id').inTable('partners');
    table.uuid('restaurant_id').notNullable().references('id').inTable('restaurants');
    table.string('external_reservation_id', 100);
    table
      .enum('status', ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
      .defaultTo('pending');
    table.date('date').notNullable();
    table.time('time').notNullable();
    table.integer('party_size').notNullable().defaultTo(2);
    table.text('special_requests');
    table.string('confirmation_code', 50);
    table.boolean('reminder_sent').defaultTo(false);
    table.string('affiliate_tracking_id', 100).notNullable();
    table.decimal('commission', 10, 2);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('match_id');
    table.index('partner_id');
    table.index('restaurant_id');
    table.index('status');
    table.index('date');
    table.index('affiliate_tracking_id');
  });

  // Events table - cached event data from partners
  await knex.schema.createTable('events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('partner_id').notNullable().references('id').inTable('partners').onDelete('CASCADE');
    table.string('external_id', 100).notNullable();
    table.string('name', 300).notNullable();
    table.text('description');
    table
      .enum('category', [
        'concerts',
        'sports',
        'theater',
        'comedy',
        'festivals',
        'experiences',
        'classes',
        'food_drink',
      ])
      .notNullable();
    table.string('subcategory', 100);
    table.string('venue_name', 200);
    table.string('venue_street1', 200);
    table.string('venue_city', 100);
    table.string('venue_state', 50);
    table.string('venue_postal_code', 20);
    table.string('venue_country', 50).defaultTo('US');
    table.decimal('venue_latitude', 10, 7);
    table.decimal('venue_longitude', 10, 7);
    table.integer('venue_capacity');
    table.timestamp('start_date_time').notNullable();
    table.timestamp('end_date_time');
    table.specificType('image_urls', 'text[]').defaultTo('{}');
    table.decimal('price_min', 10, 2);
    table.decimal('price_max', 10, 2);
    table.string('currency', 3).defaultTo('USD');
    table.boolean('is_date_friendly').defaultTo(false);
    table.integer('age_restriction');
    table.integer('tickets_remaining');
    table.boolean('is_sold_out').defaultTo(false);
    table.string('url', 500);
    table.timestamps(true, true);

    table.unique(['partner_id', 'external_id']);
    table.index('partner_id');
    table.index('category');
    table.index('start_date_time');
    table.index('is_date_friendly');
    table.index(['venue_latitude', 'venue_longitude']);
  });

  // Ticket purchases table
  await knex.schema.createTable('ticket_purchases', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('match_id');
    table.uuid('partner_id').notNullable().references('id').inTable('partners');
    table.uuid('event_id').notNullable().references('id').inTable('events');
    table.string('external_order_id', 100);
    table
      .enum('status', ['pending', 'confirmed', 'cancelled', 'refunded', 'attended'])
      .defaultTo('pending');
    table.jsonb('tickets').notNullable().defaultTo('[]');
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.string('payment_intent_id', 100);
    table.string('affiliate_tracking_id', 100).notNullable();
    table.decimal('commission', 10, 2);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('match_id');
    table.index('partner_id');
    table.index('event_id');
    table.index('status');
    table.index('affiliate_tracking_id');
  });

  // Gift products table
  await knex.schema.createTable('gift_products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('partner_id').notNullable().references('id').inTable('partners').onDelete('CASCADE');
    table.string('external_id', 100).notNullable();
    table.string('name', 200).notNullable();
    table.text('description');
    table
      .enum('category', ['flowers', 'chocolates', 'wine', 'jewelry', 'experiences', 'custom'])
      .notNullable();
    table.decimal('price', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.specificType('image_urls', 'text[]').defaultTo('{}');
    table.jsonb('options').defaultTo('[]');
    table.boolean('is_available').defaultTo(true);
    table.jsonb('delivery_options').notNullable().defaultTo('[]');
    table.boolean('is_romantic').defaultTo(true);
    table.specificType('occasion_tags', 'text[]').defaultTo('{}');
    table.timestamps(true, true);

    table.unique(['partner_id', 'external_id']);
    table.index('partner_id');
    table.index('category');
    table.index('is_available');
    table.index('is_romantic');
    table.index('price');
  });

  // Gift orders table
  await knex.schema.createTable('gift_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('recipient_match_id');
    table.uuid('partner_id').notNullable().references('id').inTable('partners');
    table.string('external_order_id', 100);
    table
      .enum('status', [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
      ])
      .defaultTo('pending');
    table.jsonb('items').notNullable().defaultTo('[]');
    table.jsonb('shipping_address').notNullable();
    table.jsonb('billing_address');
    table.jsonb('delivery_option').notNullable();
    table.text('gift_message');
    table.boolean('is_anonymous').defaultTo(false);
    table.decimal('subtotal', 10, 2).notNullable();
    table.decimal('shipping_cost', 10, 2).notNullable().defaultTo(0);
    table.decimal('tax', 10, 2).notNullable().defaultTo(0);
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.string('payment_intent_id', 100);
    table.string('affiliate_tracking_id', 100).notNullable();
    table.decimal('commission', 10, 2);
    table.string('tracking_number', 100);
    table.timestamp('estimated_delivery_date');
    table.timestamp('actual_delivery_date');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('recipient_match_id');
    table.index('partner_id');
    table.index('status');
    table.index('affiliate_tracking_id');
  });

  // Affiliate clicks table - tracks user clicks for attribution
  await knex.schema.createTable('affiliate_clicks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('partner_id').notNullable().references('id').inTable('partners');
    table.string('tracking_id', 100).notNullable().unique();
    table.enum('resource_type', ['restaurant', 'event', 'gift']).notNullable();
    table.uuid('resource_id').notNullable();
    table.string('referrer_url', 500);
    table.text('user_agent');
    table.string('ip_address', 45);
    table.timestamp('converted_at');
    table.uuid('conversion_order_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('partner_id');
    table.index('tracking_id');
    table.index('resource_type');
    table.index('created_at');
  });

  // Affiliate commissions table - tracks earned commissions
  await knex.schema.createTable('affiliate_commissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('partner_id').notNullable().references('id').inTable('partners');
    table.uuid('order_id').notNullable();
    table.enum('order_type', ['reservation', 'ticket', 'gift']).notNullable();
    table.decimal('order_amount', 10, 2).notNullable();
    table.decimal('commission_rate', 5, 2).notNullable();
    table.decimal('commission_amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.enum('status', ['pending', 'approved', 'paid', 'rejected']).defaultTo('pending');
    table.timestamp('paid_at');
    table.timestamps(true, true);

    table.index('partner_id');
    table.index('order_id');
    table.index('order_type');
    table.index('status');
    table.index('created_at');
  });

  // Date plan suggestions table
  await knex.schema.createTable('date_plan_suggestions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('match_id');
    table.string('title', 200).notNullable();
    table.text('description');
    table.decimal('budget_min', 10, 2);
    table.decimal('budget_max', 10, 2);
    table.string('budget_currency', 3).defaultTo('USD');
    table.string('duration', 50);
    table.jsonb('activities').notNullable().defaultTo('[]');
    table.decimal('total_estimated_cost', 10, 2);
    table.integer('romantic_score');
    table.integer('adventure_score');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('match_id');
    table.index('created_at');
  });

  // Order history view for unified order tracking
  await knex.raw(`
    CREATE VIEW order_history AS
    SELECT
      id,
      user_id,
      match_id,
      partner_id,
      'reservation' as order_type,
      status,
      NULL as total_amount,
      'USD' as currency,
      affiliate_tracking_id,
      commission,
      created_at,
      updated_at
    FROM reservations
    UNION ALL
    SELECT
      id,
      user_id,
      match_id,
      partner_id,
      'ticket' as order_type,
      status,
      total_amount,
      currency,
      affiliate_tracking_id,
      commission,
      created_at,
      updated_at
    FROM ticket_purchases
    UNION ALL
    SELECT
      id,
      user_id,
      recipient_match_id as match_id,
      partner_id,
      'gift' as order_type,
      status,
      total_amount,
      currency,
      affiliate_tracking_id,
      commission,
      created_at,
      updated_at
    FROM gift_orders
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP VIEW IF EXISTS order_history');
  await knex.schema.dropTableIfExists('date_plan_suggestions');
  await knex.schema.dropTableIfExists('affiliate_commissions');
  await knex.schema.dropTableIfExists('affiliate_clicks');
  await knex.schema.dropTableIfExists('gift_orders');
  await knex.schema.dropTableIfExists('gift_products');
  await knex.schema.dropTableIfExists('ticket_purchases');
  await knex.schema.dropTableIfExists('events');
  await knex.schema.dropTableIfExists('reservations');
  await knex.schema.dropTableIfExists('restaurants');
  await knex.schema.dropTableIfExists('partners');
}
