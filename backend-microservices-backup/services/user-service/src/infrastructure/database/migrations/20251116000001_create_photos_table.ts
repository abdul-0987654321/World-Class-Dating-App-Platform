import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('photos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('url', 500).notNullable();
    table.string('thumbnail_url', 500);
    table.integer('position').notNullable().defaultTo(0); // Order of photos (0 = primary)
    table.boolean('is_primary').defaultTo(false);
    table.boolean('is_verified').defaultTo(false); // For photo verification feature
    table.string('storage_key', 255); // Key for cloud storage (Azure Blob, S3, etc.)
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'position']);
    table.index(['user_id', 'is_primary']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('photos');
}
