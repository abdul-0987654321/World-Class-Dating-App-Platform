/**
 * Migration: Create ID Verifications Table
 * Flamoral Dating Platform
 *
 * Creates the id_verifications table for storing ID verification attempts
 * via Jumio, Onfido, or mock providers.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create id_verifications table
  await knex.schema.createTable('id_verifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('request_id').nullable().references('request_id').inTable('verification_requests').onDelete('SET NULL');

    // Provider information
    table.enum('provider', ['jumio', 'onfido', 'mock']).notNullable();
    table.string('external_reference_id', 255).nullable();

    // Document information
    table.enum('document_type', ['passport', 'drivers_license', 'national_id']).notNullable();
    table.string('country_code', 3).notNullable();

    // Status tracking
    table.enum('status', [
      'initiated',
      'pending',
      'processing',
      'approved',
      'declined',
      'expired',
      'error',
    ]).notNullable().defaultTo('initiated');

    // Verification results
    table.enum('document_check_result', [
      'clear',
      'consider',
      'rejected',
      'caution',
      'not_performed',
    ]).nullable();
    table.enum('face_match_result', [
      'match',
      'no_match',
      'not_performed',
      'error',
    ]).nullable();
    table.decimal('confidence_score', 5, 4).nullable();

    // Extracted data (JSON fields)
    table.jsonb('document_details').nullable();
    table.jsonb('extracted_data').nullable();
    table.jsonb('decline_reasons').nullable();
    table.jsonb('warnings').nullable();

    // Provider-specific data
    table.text('web_url').nullable();
    table.text('sdk_token').nullable();
    table.jsonb('raw_response').nullable();

    // Timestamps
    table.timestamp('expires_at').nullable();
    table.timestamp('initiated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.timestamp('webhook_received_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id'], 'idx_id_verifications_user_id');
    table.index(['user_id', 'status'], 'idx_id_verifications_user_status');
    table.index(['provider', 'external_reference_id'], 'idx_id_verifications_provider_ext_ref');
    table.index(['status'], 'idx_id_verifications_status');
    table.index(['created_at'], 'idx_id_verifications_created_at');
  });

  // Create user_verification_metadata table
  await knex.schema.createTable('user_verification_metadata', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('verification_type', 50).notNullable();
    table.string('provider', 50).nullable();
    table.string('document_type', 50).nullable();
    table.timestamp('verified_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Composite unique constraint
    table.unique(['user_id', 'verification_type'], {
      indexName: 'idx_user_verification_metadata_unique',
    });
  });

  // Add verification level columns to users table if they don't exist
  const hasVerificationLevel = await knex.schema.hasColumn('users', 'verification_level');
  if (!hasVerificationLevel) {
    await knex.schema.alterTable('users', (table) => {
      table.integer('verification_level').notNullable().defaultTo(0);
    });
  }

  const hasIsIdVerified = await knex.schema.hasColumn('users', 'is_id_verified');
  if (!hasIsIdVerified) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('is_id_verified').notNullable().defaultTo(false);
      table.timestamp('id_verified_at').nullable();
    });
  }

  // Add index for verification level queries
  const indexExists = await knex.raw(`
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'users'
    AND indexname = 'idx_users_verification_level'
  `);

  if (indexExists.rows.length === 0) {
    await knex.schema.alterTable('users', (table) => {
      table.index(['verification_level'], 'idx_users_verification_level');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes from users table
  const indexExists = await knex.raw(`
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'users'
    AND indexname = 'idx_users_verification_level'
  `);

  if (indexExists.rows.length > 0) {
    await knex.schema.alterTable('users', (table) => {
      table.dropIndex([], 'idx_users_verification_level');
    });
  }

  // Remove columns from users table if they exist
  const hasIsIdVerified = await knex.schema.hasColumn('users', 'is_id_verified');
  if (hasIsIdVerified) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('is_id_verified');
      table.dropColumn('id_verified_at');
    });
  }

  const hasVerificationLevel = await knex.schema.hasColumn('users', 'verification_level');
  if (hasVerificationLevel) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('verification_level');
    });
  }

  // Drop tables
  await knex.schema.dropTableIfExists('user_verification_metadata');
  await knex.schema.dropTableIfExists('id_verifications');
}
