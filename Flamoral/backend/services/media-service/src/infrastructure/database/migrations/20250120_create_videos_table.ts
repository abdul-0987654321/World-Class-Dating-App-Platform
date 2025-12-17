import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('videos', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().index();
    table.string('file_name').notNullable();
    table.string('original_name').notNullable();
    table.string('mime_type').notNullable();
    table.integer('size').notNullable();
    table.float('duration').notNullable(); // in seconds
    table.jsonb('urls').notNullable(); // { original, compressed, thumbnails[] }
    table.jsonb('dimensions').notNullable(); // { width, height }
    table.string('codec');
    table.integer('bitrate');
    table.float('frame_rate');
    table.string('moderation_status').notNullable().defaultTo('pending');
    table.jsonb('moderation_result');
    table.timestamp('uploaded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id', 'uploaded_at']);
    table.index('moderation_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('videos');
}
