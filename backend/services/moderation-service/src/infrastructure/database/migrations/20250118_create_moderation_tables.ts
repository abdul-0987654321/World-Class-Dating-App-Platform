import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create moderation_logs table
  await knex.schema.createTable('moderation_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('content_id').notNullable().index();
    table.string('content_type', 50).notNullable();
    table.text('content_url');
    table.text('content_text');
    table.uuid('user_id').notNullable().index();
    table.string('status', 50).notNullable().defaultTo('pending').index();
    table.string('action', 100).notNullable();
    table.decimal('risk_score', 5, 4).notNullable().defaultTo(0);
    table.specificType('violations', 'text[]').defaultTo('{}');
    table.jsonb('image_moderation_data');
    table.jsonb('text_moderation_data');
    table.specificType('recommendations', 'text[]').defaultTo('{}');
    table.timestamp('moderated_at').notNullable();
    table.uuid('moderated_by');
    table.timestamp('reviewed_at');
    table.uuid('reviewed_by');
    table.text('review_notes');
    table.timestamps(true, true);

    // Indexes
    table.index(['user_id', 'created_at']);
    table.index(['status', 'created_at']);
    table.index('moderated_at');
  });

  // Create user_violations table
  await knex.schema.createTable('user_violations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.uuid('moderation_log_id').notNullable().references('id').inTable('moderation_logs').onDelete('CASCADE');
    table.string('violation_type', 100).notNullable();
    table.string('severity', 20).notNullable();
    table.uuid('content_id').notNullable();
    table.string('content_type', 50).notNullable();
    table.string('action', 100).notNullable();
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id', 'created_at']);
    table.index('violation_type');
    table.index('severity');
  });

  // Create user_moderation_records table
  await knex.schema.createTable('user_moderation_records', (table) => {
    table.uuid('user_id').primary();
    table.string('status', 50).notNullable().defaultTo('active').index();
    table.integer('total_violations').notNullable().defaultTo(0);
    table.integer('severe_violations').notNullable().defaultTo(0);
    table.timestamp('last_violation_at');
    table.integer('warnings_issued').notNullable().defaultTo(0);
    table.integer('suspension_count').notNullable().defaultTo(0);
    table.timestamp('current_suspension_ends_at');
    table.boolean('permanently_banned').notNullable().defaultTo(false).index();
    table.timestamp('banned_at');
    table.text('banned_reason');
    table.timestamps(true, true);

    // Indexes
    table.index(['status', 'updated_at']);
  });

  // Create moderation_queue table
  await knex.schema.createTable('moderation_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('content_id').notNullable().unique();
    table.string('content_type', 50).notNullable();
    table.text('content_url');
    table.text('content_text');
    table.uuid('user_id').notNullable();
    table.string('user_name');
    table.text('user_photo');
    table.decimal('risk_score', 5, 4).notNullable();
    table.specificType('violations', 'text[]').defaultTo('{}');
    table.string('status', 50).notNullable().defaultTo('flagged').index();
    table.string('priority', 20).notNullable().defaultTo('medium').index();
    table.timestamp('flagged_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('assigned_to').index();
    table.timestamp('assigned_at');
    table.timestamps(true, true);

    // Indexes
    table.index(['status', 'priority', 'flagged_at']);
    table.index('flagged_at');
  });

  // Create moderation_stats table (for analytics)
  await knex.schema.createTable('moderation_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.date('stat_date').notNullable().unique();
    table.integer('total_moderations').notNullable().defaultTo(0);
    table.integer('auto_approved').notNullable().defaultTo(0);
    table.integer('auto_rejected').notNullable().defaultTo(0);
    table.integer('auto_flagged').notNullable().defaultTo(0);
    table.integer('manual_approved').notNullable().defaultTo(0);
    table.integer('manual_rejected').notNullable().defaultTo(0);
    table.integer('images_moderated').notNullable().defaultTo(0);
    table.integer('text_moderated').notNullable().defaultTo(0);
    table.integer('users_warned').notNullable().defaultTo(0);
    table.integer('users_suspended').notNullable().defaultTo(0);
    table.integer('users_banned').notNullable().defaultTo(0);
    table.decimal('avg_risk_score', 5, 4);
    table.jsonb('violation_counts');
    table.timestamps(true, true);

    // Index
    table.index('stat_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('moderation_stats');
  await knex.schema.dropTableIfExists('moderation_queue');
  await knex.schema.dropTableIfExists('user_moderation_records');
  await knex.schema.dropTableIfExists('user_violations');
  await knex.schema.dropTableIfExists('moderation_logs');
}
