/**
 * Wellness Service Database Migrations
 * Creates tables for wellness tracking, readiness assessments, and recovery support
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Wellness Metrics - Daily tracking
  await knex.schema.createTable('wellness_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.date('date').notNullable();

    // Usage patterns
    table.integer('session_count').defaultTo(0);
    table.integer('total_minutes_used').defaultTo(0);
    table.integer('swipe_count').defaultTo(0);
    table.integer('messages_sent').defaultTo(0);
    table.integer('messages_received').defaultTo(0);
    table.integer('matches_received').defaultTo(0);
    table.integer('rejections_received').defaultTo(0);

    // Engagement quality
    table.decimal('average_conversation_depth', 5, 2).defaultTo(0);
    table.integer('meaningful_conversations').defaultTo(0);
    table.integer('ghosted_conversations').defaultTo(0);

    // Emotional indicators
    table.string('mood_before_session', 20);
    table.string('mood_after_session', 20);
    table.decimal('reported_anxiety', 3, 1);
    table.decimal('reported_frustration', 3, 1);

    // Computed scores
    table.decimal('overall_wellness_score', 5, 2).defaultTo(0);
    table.decimal('usage_health_score', 5, 2).defaultTo(0);
    table.decimal('emotional_impact_score', 5, 2).defaultTo(0);
    table.decimal('engagement_quality_score', 5, 2).defaultTo(0);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'date']);
  });

  // Readiness Assessments
  await knex.schema.createTable('readiness_assessments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.timestamp('completed_at').notNullable();
    table.timestamp('expires_at').notNullable();

    // Dimension scores
    table.decimal('emotional_availability', 5, 2).notNullable();
    table.decimal('time_availability', 5, 2).notNullable();
    table.decimal('previous_relationship_recovery', 5, 2).notNullable();
    table.decimal('communication_readiness', 5, 2).notNullable();
    table.decimal('intentionality_score', 5, 2).notNullable();
    table.decimal('self_awareness_score', 5, 2).notNullable();

    // Overall results
    table.decimal('overall_readiness_score', 5, 2).notNullable();
    table.string('readiness_level', 20).notNullable();
    table.string('suggested_dating_mode', 30).notNullable();
    table.string('suggested_pace', 20).notNullable();

    // Analysis (JSON)
    table.jsonb('strengths').defaultTo('[]');
    table.jsonb('growth_areas').defaultTo('[]');
    table.jsonb('blockers').defaultTo('[]');
    table.jsonb('recommendations').defaultTo('[]');

    // Raw answers for future analysis
    table.jsonb('raw_answers').defaultTo('{}');

    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Dating Sabbaticals
  await knex.schema.createTable('dating_sabbaticals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.timestamp('started_at').notNullable();
    table.timestamp('planned_end_date').notNullable();
    table.timestamp('actual_end_date');

    table.string('status', 20).notNullable().defaultTo('active');
    table.string('reason', 30).notNullable();
    table.text('custom_reason');

    // State preservation
    table.integer('match_conversations').defaultTo(0);
    table.specificType('active_matches', 'uuid[]').defaultTo('{}');

    // Break activities
    table.specificType('completed_exercises', 'text[]').defaultTo('{}');

    // Return planning
    table.text('return_commitment');
    table.specificType('return_goals', 'text[]').defaultTo('{}');

    // Effectiveness tracking
    table.decimal('pre_break_wellness_score', 5, 2);
    table.decimal('post_break_wellness_score', 5, 2);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Rejection Events
  await knex.schema.createTable('rejection_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.timestamp('occurred_at').notNullable();
    table.string('type', 30).notNullable();

    // Context
    table.uuid('conversation_id');
    table.integer('conversation_length').defaultTo(0);
    table.integer('conversation_duration_hours').defaultTo(0);
    table.string('emotional_investment', 20).defaultTo('low');

    // Recovery tracking
    table.string('recovery_status', 20).defaultTo('processing');
    table.timestamp('recovery_started_at');
    table.timestamp('recovery_completed_at');

    // Support provided
    table.boolean('support_message_shown').defaultTo(false);
    table.uuid('support_message_id');
    table.string('user_feedback', 20);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'occurred_at']);
  });

  // Health Alerts
  await knex.schema.createTable('health_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();

    table.string('severity', 20).notNullable();
    table.string('type', 30).notNullable();
    table.string('title', 200).notNullable();
    table.text('message').notNullable();
    table.boolean('action_required').defaultTo(false);
    table.text('suggested_action');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('dismissed_at');
    table.timestamp('expires_at');

    table.index(['user_id', 'dismissed_at']);
  });

  // Mood Check-ins
  await knex.schema.createTable('mood_checkins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.uuid('session_id');

    table.string('session_type', 10).notNullable(); // 'start' or 'end'
    table.string('mood', 20).notNullable();
    table.decimal('anxiety', 3, 1);
    table.decimal('frustration', 3, 1);
    table.text('notes');

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'created_at']);
  });

  // Readiness Questions (reference data)
  await knex.schema.createTable('readiness_questions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('dimension', 50).notNullable();
    table.text('question_text').notNullable();
    table.string('question_type', 20).notNullable();
    table.jsonb('options');
    table.decimal('weight', 3, 2).defaultTo(1.0);
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Reflection Exercises (reference data)
  await knex.schema.createTable('reflection_exercises', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 200).notNullable();
    table.text('description').notNullable();
    table.specificType('prompts', 'text[]').notNullable();
    table.integer('estimated_minutes').defaultTo(10);
    table.string('category', 30).notNullable();
    table.boolean('is_active').defaultTo(true);

    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // User Exercise Completions
  await knex.schema.createTable('user_exercise_completions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.uuid('exercise_id').notNullable();
    table.uuid('sabbatical_id');

    table.jsonb('responses');
    table.integer('time_spent_minutes');

    table.timestamp('completed_at').defaultTo(knex.fn.now());

    table.foreign('exercise_id').references('reflection_exercises.id');
  });

  // Create indexes for common queries
  await knex.raw(`
    CREATE INDEX idx_wellness_metrics_user_date
    ON wellness_metrics (user_id, date DESC);

    CREATE INDEX idx_readiness_assessments_user_active
    ON readiness_assessments (user_id, completed_at DESC)
    WHERE expires_at > NOW();

    CREATE INDEX idx_sabbaticals_active
    ON dating_sabbaticals (user_id)
    WHERE status = 'active';

    CREATE INDEX idx_alerts_active
    ON health_alerts (user_id, created_at DESC)
    WHERE dismissed_at IS NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_exercise_completions');
  await knex.schema.dropTableIfExists('reflection_exercises');
  await knex.schema.dropTableIfExists('readiness_questions');
  await knex.schema.dropTableIfExists('mood_checkins');
  await knex.schema.dropTableIfExists('health_alerts');
  await knex.schema.dropTableIfExists('rejection_events');
  await knex.schema.dropTableIfExists('dating_sabbaticals');
  await knex.schema.dropTableIfExists('readiness_assessments');
  await knex.schema.dropTableIfExists('wellness_metrics');
}
