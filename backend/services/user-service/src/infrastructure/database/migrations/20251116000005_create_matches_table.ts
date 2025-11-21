import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('matches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user1_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('user2_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('matched_at').defaultTo(knex.fn.now());
    table.boolean('is_active').defaultTo(true); // False if either user unmatches
    table.uuid('unmatched_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('unmatched_at');
    table.timestamps(true, true);

    // Indexes
    table.index('user1_id');
    table.index('user2_id');
    table.index(['user1_id', 'user2_id']);
    table.index(['user2_id', 'user1_id']);
    table.index('is_active');
    table.index('matched_at');

    // Ensure user1_id is always less than user2_id to avoid duplicates
    table.unique(['user1_id', 'user2_id']);
    table.check('user1_id < user2_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('matches');
}
