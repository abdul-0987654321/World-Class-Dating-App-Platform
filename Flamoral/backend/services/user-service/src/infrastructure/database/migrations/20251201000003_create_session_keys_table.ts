import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('session_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable();
    table.uuid('user1_id').notNullable();
    table.uuid('user2_id').notNullable();
    table.text('session_key_user1').notNullable(); // Encrypted session key for user1
    table.text('session_key_user2').notNullable(); // Encrypted session key for user2
    table.integer('chain_key_index').defaultTo(0); // For message key derivation
    table.text('root_key').notNullable(); // Root key for ratcheting
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at');
    table.boolean('is_active').defaultTo(true);

    // Foreign keys
    table.foreign('conversation_id').references('id').inTable('conversations').onDelete('CASCADE');
    table.foreign('user1_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('user2_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('conversation_id');
    table.index(['user1_id', 'user2_id']);
    table.unique(['conversation_id', 'is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('session_keys');
}
