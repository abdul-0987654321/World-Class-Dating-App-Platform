import { Knex } from 'knex';

/**
 * Database Performance Optimization Migration
 *
 * This migration creates comprehensive indexes for optimal query performance
 * across all user service tables including users, profiles, preferences,
 * subscriptions, and related entities.
 */

export async function up(knex: Knex): Promise<void> {
  console.log('Starting database index optimization...');

  // ============================================================================
  // USERS TABLE OPTIMIZATION
  // ============================================================================

  // Add composite index for user authentication lookups
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
    ON users(email, is_active)
    WHERE is_active = true;
  `);

  // Index for phone number lookups (with partial index for non-null values)
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_verified
    ON users(phone_number, is_phone_verified)
    WHERE phone_number IS NOT NULL;
  `);

  // Composite index for user discovery queries
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_verified
    ON users(is_active, is_verified, created_at DESC);
  `);

  // Index for last login tracking and cleanup
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login
    ON users(last_login_at DESC)
    WHERE is_active = true;
  `);

  // ============================================================================
  // PROFILES TABLE OPTIMIZATION
  // ============================================================================

  // Geospatial index for location-based discovery (using GiST)
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_location_gist
    ON profiles USING gist(ll_to_earth(latitude, longitude));
  `);

  // Enable earthdistance extension if not already enabled
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS cube;`);
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS earthdistance;`);

  // Composite index for location + photo verification
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_city_verified
    ON profiles(city, is_photo_verified, created_at DESC)
    WHERE city IS NOT NULL;
  `);

  // GIN index for interests array searches
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_interests_gin
    ON profiles USING gin(interests);
  `);

  // GIN index for languages array searches
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_languages_gin
    ON profiles USING gin(languages);
  `);

  // Covering index for profile discovery queries
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_discovery
    ON profiles(user_id, city, is_photo_verified)
    INCLUDE (bio, occupation, education);
  `);

  // ============================================================================
  // PREFERENCES TABLE OPTIMIZATION
  // ============================================================================

  // Index for matching algorithm queries
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preferences_user_age
    ON preferences(user_id, min_age, max_age)
    WHERE user_id IS NOT NULL;
  `);

  // Composite index for distance-based matching
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preferences_distance
    ON preferences(user_id, max_distance);
  `);

  // GIN index for interested_in array
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preferences_interested_gin
    ON preferences USING gin(interested_in);
  `);

  // ============================================================================
  // PHOTOS TABLE OPTIMIZATION
  // ============================================================================

  // Composite index for user photo retrieval
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_user_order
    ON photos(user_id, display_order, is_primary DESC);
  `);

  // Index for profile photo lookups
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_primary
    ON photos(user_id, is_primary)
    WHERE is_primary = true;
  `);

  // Index for photo moderation queries
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_moderation
    ON photos(moderation_status, created_at)
    WHERE moderation_status = 'pending';
  `);

  // ============================================================================
  // MATCHES TABLE OPTIMIZATION
  // ============================================================================

  // Composite index for active matches per user
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_user1_active
    ON matches(user1_id, status, last_activity_at DESC)
    WHERE status = 'matched';
  `);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_user2_active
    ON matches(user2_id, status, last_activity_at DESC)
    WHERE status = 'matched';
  `);

  // Index for match expiration processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_expiring
    ON matches(expires_at, expired, first_message_sent)
    WHERE expired = false AND first_message_sent = false;
  `);

  // Covering index for match list queries
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_list_covering
    ON matches(user1_id, matched_at DESC)
    INCLUDE (user2_id, status, compatibility_score);
  `);

  // ============================================================================
  // CONVERSATIONS TABLE OPTIMIZATION
  // ============================================================================

  // Composite index for user conversations
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user1_active
    ON conversations(user1_id, last_message_at DESC)
    WHERE is_active = true;
  `);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user2_active
    ON conversations(user2_id, last_message_at DESC)
    WHERE is_active = true;
  `);

  // Index for unread message queries
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_unread_user1
    ON conversations(user1_id, unread_count_user1)
    WHERE unread_count_user1 > 0;
  `);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_unread_user2
    ON conversations(user2_id, unread_count_user2)
    WHERE unread_count_user2 > 0;
  `);

  // ============================================================================
  // MESSAGES TABLE OPTIMIZATION
  // ============================================================================

  // Covering index for message history retrieval
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_covering
    ON messages(conversation_id, created_at DESC)
    INCLUDE (sender_id, content, status);
  `);

  // Index for unread messages per user
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread
    ON messages(receiver_id, is_read, created_at DESC)
    WHERE is_read = false;
  `);

  // Index for message delivery status tracking
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_status
    ON messages(status, created_at)
    WHERE status IN ('sent', 'delivered');
  `);

  // ============================================================================
  // SUBSCRIPTIONS TABLE OPTIMIZATION
  // ============================================================================

  // Composite index for active subscription lookups
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_active
    ON user_subscriptions(user_id, status, current_period_end DESC)
    WHERE status = 'active';
  `);

  // Index for subscription expiration processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_expiring
    ON user_subscriptions(current_period_end, status)
    WHERE status IN ('active', 'trialing');
  `);

  // Index for Stripe webhook processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe
    ON user_subscriptions(stripe_subscription_id, stripe_customer_id);
  `);

  // ============================================================================
  // COIN TRANSACTIONS TABLE OPTIMIZATION
  // ============================================================================

  // Composite index for user coin history
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coin_transactions_user
    ON coin_transactions(user_id, created_at DESC, type);
  `);

  // Index for transaction type analytics
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coin_transactions_type
    ON coin_transactions(type, created_at DESC);
  `);

  // Covering index for balance calculations
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coin_transactions_balance
    ON coin_transactions(user_id, created_at DESC)
    INCLUDE (amount, balance_after);
  `);

  // ============================================================================
  // REPORTS TABLE OPTIMIZATION
  // ============================================================================

  // Index for pending report moderation
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_pending
    ON reports(status, created_at DESC)
    WHERE status = 'pending';
  `);

  // Composite index for user report history
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_reported_user
    ON reports(reported_user_id, status, created_at DESC);
  `);

  // Index for reporter tracking
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_reporter
    ON reports(reporter_id, created_at DESC);
  `);

  // ============================================================================
  // BLOCKED USERS TABLE OPTIMIZATION
  // ============================================================================

  // Covering index for block checks
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocked_users_check
    ON blocked_users(blocker_id, blocked_id)
    INCLUDE (created_at);
  `);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocked_users_reverse
    ON blocked_users(blocked_id, blocker_id);
  `);

  // ============================================================================
  // VERIFICATION TOKENS TABLE OPTIMIZATION
  // ============================================================================

  // Composite index for token validation
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_tokens_valid
    ON verification_tokens(token, type, expires_at)
    WHERE expires_at > NOW() AND used = false;
  `);

  // Index for token cleanup
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_tokens_expired
    ON verification_tokens(expires_at)
    WHERE used = false;
  `);

  // ============================================================================
  // REFRESH TOKENS TABLE OPTIMIZATION
  // ============================================================================

  // Index for token validation
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_valid
    ON refresh_tokens(token, expires_at, is_revoked)
    WHERE is_revoked = false;
  `);

  // Index for user session management
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user
    ON refresh_tokens(user_id, created_at DESC)
    WHERE is_revoked = false;
  `);

  // ============================================================================
  // BOOSTS TABLE OPTIMIZATION
  // ============================================================================

  // Index for active boosts
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boosts_active
    ON boosts(user_id, ends_at DESC)
    WHERE is_active = true;
  `);

  // Index for boost expiration processing
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boosts_expiring
    ON boosts(ends_at, is_active)
    WHERE is_active = true;
  `);

  // ============================================================================
  // ANALYTICS INDEXES
  // ============================================================================

  // Daily active users tracking
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_dau
    ON users(DATE(last_login_at), is_active)
    WHERE is_active = true AND last_login_at IS NOT NULL;
  `);

  // User registration trends
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_registration_trends
    ON users(DATE(created_at), gender, is_verified);
  `);

  console.log('Database index optimization completed successfully!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Rolling back database index optimization...');

  // Drop all created indexes
  const indexes = [
    'idx_users_email_active',
    'idx_users_phone_verified',
    'idx_users_active_verified',
    'idx_users_last_login',
    'idx_profiles_location_gist',
    'idx_profiles_city_verified',
    'idx_profiles_interests_gin',
    'idx_profiles_languages_gin',
    'idx_profiles_discovery',
    'idx_preferences_user_age',
    'idx_preferences_distance',
    'idx_preferences_interested_gin',
    'idx_photos_user_order',
    'idx_photos_primary',
    'idx_photos_moderation',
    'idx_matches_user1_active',
    'idx_matches_user2_active',
    'idx_matches_expiring',
    'idx_matches_list_covering',
    'idx_conversations_user1_active',
    'idx_conversations_user2_active',
    'idx_conversations_unread_user1',
    'idx_conversations_unread_user2',
    'idx_messages_conversation_covering',
    'idx_messages_unread',
    'idx_messages_status',
    'idx_user_subscriptions_active',
    'idx_subscriptions_expiring',
    'idx_subscriptions_stripe',
    'idx_coin_transactions_user',
    'idx_coin_transactions_type',
    'idx_coin_transactions_balance',
    'idx_reports_pending',
    'idx_reports_reported_user',
    'idx_reports_reporter',
    'idx_blocked_users_check',
    'idx_blocked_users_reverse',
    'idx_verification_tokens_valid',
    'idx_verification_tokens_expired',
    'idx_refresh_tokens_valid',
    'idx_refresh_tokens_user',
    'idx_boosts_active',
    'idx_boosts_expiring',
    'idx_users_dau',
    'idx_users_registration_trends',
  ];

  for (const index of indexes) {
    await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS ${index};`);
  }

  console.log('Index optimization rollback completed!');
}
