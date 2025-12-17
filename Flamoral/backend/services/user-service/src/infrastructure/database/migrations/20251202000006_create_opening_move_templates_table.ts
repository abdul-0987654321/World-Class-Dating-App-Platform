import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('opening_move_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('category', 100).notNullable(); // e.g., 'interests', 'date_ideas', 'conversation', 'fun'
    table.text('content').notNullable(); // The question/prompt text
    table.boolean('is_system').notNullable().defaultTo(true); // System templates vs custom
    table.integer('popularity_score').defaultTo(0); // Track how often it's used
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('category');
    table.index(['category', 'active']);
    table.index('is_system');
    table.index('popularity_score');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('opening_move_templates');
}
