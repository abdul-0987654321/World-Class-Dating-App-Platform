-- Migration: Create Analytics Tables for Event Tracking and Metrics
-- Description: Creates tables for swipes, matches, messages, sessions, revenue, and aggregated metrics
-- Created: 2025-01-19

-- =============================================
-- 1. SWIPE EVENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS swipe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('left', 'right', 'super')),
  session_id VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  location JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()

  -- Note: user_id references external user service, no FK constraint
);

CREATE INDEX idx_swipe_events_user_id ON swipe_events(user_id);
CREATE INDEX idx_swipe_events_target_user_id ON swipe_events(target_user_id);
CREATE INDEX idx_swipe_events_timestamp ON swipe_events(timestamp);
CREATE INDEX idx_swipe_events_session_id ON swipe_events(session_id);
CREATE INDEX idx_swipe_events_direction ON swipe_events(direction);

-- =============================================
-- 2. MATCH EVENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  user_id_1 UUID NOT NULL,
  user_id_2 UUID NOT NULL,
  mutual_swipe_time INTEGER DEFAULT 0, -- Time in milliseconds between swipes
  session_id VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()

  -- Note: user_id references external user service, no FK constraint
);

CREATE INDEX idx_match_events_match_id ON match_events(match_id);
CREATE INDEX idx_match_events_user_id_1 ON match_events(user_id_1);
CREATE INDEX idx_match_events_user_id_2 ON match_events(user_id_2);
CREATE INDEX idx_match_events_timestamp ON match_events(timestamp);

-- =============================================
-- 3. MESSAGE EVENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message_length INTEGER DEFAULT 0,
  has_media BOOLEAN DEFAULT FALSE,
  response_time INTEGER, -- Time to respond in seconds
  session_id VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()

  -- Note: user_id references external user service, no FK constraint
);

CREATE INDEX idx_message_events_conversation_id ON message_events(conversation_id);
CREATE INDEX idx_message_events_sender_id ON message_events(sender_id);
CREATE INDEX idx_message_events_receiver_id ON message_events(receiver_id);
CREATE INDEX idx_message_events_timestamp ON message_events(timestamp);

-- =============================================
-- 4. SESSION EVENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID,
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  duration INTEGER, -- in seconds
  screen_views INTEGER DEFAULT 0,
  swipe_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  device_type VARCHAR(50) DEFAULT 'unknown',
  app_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()

  -- Note: user_id references external user service, no FK constraint
);

CREATE INDEX idx_session_events_session_id ON session_events(session_id);
CREATE INDEX idx_session_events_user_id ON session_events(user_id);
CREATE INDEX idx_session_events_start_time ON session_events(start_time);
CREATE INDEX idx_session_events_device_type ON session_events(device_type);

-- =============================================
-- 5. REVENUE TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('subscription', 'coins', 'boost', 'super_like', 'other')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  subscription_plan VARCHAR(50),
  coin_package_size INTEGER,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()

  -- Note: user_id references external user service, no FK constraint
);

CREATE INDEX idx_revenue_transactions_user_id ON revenue_transactions(user_id);
CREATE INDEX idx_revenue_transactions_type ON revenue_transactions(transaction_type);
CREATE INDEX idx_revenue_transactions_status ON revenue_transactions(status);
CREATE INDEX idx_revenue_transactions_timestamp ON revenue_transactions(timestamp);
CREATE INDEX idx_revenue_transactions_subscription_plan ON revenue_transactions(subscription_plan);

-- =============================================
-- 6. DATE ARRANGEMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS date_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id_1 UUID NOT NULL,
  user_id_2 UUID NOT NULL,
  proposed_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()

  -- Note: user_id references external user service, no FK constraint
);

CREATE INDEX idx_date_arrangements_conversation_id ON date_arrangements(conversation_id);
CREATE INDEX idx_date_arrangements_status ON date_arrangements(status);
CREATE INDEX idx_date_arrangements_proposed_at ON date_arrangements(proposed_at);

-- =============================================
-- 7. DAILY METRICS TABLE (Pre-aggregated)
-- =============================================
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  dau INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  average_session_duration DECIMAL(10, 2) DEFAULT 0,
  total_swipes INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  revenue DECIMAL(12, 2) DEFAULT 0,
  new_subscribers INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);

-- =============================================
-- 8. HOURLY METRICS TABLE (Pre-aggregated)
-- =============================================
CREATE TABLE IF NOT EXISTS hourly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hour TIMESTAMP UNIQUE NOT NULL,
  active_users INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  swipes INTEGER DEFAULT 0,
  matches INTEGER DEFAULT 0,
  messages INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hourly_metrics_hour ON hourly_metrics(hour);

-- =============================================
-- 9. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_session_events_updated_at BEFORE UPDATE ON session_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_transactions_updated_at BEFORE UPDATE ON revenue_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_date_arrangements_updated_at BEFORE UPDATE ON date_arrangements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_metrics_updated_at BEFORE UPDATE ON daily_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hourly_metrics_updated_at BEFORE UPDATE ON hourly_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 10. VIEWS FOR ANALYTICS
-- =============================================

-- View: Daily Swipe Statistics
CREATE OR REPLACE VIEW v_daily_swipe_stats AS
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_swipes,
  COUNT(CASE WHEN direction = 'right' THEN 1 END) as right_swipes,
  COUNT(CASE WHEN direction = 'left' THEN 1 END) as left_swipes,
  COUNT(CASE WHEN direction = 'super' THEN 1 END) as super_likes,
  COUNT(DISTINCT user_id) as unique_users
FROM swipe_events
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- View: Match Success Metrics
CREATE OR REPLACE VIEW v_match_success_metrics AS
SELECT
  DATE(me.timestamp) as date,
  COUNT(DISTINCT me.match_id) as total_matches,
  COUNT(DISTINCT msg.conversation_id) as conversations_started,
  ROUND(100.0 * COUNT(DISTINCT msg.conversation_id) / NULLIF(COUNT(DISTINCT me.match_id), 0), 2) as conversation_rate,
  COUNT(DISTINCT da.id) as dates_arranged,
  ROUND(100.0 * COUNT(DISTINCT da.id) / NULLIF(COUNT(DISTINCT msg.conversation_id), 0), 2) as date_arrangement_rate
FROM match_events me
LEFT JOIN message_events msg ON DATE(msg.timestamp) = DATE(me.timestamp)
LEFT JOIN date_arrangements da ON DATE(da.proposed_at) = DATE(me.timestamp)
GROUP BY DATE(me.timestamp)
ORDER BY date DESC;

-- View: Revenue Summary
CREATE OR REPLACE VIEW v_revenue_summary AS
SELECT
  DATE(timestamp) as date,
  transaction_type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_revenue,
  AVG(amount) as average_transaction_value,
  COUNT(DISTINCT user_id) as unique_payers
FROM revenue_transactions
WHERE status = 'completed'
GROUP BY DATE(timestamp), transaction_type
ORDER BY date DESC, total_revenue DESC;

-- View: User Engagement Summary
CREATE OR REPLACE VIEW v_user_engagement AS
SELECT
  user_id,
  COUNT(DISTINCT session_id) as total_sessions,
  MAX(start_time) as last_active,
  SUM(duration) as total_time_seconds,
  SUM(swipe_count) as total_swipes,
  SUM(message_count) as total_messages,
  AVG(duration) as avg_session_duration
FROM session_events
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- =============================================
-- TIMESCALEDB HYPERTABLES (if enabled)
-- =============================================
-- Note: These will be converted to hypertables if TimescaleDB is enabled
-- The conversion happens in the db-client.ts enableTimescaleDB() function

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
INSERT INTO migrations (name) VALUES ('002_create_analytics_tables')
ON CONFLICT (name) DO NOTHING;
