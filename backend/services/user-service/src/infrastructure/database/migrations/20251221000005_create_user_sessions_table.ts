import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_sessions', (table) => {
    table.uuid('session_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('device_info').nullable(); // { platform, os, browser, device_type, app_version }
    table.specificType('ip_address', 'inet').nullable();
    table.string('user_agent', 500).nullable();
    table.string('refresh_token_hash', 255).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.string('session_type', 50).notNullable().defaultTo('web'); // web, mobile, api
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_active_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable();
    table.timestamp('revoked_at').nullable();

    // Indexes for frequent queries
    table.index('user_id');
    table.index('is_active');
    table.index(['user_id', 'is_active']);
    table.index('last_active_at');
    table.index('expires_at');
    table.index('created_at');
    table.index('refresh_token_hash');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('user_sessions');
}
