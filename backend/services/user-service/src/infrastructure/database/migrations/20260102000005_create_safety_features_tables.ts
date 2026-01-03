import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Harassment Detection Results
  await knex.schema.createTable('harassment_detection_results', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('message_id').nullable();
    table.uuid('conversation_id').nullable();
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('recipient_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('content').notNullable();
    table.enum('content_type', ['message', 'profile_bio', 'photo_caption', 'prompt_response']).notNullable().defaultTo('message');

    // AI Detection Results
    table.float('harassment_score').notNullable().defaultTo(0);
    table.float('threat_score').notNullable().defaultTo(0);
    table.float('hate_speech_score').notNullable().defaultTo(0);
    table.float('sexual_harassment_score').notNullable().defaultTo(0);
    table.float('manipulation_score').notNullable().defaultTo(0);
    table.float('overall_risk_score').notNullable().defaultTo(0);

    // Classification
    table.boolean('is_flagged').notNullable().defaultTo(false);
    table.boolean('requires_review').notNullable().defaultTo(false);
    table.boolean('auto_blocked').notNullable().defaultTo(false);

    // Detected patterns
    table.jsonb('detected_patterns').nullable(); // Array of pattern types detected
    table.jsonb('confidence_scores').nullable(); // Confidence for each detection
    table.jsonb('ai_explanation').nullable(); // Explanation from AI for reviewers

    // Review status
    table.enum('review_status', ['pending', 'reviewed', 'confirmed', 'dismissed', 'escalated']).notNullable().defaultTo('pending');
    table.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at').nullable();
    table.text('reviewer_notes').nullable();

    // Actions taken
    table.enum('action_taken', ['none', 'warning_sent', 'message_hidden', 'user_warned', 'user_suspended', 'user_banned', 'escalated_to_law_enforcement']).nullable();

    table.timestamps(true, true);

    // Indexes
    table.index('sender_id');
    table.index('recipient_id');
    table.index('harassment_score');
    table.index('overall_risk_score');
    table.index('is_flagged');
    table.index('requires_review');
    table.index('review_status');
    table.index('created_at');
  });

  // Block Audit Log - for tracking block/unblock history
  await knex.schema.createTable('block_audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('blocker_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('blocked_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('action', ['block', 'unblock']).notNullable();
    table.string('reason', 500).nullable();
    table.string('source', 50).nullable(); // 'manual', 'auto_harassment', 'report', 'admin'
    table.jsonb('context').nullable(); // Additional context (e.g., related report ID)
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('blocker_id');
    table.index('blocked_id');
    table.index('action');
    table.index('created_at');
  });

  // Enhanced Report Evidence
  await knex.schema.createTable('report_evidence', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('report_id').notNullable().references('id').inTable('reports').onDelete('CASCADE');
    table.enum('evidence_type', ['screenshot', 'message', 'conversation', 'profile', 'media', 'other']).notNullable();
    table.text('content_url').nullable(); // For screenshots/media
    table.text('content_text').nullable(); // For message/text evidence
    table.uuid('message_id').nullable(); // Reference to specific message
    table.uuid('conversation_id').nullable(); // Reference to conversation
    table.jsonb('metadata').nullable(); // Additional context
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('report_id');
    table.index('evidence_type');
  });

  // AI Report Analysis
  await knex.schema.createTable('report_ai_analysis', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('report_id').notNullable().references('id').inTable('reports').onDelete('CASCADE');

    // AI-suggested classification
    table.string('suggested_category', 50).nullable();
    table.float('category_confidence').nullable();
    table.string('suggested_severity', 20).nullable();
    table.float('severity_confidence').nullable();

    // Risk assessment
    table.float('legitimacy_score').nullable(); // How likely the report is genuine
    table.float('urgency_score').nullable(); // How urgent the report is
    table.boolean('requires_immediate_action').notNullable().defaultTo(false);

    // Similar reports detection
    table.integer('similar_reports_count').defaultTo(0);
    table.jsonb('similar_report_ids').nullable();

    // AI reasoning
    table.text('analysis_summary').nullable();
    table.jsonb('detailed_analysis').nullable();

    // Processing info
    table.string('model_version').nullable();
    table.timestamp('analyzed_at').notNullable().defaultTo(knex.fn.now());

    table.timestamps(true, true);

    table.index('report_id');
    table.index('suggested_severity');
    table.index('requires_immediate_action');
  });

  // Emergency Panic Button Events (enhanced from sos_alerts)
  await knex.schema.createTable('panic_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('sos_alert_id').nullable().references('id').inTable('sos_alerts').onDelete('SET NULL');

    // Trigger context
    table.enum('trigger_type', ['button_press', 'gesture', 'voice_command', 'auto_detection', 'shake_device']).notNullable();
    table.uuid('related_match_id').nullable(); // If triggered during a date/conversation with specific user
    table.uuid('related_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');

    // Location tracking
    table.float('latitude').nullable();
    table.float('longitude').nullable();
    table.float('location_accuracy').nullable();
    table.string('address').nullable();
    table.string('venue_name').nullable();

    // 911 Integration
    table.boolean('emergency_services_contacted').notNullable().defaultTo(false);
    table.timestamp('emergency_services_contacted_at').nullable();
    table.string('emergency_reference_number').nullable();

    // Live location sharing
    table.boolean('live_location_enabled').notNullable().defaultTo(false);
    table.jsonb('location_history').nullable(); // Array of location updates

    // Recording
    table.boolean('audio_recording_enabled').notNullable().defaultTo(false);
    table.string('audio_recording_url').nullable();

    // Resolution
    table.enum('status', ['active', 'resolved', 'escalated', 'false_alarm']).notNullable().defaultTo('active');
    table.text('resolution_notes').nullable();
    table.uuid('resolved_by').nullable();
    table.timestamp('resolved_at').nullable();

    table.timestamps(true, true);

    table.index('user_id');
    table.index('status');
    table.index('created_at');
    table.index(['latitude', 'longitude']);
  });

  // User Safety Scores (aggregate safety metrics)
  await knex.schema.createTable('user_safety_scores', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').unique();

    // Safety metrics
    table.float('overall_safety_score').notNullable().defaultTo(100);
    table.float('harassment_risk_score').notNullable().defaultTo(0);
    table.float('report_frequency_score').notNullable().defaultTo(0);
    table.float('block_frequency_score').notNullable().defaultTo(0);

    // Counts
    table.integer('total_reports_received').notNullable().defaultTo(0);
    table.integer('confirmed_reports').notNullable().defaultTo(0);
    table.integer('total_blocks_received').notNullable().defaultTo(0);
    table.integer('harassment_detections').notNullable().defaultTo(0);
    table.integer('warnings_received').notNullable().defaultTo(0);
    table.integer('suspensions_count').notNullable().defaultTo(0);

    // Status flags
    table.boolean('is_flagged').notNullable().defaultTo(false);
    table.boolean('is_under_review').notNullable().defaultTo(false);
    table.boolean('is_restricted').notNullable().defaultTo(false);
    table.string('restriction_reason').nullable();

    // Verification bonuses
    table.boolean('is_id_verified').notNullable().defaultTo(false);
    table.boolean('is_photo_verified').notNullable().defaultTo(false);
    table.boolean('has_clean_background_check').notNullable().defaultTo(false);

    table.timestamp('last_calculated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.index('user_id');
    table.index('overall_safety_score');
    table.index('is_flagged');
    table.index('is_under_review');
  });

  // Real-time Content Moderation Queue
  await knex.schema.createTable('realtime_moderation_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('content_id').notNullable(); // Message ID, photo ID, etc.
    table.enum('content_type', ['message', 'photo', 'bio', 'prompt_response', 'profile_update']).notNullable();
    table.text('content_preview').nullable();
    table.string('content_url').nullable();

    // Quick flags
    table.boolean('is_urgent').notNullable().defaultTo(false);
    table.boolean('is_auto_flagged').notNullable().defaultTo(false);
    table.float('risk_score').notNullable().defaultTo(0);
    table.jsonb('flagged_categories').nullable();

    // Processing status
    table.enum('status', ['pending', 'in_review', 'approved', 'rejected', 'escalated']).notNullable().defaultTo('pending');
    table.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('assigned_at').nullable();
    table.uuid('processed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('processed_at').nullable();
    table.text('processing_notes').nullable();

    // Action taken
    table.enum('action_taken', ['approved', 'hidden', 'removed', 'user_warned', 'user_suspended', 'user_banned']).nullable();

    table.timestamps(true, true);

    table.index('user_id');
    table.index('content_type');
    table.index('status');
    table.index('is_urgent');
    table.index('risk_score');
    table.index('created_at');
  });

  // Moderator Actions Log
  await knex.schema.createTable('moderator_action_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('moderator_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('target_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.uuid('report_id').nullable().references('id').inTable('reports').onDelete('SET NULL');
    table.uuid('content_id').nullable();

    table.enum('action_type', [
      'report_reviewed',
      'report_resolved',
      'report_dismissed',
      'report_escalated',
      'user_warned',
      'user_suspended',
      'user_banned',
      'user_unbanned',
      'content_removed',
      'content_approved',
      'block_applied',
      'safety_note_added',
      'priority_changed',
      'case_assigned',
      'case_transferred'
    ]).notNullable();

    table.text('action_details').nullable();
    table.jsonb('before_state').nullable();
    table.jsonb('after_state').nullable();
    table.string('ip_address').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('moderator_id');
    table.index('target_user_id');
    table.index('report_id');
    table.index('action_type');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('moderator_action_logs');
  await knex.schema.dropTableIfExists('realtime_moderation_queue');
  await knex.schema.dropTableIfExists('user_safety_scores');
  await knex.schema.dropTableIfExists('panic_events');
  await knex.schema.dropTableIfExists('report_ai_analysis');
  await knex.schema.dropTableIfExists('report_evidence');
  await knex.schema.dropTableIfExists('block_audit_logs');
  await knex.schema.dropTableIfExists('harassment_detection_results');
}
