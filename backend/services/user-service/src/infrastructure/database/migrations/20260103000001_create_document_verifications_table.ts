/**
 * Migration: Create Document Verifications Table
 * Flamoral Dating Platform
 *
 * Creates the document_verifications table for storing OCR-based
 * document verification attempts with GDPR compliance features.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create document_verifications table
  await knex.schema.createTable('document_verifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Document information
    table.enum('document_type', ['passport', 'drivers_license', 'national_id']).notNullable();
    table.string('country_code', 3).notNullable();

    // Status tracking
    table.enum('status', [
      'pending',
      'processing',
      'completed',
      'failed',
      'expired',
    ]).notNullable().defaultTo('pending');

    // Extracted data (encrypted at rest for GDPR compliance)
    table.text('extracted_data_encrypted').nullable();
    table.decimal('extraction_confidence', 5, 4).nullable();

    // Validation results
    table.jsonb('validation_result').nullable();
    table.enum('authenticity_result', [
      'authentic',
      'suspicious',
      'fraudulent',
      'inconclusive',
    ]).nullable();

    // Profile match results
    table.jsonb('profile_match_result').nullable();
    table.decimal('profile_match_score', 5, 4).nullable();

    // Verification outcome
    table.decimal('overall_score', 5, 4).nullable();
    table.boolean('is_verified').notNullable().defaultTo(false);
    table.enum('verification_decision', [
      'pending',
      'approved',
      'rejected',
      'manual_review',
    ]).notNullable().defaultTo('pending');
    table.jsonb('decision_reasons').nullable();

    // Processing metadata
    table.string('textract_job_id', 255).nullable();
    table.integer('processing_duration_ms').nullable();

    // GDPR compliance fields
    table.boolean('consent_given').notNullable().defaultTo(false);
    table.timestamp('consent_timestamp').nullable();
    table.timestamp('data_retention_expires_at').nullable();
    table.boolean('gdpr_export_requested').notNullable().defaultTo(false);
    table.boolean('gdpr_deletion_requested').notNullable().defaultTo(false);

    // Audit trail
    table.jsonb('audit_log').nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.timestamp('expires_at').nullable();

    // Indexes for common queries
    table.index(['user_id'], 'idx_doc_verifications_user_id');
    table.index(['user_id', 'status'], 'idx_doc_verifications_user_status');
    table.index(['status'], 'idx_doc_verifications_status');
    table.index(['verification_decision'], 'idx_doc_verifications_decision');
    table.index(['created_at'], 'idx_doc_verifications_created_at');
    table.index(['data_retention_expires_at'], 'idx_doc_verifications_retention');
  });

  // Add document verification fields to users table if they don't exist
  const hasDocumentVerified = await knex.schema.hasColumn('users', 'is_document_verified');
  if (!hasDocumentVerified) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('is_document_verified').notNullable().defaultTo(false);
      table.timestamp('document_verified_at').nullable();
      table.uuid('document_verification_id').nullable();
    });
  }

  // Create index for document verified users
  const indexExists = await knex.raw(`
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'users'
    AND indexname = 'idx_users_document_verified'
  `);

  if (indexExists.rows.length === 0) {
    await knex.schema.alterTable('users', (table) => {
      table.index(['is_document_verified'], 'idx_users_document_verified');
    });
  }

  // Create document_verification_audit_log table for detailed audit trail
  await knex.schema.createTable('document_verification_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('verification_id').notNullable().references('id').inTable('document_verifications').onDelete('CASCADE');
    table.uuid('user_id').notNullable();

    table.string('action', 100).notNullable();
    table.enum('actor', ['system', 'user', 'admin']).notNullable();
    table.text('details').nullable();
    table.jsonb('data_accessed').nullable();
    table.string('ip_address', 45).nullable();

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['verification_id'], 'idx_doc_audit_verification_id');
    table.index(['user_id'], 'idx_doc_audit_user_id');
    table.index(['created_at'], 'idx_doc_audit_created_at');
  });

  // Create document_verification_cleanup_queue for GDPR data cleanup
  await knex.schema.createTable('document_verification_cleanup_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('verification_id').notNullable();
    table.uuid('user_id').notNullable();

    table.enum('cleanup_type', ['retention_expired', 'gdpr_deletion', 'user_request']).notNullable();
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).notNullable().defaultTo('pending');
    table.timestamp('scheduled_for').notNullable();
    table.timestamp('processed_at').nullable();
    table.text('error_message').nullable();

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['status', 'scheduled_for'], 'idx_cleanup_queue_status_scheduled');
    table.index(['user_id'], 'idx_cleanup_queue_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop cleanup queue table
  await knex.schema.dropTableIfExists('document_verification_cleanup_queue');

  // Drop audit log table
  await knex.schema.dropTableIfExists('document_verification_audit_log');

  // Drop indexes from users table
  const indexExists = await knex.raw(`
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'users'
    AND indexname = 'idx_users_document_verified'
  `);

  if (indexExists.rows.length > 0) {
    await knex.schema.alterTable('users', (table) => {
      table.dropIndex([], 'idx_users_document_verified');
    });
  }

  // Remove columns from users table if they exist
  const hasDocumentVerified = await knex.schema.hasColumn('users', 'is_document_verified');
  if (hasDocumentVerified) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('is_document_verified');
      table.dropColumn('document_verified_at');
      table.dropColumn('document_verification_id');
    });
  }

  // Drop main table
  await knex.schema.dropTableIfExists('document_verifications');
}
