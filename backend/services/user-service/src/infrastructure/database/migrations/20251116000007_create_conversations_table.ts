import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user1_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('user2_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('match_id').notNullable().references('id').inTable('matches').onDelete('CASCADE');
    table.text('last_message');
    table.timestamp('last_message_at');
    table.uuid('last_message_sender_id').references('id').inTable('users').onDelete('SET NULL');
    table.integer('unread_count_user1').defaultTo(0);
    table.integer('unread_count_user2').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Ensure user1_id < user2_id for consistency
    table.check('user1_id < user2_id');

    // Unique constraint - one conversation per match
    table.unique(['user1_id', 'user2_id']);
    table.unique(['match_id']);

    // Indexes for performance
    table.index(['user1_id', 'updated_at']);
    table.index(['user2_id', 'updated_at']);
    table.index('match_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('conversations');
}
