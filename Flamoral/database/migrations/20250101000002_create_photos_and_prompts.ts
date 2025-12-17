import { Knex } from 'knex';

/**
 * Migration: Create Photos and Prompts Tables
 * Description: User photos and profile prompts/answers
 */
export async function up(knex: Knex): Promise<void> {
  // Create photos table
  await knex.schema.createTable('photos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Photo URLs
    table.string('url', 500).notNullable();
    table.string('thumbnail_url', 500).nullable();

    // Photo metadata
    table.integer('position').notNullable().defaultTo(0); // 0 = primary photo
    table.boolean('is_primary').defaultTo(false);
    table.boolean('is_verified').defaultTo(false);
    table.string('storage_key', 255).nullable(); // Cloud storage key (S3, Azure, etc.)

    // Verification data
    table.jsonb('verification_data').nullable(); // AI verification results
    table.timestamp('verified_at').nullable();

    // Moderation
    table.enum('moderation_status', ['pending', 'approved', 'rejected', 'flagged'])
      .defaultTo('pending');
    table.jsonb('moderation_data').nullable();

    // Timestamps
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'position']);
    table.index(['user_id', 'is_primary']);
    table.index('moderation_status');
  });

  // Create prompts table (predefined profile questions)
  await knex.schema.createTable('prompts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('question', 255).notNullable();
    table.string('category', 50).nullable(); // 'personality', 'lifestyle', 'fun', etc.
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index('is_active');
    table.index('category');
    table.index('display_order');
  });

  // Create user_prompts table (user answers to prompts)
  await knex.schema.createTable('user_prompts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('prompt_id').notNullable()
      .references('id').inTable('prompts').onDelete('CASCADE');
    table.text('answer').notNullable();
    table.integer('display_order').defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('prompt_id');
    table.unique(['user_id', 'prompt_id']); // User can answer each prompt only once
  });

  // Seed default prompts
  await knex('prompts').insert([
    {
      question: 'My ideal Sunday looks like...',
      category: 'lifestyle',
      is_active: true,
      display_order: 1,
    },
    {
      question: 'I geek out on...',
      category: 'personality',
      is_active: true,
      display_order: 2,
    },
    {
      question: 'A perfect first date would be...',
      category: 'fun',
      is_active: true,
      display_order: 3,
    },
    {
      question: 'The way to win me over is...',
      category: 'personality',
      is_active: true,
      display_order: 4,
    },
    {
      question: "I'm looking for someone who...",
      category: 'personality',
      is_active: true,
      display_order: 5,
    },
    {
      question: 'My greatest adventure was...',
      category: 'fun',
      is_active: true,
      display_order: 6,
    },
    {
      question: 'I spend most of my free time...',
      category: 'lifestyle',
      is_active: true,
      display_order: 7,
    },
    {
      question: 'My love language is...',
      category: 'personality',
      is_active: true,
      display_order: 8,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_prompts');
  await knex.schema.dropTableIfExists('prompts');
  await knex.schema.dropTableIfExists('photos');
}
