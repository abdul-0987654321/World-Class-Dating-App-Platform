import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('deletion_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.enum('status', [
      'pending',
      'scheduled',
      'processing',
      'completed',
      'failed',
      'cancelled',
    ]).defaultTo('pending');
    table.enum('deletion_type', [
      'soft_delete', // Mark as deleted but retain data for legal period
      'hard_delete', // Permanent deletion
      'anonymize', // Anonymize but keep statistical data
    ]).defaultTo('soft_delete');
    table.timestamp('requested_at').defaultTo(knex.fn.now());
    table.timestamp('scheduled_for'); // When the deletion will occur (grace period)
    table.timestamp('completed_at');
    table.timestamp('cancelled_at');
    table.text('reason'); // User's reason for deletion
    table.text('cancellation_token'); // Token to cancel deletion during grace period
    table.jsonb('deleted_data_summary'); // Summary of what was deleted
    table.text('error_message');
    table.text('ip_address');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('scheduled_for');
    table.index('cancellation_token');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('deletion_requests');
}
