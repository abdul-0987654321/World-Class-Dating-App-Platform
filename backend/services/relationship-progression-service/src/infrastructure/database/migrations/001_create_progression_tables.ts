/**
 * Migration: Create Relationship Progression Tables
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Relationship Progressions
  await knex.schema.createTable('relationship_progressions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().index();
    table.uuid('partner_id').notNullable().index();
    table.uuid('conversation_id').notNullable().unique();
    table
      .enum('current_stage', [
        'matched',
        'chatting',
        'vibing',
        'planning_date',
        'first_date',
        'dating',
        'exclusive',
        'committed',
      ])
      .notNullable()
      .defaultTo('matched');
    table.jsonb('stage_history').notNullable().defaultTo('[]');
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_activity_at').notNullable().defaultTo(knex.fn.now());
    table.integer('health_score').notNullable().defaultTo(100);
    table.integer('mutual_engagement').notNullable().defaultTo(50);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Composite index for user queries
    table.index(['user_id', 'last_activity_at']);
  });

  // Milestones
  await knex.schema.createTable('milestones', (table) => {
    table.uuid('id').primary();
    table
      .uuid('relationship_id')
      .notNullable()
      .references('id')
      .inTable('relationship_progressions')
      .onDelete('CASCADE');
    table
      .enum('type', [
        'first_message',
        'first_conversation_hour',
        'exchanged_numbers',
        'first_date_planned',
        'first_date_completed',
        'first_photo_shared',
        'first_voice_note',
        'first_video_call',
        'met_friends',
        'week_anniversary',
        'month_anniversary',
        'became_exclusive',
        'custom',
      ])
      .notNullable();
    table.string('title', 255).notNullable();
    table.text('description');
    table.timestamp('achieved_at').notNullable().defaultTo(knex.fn.now());
    table.jsonb('celebrated_by').notNullable().defaultTo('[]');
    table.boolean('is_shared').notNullable().defaultTo(true);
    table.jsonb('custom_data');
    table.uuid('created_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['relationship_id', 'achieved_at']);
    table.index(['relationship_id', 'type']);
  });

  // Milestone Memories
  await knex.schema.createTable('milestone_memories', (table) => {
    table.uuid('id').primary();
    table
      .uuid('milestone_id')
      .notNullable()
      .references('id')
      .inTable('milestones')
      .onDelete('CASCADE');
    table.enum('type', ['text', 'photo', 'voice', 'location']).notNullable();
    table.text('content').notNullable();
    table.uuid('added_by').notNullable();
    table.timestamp('added_at').notNullable().defaultTo(knex.fn.now());

    table.index(['milestone_id', 'added_at']);
  });

  // Shared Experiences
  await knex.schema.createTable('shared_experiences', (table) => {
    table.uuid('id').primary();
    table
      .uuid('relationship_id')
      .notNullable()
      .references('id')
      .inTable('relationship_progressions')
      .onDelete('CASCADE');
    table
      .enum('type', [
        'date',
        'activity',
        'travel',
        'event',
        'milestone_celebration',
        'gift',
        'surprise',
        'first_time',
      ])
      .notNullable();
    table.string('title', 255).notNullable();
    table.text('description');
    table.timestamp('date').notNullable();
    table.jsonb('location');
    table.jsonb('photos').notNullable().defaultTo('[]');
    table.jsonb('moods').notNullable().defaultTo('[]');
    table.jsonb('tags').notNullable().defaultTo('[]');
    table.boolean('is_private').notNullable().defaultTo(false);
    table.uuid('created_by').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['relationship_id', 'date']);
    table.index(['relationship_id', 'type']);
  });

  // Create updated_at trigger function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Add trigger to progressions table
  await knex.raw(`
    CREATE TRIGGER update_relationship_progressions_updated_at
    BEFORE UPDATE ON relationship_progressions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    'DROP TRIGGER IF EXISTS update_relationship_progressions_updated_at ON relationship_progressions'
  );
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column');
  await knex.schema.dropTableIfExists('shared_experiences');
  await knex.schema.dropTableIfExists('milestone_memories');
  await knex.schema.dropTableIfExists('milestones');
  await knex.schema.dropTableIfExists('relationship_progressions');
}
