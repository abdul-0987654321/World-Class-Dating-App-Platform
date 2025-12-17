import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('prompts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('question', 255).notNullable();
    table.string('category', 50); // e.g., 'personality', 'lifestyle', 'fun'
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index('is_active');
    table.index('category');
  });

  // Seed some default prompts
  return knex('prompts').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'My ideal Sunday looks like...',
      category: 'lifestyle',
      is_active: true,
      display_order: 1,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'I geek out on...',
      category: 'personality',
      is_active: true,
      display_order: 2,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'A perfect first date would be...',
      category: 'fun',
      is_active: true,
      display_order: 3,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: "The way to win me over is...",
      category: 'personality',
      is_active: true,
      display_order: 4,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: "I'm looking for someone who...",
      category: 'personality',
      is_active: true,
      display_order: 5,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'My greatest adventure was...',
      category: 'fun',
      is_active: true,
      display_order: 6,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('prompts');
}
