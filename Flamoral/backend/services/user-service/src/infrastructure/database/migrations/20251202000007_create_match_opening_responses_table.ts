import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('match_opening_responses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('match_id').notNullable().references('id').inTable('matches').onDelete('CASCADE');
    table.uuid('opening_move_id').notNullable().references('id').inTable('opening_moves').onDelete('CASCADE');
    table.uuid('responder_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('response_text').notNullable();
    table.timestamp('responded_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index('match_id');
    table.index('opening_move_id');
    table.index('responder_id');
    table.index('responded_at');

    // Ensure one response per match (can respond to only one opening move)
    table.unique('match_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('match_opening_responses');
}
