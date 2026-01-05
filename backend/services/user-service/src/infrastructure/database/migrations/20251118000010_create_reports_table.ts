import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('reporter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('reported_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .enum('report_type', [
        'inappropriate_photos',
        'inappropriate_messages',
        'fake_profile',
        'spam',
        'harassment',
        'underage',
        'scam',
        'violence',
        'hate_speech',
        'other',
      ])
      .notNullable();
    table.text('description').nullable();
    table.jsonb('evidence_urls').nullable(); // Screenshots, message IDs, etc.
    table
      .enum('status', ['pending', 'investigating', 'resolved', 'dismissed', 'action_taken'])
      .notNullable()
      .defaultTo('pending');
    table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('medium');
    table.text('resolution').nullable();
    table
      .enum('action_taken', [
        'none',
        'warning_sent',
        'content_removed',
        'account_suspended',
        'account_banned',
      ])
      .nullable();
    table.uuid('resolved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('resolved_at').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('reporter_id');
    table.index('reported_id');
    table.index('status');
    table.index('severity');
    table.index('report_type');
    table.index(['status', 'severity']);
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('reports');
}
