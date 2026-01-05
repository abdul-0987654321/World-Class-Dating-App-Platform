import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('data_access_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table
      .enum('access_type', [
        'view_profile',
        'view_messages',
        'view_photos',
        'export_data',
        'download_data',
        'third_party_share',
        'analytics_processing',
        'support_access',
      ])
      .notNullable();
    table.text('accessed_by'); // Who accessed the data (user, admin, system, third-party)
    table.text('purpose'); // Purpose of access
    table.jsonb('data_accessed'); // What specific data was accessed
    table.text('ip_address');
    table.timestamp('accessed_at').defaultTo(knex.fn.now());

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index('accessed_at');
    table.index('access_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('data_access_logs');
}
