import { Knex } from 'knex';

/**
 * Migration: Add face embeddings table for lookalike matching
 *
 * This table stores face embeddings (vector representations of faces)
 * extracted from user photos using AWS Rekognition. These embeddings
 * enable efficient similarity searches for the lookalike matching feature.
 */
export async function up(knex: Knex): Promise<void> {
  // Create face_embeddings table
  await knex.schema.createTable('face_embeddings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.string('photo_url', 1024).notNullable();

    // Store embedding as JSONB array of floats (typically 128 or 512 dimensions)
    // AWS Rekognition returns 128-dimensional face embeddings
    table.jsonb('embedding').notNullable();
    table.integer('embedding_dimension').notNullable().defaultTo(128);

    // Metadata about the face detection
    table.float('face_confidence').notNullable(); // 0-100 confidence score
    table.jsonb('bounding_box').nullable(); // Face location in image
    table.jsonb('face_attributes').nullable(); // Age, emotions, etc.

    // Quality metrics
    table.float('quality_brightness').nullable();
    table.float('quality_sharpness').nullable();
    table.boolean('is_primary').notNullable().defaultTo(false); // Primary profile photo

    // Status and timestamps
    table.string('status').notNullable().defaultTo('active'); // active, deleted, processing
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Indexes for efficient querying
    table.index(['user_id', 'is_primary']);
    table.index(['user_id', 'status']);
    table.index('created_at');
  });

  // Create lookalike_searches table to track search history and rate limiting
  await knex.schema.createTable('lookalike_searches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();

    // Reference image info
    table.string('reference_image_url', 1024).nullable(); // URL if uploaded
    table.string('reference_image_hash', 64).notNullable(); // SHA256 hash for dedup
    table.jsonb('reference_embedding').nullable(); // The embedding used for search

    // Search parameters
    table.integer('limit_requested').notNullable().defaultTo(20);
    table.integer('results_returned').notNullable().defaultTo(0);
    table.float('min_similarity_threshold').notNullable().defaultTo(0.7);

    // Results summary
    table.jsonb('top_matches').nullable(); // Array of {userId, score}

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id', 'created_at']);
    table.index('reference_image_hash');
  });

  // Create lookalike_rate_limits table for tracking rate limits per user
  await knex.schema.createTable('lookalike_rate_limits', (table) => {
    table.uuid('user_id').primary();
    table.integer('daily_searches').notNullable().defaultTo(0);
    table.integer('monthly_searches').notNullable().defaultTo(0);
    table.date('daily_reset_date').notNullable();
    table.date('monthly_reset_date').notNullable();
    table.timestamp('last_search_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  console.log('Created face_embeddings, lookalike_searches, and lookalike_rate_limits tables');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('lookalike_rate_limits');
  await knex.schema.dropTableIfExists('lookalike_searches');
  await knex.schema.dropTableIfExists('face_embeddings');
  console.log('Dropped face_embeddings, lookalike_searches, and lookalike_rate_limits tables');
}
