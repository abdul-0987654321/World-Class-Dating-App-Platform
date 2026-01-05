import { Knex } from 'knex';

/**
 * Create verification_dlq (Dead Letter Queue) table for failed verification processing
 * Used for retry logic and error tracking in the verification worker
 */
export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('verification_dlq', (table) => {
    table.uuid('dlq_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('request_id')
      .notNullable()
      .references('request_id')
      .inTable('verification_requests')
      .onDelete('CASCADE');

    // Error information
    table.text('error_message').notNullable();
    table.text('error_stack').nullable();
    table.string('error_code', 100).nullable();

    // Retry tracking
    table.integer('retry_count').defaultTo(0);
    table.integer('max_retries').defaultTo(5);
    table.timestamp('next_retry_at').nullable();
    table.timestamp('last_retry_at').nullable();

    // Status
    table
      .enum('status', [
        'pending', // Waiting for retry
        'retrying', // Currently being processed
        'resolved', // Successfully processed after retry
        'abandoned', // Max retries exceeded, needs manual intervention
      ])
      .defaultTo('pending');

    // Original payload for debugging
    table.jsonb('original_payload').nullable();

    // Resolution
    table.text('resolution_notes').nullable();
    table.uuid('resolved_by').nullable(); // Admin user ID who resolved it
    table.timestamp('resolved_at').nullable();

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('request_id');
    table.index('status');
    table.index('next_retry_at');
    table.index('created_at');
    table.index(['status', 'next_retry_at']); // For worker query
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('verification_dlq');
}
