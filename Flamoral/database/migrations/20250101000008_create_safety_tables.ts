import { Knex } from 'knex';

/**
 * Migration: Create Safety and Moderation Tables
 * Description: User blocks, reports, moderation, and safety features
 */
export async function up(knex: Knex): Promise<void> {
  // Create user_blocks table
  await knex.schema.createTable('user_blocks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('blocked_user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Block reason
    table.string('reason', 255).nullable();
    table.text('notes').nullable();

    // Timestamp
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('blocked_user_id');
    table.index(['user_id', 'blocked_user_id']);

    // Unique constraint: can't block the same user twice
    table.unique(['user_id', 'blocked_user_id']);

    // Check constraint: can't block yourself
    table.check('user_id != blocked_user_id', undefined, 'user_blocks_not_self');
  });

  // Create reports table
  await knex.schema.createTable('reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('reporter_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('reported_user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Report details
    table.enum('category', [
      'inappropriate_photos',
      'inappropriate_messages',
      'fake_profile',
      'spam',
      'harassment',
      'underage',
      'scam',
      'violence',
      'hate_speech',
      'impersonation',
      'other'
    ]).notNullable();

    table.text('description').nullable();
    table.jsonb('evidence').nullable(); // Screenshots, message IDs, etc.

    // Report status
    table.enum('status', [
      'pending',
      'investigating',
      'resolved',
      'dismissed',
      'action_taken'
    ]).notNullable().defaultTo('pending');

    table.enum('severity', ['low', 'medium', 'high', 'critical'])
      .notNullable()
      .defaultTo('medium');

    // Resolution
    table.text('resolution_notes').nullable();
    table.enum('action_taken', [
      'none',
      'warning_sent',
      'content_removed',
      'photo_removed',
      'account_restricted',
      'account_suspended',
      'account_banned'
    ]).nullable();

    table.uuid('resolved_by').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('resolved_at').nullable();

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('reporter_id');
    table.index('reported_user_id');
    table.index('status');
    table.index('severity');
    table.index('category');
    table.index(['status', 'severity']);
    table.index('created_at');
  });

  // Create moderation_logs table
  await knex.schema.createTable('moderation_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content being moderated
    table.uuid('content_id').notNullable().index();
    table.enum('content_type', ['photo', 'bio', 'message', 'prompt_answer', 'profile'])
      .notNullable();
    table.text('content_url').nullable();
    table.text('content_text').nullable();

    // User information
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Moderation results
    table.enum('status', [
      'pending',
      'approved',
      'rejected',
      'flagged',
      'reviewing'
    ]).notNullable().defaultTo('pending');

    table.enum('action', [
      'auto_approved',
      'auto_rejected',
      'auto_flagged',
      'manual_approved',
      'manual_rejected'
    ]).notNullable();

    table.decimal('risk_score', 5, 4).notNullable().defaultTo(0);
    table.jsonb('violations').defaultTo('[]'); // Array of violation types

    // AI moderation data
    table.jsonb('image_moderation_data').nullable();
    table.jsonb('text_moderation_data').nullable();
    table.jsonb('recommendations').defaultTo('[]');

    // Moderation metadata
    table.timestamp('moderated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('moderated_by').nullable(); // Admin/moderator user ID
    table.timestamp('reviewed_at').nullable();
    table.uuid('reviewed_by').nullable();
    table.text('review_notes').nullable();

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('content_type');
    table.index('user_id');
    table.index('status');
    table.index(['user_id', 'created_at']);
    table.index(['status', 'created_at']);
    table.index('moderated_at');
  });

  // Create user_violations table
  await knex.schema.createTable('user_violations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('moderation_log_id').nullable()
      .references('id').inTable('moderation_logs').onDelete('CASCADE');
    table.uuid('report_id').nullable()
      .references('id').inTable('reports').onDelete('CASCADE');

    // Violation details
    table.enum('violation_type', [
      'inappropriate_content',
      'fake_profile',
      'harassment',
      'spam',
      'underage',
      'hate_speech',
      'violence',
      'scam',
      'impersonation',
      'terms_violation',
      'community_guidelines_violation',
      'other'
    ]).notNullable();

    table.enum('severity', ['warning', 'minor', 'major', 'severe', 'critical'])
      .notNullable();

    // Content reference
    table.uuid('content_id').nullable();
    table.string('content_type', 50).nullable();

    // Action taken
    table.enum('action', [
      'warning',
      'content_removal',
      'feature_restriction',
      'temporary_suspension',
      'permanent_suspension',
      'account_termination'
    ]).notNullable();

    // Notes and metadata
    table.text('notes').nullable();
    table.jsonb('metadata').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable(); // For temporary actions

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'created_at']);
    table.index('violation_type');
    table.index('severity');
    table.index('expires_at');
  });

  // Create user_safety_records table (aggregated safety data per user)
  await knex.schema.createTable('user_safety_records', (table) => {
    table.uuid('user_id').primary()
      .references('id').inTable('users').onDelete('CASCADE');

    // Account status
    table.enum('status', [
      'good_standing',
      'warned',
      'restricted',
      'suspended',
      'banned'
    ]).notNullable().defaultTo('good_standing');

    // Violation counts
    table.integer('total_violations').notNullable().defaultTo(0);
    table.integer('warnings_count').notNullable().defaultTo(0);
    table.integer('minor_violations').notNullable().defaultTo(0);
    table.integer('major_violations').notNullable().defaultTo(0);
    table.integer('severe_violations').notNullable().defaultTo(0);

    // Reports
    table.integer('reports_received').notNullable().defaultTo(0);
    table.integer('reports_made').notNullable().defaultTo(0);

    // Suspension history
    table.integer('suspension_count').notNullable().defaultTo(0);
    table.timestamp('current_suspension_start').nullable();
    table.timestamp('current_suspension_end').nullable();

    // Ban information
    table.boolean('is_permanently_banned').notNullable().defaultTo(false);
    table.timestamp('banned_at').nullable();
    table.text('ban_reason').nullable();

    // Last violation
    table.timestamp('last_violation_at').nullable();

    // Trust score (0-100)
    table.integer('trust_score').notNullable().defaultTo(100);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('status');
    table.index('is_permanently_banned');
    table.index(['status', 'updated_at']);
    table.index('trust_score');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_safety_records');
  await knex.schema.dropTableIfExists('user_violations');
  await knex.schema.dropTableIfExists('moderation_logs');
  await knex.schema.dropTableIfExists('reports');
  await knex.schema.dropTableIfExists('user_blocks');
}
