import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('moderation_actions', (table) => {
    table.uuid('action_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('case_id')
      .notNullable()
      .references('case_id')
      .inTable('moderation_cases')
      .onDelete('CASCADE');
    table
      .enum('action_type', [
        'warning_issued',
        'content_removed',
        'content_flagged',
        'account_suspended',
        'account_banned',
        'account_restored',
        'restriction_applied',
        'restriction_removed',
        'note_added',
        'escalated',
        'dismissed',
        'appealed',
        'appeal_approved',
        'appeal_denied',
      ])
      .notNullable();
    table.uuid('actor_id').notNullable().references('id').inTable('users').onDelete('CASCADE'); // Moderator/admin who took action
    table.text('reason').nullable();
    table.jsonb('action_details').nullable(); // Specific details about the action
    table.integer('duration_hours').nullable(); // For temporary suspensions/restrictions
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('case_id');
    table.index('action_type');
    table.index('actor_id');
    table.index(['case_id', 'action_type']);
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('moderation_actions');
}
