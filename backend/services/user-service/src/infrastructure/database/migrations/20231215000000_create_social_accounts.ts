import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('social_accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('provider', ['google', 'apple', 'facebook']).notNullable();
    table.string('provider_user_id').notNullable();
    table.string('provider_email');
    table.string('provider_name');
    table.text('provider_picture');
    table.text('access_token');
    table.text('refresh_token');
    table.timestamp('token_expires_at');
    table.jsonb('profile_data');
    table.boolean('is_primary').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index(['provider', 'provider_user_id']);
    table.unique(['provider', 'provider_user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('social_accounts');
}
