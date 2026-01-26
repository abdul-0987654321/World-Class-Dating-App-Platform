/**
 * Conversation Intelligence Service Database Migrations
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Connection Scores
  await knex.schema.createTable('connection_scores', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable().unique();
    table.uuid('user1_id').notNullable();
    table.uuid('user2_id').notNullable();

    // Scores
    table.decimal('overall_score', 5, 2).defaultTo(0);
    table.string('score_level', 20).defaultTo('sparking');

    table.decimal('depth_score', 5, 2).defaultTo(0);
    table.decimal('reciprocity_score', 5, 2).defaultTo(0);
    table.decimal('engagement_score', 5, 2).defaultTo(0);
    table.decimal('progression_score', 5, 2).defaultTo(0);

    // Metrics
    table.integer('total_messages').defaultTo(0);
    table.decimal('average_message_length', 7, 2).defaultTo(0);
    table.decimal('question_ratio', 5, 4).defaultTo(0);
    table.decimal('response_time_average', 10, 2).defaultTo(0);
    table.specificType('topics_discussed', 'text[]').defaultTo('{}');

    // Progression indicators
    table.boolean('has_exchanged_personal_info').defaultTo(false);
    table.boolean('has_discussed_meetup').defaultTo(false);
    table.boolean('has_shared_vulnerability').defaultTo(false);

    // Trends
    table.string('score_trend', 20).defaultTo('stable');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user1_id']);
    table.index(['user2_id']);
  });

  // Message Analysis Cache
  await knex.schema.createTable('message_analyses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('message_id').notNullable().unique();
    table.uuid('conversation_id').notNullable().index();
    table.uuid('sender_id').notNullable();

    // Analysis results
    table.integer('word_count').defaultTo(0);
    table.boolean('is_question').defaultTo(false);
    table.decimal('depth_score', 5, 2).defaultTo(0);
    table.specificType('topics', 'text[]').defaultTo('{}');
    table.boolean('contains_personal_info').defaultTo(false);
    table.boolean('contains_vulnerability').defaultTo(false);
    table.boolean('mentions_meetup').defaultTo(false);
    table.decimal('response_time_minutes', 10, 2);

    table.timestamp('message_timestamp').notNullable();
    table.timestamp('analyzed_at').defaultTo(knex.fn.now());
  });

  // User Intents
  await knex.schema.createTable('user_intents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('conversation_id'); // null = global intent

    table.string('intent', 30).notNullable();
    table.string('available_timeframe', 100);
    table.specificType('preferred_date_types', 'text[]').defaultTo('{}');
    table.text('notes');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'conversation_id']);
    table.index(['user_id']);
  });

  // Ghost Risk Assessments
  await knex.schema.createTable('ghost_risk_assessments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable().index();

    table.decimal('risk_score', 5, 2).defaultTo(0);
    table.string('risk_level', 20).defaultTo('low');
    table.jsonb('factors').defaultTo('[]');
    table.jsonb('interventions').defaultTo('[]');

    table.timestamp('assessed_at').defaultTo(knex.fn.now());
  });

  // Graceful Exits
  await knex.schema.createTable('graceful_exits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable();
    table.uuid('from_user_id').notNullable();
    table.uuid('to_user_id').notNullable();

    table.string('reason', 30).notNullable();
    table.text('custom_message');
    table.text('final_message');

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['from_user_id']);
    table.index(['to_user_id']);
  });

  // Exit Feedback
  await knex.schema.createTable('exit_feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('graceful_exit_id').notNullable().references('graceful_exits.id');
    table.uuid('from_user_id').notNullable();
    table.uuid('to_user_id').notNullable();

    table.specificType('categories', 'text[]').defaultTo('{}');
    table.boolean('is_private').defaultTo(true);

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['to_user_id']);
  });

  // Communication Styles
  await knex.schema.createTable('communication_styles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique();

    table.integer('sample_size').defaultTo(0);

    // Style dimensions (0-100)
    table.decimal('formality', 5, 2).defaultTo(50);
    table.decimal('expressiveness', 5, 2).defaultTo(50);
    table.decimal('verbosity', 5, 2).defaultTo(50);
    table.decimal('question_frequency', 5, 2).defaultTo(50);
    table.decimal('response_speed', 5, 2).defaultTo(50);

    // Patterns
    table.string('emoji_usage', 20).defaultTo('moderate');
    table.decimal('average_message_length', 7, 2).defaultTo(0);
    table.decimal('typical_response_time', 10, 2).defaultTo(0);

    // Preferences
    table.string('preferred_conversation_pace', 20).defaultTo('moderate');
    table.string('preferred_depth', 20).defaultTo('moderate');

    table.timestamp('analyzed_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Conversation Milestones
  await knex.schema.createTable('conversation_milestones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable();
    table.string('milestone_id', 50).notNullable();
    table.string('milestone_name', 100).notNullable();

    table.timestamp('achieved_at').defaultTo(knex.fn.now());

    table.unique(['conversation_id', 'milestone_id']);
    table.index(['conversation_id']);
  });

  // Conversation Suggestions
  await knex.schema.createTable('conversation_suggestions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable();
    table.uuid('for_user_id').notNullable();

    table.string('type', 30).notNullable();
    table.string('priority', 20).defaultTo('medium');
    table.string('title', 200).notNullable();
    table.text('description').notNullable();
    table.specificType('example_actions', 'text[]').defaultTo('{}');

    table.boolean('is_dismissed').defaultTo(false);
    table.boolean('is_actioned').defaultTo(false);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at');

    table.index(['conversation_id', 'for_user_id']);
  });

  // Create indexes
  await knex.raw(`
    CREATE INDEX idx_message_analyses_conversation_time
    ON message_analyses (conversation_id, message_timestamp DESC);

    CREATE INDEX idx_ghost_risk_recent
    ON ghost_risk_assessments (conversation_id, assessed_at DESC);

    CREATE INDEX idx_suggestions_active
    ON conversation_suggestions (conversation_id, for_user_id)
    WHERE is_dismissed = false AND (expires_at IS NULL OR expires_at > NOW());
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('conversation_suggestions');
  await knex.schema.dropTableIfExists('conversation_milestones');
  await knex.schema.dropTableIfExists('communication_styles');
  await knex.schema.dropTableIfExists('exit_feedback');
  await knex.schema.dropTableIfExists('graceful_exits');
  await knex.schema.dropTableIfExists('ghost_risk_assessments');
  await knex.schema.dropTableIfExists('user_intents');
  await knex.schema.dropTableIfExists('message_analyses');
  await knex.schema.dropTableIfExists('connection_scores');
}
