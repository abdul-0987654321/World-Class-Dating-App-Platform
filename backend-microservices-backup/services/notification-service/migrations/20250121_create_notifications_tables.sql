/**
 * Database Migration: Create Notifications Tables
 * Creates tables for FCM tokens and notification history
 */

-- =====================================================
-- FCM Tokens Table
-- =====================================================
-- Stores Firebase Cloud Messaging tokens for user devices

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
  device_name VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one token per device
  CONSTRAINT unique_token UNIQUE (token)
);

-- Indexes for fast token lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_last_used ON fcm_tokens(last_used_at);

-- =====================================================
-- Notifications Table
-- =====================================================
-- Stores notification history for users

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'new_match',
    'new_message',
    'new_like',
    'super_like',
    'message_read',
    'profile_view',
    'reminder',
    'promo'
  )),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Composite index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read = FALSE;

-- =====================================================
-- Add Notification Preference Columns to Users
-- =====================================================
-- These may already exist from the settings migration, so we use IF NOT EXISTS

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT FALSE;

-- Specific notification type preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_new_matches BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_new_messages BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_likes BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_super_likes BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_message_read BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_profile_views BOOLEAN DEFAULT FALSE;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE fcm_tokens IS 'Firebase Cloud Messaging tokens for push notifications';
COMMENT ON COLUMN fcm_tokens.token IS 'FCM registration token from device';
COMMENT ON COLUMN fcm_tokens.device_type IS 'Platform: ios, android, or web';
COMMENT ON COLUMN fcm_tokens.last_used_at IS 'Last time token was used to send notification';

COMMENT ON TABLE notifications IS 'Notification history for users';
COMMENT ON COLUMN notifications.type IS 'Type of notification sent';
COMMENT ON COLUMN notifications.data IS 'Additional data in JSON format';
COMMENT ON COLUMN notifications.read IS 'Whether user has read this notification';

-- =====================================================
-- Sample Queries for Testing
-- =====================================================

-- Get all active tokens for a user
-- SELECT * FROM fcm_tokens WHERE user_id = 'user-uuid' ORDER BY last_used_at DESC;

-- Get unread notifications for a user
-- SELECT * FROM notifications WHERE user_id = 'user-uuid' AND read = FALSE ORDER BY created_at DESC;

-- Get notification count by type
-- SELECT type, COUNT(*) as count FROM notifications WHERE user_id = 'user-uuid' GROUP BY type;

-- Clean up old notifications (older than 90 days)
-- DELETE FROM notifications WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

-- Clean up invalid tokens (not used in 30 days)
-- DELETE FROM fcm_tokens WHERE last_used_at < CURRENT_DATE - INTERVAL '30 days';
