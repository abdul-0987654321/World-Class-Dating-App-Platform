import { Knex } from 'knex';

/**
 * Matching Service Database Performance Optimization
 *
 * This migration creates optimized indexes for the matching service
 * to handle high-throughput swipe operations and real-time matching.
 */

export async function up(knex: Knex): Promise<void> {
  console.log('Starting matching service index optimization...');

  // ============================================================================
  // SWIPES TABLE OPTIMIZATION
  // ============================================================================

  // Covering index for swipe history with included columns
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swipes_user_history
    ON swipes(user_id, created_at DESC)
    INCLUDE (target_user_id, action);
  `);

  // Partial index for like actions only (most queried)
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swipes_likes_only
    ON swipes(target_user_id, user_id, created_at DESC)
    WHERE action IN ('like', 'super_like');
  `);

  // Index for mutual like detection (match creation)
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swipes_mutual_likes
    ON swipes(user_id, target_user_id, action)
    WHERE action IN ('like', 'super_like');
  `);

  // Index for daily swipe count tracking
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swipes_daily_count
    ON swipes(user_id, DATE(created_at), action);
  `);

  // Index for super like tracking
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swipes_super_likes
    ON swipes(user_id, created_at DESC)
    WHERE action = 'super_like';
  `);

  // Composite index for swipe analytics
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swipes_analytics
    ON swipes(DATE(created_at), action);
  `);

  // ============================================================================
  // MATCHES TABLE OPTIMIZATION
  // ============================================================================

  // Covering index for user's active matches with key fields
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_user1_details
    ON matches(user1_id, status, matched_at DESC)
    INCLUDE (user2_id, compatibility_score, expires_at, first_message_sent);
  `);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_user2_details
    ON matches(user2_id, status, matched_at DESC)
    INCLUDE (user1_id, compatibility_score, expires_at, first_message_sent);
  `);

  // Partial index for unexpired active matches
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_active_unexpired
    ON matches(user1_id, user2_id, matched_at DESC)
    WHERE status = 'matched' AND expired = false;
  `);

  // Index for match expiration worker
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_to_expire
    ON matches(expires_at ASC)
    WHERE expires_at IS NOT NULL
      AND expired = false
      AND first_message_sent = false
      AND status = 'matched';
  `);

  // Index for extendable matches
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_extendable
    ON matches(user1_id, user2_id, expires_at)
    WHERE extended = false
      AND expired = false
      AND first_message_sent = false
      AND expires_at IS NOT NULL;
  `);

  // Index for match quality scoring
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_quality
    ON matches(compatibility_score DESC, matched_at DESC)
    WHERE status = 'matched' AND compatibility_score IS NOT NULL;
  `);

  // Index for rematch eligibility
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_rematch_eligible
    ON matches(user1_id, user2_id, expired, unmatched_at)
    WHERE expired = true OR unmatched_at IS NOT NULL;
  `);

  // ============================================================================
  // USER PREFERENCES TABLE OPTIMIZATION
  // ============================================================================

  // Composite index for preference-based matching
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_matching
    ON user_preferences(user_id, min_age, max_age, max_distance)
    INCLUDE (show_me, min_height, max_height);
  `);

  // GIN index for preference arrays
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_show_me_gin
    ON user_preferences USING gin(show_me);
  `);

  // Index for location-based preference queries
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_distance
    ON user_preferences(max_distance, user_id);
  `);

  // Index for dealbreaker preferences
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_dealbreakers
    ON user_preferences(user_id)
    INCLUDE (dealbreakers);
  `);

  // ============================================================================
  // MATCH QUEUE OPTIMIZATION (if exists)
  // ============================================================================

  // Index for priority queue processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_queue_processing
    ON user_preferences(user_id, updated_at ASC)
    WHERE updated_at IS NOT NULL;
  `);

  // ============================================================================
  // PERFORMANCE STATISTICS
  // ============================================================================

  // Create materialized view for swipe statistics (if needed)
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_swipe_stats AS
    SELECT
      user_id,
      DATE(created_at) as swipe_date,
      COUNT(*) as total_swipes,
      COUNT(*) FILTER (WHERE action = 'like') as likes,
      COUNT(*) FILTER (WHERE action = 'super_like') as super_likes,
      COUNT(*) FILTER (WHERE action = 'pass') as passes
    FROM swipes
    GROUP BY user_id, DATE(created_at);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_swipe_stats
    ON mv_swipe_stats(user_id, swipe_date DESC);
  `);

  // Create materialized view for match statistics
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_match_stats AS
    SELECT
      user_id,
      DATE(matched_at) as match_date,
      COUNT(*) as total_matches,
      AVG(compatibility_score) as avg_compatibility
    FROM (
      SELECT user1_id as user_id, matched_at, compatibility_score FROM matches WHERE status = 'matched'
      UNION ALL
      SELECT user2_id as user_id, matched_at, compatibility_score FROM matches WHERE status = 'matched'
    ) all_matches
    GROUP BY user_id, DATE(matched_at);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_match_stats
    ON mv_match_stats(user_id, match_date DESC);
  `);

  // ============================================================================
  // QUERY OPTIMIZATION HINTS
  // ============================================================================

  // Update table statistics for query planner
  await knex.raw('ANALYZE swipes;');
  await knex.raw('ANALYZE matches;');
  await knex.raw('ANALYZE user_preferences;');

  console.log('Matching service index optimization completed!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Rolling back matching service optimization...');

  // Drop materialized views
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_match_stats;');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_swipe_stats;');

  // Drop all created indexes
  const indexes = [
    'idx_swipes_user_history',
    'idx_swipes_likes_only',
    'idx_swipes_mutual_likes',
    'idx_swipes_daily_count',
    'idx_swipes_super_likes',
    'idx_swipes_analytics',
    'idx_matches_user1_details',
    'idx_matches_user2_details',
    'idx_matches_active_unexpired',
    'idx_matches_to_expire',
    'idx_matches_extendable',
    'idx_matches_quality',
    'idx_matches_rematch_eligible',
    'idx_user_preferences_matching',
    'idx_user_preferences_show_me_gin',
    'idx_user_preferences_distance',
    'idx_user_preferences_dealbreakers',
    'idx_match_queue_processing',
  ];

  for (const index of indexes) {
    await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS ${index};`);
  }

  console.log('Matching service optimization rollback completed!');
}
