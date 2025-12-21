import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('password_resets', (table) => {
    table.uuid('reset_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 255).notNullable(); // Hashed reset token
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at').nullable();
    table.specificType('ip_address', 'inet').nullable(); // IP that requested the reset
    table.string('user_agent', 500).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('token_hash');
    table.index('expires_at');
    table.index(['user_id', 'expires_at']);
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('password_resets');
}
