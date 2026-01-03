/**
 * Migration: Create Background Checks Table
 * Flamoral Dating Platform
 *
 * Creates the background_checks table for storing Elite tier background check
 * results from Jumio and Onfido providers.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create background_checks table
  await knex.schema.createTable('background_checks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Provider information
    table.enum('provider', ['jumio', 'onfido']).notNullable();
    table.string('external_id', 255).notNullable();

    // Check tier and status
    table.enum('tier', ['basic', 'standard', 'comprehensive']).notNullable().defaultTo('basic');
    table.enum('status', [
      'initiated',
      'pending',
      'processing',
      'clear',
      'consider',
      'flagged',
      'error',
      'expired',
    ]).notNullable().defaultTo('initiated');

    // Check results
    table.jsonb('checks_performed').nullable();
    table.boolean('identity_verified').notNullable().defaultTo(false);
    table.enum('watchlist_result', [
      'clear',
      'possible_match',
      'confirmed_match',
      'not_performed',
      'error',
    ]).nullable();
    table.jsonb('watchlist_details').nullable();
    table.decimal('overall_score', 5, 4).nullable();
    table.jsonb('flags').nullable();

    // Consent tracking
    table.boolean('consent_given').notNullable().defaultTo(false);
    table.timestamp('consent_timestamp').nullable();

    // Timestamps
    table.timestamp('initiated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.timestamp('expires_at').nullable();
    table.timestamp('webhook_received_at').nullable();
    table.jsonb('raw_response').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id'], 'idx_background_checks_user_id');
    table.index(['user_id', 'status'], 'idx_background_checks_user_status');
    table.index(['provider', 'external_id'], 'idx_background_checks_provider_ext_id');
    table.index(['status'], 'idx_background_checks_status');
    table.index(['expires_at'], 'idx_background_checks_expires_at');
    table.index(['created_at'], 'idx_background_checks_created_at');
  });

  // Create user_badges table if it doesn't exist (for background check badges)
  const hasBadgesTable = await knex.schema.hasTable('user_badges');
  if (!hasBadgesTable) {
    await knex.schema.createTable('user_badges', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('badge_type', 100).notNullable();
      table.string('badge_name', 255).notNullable();
      table.jsonb('metadata').nullable();
      table.timestamp('awarded_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('expires_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      // Unique constraint to prevent duplicate badges
      table.unique(['user_id', 'badge_type'], {
        indexName: 'idx_user_badges_unique_type',
      });

      table.index(['user_id'], 'idx_user_badges_user_id');
      table.index(['badge_type'], 'idx_user_badges_badge_type');
    });
  }

  // Add background check related columns to users table if they don't exist
  const hasBackgroundCheckVerified = await knex.schema.hasColumn('users', 'is_background_checked');
  if (!hasBackgroundCheckVerified) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('is_background_checked').notNullable().defaultTo(false);
      table.timestamp('background_check_at').nullable();
      table.string('background_check_tier', 50).nullable();
    });

    // Add index for background check queries
    await knex.schema.alterTable('users', (table) => {
      table.index(['is_background_checked'], 'idx_users_background_checked');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove columns from users table
  const hasBackgroundCheckVerified = await knex.schema.hasColumn('users', 'is_background_checked');
  if (hasBackgroundCheckVerified) {
    // Drop index first
    const indexExists = await knex.raw(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'users'
      AND indexname = 'idx_users_background_checked'
    `);

    if (indexExists.rows.length > 0) {
      await knex.schema.alterTable('users', (table) => {
        table.dropIndex([], 'idx_users_background_checked');
      });
    }

    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('is_background_checked');
      table.dropColumn('background_check_at');
      table.dropColumn('background_check_tier');
    });
  }

  // Drop tables
  await knex.schema.dropTableIfExists('user_badges');
  await knex.schema.dropTableIfExists('background_checks');
}
