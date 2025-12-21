import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('error_events', (table) => {
    table.uuid('event_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('error_type', 100).notNullable(); // e.g., 'ValidationError', 'DatabaseError', 'TimeoutError'
    table.string('error_code', 50).nullable(); // Application-specific error code
    table.string('service', 100).notNullable(); // Service where error occurred
    table.text('message').nullable(); // Error message
    table.text('stack_trace').nullable(); // Full stack trace
    table.uuid('correlation_id').nullable(); // For tracing related events
    table.string('request_id', 255).nullable(); // HTTP request ID
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL'); // User context if available
    table.string('endpoint', 500).nullable(); // API endpoint if applicable
    table.string('method', 10).nullable(); // HTTP method
    table.jsonb('request_context').nullable(); // Sanitized request data
    table.jsonb('error_context').nullable(); // Additional error context
    table.specificType('ip_address', 'inet').nullable();
    table.string('user_agent', 500).nullable();
    table.string('environment', 50).nullable();
    table.string('version', 50).nullable();
    table.string('host', 255).nullable();
    table.enum('severity', ['warning', 'error', 'critical']).notNullable().defaultTo('error');
    table.boolean('is_handled').notNullable().defaultTo(true);
    table.boolean('is_resolved').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for frequent queries
    table.index('error_type');
    table.index('error_code');
    table.index('service');
    table.index('correlation_id');
    table.index('request_id');
    table.index('user_id');
    table.index('severity');
    table.index('is_resolved');
    table.index(['service', 'error_type']);
    table.index(['service', 'created_at']);
    table.index(['severity', 'created_at']);
    table.index(['is_resolved', 'severity']);
    table.index('created_at');
    table.index('environment');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('error_events');
}
