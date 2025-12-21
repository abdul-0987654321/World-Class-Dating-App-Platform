import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('moderation_cases', (table) => {
    table.uuid('case_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('subject_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('reporter_id').nullable().references('id').inTable('users').onDelete('SET NULL'); // User who reported, if applicable
    table.enum('case_type', [
      'user_report',
      'content_violation',
      'automated_detection',
      'appeal',
      'escalation',
      'proactive_review'
    ]).notNullable();
    table.enum('status', [
      'open',
      'under_review',
      'pending_action',
      'resolved',
      'dismissed',
      'escalated'
    ]).notNullable().defaultTo('open');
    table.enum('priority', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('medium');
    table.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL'); // Moderator assigned
    table.text('description').nullable();
    table.jsonb('metadata').nullable(); // Additional case data
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('resolved_at').nullable();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for frequent queries
    table.index('subject_user_id');
    table.index('reporter_id');
    table.index('status');
    table.index('priority');
    table.index('case_type');
    table.index('assigned_to');
    table.index(['status', 'priority']);
    table.index(['status', 'created_at']);
    table.index('created_at');
    table.index('resolved_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('moderation_cases');
}
