import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('voice_notes', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().index();
    table.string('file_name').notNullable();
    table.string('original_name').notNullable();
    table.string('mime_type').notNullable();
    table.integer('size').notNullable();
    table.float('duration').notNullable(); // in seconds
    table.text('url').notNullable();
    table.jsonb('waveform_data').notNullable(); // { samples[], duration, sampleRate, peaks[] }
    table.string('context').notNullable(); // profile, prompt, message
    table.uuid('prompt_id').index();
    table.uuid('conversation_id').index();
    table.string('moderation_status').notNullable().defaultTo('pending');
    table.timestamp('uploaded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id', 'context']);
    table.index(['conversation_id', 'uploaded_at']);
    table.index('moderation_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('voice_notes');
}
