import { Knex } from 'knex';

/**
 * Add additional fields to verification_artifacts table
 * Including file storage details, processing status, and OCR/analysis results
 */
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('verification_artifacts', (table) => {
    // File storage details
    table.string('file_url', 1024).nullable(); // URL to stored file
    table.string('file_hash', 64).nullable(); // SHA-256 hash for integrity
    table.integer('file_size').nullable(); // File size in bytes
    table.string('mime_type', 100).nullable(); // MIME type of the file

    // Processing status
    table
      .enum('processing_status', ['pending', 'processing', 'completed', 'failed'])
      .defaultTo('pending');
    table.text('processing_error').nullable();
    table.timestamp('processed_at').nullable();

    // Analysis results from AI/OCR
    table.jsonb('analysis_result').nullable(); // OCR data, face detection results, etc.
    table.decimal('confidence_score', 5, 4).nullable(); // 0.0000 to 9.9999

    // Additional indexes
    table.index('processing_status');
    table.index('processed_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('verification_artifacts', (table) => {
    table.dropIndex('processing_status');
    table.dropIndex('processed_at');

    table.dropColumn('file_url');
    table.dropColumn('file_hash');
    table.dropColumn('file_size');
    table.dropColumn('mime_type');
    table.dropColumn('processing_status');
    table.dropColumn('processing_error');
    table.dropColumn('processed_at');
    table.dropColumn('analysis_result');
    table.dropColumn('confidence_score');
  });
}
