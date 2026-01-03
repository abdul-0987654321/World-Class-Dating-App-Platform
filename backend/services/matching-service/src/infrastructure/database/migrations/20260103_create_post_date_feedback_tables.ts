import { Knex } from 'knex';

/**
 * Post-Date Feedback System Migration
 *
 * Creates tables for:
 * - scheduled_dates: Tracks dates between users
 * - feedback_requests: Tracks feedback request status
 * - post_date_feedback: Stores actual feedback (anonymous to other user)
 * - feedback_safety_issues: Confidential safety reports
 * - user_matching_weights: User-specific matching weight adjustments based on feedback
 */
export async function up(knex: Knex): Promise<void> {
  // Create scheduled_dates table to track dates between users
  await knex.schema.createTable('scheduled_dates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Participants
    table.uuid('user1_id').notNullable().index();
    table.uuid('user2_id').notNullable().index();
    table.uuid('match_id').notNullable().index();

    // Date details
    table.timestamp('scheduled_time').notNullable().index();
    table.string('location_name', 500).nullable();
    table.string('location_type', 50).nullable(); // virtual, restaurant, cafe, etc.
    table.jsonb('location_coordinates').nullable(); // { lat, lng }
    table.text('notes').nullable();

    // Status tracking
    table.enum('status', [
      'scheduled',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
      'rescheduled'
    ]).notNullable().defaultTo('scheduled').index();

    // Who created/confirmed
    table.uuid('created_by').notNullable();
    table.uuid('confirmed_by').nullable();
    table.timestamp('confirmed_at').nullable();
    table.uuid('cancelled_by').nullable();
    table.timestamp('cancelled_at').nullable();
    table.text('cancellation_reason').nullable();

    // Completion tracking
    table.timestamp('completed_at').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index(['user1_id', 'status']);
    table.index(['user2_id', 'status']);
    table.index(['scheduled_time', 'status']);
    table.index(['match_id', 'status']);
  });

  // Create feedback_requests table
  await knex.schema.createTable('feedback_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Link to scheduled date
    table.uuid('scheduled_date_id').notNullable()
      .references('id').inTable('scheduled_dates')
      .onDelete('CASCADE');

    // User who should provide feedback
    table.uuid('user_id').notNullable().index();

    // User they went on date with (for anonymity tracking)
    table.uuid('partner_id').notNullable();

    // Request status
    table.enum('status', [
      'pending',      // Waiting to be sent (scheduled)
      'sent',         // Notification sent
      'opened',       // User opened the feedback form
      'completed',    // Feedback submitted
      'skipped',      // User declined to provide feedback
      'expired'       // 7 days passed without response
    ]).notNullable().defaultTo('pending').index();

    // Timing
    table.timestamp('send_at').notNullable().index(); // When to send the request (24h after date)
    table.timestamp('sent_at').nullable();
    table.timestamp('opened_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('expires_at').notNullable().index(); // 7 days after send_at

    // Reminder tracking
    table.integer('reminder_count').notNullable().defaultTo(0);
    table.timestamp('last_reminder_at').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Unique constraint: one request per user per date
    table.unique(['scheduled_date_id', 'user_id']);

    // Indexes
    table.index(['status', 'send_at']);
    table.index(['user_id', 'status']);
  });

  // Create post_date_feedback table
  await knex.schema.createTable('post_date_feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Link to feedback request
    table.uuid('feedback_request_id').notNullable()
      .references('id').inTable('feedback_requests')
      .onDelete('CASCADE')
      .unique(); // One feedback per request

    // Link to scheduled date
    table.uuid('scheduled_date_id').notNullable()
      .references('id').inTable('scheduled_dates')
      .onDelete('CASCADE');

    // User providing feedback (stored but not exposed to partner)
    table.uuid('user_id').notNullable().index();

    // Partner they're rating (for aggregation purposes only)
    table.uuid('partner_id').notNullable().index();

    // Overall rating (1-5 stars)
    table.integer('overall_rating').notNullable();
    table.check('overall_rating >= 1 AND overall_rating <= 5', [], 'check_overall_rating');

    // Category ratings (1-5 each)
    table.integer('conversation_rating').notNullable();
    table.check('conversation_rating >= 1 AND conversation_rating <= 5', [], 'check_conversation_rating');

    table.integer('chemistry_rating').notNullable();
    table.check('chemistry_rating >= 1 AND chemistry_rating <= 5', [], 'check_chemistry_rating');

    table.integer('punctuality_rating').notNullable();
    table.check('punctuality_rating >= 1 AND punctuality_rating <= 5', [], 'check_punctuality_rating');

    table.integer('appearance_accuracy_rating').notNullable(); // Did they look like their photos?
    table.check('appearance_accuracy_rating >= 1 AND appearance_accuracy_rating <= 5', [], 'check_appearance_accuracy');

    table.integer('respectfulness_rating').notNullable();
    table.check('respectfulness_rating >= 1 AND respectfulness_rating <= 5', [], 'check_respectfulness_rating');

    // Would go on another date?
    table.enum('would_date_again', ['yes', 'maybe', 'no']).notNullable();

    // Optional text feedback (kept confidential, used for matching improvement)
    table.text('positive_notes').nullable(); // What went well
    table.text('improvement_notes').nullable(); // Areas for improvement

    // Did the date actually happen?
    table.boolean('date_happened').notNullable().defaultTo(true);
    table.enum('no_show_user', ['me', 'partner', 'both', null]).nullable();

    // Safety feedback flag (if true, check feedback_safety_issues)
    table.boolean('has_safety_concerns').notNullable().defaultTo(false);

    // Match quality feedback for algorithm improvement
    table.enum('match_quality', ['excellent', 'good', 'fair', 'poor']).nullable();
    table.jsonb('compatibility_feedback').nullable(); // { interests: 'accurate'|'inaccurate', values: '...', etc. }

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes for aggregation
    table.index(['partner_id', 'created_at']);
    table.index(['user_id', 'created_at']);
    table.index(['overall_rating']);
    table.index(['would_date_again']);
    table.index(['has_safety_concerns']);
  });

  // Create feedback_safety_issues table (confidential)
  await knex.schema.createTable('feedback_safety_issues', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Link to feedback
    table.uuid('feedback_id').notNullable()
      .references('id').inTable('post_date_feedback')
      .onDelete('CASCADE');

    // Reporter and reported user
    table.uuid('reporter_id').notNullable().index();
    table.uuid('reported_user_id').notNullable().index();

    // Issue category
    table.enum('category', [
      'harassment',
      'inappropriate_behavior',
      'felt_unsafe',
      'misrepresentation',
      'substance_abuse',
      'verbal_abuse',
      'physical_threat',
      'unwanted_contact',
      'boundary_violation',
      'catfishing',
      'other'
    ]).notNullable().index();

    // Severity level
    table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable().index();

    // Details
    table.text('description').notNullable();
    table.jsonb('additional_details').nullable();

    // Status tracking
    table.enum('status', [
      'new',
      'under_review',
      'action_taken',
      'dismissed',
      'escalated'
    ]).notNullable().defaultTo('new').index();

    // Action taken
    table.text('action_notes').nullable();
    table.uuid('reviewed_by').nullable();
    table.timestamp('reviewed_at').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index(['status', 'severity']);
    table.index(['reported_user_id', 'status']);
    table.index(['created_at']);
  });

  // Create user_matching_weights table for algorithm personalization
  await knex.schema.createTable('user_matching_weights', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User this applies to
    table.uuid('user_id').notNullable().unique();

    // Base matching weights (adjusted based on feedback patterns)
    table.decimal('distance_weight', 5, 4).notNullable().defaultTo(0.3000);
    table.decimal('interests_weight', 5, 4).notNullable().defaultTo(0.2500);
    table.decimal('activity_weight', 5, 4).notNullable().defaultTo(0.1500);
    table.decimal('preferences_weight', 5, 4).notNullable().defaultTo(0.3000);

    // Learned preferences from feedback
    table.decimal('conversation_importance', 5, 4).notNullable().defaultTo(0.2000);
    table.decimal('chemistry_importance', 5, 4).notNullable().defaultTo(0.2000);
    table.decimal('punctuality_importance', 5, 4).notNullable().defaultTo(0.1500);
    table.decimal('appearance_accuracy_importance', 5, 4).notNullable().defaultTo(0.2000);
    table.decimal('respectfulness_importance', 5, 4).notNullable().defaultTo(0.2500);

    // Aggregate stats from received feedback
    table.integer('total_dates').notNullable().defaultTo(0);
    table.integer('successful_dates').notNullable().defaultTo(0); // would_date_again = yes
    table.decimal('avg_rating_received', 3, 2).nullable();
    table.decimal('date_success_rate', 5, 4).nullable();

    // Last calculation
    table.timestamp('last_calculated_at').nullable();
    table.integer('feedback_count_at_calculation').notNullable().defaultTo(0);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Index
    table.index(['user_id']);
    table.index(['date_success_rate']);
  });

  // Create date_feedback_summary table for quick lookups
  await knex.schema.createTable('date_feedback_summary', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User this summary is for
    table.uuid('user_id').notNullable().unique();

    // Aggregate ratings (received from others, anonymous)
    table.decimal('avg_overall_rating', 3, 2).nullable();
    table.decimal('avg_conversation_rating', 3, 2).nullable();
    table.decimal('avg_chemistry_rating', 3, 2).nullable();
    table.decimal('avg_punctuality_rating', 3, 2).nullable();
    table.decimal('avg_appearance_accuracy_rating', 3, 2).nullable();
    table.decimal('avg_respectfulness_rating', 3, 2).nullable();

    // Would date again stats
    table.integer('would_date_again_yes_count').notNullable().defaultTo(0);
    table.integer('would_date_again_maybe_count').notNullable().defaultTo(0);
    table.integer('would_date_again_no_count').notNullable().defaultTo(0);

    // Date stats
    table.integer('total_dates_completed').notNullable().defaultTo(0);
    table.integer('total_feedback_received').notNullable().defaultTo(0);
    table.integer('no_show_count').notNullable().defaultTo(0);

    // Safety flags (for internal use only)
    table.integer('safety_concerns_count').notNullable().defaultTo(0);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Index
    table.index(['user_id']);
    table.index(['avg_overall_rating']);
  });

  // Create updated_at trigger function if not exists
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_feedback_tables_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create triggers for updated_at
  const tables = [
    'scheduled_dates',
    'feedback_requests',
    'post_date_feedback',
    'feedback_safety_issues',
    'user_matching_weights',
    'date_feedback_summary'
  ];

  for (const tableName of tables) {
    await knex.raw(`
      CREATE TRIGGER update_${tableName}_updated_at
        BEFORE UPDATE ON ${tableName}
        FOR EACH ROW
        EXECUTE FUNCTION update_feedback_tables_updated_at();
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  const tables = [
    'date_feedback_summary',
    'user_matching_weights',
    'feedback_safety_issues',
    'post_date_feedback',
    'feedback_requests',
    'scheduled_dates'
  ];

  for (const tableName of tables) {
    await knex.raw(`DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON ${tableName}`);
  }

  // Drop function
  await knex.raw('DROP FUNCTION IF EXISTS update_feedback_tables_updated_at');

  // Drop tables in reverse order (due to foreign key constraints)
  await knex.schema.dropTableIfExists('date_feedback_summary');
  await knex.schema.dropTableIfExists('user_matching_weights');
  await knex.schema.dropTableIfExists('feedback_safety_issues');
  await knex.schema.dropTableIfExists('post_date_feedback');
  await knex.schema.dropTableIfExists('feedback_requests');
  await knex.schema.dropTableIfExists('scheduled_dates');
}
