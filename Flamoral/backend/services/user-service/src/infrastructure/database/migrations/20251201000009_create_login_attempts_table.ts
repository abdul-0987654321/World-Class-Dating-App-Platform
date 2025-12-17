import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('login_attempts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable();
    table.uuid('user_id'); // Null if user doesn't exist
    table.text('ip_address').notNullable();
    table.text('user_agent');
    table.boolean('successful').notNullable();
    table.text('failure_reason'); // 'invalid_password', 'user_not_found', 'account_locked', etc.
    table.timestamp('attempted_at').defaultTo(knex.fn.now());
    table.text('location'); // GeoIP location data
    table.text('device_fingerprint');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('email');
    table.index('user_id');
    table.index('ip_address');
    table.index('attempted_at');
    table.index(['email', 'successful', 'attempted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('login_attempts');
}
