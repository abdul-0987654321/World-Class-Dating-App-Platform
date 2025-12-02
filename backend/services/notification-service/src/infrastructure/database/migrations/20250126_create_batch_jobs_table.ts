import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Batch Notification Jobs table
  await knex.schema.createTable('batch_notification_jobs', (table) => {
    table.uuid('id').primary();
    table.jsonb('user_ids').notNullable(); // Array of user IDs
    table.jsonb('payload').notNullable(); // Notification payload
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
    table.integer('total_users').notNullable();
    table.integer('sent_count').defaultTo(0);
    table.integer('failed_count').defaultTo(0);
    table.text('error');
    table.timestamp('created_at').notNullable();
    table.timestamp('started_at');
    table.timestamp('completed_at');

    table.index('status');
    table.index('created_at');
    table.index('completed_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('batch_notification_jobs');
}
