import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('verification_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token', 255).notNullable().unique();
    table
      .enum('type', ['email_verification', 'password_reset', 'phone_verification'])
      .notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_used').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('token');
    table.index('expires_at');
    table.index(['token', 'type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('verification_tokens');
}
