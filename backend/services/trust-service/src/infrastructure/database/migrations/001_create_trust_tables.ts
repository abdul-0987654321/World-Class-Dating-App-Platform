/**
 * Migration: Create Trust Service Tables
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Trust Scores
  await knex.schema.createTable('trust_scores', (table) => {
    table.uuid('user_id').primary();
    table.integer('overall_score').notNullable().defaultTo(40);
    table
      .enum('level', ['new', 'building', 'established', 'trusted', 'highly_trusted'])
      .notNullable()
      .defaultTo('new');
    table.string('badge', 50);
    table.jsonb('components').notNullable().defaultTo('{}');
    table.timestamp('last_updated').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('overall_score');
    table.index('level');
  });

  // Trust Signals
  await knex.schema.createTable('trust_signals', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().index();
    table.string('type', 50).notNullable();
    table.integer('impact').notNullable();
    table.string('source', 100).notNullable();
    table.jsonb('metadata');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at');

    table.index(['user_id', 'type']);
    table.index(['user_id', 'created_at']);
  });

  // Trust History
  await knex.schema.createTable('trust_history', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().index();
    table.integer('score').notNullable();
    table.string('level', 20).notNullable();
    table.text('change_reason');
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'timestamp']);
  });

  // User Ratings
  await knex.schema.createTable('user_ratings', (table) => {
    table.uuid('id').primary();
    table.uuid('from_user_id').notNullable().index();
    table.uuid('to_user_id').notNullable().index();
    table.uuid('conversation_id');
    table.integer('rating').notNullable();
    table.jsonb('categories').notNullable().defaultTo('[]');
    table.text('comment');
    table.boolean('is_anonymous').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at');

    table.index(['to_user_id', 'rating']);
    table.unique(['from_user_id', 'to_user_id', 'conversation_id']);
  });

  // Endorsements
  await knex.schema.createTable('endorsements', (table) => {
    table.uuid('id').primary();
    table.uuid('from_user_id').notNullable().index();
    table.uuid('to_user_id').notNullable().index();
    table.string('type', 50).notNullable();
    table.text('message');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['from_user_id', 'to_user_id', 'type']);
    table.index(['to_user_id', 'type']);
  });

  // Trust Warnings
  await knex.schema.createTable('trust_warnings', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().index();
    table.string('type', 50).notNullable();
    table.enum('severity', ['low', 'medium', 'high']).notNullable();
    table.text('message').notNullable();
    table.text('action_required');
    table.timestamp('resolved_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'resolved_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('trust_warnings');
  await knex.schema.dropTableIfExists('endorsements');
  await knex.schema.dropTableIfExists('user_ratings');
  await knex.schema.dropTableIfExists('trust_history');
  await knex.schema.dropTableIfExists('trust_signals');
  await knex.schema.dropTableIfExists('trust_scores');
}
