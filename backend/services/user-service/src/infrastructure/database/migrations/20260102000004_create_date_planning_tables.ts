import { Knex } from 'knex';

/**
 * Migration: Create Date Planning Tables
 * - venues: Stores venue information from Google Places, Yelp, or manual entry
 * - date_plans: Stores user-created date plans for their matches
 */
export async function up(knex: Knex): Promise<void> {
  // Create venues table
  await knex.schema.createTable('venues', (table) => {
    table.uuid('id').primary();
    table.string('name', 255).notNullable();
    table
      .enum('type', ['restaurant', 'bar', 'activity', 'entertainment'])
      .notNullable()
      .defaultTo('restaurant');
    table.string('address', 500).notNullable();
    table.string('city', 100).notNullable();
    table
      .enum('price_range', ['budget', 'moderate', 'upscale', 'luxury'])
      .notNullable()
      .defaultTo('moderate');
    table.decimal('rating', 2, 1).nullable();
    table.string('image_url', 1000).nullable();
    table.string('external_id', 255).nullable();
    table.enum('external_source', ['google', 'yelp', 'manual']).nullable();
    table.jsonb('metadata').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for efficient queries
    table.index('type');
    table.index('city');
    table.index('price_range');
    table.index('rating');
    table.index(['external_id', 'external_source']);
    table.index('name');
  });

  // Create date_plans table
  await knex.schema.createTable('date_plans', (table) => {
    table.uuid('id').primary();
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .uuid('match_id')
      .notNullable()
      .references('id')
      .inTable('matches')
      .onDelete('CASCADE');
    table.string('title', 100).notNullable();
    table.text('description').nullable();
    table.timestamp('date').notNullable();
    table.jsonb('venues').notNullable().defaultTo('[]');
    table.decimal('estimated_budget', 10, 2).nullable();
    table
      .enum('status', ['draft', 'confirmed', 'completed', 'cancelled'])
      .notNullable()
      .defaultTo('draft');
    table.boolean('shared_with_match').notNullable().defaultTo(false);
    table.timestamp('shared_at').nullable();
    table.timestamp('completed_at').nullable();
    table.jsonb('feedback').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for efficient queries
    table.index('user_id');
    table.index('match_id');
    table.index('status');
    table.index('date');
    table.index('shared_with_match');
    table.index(['user_id', 'status']);
    table.index(['match_id', 'shared_with_match']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('date_plans');
  await knex.schema.dropTableIfExists('venues');
}
