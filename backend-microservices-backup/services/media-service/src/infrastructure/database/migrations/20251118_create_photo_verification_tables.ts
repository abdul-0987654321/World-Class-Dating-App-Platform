import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Photo verification records table
  await knex.schema.createTable('photo_verifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('media_id').notNullable();
    table.uuid('user_id').notNullable();
    table.string('image_url').notNullable();
    table.string('reference_photo_url');

    // Verification results
    table.boolean('verified').notNullable();
    table.decimal('confidence', 5, 4); // 0.0000 to 1.0000
    table.string('status').notNullable(); // pending, verified, failed, flagged
    table.text('failure_reason');

    // Face detection results
    table.boolean('face_detected');
    table.integer('face_count');
    table.decimal('quality_score', 5, 4);
    table.string('face_id'); // Azure Face API face ID
    table.json('face_attributes'); // Store full face attributes from Azure

    // Face matching results (if reference photo provided)
    table.decimal('match_score', 5, 4);
    table.boolean('faces_match');

    // Liveness detection results
    table.boolean('liveness_detected');
    table.decimal('liveness_score', 5, 4);

    // Duplicate detection results
    table.boolean('duplicate_detected');
    table.json('matching_user_ids'); // Array of user IDs with matching faces

    // Stock photo detection
    table.boolean('stock_photo_detected');
    table.decimal('stock_photo_confidence', 5, 4);
    table.string('stock_photo_source');

    // Metadata
    table.string('verification_type').notNullable(); // basic, profile, comprehensive
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('media_id');
    table.index('user_id');
    table.index('status');
    table.index('verified');
    table.index('duplicate_detected');
    table.index('created_at');

    // Foreign key
    table.foreign('media_id').references('id').inTable('media').onDelete('CASCADE');
  });

  // Verification attempts tracking
  await knex.schema.createTable('verification_attempts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable();
    table.uuid('media_id').notNullable();
    table.string('attempt_type').notNullable(); // upload, retry, manual_review
    table.string('result').notNullable(); // success, failure, pending
    table.text('error_message');
    table.string('ip_address');
    table.string('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('media_id');
    table.index('result');
    table.index('created_at');
  });

  // User verification status
  await knex.schema.createTable('user_verification_status', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().unique();
    table.boolean('is_verified').defaultTo(false);
    table.string('verification_level').defaultTo('none'); // none, basic, verified, premium
    table.uuid('primary_verified_photo_id');
    table.integer('verified_photos_count').defaultTo(0);
    table.integer('failed_attempts_count').defaultTo(0);
    table.integer('total_attempts_count').defaultTo(0);
    table.timestamp('first_verified_at');
    table.timestamp('last_verified_at');
    table.timestamp('last_attempt_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('is_verified');
    table.index('verification_level');
  });

  // Duplicate profile flags
  await knex.schema.createTable('duplicate_profile_flags', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable();
    table.uuid('matching_user_id').notNullable();
    table.uuid('verification_id').notNullable();
    table.decimal('confidence_score', 5, 4).notNullable();
    table.string('status').defaultTo('flagged'); // flagged, reviewed, confirmed, dismissed
    table.uuid('reviewed_by');
    table.timestamp('reviewed_at');
    table.text('review_notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('matching_user_id');
    table.index('status');
    table.index(['user_id', 'matching_user_id']);
  });

  // Add verification columns to existing media table if not exists
  await knex.schema.alterTable('media', (table) => {
    // Check if columns don't exist before adding
    table.boolean('is_verified').defaultTo(false);
    table.json('verification_data'); // Store face_id, quality_score, etc.
    table.boolean('flagged_for_review').defaultTo(false);
    table.string('flag_reason');
    table.timestamp('verified_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('duplicate_profile_flags');
  await knex.schema.dropTableIfExists('user_verification_status');
  await knex.schema.dropTableIfExists('verification_attempts');
  await knex.schema.dropTableIfExists('photo_verifications');

  // Remove columns from media table
  await knex.schema.alterTable('media', (table) => {
    table.dropColumn('is_verified');
    table.dropColumn('verification_data');
    table.dropColumn('flagged_for_review');
    table.dropColumn('flag_reason');
    table.dropColumn('verified_at');
  });
}
