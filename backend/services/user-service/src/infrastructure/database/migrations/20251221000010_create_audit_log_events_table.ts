import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('audit_log_events', (table) => {
    table.uuid('event_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('event_type', 100).notNullable(); // e.g., 'user.login', 'profile.updated', 'payment.processed'
    table.uuid('actor_user_id').nullable().references('id').inTable('users').onDelete('SET NULL'); // Who performed the action
    table.uuid('subject_user_id').nullable().references('id').inTable('users').onDelete('SET NULL'); // Who was affected
    table.string('resource_type', 100).nullable(); // e.g., 'user', 'profile', 'message', 'payment'
    table.string('resource_id', 255).nullable(); // ID of the affected resource
    table.jsonb('payload_json').nullable(); // Event-specific data
    table.jsonb('changes').nullable(); // Before/after for update operations
    table.uuid('correlation_id').nullable(); // For tracing related events
    table.string('request_id', 255).nullable(); // HTTP request ID
    table.specificType('ip_address', 'inet').nullable();
    table.string('user_agent', 500).nullable();
    table.string('service', 100).nullable(); // Which service generated the event
    table
      .enum('severity', ['debug', 'info', 'warning', 'error', 'critical'])
      .notNullable()
      .defaultTo('info');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for frequent queries
    table.index('event_type');
    table.index('actor_user_id');
    table.index('subject_user_id');
    table.index('resource_type');
    table.index('resource_id');
    table.index('correlation_id');
    table.index('request_id');
    table.index('service');
    table.index('severity');
    table.index(['event_type', 'created_at']);
    table.index(['actor_user_id', 'created_at']);
    table.index(['subject_user_id', 'created_at']);
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('audit_log_events');
}
