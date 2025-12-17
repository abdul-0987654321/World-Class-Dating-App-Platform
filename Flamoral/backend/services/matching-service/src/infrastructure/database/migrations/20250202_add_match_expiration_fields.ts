import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('matches', (table) => {
    // Expiration tracking
    table.timestamp('expires_at').nullable().index();

    // Extension tracking (Premium feature)
    table.boolean('extended').defaultTo(false).notNullable();
    table.timestamp('extended_at').nullable();

    // Expiration status
    table.boolean('expired').defaultTo(false).notNullable().index();

    // Track if first message was sent (to determine if match should expire)
    table.boolean('first_message_sent').defaultTo(false).notNullable();

    // Add composite index for efficient expiration queries
    table.index(['expires_at', 'expired', 'first_message_sent']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('matches', (table) => {
    table.dropColumn('expires_at');
    table.dropColumn('extended');
    table.dropColumn('extended_at');
    table.dropColumn('expired');
    table.dropColumn('first_message_sent');
  });
}
