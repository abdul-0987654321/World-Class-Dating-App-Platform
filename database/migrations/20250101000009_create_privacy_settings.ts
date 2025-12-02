import { Knex } from 'knex';

/**
 * Migration: Create Privacy Settings Table
 * Description: User privacy preferences and settings
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('privacy_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');

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
      'hidden'
    ]).notNullable().defaultTo('everyone');

    // Discovery settings
    table.boolean('discoverable').notNullable().defaultTo(true);
    table.boolean('show_in_search').notNullable().defaultTo(true);

    // Contact and social privacy
    table.boolean('hide_from_contacts').notNullable().defaultTo(false);
    table.jsonb('hidden_phone_numbers').nullable(); // Phone numbers to hide from
    table.jsonb('hidden_emails').nullable(); // Emails to hide from

    // Message settings
    table.boolean('read_receipts_enabled').notNullable().defaultTo(true);
    table.boolean('typing_indicators_enabled').notNullable().defaultTo(true);

    // Message filtering
    table.enum('message_filter', [
      'everyone',
      'matches_only',
      'verified_only'
    ]).notNullable().defaultTo('everyone');

    // Location privacy
    table.boolean('precise_location').notNullable().defaultTo(false);
    table.integer('location_radius_km').nullable(); // Fuzz location by X km

    // Photo privacy
    table.boolean('blur_photos').notNullable().defaultTo(false); // Blur until match
    table.boolean('private_photo_album').notNullable().defaultTo(false);

    // Activity privacy
    table.boolean('hide_activity_status').notNullable().defaultTo(false);
    table.boolean('hide_recently_active').notNullable().defaultTo(false);

    // Data sharing
    table.boolean('allow_analytics').notNullable().defaultTo(true);
    table.boolean('allow_personalized_ads').notNullable().defaultTo(true);
    table.boolean('share_data_with_partners').notNullable().defaultTo(false);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('incognito_mode');
    table.index('profile_visibility');
    table.index('discoverable');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('privacy_settings');
}
