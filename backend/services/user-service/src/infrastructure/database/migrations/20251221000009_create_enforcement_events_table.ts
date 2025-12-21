import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('enforcement_events', (table) => {
    table.uuid('event_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('case_id').nullable().references('case_id').inTable('moderation_cases').onDelete('SET NULL');
    table.enum('action_type', [
      'account_suspended',
      'account_banned',
      'account_restored',
      'shadowban_applied',
      'shadowban_removed',
      'feature_restricted',
      'feature_unrestricted',
      'content_hidden',
      'content_restored',
      'warning_sent',
      'rate_limited'
    ]).notNullable();
    table.uuid('target_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('enforced_by').nullable().references('id').inTable('users').onDelete('SET NULL'); // Admin/system that enforced
    table.uuid('correlation_id').nullable(); // For tracing related events
    table.text('reason').nullable();
    table.jsonb('enforcement_details').nullable(); // Duration, scope, etc.
    table.timestamp('expires_at').nullable(); // For temporary enforcements
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('reverted_at').nullable();

    // Indexes for frequent queries
    table.index('case_id');
    table.index('action_type');
    table.index('target_user_id');
    table.index('enforced_by');
    table.index('correlation_id');
    table.index(['target_user_id', 'action_type']);
    table.index(['target_user_id', 'is_active']);
    table.index('expires_at');
    table.index('created_at');
    table.index('is_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('enforcement_events');
}
