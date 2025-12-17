import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('security_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.text('session_token').notNullable().unique();
    table.text('refresh_token').notNullable().unique();
    table.text('device_fingerprint');
    table.text('device_name'); // e.g., "iPhone 13", "Chrome on Windows"
    table.text('ip_address').notNullable();
    table.text('user_agent');
    table.text('location'); // GeoIP location
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_trusted_device').defaultTo(false);
    table.timestamp('revoked_at');
    table.text('revoked_reason'); // 'logout', 'security_breach', 'expired', etc.

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index('session_token');
    table.index('refresh_token');
    table.index('is_active');
    table.index('expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('security_sessions');
}
