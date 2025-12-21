import { Knex } from 'knex';

/**
 * Add additional fields to verification_requests table for complete verification flow
 * Including biometric consent tracking, retry logic, and expiration handling
 */
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('verification_requests', (table) => {
    // Biometric consent tracking (required for IL, TX, WA)
    table.boolean('biometric_consent_given').defaultTo(false);
    table.timestamp('biometric_consent_at').nullable();
    table.string('biometric_consent_ip', 45).nullable(); // IPv6 max length

    // Retry tracking
    table.integer('retry_count').defaultTo(0);
    table.integer('max_retries').defaultTo(3);

    // Expiration
    table.timestamp('expires_at').nullable();

    // Additional metadata
    table.jsonb('metadata').nullable(); // Device info, attempt details, etc.
    table.string('external_reference_id', 255).nullable(); // Reference ID from external provider

    // Workflow timestamps
    table.timestamp('submitted_at').nullable(); // When user submitted for review
    table.timestamp('completed_at').nullable(); // When verification was completed

    // Additional indexes
    table.index(['status', 'type']); // For worker processing
    table.index('expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('verification_requests', (table) => {
    table.dropIndex(['status', 'type']);
    table.dropIndex('expires_at');

    table.dropColumn('biometric_consent_given');
    table.dropColumn('biometric_consent_at');
    table.dropColumn('biometric_consent_ip');
    table.dropColumn('retry_count');
    table.dropColumn('max_retries');
    table.dropColumn('expires_at');
    table.dropColumn('metadata');
    table.dropColumn('external_reference_id');
    table.dropColumn('submitted_at');
    table.dropColumn('completed_at');
  });
}
