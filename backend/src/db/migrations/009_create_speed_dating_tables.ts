/**
 * Migration: Create Speed Dating Tables
 * Tables for live video speed dating events
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Speed dating events table
  await knex.schema.createTable('speed_dating_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description').notNullable();
    table.enum('type', ['classic', 'quick', 'deep_dive', 'themed']).notNullable();
    table.string('theme');
    table.enum('status', ['scheduled', 'registration_open', 'check_in', 'in_progress', 'matching', 'completed', 'cancelled']).notNullable().defaultTo('scheduled');
    table.timestamp('scheduled_at').notNullable();
    table.timestamp('check_in_starts_at').notNullable();
    table.timestamp('starts_at');
    table.timestamp('ends_at');
    table.integer('round_duration_seconds').notNullable().defaultTo(300);
    table.integer('break_duration_seconds').notNullable().defaultTo(60);
    table.integer('total_rounds').notNullable().defaultTo(8);
    table.integer('min_participants').notNullable().defaultTo(10);
    table.integer('max_participants').notNullable().defaultTo(30);
    table.integer('gender_ratio_male').notNullable().defaultTo(50);
    table.integer('gender_ratio_female').notNullable().defaultTo(50);
    table.integer('target_age_min');
    table.integer('target_age_max');
    table.boolean('verified_only').notNullable().defaultTo(true);
    table.boolean('photo_verified_only').notNullable().defaultTo(false);
    table.integer('min_profile_completion');
    table.jsonb('premium_tiers').defaultTo('[]');
    table.integer('coin_cost').notNullable().defaultTo(0);
    table.integer('gem_cost');
    table.jsonb('free_for_tiers').defaultTo('[]');
    table.integer('current_participants').notNullable().defaultTo(0);
    table.string('cover_image');
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('status');
    table.index('scheduled_at');
    table.index(['status', 'scheduled_at']);
  });

  // Event participants table
  await knex.schema.createTable('speed_dating_participants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable().references('id').inTable('speed_dating_events').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('gender', ['male', 'female', 'non-binary']).notNullable();
    table.enum('status', ['registered', 'checked_in', 'in_round', 'waiting', 'completed', 'no_show']).notNullable().defaultTo('registered');
    table.timestamp('registered_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('checked_in_at');
    table.jsonb('matched_with').defaultTo('[]');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['event_id', 'user_id']);
    table.index('event_id');
    table.index('user_id');
    table.index(['event_id', 'status']);
    table.index(['event_id', 'gender']);
  });

  // Speed dating rounds table
  await knex.schema.createTable('speed_dating_rounds', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable().references('id').inTable('speed_dating_events').onDelete('CASCADE');
    table.integer('round_number').notNullable();
    table.enum('status', ['pending', 'active', 'break', 'completed']).notNullable().defaultTo('pending');
    table.timestamp('starts_at').notNullable();
    table.timestamp('ends_at').notNullable();
    table.timestamp('actual_start_at');
    table.timestamp('actual_end_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['event_id', 'round_number']);
    table.index(['event_id', 'status']);
  });

  // Round pairings table
  await knex.schema.createTable('speed_dating_pairings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('round_id').notNullable().references('id').inTable('speed_dating_rounds').onDelete('CASCADE');
    table.uuid('participant1_id').notNullable().references('id').inTable('speed_dating_participants').onDelete('CASCADE');
    table.uuid('participant2_id').notNullable().references('id').inTable('speed_dating_participants').onDelete('CASCADE');
    table.string('room_id').notNullable();
    table.timestamp('started_at');
    table.timestamp('ended_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('round_id');
    table.index('participant1_id');
    table.index('participant2_id');
    table.index('room_id');
  });

  // Interest marks table
  await knex.schema.createTable('speed_dating_interests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable().references('id').inTable('speed_dating_events').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('partner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('interested').notNullable();
    table.uuid('round_id').references('id').inTable('speed_dating_rounds').onDelete('SET NULL');
    table.timestamp('marked_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['event_id', 'user_id', 'partner_id']);
    table.index(['event_id', 'user_id']);
    table.index(['event_id', 'partner_id']);
  });

  // Speed dating matches table
  await knex.schema.createTable('speed_dating_matches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable().references('id').inTable('speed_dating_events').onDelete('CASCADE');
    table.uuid('user1_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('user2_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('matched_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('conversation_started').notNullable().defaultTo(false);
    table.uuid('conversation_id'); // Will reference conversations when that table exists
    table.timestamp('conversation_started_at');

    table.unique(['event_id', 'user1_id', 'user2_id']);
    table.index('event_id');
    table.index('user1_id');
    table.index('user2_id');
  });

  // Icebreaker prompts table
  await knex.schema.createTable('icebreaker_prompts', (table) => {
    table.string('id').primary();
    table.text('text').notNullable();
    table.enum('category', ['fun', 'deep', 'creative', 'casual']).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('display_order');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('category');
    table.index('is_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('icebreaker_prompts');
  await knex.schema.dropTableIfExists('speed_dating_matches');
  await knex.schema.dropTableIfExists('speed_dating_interests');
  await knex.schema.dropTableIfExists('speed_dating_pairings');
  await knex.schema.dropTableIfExists('speed_dating_rounds');
  await knex.schema.dropTableIfExists('speed_dating_participants');
  await knex.schema.dropTableIfExists('speed_dating_events');
}
