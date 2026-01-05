import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('media', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User reference
    table.uuid('user_id').notNullable().index();

    // File information
    table.string('file_name').notNullable();
    table.string('original_name').notNullable();
    table.string('mime_type').notNullable();
    table.integer('size').notNullable();

    // Image URLs
    table.jsonb('urls').notNullable();

    // Image dimensions
    table.jsonb('dimensions').notNullable();

    // Metadata
    table.boolean('is_profile_photo').defaultTo(false).index();
    table.boolean('is_verified').defaultTo(false);

    // Moderation
    table
      .enum('moderation_status', ['pending', 'approved', 'rejected', 'flagged'])
      .defaultTo('pending')
      .index();
    table.jsonb('moderation_result').nullable();

    // Timestamps
    table.timestamp('uploaded_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index(['user_id', 'is_profile_photo']);
    table.index(['user_id', 'uploaded_at']);
  });

  // Create updated_at trigger
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await knex.raw(`
    CREATE TRIGGER update_media_updated_at
      BEFORE UPDATE ON media
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_media_updated_at ON media');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column');
  await knex.schema.dropTableIfExists('media');
}
