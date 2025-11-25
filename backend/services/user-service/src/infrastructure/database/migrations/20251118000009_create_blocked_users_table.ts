import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('blocked_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('blocker_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('blocked_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('reason', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('blocker_id');
    table.index('blocked_id');
    table.index(['blocker_id', 'blocked_id']);

    // Unique constraint: can't block the same user twice
    table.unique(['blocker_id', 'blocked_id']);

    // Check constraint: can't block yourself
    table.check('blocker_id != blocked_id', [], 'blocked_users_not_self');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('blocked_users');
}
