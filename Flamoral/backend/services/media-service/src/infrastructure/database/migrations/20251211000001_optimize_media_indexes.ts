import { Knex } from 'knex';

/**
 * Media Service Database Performance Optimization
 *
 * This migration creates optimized indexes for efficient media retrieval,
 * moderation processing, and storage management.
 */

export async function up(knex: Knex): Promise<void> {
  console.log('Starting media service index optimization...');

  // ============================================================================
  // MEDIA TABLE OPTIMIZATION
  // ============================================================================

  // Covering index for user media retrieval
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_user_profile
    ON media(user_id, is_profile_photo DESC, uploaded_at DESC)
    INCLUDE (file_name, mime_type, urls);
  `);

  // Partial index for profile photos only
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_profile_photos
    ON media(user_id, uploaded_at DESC)
    WHERE is_profile_photo = true;
  `);

  // Index for media moderation queue
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_moderation_queue
    ON media(moderation_status, uploaded_at ASC)
    WHERE moderation_status = 'pending';
  `);

  // Index for flagged content review
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_flagged
    ON media(moderation_status, uploaded_at DESC)
    WHERE moderation_status IN ('flagged', 'rejected');
  `);

  // Composite index for media type filtering
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_type
    ON media(user_id, mime_type, uploaded_at DESC);
  `);

  // Index for storage size analytics
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_size
    ON media(user_id, size);
  `);

  // Index for verified media
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_verified
    ON media(user_id, is_verified, uploaded_at DESC)
    WHERE is_verified = true;
  `);

  // ============================================================================
  // VIDEOS TABLE OPTIMIZATION
  // ============================================================================

  // Covering index for user videos
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_user
    ON videos(user_id, uploaded_at DESC)
    INCLUDE (file_name, duration, thumbnail_url, status);
  `);

  // Index for video processing queue
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_processing
    ON videos(status, uploaded_at ASC)
    WHERE status IN ('pending', 'processing');
  `);

  // Index for video moderation
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_moderation
    ON videos(moderation_status, uploaded_at ASC)
    WHERE moderation_status = 'pending';
  `);

  // Partial index for published videos
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_published
    ON videos(user_id, uploaded_at DESC)
    WHERE status = 'published';
  `);

  // Index for video duration analytics
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_duration
    ON videos(duration, uploaded_at DESC)
    WHERE duration IS NOT NULL;
  `);

  // ============================================================================
  // VOICE NOTES TABLE OPTIMIZATION
  // ============================================================================

  // Index for user voice notes
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_notes_user
    ON voice_notes(user_id, created_at DESC)
    INCLUDE (duration, url, status);
  `);

  // Index for voice note processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_notes_processing
    ON voice_notes(status, created_at ASC)
    WHERE status IN ('pending', 'processing');
  `);

  // Index for voice note moderation
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_notes_moderation
    ON voice_notes(moderation_status, created_at ASC)
    WHERE moderation_status = 'pending';
  `);

  // Index for recipient voice notes
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_notes_recipient
    ON voice_notes(recipient_id, listened, created_at DESC)
    WHERE recipient_id IS NOT NULL;
  `);

  // ============================================================================
  // PHOTO VERIFICATION TABLE OPTIMIZATION
  // ============================================================================

  // Index for verification requests queue
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_verification_queue
    ON photo_verification_attempts(status, created_at ASC)
    WHERE status = 'pending';
  `);

  // Index for user verification history
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_verification_user
    ON photo_verification_attempts(user_id, created_at DESC)
    INCLUDE (status, verification_result);
  `);

  // Partial index for successful verifications
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_verification_success
    ON photo_verification_attempts(user_id, created_at DESC)
    WHERE status = 'verified';
  `);

  // Index for verification expiry processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_verification_expiry
    ON photo_verification_attempts(expires_at ASC, status)
    WHERE expires_at IS NOT NULL AND status = 'verified';
  `);

  // ============================================================================
  // MEDIA STORAGE OPTIMIZATION
  // ============================================================================

  // Create materialized view for storage analytics
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_storage_stats AS
    SELECT
      user_id,
      COUNT(*) as total_files,
      SUM(size) as total_size_bytes,
      SUM(size) / (1024.0 * 1024.0) as total_size_mb,
      COUNT(*) FILTER (WHERE is_profile_photo = true) as profile_photos_count,
      MAX(uploaded_at) as last_upload,
      AVG(size) as avg_file_size
    FROM media
    GROUP BY user_id;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_storage_stats
    ON mv_user_storage_stats(user_id);

    CREATE INDEX IF NOT EXISTS idx_mv_user_storage_size
    ON mv_user_storage_stats(total_size_mb DESC);
  `);

  // Create view for moderation statistics
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_moderation_stats AS
    SELECT
      DATE(uploaded_at) as date,
      moderation_status,
      COUNT(*) as count,
      AVG(size) as avg_size
    FROM media
    WHERE uploaded_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(uploaded_at), moderation_status;

    CREATE INDEX IF NOT EXISTS idx_mv_moderation_stats
    ON mv_moderation_stats(date DESC, moderation_status);
  `);

  // ============================================================================
  // CLEANUP AND OPTIMIZATION
  // ============================================================================

  // Update table statistics
  await knex.raw('ANALYZE media;');
  await knex.raw('ANALYZE videos;');
  await knex.raw('ANALYZE voice_notes;');
  await knex.raw('ANALYZE photo_verification_attempts;');

  console.log('Media service index optimization completed!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Rolling back media service optimization...');

  // Drop materialized views
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_moderation_stats;');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_user_storage_stats;');

  // Drop all created indexes
  const indexes = [
    'idx_media_user_profile',
    'idx_media_profile_photos',
    'idx_media_moderation_queue',
    'idx_media_flagged',
    'idx_media_type',
    'idx_media_size',
    'idx_media_verified',
    'idx_videos_user',
    'idx_videos_processing',
    'idx_videos_moderation',
    'idx_videos_published',
    'idx_videos_duration',
    'idx_voice_notes_user',
    'idx_voice_notes_processing',
    'idx_voice_notes_moderation',
    'idx_voice_notes_recipient',
    'idx_photo_verification_queue',
    'idx_photo_verification_user',
    'idx_photo_verification_success',
    'idx_photo_verification_expiry',
  ];

  for (const index of indexes) {
    await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS ${index};`);
  }

  console.log('Media service optimization rollback completed!');
}
