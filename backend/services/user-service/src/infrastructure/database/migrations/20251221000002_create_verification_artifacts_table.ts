import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('verification_artifacts', (table) => {
    table.uuid('artifact_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('request_id').notNullable().references('request_id').inTable('verification_requests').onDelete('CASCADE');
    table.uuid('media_id').nullable(); // References media_files in media-service, no FK due to cross-service
    table.string('type', 100).notNullable(); // document_front, document_back, selfie, video, etc.
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('request_id');
    table.index('media_id');
    table.index('type');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('verification_artifacts');
}
