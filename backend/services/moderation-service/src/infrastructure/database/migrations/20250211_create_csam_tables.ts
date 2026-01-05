import { createLogger } from '@flamoral/backend-shared';
import { Knex } from 'knex';

const logger = createLogger('csam-tables-migration');

/**
 * CSAM Detection System Database Migration
 *
 * Creates all necessary tables for CSAM detection, quarantine, reporting, and audit trail.
 * These tables implement legal compliance requirements for CSAM handling.
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================================
  // CSAM Detection Logs Table
  // ============================================================================
  await knex.schema.createTable('csam_detection_logs', (table) => {
    table.uuid('id').primary();
    table.uuid('content_id').notNullable().index();
    table.uuid('user_id').notNullable().index();
    table.string('status', 50).notNullable().index(); // clean, detected, pending, error
    table.boolean('is_csam').notNullable().defaultTo(false).index();
    table.decimal('confidence_score', 5, 4).notNullable().defaultTo(0);
    table.string('severity', 50).notNullable(); // unknown, low, medium, high, critical
    table.text('photodna_hash');
    table.text('perceptual_hash');
    table.boolean('ncmec_match').notNullable().defaultTo(false);
    table.uuid('ncmec_hash_id');
    table.boolean('internal_match').notNullable().defaultTo(false);
    table.boolean('cloud_match').notNullable().defaultTo(false);
    table.string('match_source', 255); // ncmec, internal, photodna_cloud
    table.string('detection_method', 100).notNullable();
    table.text('content_url');
    table.string('content_type', 100);
    table.integer('processing_time_ms');
    table.timestamp('detected_at').notNullable().index();
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id', 'detected_at']);
    table.index(['is_csam', 'detected_at']);
    table.index('detected_at');
  });

  // ============================================================================
  // CSAM Known Hashes Table (Hash Database)
  // ============================================================================
  await knex.schema.createTable('csam_known_hashes', (table) => {
    table.uuid('id').primary();
    table.text('hash').notNullable().unique(); // PhotoDNA or SHA-256 hash
    table.text('perceptual_hash');
    table.string('source', 50).notNullable().index(); // ncmec, internal, iwf, interpol, other
    table.decimal('confidence', 5, 4).notNullable().defaultTo(1.0);
    table.integer('detection_count').notNullable().defaultTo(0);
    table.timestamp('first_detected_at').notNullable();
    table.timestamp('last_detected_at').notNullable();
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('hash');
    table.index('source');
    table.index('perceptual_hash');
  });

  // ============================================================================
  // CSAM Quarantine Table
  // ============================================================================
  await knex.schema.createTable('csam_quarantine', (table) => {
    table.uuid('id').primary();
    table.uuid('detection_id').references('id').inTable('csam_detection_logs').onDelete('SET NULL');
    table.uuid('content_id').notNullable().unique().index();
    table.uuid('user_id').notNullable().index();
    table.string('content_type', 100).notNullable();
    table.text('original_url').notNullable();
    table.text('storage_location'); // Encrypted storage location
    table.text('evidence_hash'); // SHA-256 for chain of custody
    table.text('photodna_hash');
    table.text('perceptual_hash');
    table.string('status', 50).notNullable().defaultTo('quarantined').index(); // quarantined, pending_review, released, transferred
    table.string('legal_hold_status', 50).notNullable().defaultTo('pending').index(); // pending, active, released, expired
    table.timestamp('legal_hold_applied_at');
    table.timestamp('legal_hold_expires_at');
    table.decimal('confidence_score', 5, 4).notNullable();
    table.string('detection_method', 100);
    table.string('match_source', 255);
    table.boolean('access_restricted').notNullable().defaultTo(true);
    table.jsonb('access_log').defaultTo('[]');
    table.jsonb('chain_of_custody').defaultTo('[]');
    table.timestamp('quarantined_at').notNullable().index();
    table.timestamp('released_at');
    table.uuid('released_by');
    table.text('release_justification');
    table.text('approval_documentation');
    table.boolean('review_required').defaultTo(false);
    table.text('review_reason');
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id', 'quarantined_at']);
    table.index(['status', 'quarantined_at']);
    table.index('legal_hold_status');
  });

  // ============================================================================
  // NCMEC Reports Table
  // ============================================================================
  await knex.schema.createTable('ncmec_reports', (table) => {
    table.uuid('id').primary();
    table.uuid('detection_id').references('id').inTable('csam_detection_logs').onDelete('SET NULL');
    table.uuid('content_id').notNullable();
    table.uuid('user_id').notNullable().index();
    table.uuid('quarantine_id').references('id').inTable('csam_quarantine').onDelete('SET NULL');
    table.string('status', 50).notNullable().defaultTo('pending').index(); // pending, submitted, acknowledged, failed, retry_scheduled
    table.decimal('confidence_score', 5, 4).notNullable();
    table.text('photodna_hash');
    table.text('perceptual_hash');
    table.string('match_source', 255);
    table.jsonb('user_info').notNullable();
    table.jsonb('incident_details').notNullable();
    table.string('esp_id', 100).notNullable();
    table.string('esp_name', 255).notNullable();
    table.string('ncmec_report_id', 255).unique();
    table.string('ncmec_reference_number', 255);
    table.jsonb('ncmec_response');
    table.timestamp('report_created_at').notNullable();
    table.timestamp('submitted_at').index();
    table.timestamp('acknowledged_at');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('next_retry_at');
    table.timestamp('last_error_at');
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['status', 'created_at']);
    table.index('next_retry_at');
  });

  // ============================================================================
  // CSAM Audit Logs Table
  // ============================================================================
  await knex.schema.createTable('csam_audit_logs', (table) => {
    table.uuid('id').primary();
    table.string('event_type', 100).notNullable().index();
    table.string('severity', 50).notNullable().index();
    table.uuid('detection_id');
    table.uuid('content_id');
    table.uuid('user_id');
    table.string('actor', 255).notNullable(); // system, user_id, admin_id, officer_id
    table.jsonb('event_data').notNullable();
    table.boolean('sensitive_data').notNullable().defaultTo(true);
    table.text('signature').notNullable(); // Cryptographic signature for tamper detection
    table.timestamp('timestamp').notNullable().index();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['event_type', 'timestamp']);
    table.index(['severity', 'timestamp']);
    table.index(['detection_id', 'timestamp']);
    table.index(['user_id', 'timestamp']);
    table.index('timestamp');
  });

  // ============================================================================
  // Law Enforcement Access Table
  // ============================================================================
  await knex.schema.createTable('law_enforcement_access', (table) => {
    table.uuid('id').primary();
    table.uuid('quarantine_id').references('id').inTable('csam_quarantine').onDelete('CASCADE');
    table.text('access_token').notNullable().unique();
    table.string('officer_id', 255).notNullable();
    table.string('agency', 255).notNullable();
    table.string('case_number', 255).notNullable();
    table.string('warrant_number', 255);
    table.timestamp('granted_at').notNullable();
    table.timestamp('expires_at').notNullable().index();
    table.timestamp('last_accessed_at');
    table.integer('access_count').defaultTo(0);
    table.boolean('revoked').defaultTo(false).index();
    table.timestamp('revoked_at');
    table.text('revoked_reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['quarantine_id', 'created_at']);
    table.index('agency');
    table.index('case_number');
  });

  // ============================================================================
  // Law Enforcement Access Tokens Table
  // ============================================================================
  await knex.schema.createTable('law_enforcement_access_tokens', (table) => {
    table.uuid('id').primary();
    table.text('token').notNullable().unique().index();
    table.uuid('content_id').notNullable();
    table.uuid('detection_id');
    table.timestamp('expires_at').notNullable().index();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('expires_at');
  });

  // ============================================================================
  // Content Access Blocks Table
  // ============================================================================
  await knex.schema.createTable('content_access_blocks', (table) => {
    table.uuid('id').primary();
    table.uuid('content_id').notNullable().unique().index();
    table.uuid('quarantine_id').references('id').inTable('csam_quarantine').onDelete('CASCADE');
    table.string('block_reason', 100).notNullable();
    table.timestamp('blocked_at').notNullable().index();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('content_id');
  });

  // ============================================================================
  // User Content Blocks Table
  // ============================================================================
  await knex.schema.createTable('user_content_blocks', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().index();
    table.uuid('detection_id').references('id').inTable('csam_detection_logs').onDelete('SET NULL');
    table.string('block_reason', 100).notNullable();
    table.timestamp('blocked_at').notNullable().index();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id', 'blocked_at']);
  });

  // ============================================================================
  // Quarantine Action Log Table
  // ============================================================================
  await knex.schema.createTable('quarantine_action_log', (table) => {
    table.uuid('id').primary();
    table.uuid('quarantine_id').references('id').inTable('csam_quarantine').onDelete('CASCADE');
    table.string('action', 100).notNullable().index();
    table.string('actor', 255).notNullable();
    table.jsonb('details');
    table.timestamp('timestamp').notNullable().index();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['quarantine_id', 'timestamp']);
    table.index('action');
  });

  // ============================================================================
  // Staff Notifications Table
  // ============================================================================
  await knex.schema.createTable('staff_notifications', (table) => {
    table.uuid('id').primary();
    table.uuid('detection_id').references('id').inTable('csam_detection_logs').onDelete('SET NULL');
    table.uuid('content_id');
    table.uuid('user_id');
    table.uuid('quarantine_id').references('id').inTable('csam_quarantine').onDelete('SET NULL');
    table.string('notification_type', 100).notNullable();
    table.string('severity', 50).notNullable().index();
    table.string('priority', 50).notNullable().index();
    table.jsonb('message').notNullable();
    table.specificType('channels_sent', 'text[]').defaultTo('{}');
    table.jsonb('channel_results');
    table.timestamp('sent_at').notNullable().index();
    table.timestamp('acknowledged_at');
    table.uuid('acknowledged_by');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['detection_id', 'sent_at']);
    table.index(['severity', 'sent_at']);
  });

  // ============================================================================
  // Notification Failures Table
  // ============================================================================
  await knex.schema.createTable('notification_failures', (table) => {
    table.uuid('id').primary();
    table.uuid('notification_id');
    table.uuid('detection_id');
    table.text('error_message').notNullable();
    table.text('error_stack');
    table.jsonb('params');
    table.timestamp('failed_at').notNullable().index();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('failed_at');
  });

  // ============================================================================
  // Add CSAM fields to user_moderation_records table
  // ============================================================================
  await knex.schema.table('user_moderation_records', (table) => {
    table.boolean('csam_flag').defaultTo(false).index();
    table.uuid('csam_detection_id');
    table.timestamp('csam_flagged_at');
  });

  // ============================================================================
  // CSAM Statistics Table
  // ============================================================================
  await knex.schema.createTable('csam_statistics', (table) => {
    table.uuid('id').primary();
    table.date('stat_date').notNullable().unique();
    table.integer('total_scans').notNullable().defaultTo(0);
    table.integer('total_detections').notNullable().defaultTo(0);
    table.decimal('detection_rate', 7, 6);
    table.decimal('avg_confidence', 5, 4);
    table.integer('avg_processing_time_ms');
    table.integer('ncmec_reports_submitted').notNullable().defaultTo(0);
    table.integer('content_quarantined').notNullable().defaultTo(0);
    table.integer('users_affected').notNullable().defaultTo(0);
    table.jsonb('severity_breakdown');
    table.jsonb('match_source_breakdown');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Index
    table.index('stat_date');
  });

  logger.info('CSAM detection tables created successfully');
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order (respecting foreign key constraints)
  await knex.schema.dropTableIfExists('csam_statistics');
  await knex.schema.dropTableIfExists('notification_failures');
  await knex.schema.dropTableIfExists('staff_notifications');
  await knex.schema.dropTableIfExists('quarantine_action_log');
  await knex.schema.dropTableIfExists('user_content_blocks');
  await knex.schema.dropTableIfExists('content_access_blocks');
  await knex.schema.dropTableIfExists('law_enforcement_access_tokens');
  await knex.schema.dropTableIfExists('law_enforcement_access');
  await knex.schema.dropTableIfExists('csam_audit_logs');
  await knex.schema.dropTableIfExists('ncmec_reports');
  await knex.schema.dropTableIfExists('csam_quarantine');
  await knex.schema.dropTableIfExists('csam_known_hashes');
  await knex.schema.dropTableIfExists('csam_detection_logs');

  // Remove CSAM fields from user_moderation_records
  await knex.schema.table('user_moderation_records', (table) => {
    table.dropColumn('csam_flag');
    table.dropColumn('csam_detection_id');
    table.dropColumn('csam_flagged_at');
  });

  logger.info('CSAM detection tables dropped successfully');
}
