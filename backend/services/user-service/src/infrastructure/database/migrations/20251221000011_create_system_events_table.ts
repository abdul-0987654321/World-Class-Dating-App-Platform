import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('system_events', (table) => {
    table.uuid('event_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('event_type', 100).notNullable(); // e.g., 'service.started', 'deployment.completed', 'config.changed'
    table.string('service', 100).notNullable(); // Service that generated the event
    table.jsonb('details_json').nullable(); // Event-specific details
    table.enum('severity', ['debug', 'info', 'warning', 'error', 'critical']).notNullable().defaultTo('info');
    table.string('environment', 50).nullable(); // development, staging, production
    table.string('version', 50).nullable(); // Service version
    table.string('host', 255).nullable(); // Server/container hostname
    table.uuid('correlation_id').nullable();
    table.integer('duration_ms').nullable(); // For timed operations
    table.boolean('success').nullable(); // For operations that can succeed/fail
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for frequent queries
    table.index('event_type');
    table.index('service');
    table.index('severity');
    table.index('environment');
    table.index('correlation_id');
    table.index(['service', 'event_type']);
    table.index(['service', 'created_at']);
    table.index(['severity', 'created_at']);
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('system_events');
}
