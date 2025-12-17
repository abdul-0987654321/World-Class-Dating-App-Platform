import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('one_time_prekeys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.integer('key_id').notNullable();
    table.text('public_key').notNullable();
    table.text('private_key').notNullable(); // Encrypted
    table.boolean('used').defaultTo(false);
    table.timestamp('used_at');
    table.uuid('used_by_user_id'); // Which user used this prekey
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('used_by_user_id').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'used']);
    table.unique(['user_id', 'key_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('one_time_prekeys');
}
