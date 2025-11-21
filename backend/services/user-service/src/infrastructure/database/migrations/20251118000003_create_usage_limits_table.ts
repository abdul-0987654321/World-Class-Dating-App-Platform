import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('usage_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('resource_type', ['swipes', 'likes', 'super_likes', 'rewinds', 'boosts']).notNullable();
    table.integer('daily_limit').notNullable().defaultTo(0);
    table.integer('current_usage').notNullable().defaultTo(0);
    table.timestamp('reset_at').notNullable();
    table.timestamp('last_reset_at').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('resource_type');
    table.index('reset_at');

    // Unique constraint: one limit record per user per resource type
    table.unique(['user_id', 'resource_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('usage_limits');
}
