import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create photo_moderation_queue table
  await knex.schema.createTable('photo_moderation_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('photo_id').notNullable().unique().index();
    table.uuid('user_id').notNullable().index();
    table.text('photo_url').notNullable();
    table.text('thumbnail_url');

    // AI Analysis Scores
    table.decimal('ai_risk_score', 5, 4).notNullable().defaultTo(0);
    table.decimal('azure_adult_score', 5, 4);
    table.decimal('azure_racy_score', 5, 4);
    table.decimal('azure_gore_score', 5, 4);
    table.decimal('aws_explicit_nudity_score', 5, 4);
    table.decimal('aws_suggestive_score', 5, 4);
    table.decimal('aws_violence_score', 5, 4);
    table.jsonb('ai_analysis_data'); // Full AI analysis results

    // Detected Issues
    table.specificType('detected_violations', 'text[]').defaultTo('{}');
    table.specificType('ai_tags', 'text[]').defaultTo('{}');
    table.boolean('contains_faces').defaultTo(false);
    table.integer('face_count').defaultTo(0);
    table.boolean('age_verification_needed').defaultTo(false);

    // Queue Management
    table.string('status', 50).notNullable().defaultTo('pending').index();
    // Status: pending, in_review, approved, rejected, escalated
    table.string('priority', 20).notNullable().defaultTo('medium').index();
    // Priority: low, medium, high, urgent
    table.integer('retry_count').notNullable().defaultTo(0);
    table.timestamp('queued_at').notNullable().defaultTo(knex.fn.now());

    // Assignment
    table.uuid('assigned_to').index(); // Moderator ID
    table.timestamp('assigned_at');
    table.timestamp('review_started_at');
    table.timestamp('review_completed_at');

    // User Context (for smart prioritization)
    table.integer('user_violation_count').defaultTo(0);
    table.boolean('user_is_new').defaultTo(true);
    table.boolean('user_is_verified').defaultTo(false);
    table.integer('user_photo_count').defaultTo(0);
    table.timestamp('user_joined_at');

    // Metadata
    table.jsonb('metadata'); // Additional metadata
    table.timestamps(true, true);

    // Composite indexes for efficient queue queries
    table.index(['status', 'priority', 'queued_at']);
    table.index(['assigned_to', 'status']);
    table.index(['status', 'queued_at']);
    table.index(['user_id', 'status']);
  });

  // Create photo_moderation_decisions table
  await knex.schema.createTable('photo_moderation_decisions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('queue_id').notNullable().references('id').inTable('photo_moderation_queue').onDelete('CASCADE');
    table.uuid('photo_id').notNullable().index();
    table.uuid('user_id').notNullable().index();

    // Decision
    table.string('decision', 50).notNullable().index();
    // Decision: approved, rejected, escalated, needs_resubmit
    table.uuid('moderator_id').notNullable().index();
    table.text('moderator_notes');
    table.specificType('violation_reasons', 'text[]').defaultTo('{}');

    // Action Taken
    table.string('action_taken', 100);
    // Action: content_approved, content_removed, user_warned, user_suspended, etc.
    table.boolean('user_notified').defaultTo(false);
    table.timestamp('user_notified_at');

    // Review Quality
    table.integer('confidence_level').defaultTo(5); // 1-5 scale
    table.boolean('requires_second_review').defaultTo(false);
    table.uuid('reviewed_by'); // Second reviewer ID
    table.timestamp('second_review_at');
    table.text('second_review_notes');

    // Timing Metrics
    table.integer('review_duration_seconds'); // Time spent reviewing
    table.timestamp('decided_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index(['moderator_id', 'decided_at']);
    table.index(['decision', 'decided_at']);
    table.index('decided_at');
  });

  // Create photo_moderation_appeals table
  await knex.schema.createTable('photo_moderation_appeals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('decision_id').notNullable().references('id').inTable('photo_moderation_decisions').onDelete('CASCADE');
    table.uuid('photo_id').notNullable().index();
    table.uuid('user_id').notNullable().index();

    // Appeal Details
    table.text('appeal_reason').notNullable();
    table.text('user_explanation');
    table.string('appeal_status', 50).notNullable().defaultTo('pending').index();
    // Status: pending, under_review, approved, rejected, withdrawn
    table.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());

    // Review
    table.uuid('reviewed_by'); // Appeal reviewer ID
    table.timestamp('reviewed_at');
    table.string('appeal_decision', 50);
    // Decision: overturn_approval, overturn_rejection, uphold_decision
    table.text('review_notes');

    // Resolution
    table.string('resolution_action', 100);
    // Action: photo_restored, decision_upheld, partial_resolution, etc.
    table.boolean('user_notified').defaultTo(false);
    table.timestamp('user_notified_at');
    table.timestamp('resolved_at');

    table.timestamps(true, true);

    // Indexes
    table.index(['user_id', 'appeal_status']);
    table.index(['appeal_status', 'submitted_at']);
    table.index('submitted_at');
  });

  // Create photo_moderation_stats table (for analytics and dashboard)
  await knex.schema.createTable('photo_moderation_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.date('stat_date').notNullable().unique().index();

    // Queue Stats
    table.integer('total_queued').notNullable().defaultTo(0);
    table.integer('total_reviewed').notNullable().defaultTo(0);
    table.integer('total_approved').notNullable().defaultTo(0);
    table.integer('total_rejected').notNullable().defaultTo(0);
    table.integer('total_escalated').notNullable().defaultTo(0);

    // Auto vs Manual
    table.integer('auto_approved').notNullable().defaultTo(0);
    table.integer('auto_rejected').notNullable().defaultTo(0);
    table.integer('manual_reviewed').notNullable().defaultTo(0);

    // Performance Metrics
    table.decimal('avg_review_time_seconds', 10, 2);
    table.decimal('avg_queue_wait_time_minutes', 10, 2);
    table.integer('max_queue_size').defaultTo(0);
    table.integer('end_of_day_queue_size').defaultTo(0);

    // AI Accuracy (compared to manual reviews)
    table.decimal('ai_accuracy_rate', 5, 4); // How often AI matches manual decision
    table.integer('ai_false_positives').defaultTo(0);
    table.integer('ai_false_negatives').defaultTo(0);

    // Moderator Stats
    table.jsonb('moderator_stats'); // { moderatorId: { reviewed: X, approved: Y, rejected: Z } }
    table.jsonb('violation_breakdown'); // { violationType: count }

    // Appeals
    table.integer('appeals_submitted').defaultTo(0);
    table.integer('appeals_approved').defaultTo(0);
    table.integer('appeals_rejected').defaultTo(0);

    table.timestamps(true, true);
  });

  // Create indexes for better query performance
  await knex.raw(`
    CREATE INDEX idx_photo_queue_priority_order
    ON photo_moderation_queue (priority DESC, queued_at ASC)
    WHERE status = 'pending'
  `);

  await knex.raw(`
    CREATE INDEX idx_photo_queue_assigned
    ON photo_moderation_queue (assigned_to, status, assigned_at DESC)
    WHERE assigned_to IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('photo_moderation_stats');
  await knex.schema.dropTableIfExists('photo_moderation_appeals');
  await knex.schema.dropTableIfExists('photo_moderation_decisions');
  await knex.schema.dropTableIfExists('photo_moderation_queue');
}
