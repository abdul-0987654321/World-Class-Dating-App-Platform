/**
 * Migration: Add Discovery Features
 * - Curated picks table
 * - Passport locations table
 * - Grid view preferences
 * - Advanced search filter presets
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create curated_picks table
  await knex.schema.createTable('curated_picks', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().index();
    table.uuid('pick_user_id').notNullable();
    table.float('score').notNullable().defaultTo(0);
    table.text('reasons'); // JSON array of reasons
    table
      .enum('category', [
        'top_pick',
        'high_compatibility',
        'new_user',
        'recently_active',
        'mutual_interest',
      ])
      .notNullable()
      .defaultTo('high_compatibility');
    table.timestamp('expires_at').notNullable();
    table.boolean('viewed').notNullable().defaultTo(false);
    table.timestamp('viewed_at');
    table.boolean('acted_upon').notNullable().defaultTo(false);
    table.timestamp('acted_upon_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id', 'created_at']);
    table.index(['user_id', 'expires_at']);
    table.unique(['user_id', 'pick_user_id', 'created_at']);
  });

  // Create passport_locations table
  await knex.schema.createTable('passport_locations', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().index();
    table.string('city', 255).notNullable();
    table.string('country', 255).notNullable();
    table.decimal('latitude', 10, 8).notNullable();
    table.decimal('longitude', 11, 8).notNullable();
    table.timestamp('start_date').notNullable();
    table.timestamp('end_date').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('deactivated_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id', 'is_active']);
    table.index(['user_id', 'end_date']);
  });

  // Create discovery_preferences table for grid view settings
  await knex.schema.createTable('discovery_preferences', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().unique();
    table.enum('view_mode', ['swipe', 'grid']).notNullable().defaultTo('swipe');
    table.integer('grid_columns').notNullable().defaultTo(2);
    table.boolean('show_distance').notNullable().defaultTo(true);
    table.boolean('show_compatibility').notNullable().defaultTo(true);
    table.boolean('auto_advance').notNullable().defaultTo(false);
    table.boolean('sound_enabled').notNullable().defaultTo(true);
    table.boolean('haptic_enabled').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create search_filter_presets table if not exists
  const hasSearchFilterPresets = await knex.schema.hasTable('search_filter_presets');
  if (!hasSearchFilterPresets) {
    await knex.schema.createTable('search_filter_presets', (table) => {
      table.uuid('id').primary();
      table.uuid('user_id').notNullable().index();
      table.string('name', 255).notNullable();
      table.text('filters').notNullable(); // JSON blob of filter settings
      table.boolean('is_default').notNullable().defaultTo(false);
      table.timestamp('last_used_at');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      // Indexes
      table.index(['user_id', 'is_default']);
    });
  }

  // Add effective location columns to users table if using user service
  // This is for passport mode location spoofing
  const hasUsersTable = await knex.schema.hasTable('users');
  if (hasUsersTable) {
    const hasEffectiveLatitude = await knex.schema.hasColumn('users', 'effective_latitude');
    if (!hasEffectiveLatitude) {
      await knex.schema.alterTable('users', (table) => {
        table.decimal('effective_latitude', 10, 8);
        table.decimal('effective_longitude', 11, 8);
        table.string('effective_city', 255);
        table.string('effective_country', 255);
        table.boolean('is_passport_active').notNullable().defaultTo(false);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('curated_picks');
  await knex.schema.dropTableIfExists('passport_locations');
  await knex.schema.dropTableIfExists('discovery_preferences');

  // Only drop search_filter_presets if it was created by this migration
  // await knex.schema.dropTableIfExists('search_filter_presets');

  // Remove effective location columns from users table
  const hasUsersTable = await knex.schema.hasTable('users');
  if (hasUsersTable) {
    const hasEffectiveLatitude = await knex.schema.hasColumn('users', 'effective_latitude');
    if (hasEffectiveLatitude) {
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn('effective_latitude');
        table.dropColumn('effective_longitude');
        table.dropColumn('effective_city');
        table.dropColumn('effective_country');
        table.dropColumn('is_passport_active');
      });
    }
  }
}
