import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('data_export_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.enum('status', [
      'pending',
      'processing',
      'completed',
      'failed',
      'expired',
    ]).defaultTo('pending');
    table.enum('format', ['json', 'zip']).defaultTo('json');
    table.text('export_url'); // Temporary URL to download the export
    table.timestamp('url_expires_at'); // When the download URL expires
    table.jsonb('included_data'); // What data was included in export
    table.text('file_path'); // Path to the export file
    table.bigInteger('file_size'); // Size of export in bytes
    table.timestamp('requested_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.timestamp('downloaded_at');
    table.text('error_message');
    table.text('ip_address');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('requested_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('data_export_requests');
}
