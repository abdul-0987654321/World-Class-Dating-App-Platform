import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_prompts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('prompt_id').notNullable().references('id').inTable('prompts').onDelete('CASCADE');
    table.text('answer').notNullable();
    table.integer('display_order').defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('prompt_id');
    table.unique(['user_id', 'prompt_id']); // User can answer each prompt only once
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('user_prompts');
}
