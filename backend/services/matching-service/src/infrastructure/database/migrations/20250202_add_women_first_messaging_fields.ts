import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('matches', (table) => {
    // Track who sent the first message
    table.uuid('first_message_sent_by').nullable();

    // Track if conversation has been initiated
    table.boolean('conversation_initiated').defaultTo(false).notNullable();

    // Track if this match requires women-first messaging (heterosexual match)
    table.boolean('requires_women_first').defaultTo(false).notNullable();

    // Track the woman's user ID in heterosexual matches for quick validation
    table.uuid('woman_user_id').nullable();

    // Add index for quick lookups
    table.index(['conversation_initiated']);
    table.index(['requires_women_first', 'conversation_initiated']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('matches', (table) => {
    table.dropColumn('first_message_sent_by');
    table.dropColumn('conversation_initiated');
    table.dropColumn('requires_women_first');
    table.dropColumn('woman_user_id');
  });
}
