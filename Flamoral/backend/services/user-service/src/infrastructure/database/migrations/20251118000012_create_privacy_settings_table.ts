import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('privacy_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');

    // Incognito mode (premium feature)
    table.boolean('incognito_mode').notNullable().defaultTo(false);
    table.timestamp('incognito_until').nullable();

    // Visibility settings
    table.boolean('show_distance').notNullable().defaultTo(true);
    table.boolean('show_last_active').notNullable().defaultTo(true);
    table.boolean('show_online_status').notNullable().defaultTo(true);
    table.boolean('show_age').notNullable().defaultTo(true);

    // Profile visibility
    table.enum('profile_visibility', [
      'everyone',
      'matches_only',
      'private'
    ]).notNullable().defaultTo('everyone');

    // Contact hiding
    table.boolean('hide_from_contacts').notNullable().defaultTo(false);
    table.jsonb('hidden_contact_numbers').nullable(); // Phone numbers to hide from

    // Read receipts
    table.boolean('read_receipts_enabled').notNullable().defaultTo(true);
    table.boolean('typing_indicators_enabled').notNullable().defaultTo(true);

    // Location privacy
    table.boolean('precise_location').notNullable().defaultTo(false);
    table.integer('location_radius_km').nullable(); // Fuzz location by X km

    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('incognito_mode');
    table.index('profile_visibility');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('privacy_settings');
}
