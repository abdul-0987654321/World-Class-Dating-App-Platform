import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_settings', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');

    // Notifications
    table.boolean('notifications_push').defaultTo(true);
    table.boolean('notifications_email').defaultTo(true);
    table.boolean('notifications_sms').defaultTo(false);
    table.boolean('notify_new_matches').defaultTo(true);
    table.boolean('notify_messages').defaultTo(true);
    table.boolean('notify_likes').defaultTo(true);
    table.boolean('notify_super_likes').defaultTo(true);

    // Privacy
    table.boolean('privacy_show_online').defaultTo(true);
    table.boolean('privacy_show_distance').defaultTo(true);
    table.boolean('privacy_show_age').defaultTo(true);
    table.boolean('privacy_incognito_mode').defaultTo(false);

    // Discovery
    table.integer('discovery_age_min').defaultTo(18);
    table.integer('discovery_age_max').defaultTo(50);
    table.integer('discovery_distance_max').defaultTo(50);
    table.jsonb('discovery_show_me').defaultTo('["all"]');

    table.timestamps(true, true);
  });

  await knex.schema.createTable('user_locations', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('latitude', 10, 8).notNullable();
    table.decimal('longitude', 11, 8).notNullable();
    table.string('city');
    table.string('state');
    table.string('country');
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Index for geospatial queries
    table.index(['latitude', 'longitude']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_locations');
  await knex.schema.dropTable('user_settings');
}
