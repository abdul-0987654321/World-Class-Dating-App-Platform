-- Migration: Create Daily Login Rewards and Achievements System Tables
-- Version: 1.0.0
-- Date: 2025-12-02

-- ============================================
-- DAILY LOGIN REWARDS SYSTEM
-- ============================================

-- Table: daily_login_rewards
-- Stores configuration for each day's reward in the 7-day cycle
CREATE TABLE daily_login_rewards (
  id SERIAL PRIMARY KEY,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('coins', 'super_likes', 'boosts', 'premium_trial')),
  reward_amount INTEGER NOT NULL,
  reward_duration_hours INTEGER, -- For boosts and premium trials
  display_title VARCHAR(100) NOT NULL,
  display_description TEXT,
  icon_name VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(day_number)
);

-- Table: user_login_streaks
-- Tracks each user's login streak and reward claiming status
CREATE TABLE user_login_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Streak tracking
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE,

  -- Reward claiming
  current_day_in_cycle INTEGER DEFAULT 1 CHECK (current_day_in_cycle BETWEEN 1 AND 7),
  last_claim_date DATE,
  can_claim_today BOOLEAN DEFAULT TRUE,

  -- Statistics
  total_logins INTEGER DEFAULT 0,
  total_rewards_claimed INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_reward_history
-- Historical record of all rewards claimed by users
CREATE TABLE user_reward_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  reward_type VARCHAR(50) NOT NULL,
  reward_amount INTEGER NOT NULL,
  reward_duration_hours INTEGER,

  day_in_cycle INTEGER,
  streak_at_claim INTEGER,

  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP -- For time-limited rewards like boosts
);

CREATE INDEX idx_user_reward_history_user ON user_reward_history(user_id);
CREATE INDEX idx_user_reward_history_claimed ON user_reward_history(claimed_at);

-- ============================================
-- ACHIEVEMENTS SYSTEM
-- ============================================

-- Table: achievements
-- Master list of all available achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('profile', 'social', 'activity', 'hidden')),

  -- Requirements
  requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN (
    'profile_completion',
    'photo_count',
    'verify_phone',
    'verify_photo',
    'first_match',
    'match_count',
    'first_message',
    'message_count',
    'first_date',
    'swipe_count',
    'login_streak',
    'super_like_sent',
    'profile_view_count'
  )),
  requirement_value INTEGER NOT NULL DEFAULT 1,

  -- Rewards
  reward_coins INTEGER DEFAULT 0,
  reward_super_likes INTEGER DEFAULT 0,
  reward_boosts INTEGER DEFAULT 0,

  -- Display
  icon_name VARCHAR(50),
  icon_color VARCHAR(7), -- Hex color code
  badge_image_url VARCHAR(500),
  tier VARCHAR(20) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),

  -- Configuration
  is_hidden BOOLEAN DEFAULT FALSE, -- Secret achievements
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_active ON achievements(is_active);
CREATE INDEX idx_achievements_hidden ON achievements(is_hidden);

-- Table: user_achievements
-- Tracks which achievements users have unlocked
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,

  -- Progress tracking
  current_progress INTEGER DEFAULT 0,
  required_progress INTEGER NOT NULL,
  is_unlocked BOOLEAN DEFAULT FALSE,

  -- Metadata
  unlocked_at TIMESTAMP,
  shown_on_profile BOOLEAN DEFAULT FALSE, -- User can showcase achievements
  notification_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(user_id, is_unlocked);
CREATE INDEX idx_user_achievements_showcase ON user_achievements(user_id, shown_on_profile);

-- Table: achievement_progress_events
-- Logs events that contribute to achievement progress
CREATE TABLE achievement_progress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  event_type VARCHAR(50) NOT NULL,
  event_value INTEGER DEFAULT 1,
  metadata JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievement_events_user ON achievement_progress_events(user_id);
CREATE INDEX idx_achievement_events_type ON achievement_progress_events(event_type);
CREATE INDEX idx_achievement_events_created ON achievement_progress_events(created_at);

-- ============================================
-- SEED DATA: Default Daily Login Rewards (7-day cycle)
-- ============================================

INSERT INTO daily_login_rewards (day_number, reward_type, reward_amount, reward_duration_hours, display_title, display_description, icon_name) VALUES
(1, 'coins', 10, NULL, 'Day 1: Welcome Coins', 'Start your week with 10 free coins!', 'coins'),
(2, 'super_likes', 1, NULL, 'Day 2: Super Like', 'Get 1 Super Like to stand out!', 'star'),
(3, 'coins', 20, NULL, 'Day 3: Bonus Coins', 'Keep the streak! 20 coins for you!', 'coins'),
(4, 'boosts', 1, 1, 'Day 4: Profile Boost', '1-hour profile boost to get noticed!', 'rocket'),
(5, 'coins', 30, NULL, 'Day 5: More Coins', 'Halfway there! 30 coins reward!', 'coins'),
(6, 'super_likes', 2, NULL, 'Day 6: Double Super Likes', '2 Super Likes for your dedication!', 'star'),
(7, 'premium_trial', 1, 24, 'Day 7: Premium Day', '24-hour Premium trial! Enjoy all features!', 'crown');

-- ============================================
-- SEED DATA: Default Achievements
-- ============================================

-- Profile Achievements
INSERT INTO achievements (name, slug, description, category, requirement_type, requirement_value, reward_coins, icon_name, tier) VALUES
('Profile Pioneer', 'profile_pioneer', 'Complete your profile to 100%', 'profile', 'profile_completion', 100, 50, 'user-check', 'bronze'),
('Photogenic', 'photogenic', 'Upload 5 photos to your profile', 'profile', 'photo_count', 5, 30, 'camera', 'bronze'),
('Photo Pro', 'photo_pro', 'Upload 10 photos to your profile', 'profile', 'photo_count', 10, 50, 'camera', 'silver'),
('Verified Member', 'verified_member', 'Verify your phone number', 'profile', 'verify_phone', 1, 100, 'shield-check', 'gold'),
('Face Verified', 'face_verified', 'Complete photo verification', 'profile', 'verify_photo', 1, 150, 'user-shield', 'gold');

-- Social Achievements
INSERT INTO achievements (name, slug, description, category, requirement_type, requirement_value, reward_coins, reward_super_likes, icon_name, tier) VALUES
('First Connection', 'first_connection', 'Get your first match!', 'social', 'first_match', 1, 100, 1, 'heart', 'bronze'),
('Popular', 'popular', 'Reach 10 matches', 'social', 'match_count', 10, 200, 2, 'users', 'silver'),
('Social Butterfly', 'social_butterfly', 'Reach 50 matches', 'social', 'match_count', 50, 500, 5, 'users', 'gold'),
('Match Master', 'match_master', 'Reach 100 matches', 'social', 'match_count', 100, 1000, 10, 'crown', 'platinum'),
('Ice Breaker', 'ice_breaker', 'Send your first message', 'social', 'first_message', 1, 50, 0, 'message-circle', 'bronze'),
('Conversationalist', 'conversationalist', 'Send 100 messages', 'social', 'message_count', 100, 200, 0, 'message-square', 'silver'),
('Chatterbox', 'chatterbox', 'Send 1000 messages', 'social', 'message_count', 1000, 500, 0, 'messages-square', 'gold');

-- Activity Achievements
INSERT INTO achievements (name, slug, description, category, requirement_type, requirement_value, reward_coins, icon_name, tier) VALUES
('Newbie Swiper', 'newbie_swiper', 'Make 100 swipes', 'activity', 'swipe_count', 100, 50, 'hand', 'bronze'),
('Active Swiper', 'active_swiper', 'Make 500 swipes', 'activity', 'swipe_count', 500, 150, 'hand', 'silver'),
('Swipe Master', 'swipe_master', 'Make 1000 swipes', 'activity', 'swipe_count', 1000, 300, 'zap', 'gold'),
('Swipe Legend', 'swipe_legend', 'Make 5000 swipes', 'activity', 'swipe_count', 5000, 1000, 'zap', 'platinum'),
('Week Warrior', 'week_warrior', 'Login for 7 consecutive days', 'activity', 'login_streak', 7, 200, 'calendar', 'silver'),
('Month Master', 'month_master', 'Login for 30 consecutive days', 'activity', 'login_streak', 30, 1000, 'calendar-check', 'gold'),
('Year Champion', 'year_champion', 'Login for 365 consecutive days', 'activity', 'login_streak', 365, 5000, 'trophy', 'diamond');

-- Hidden/Secret Achievements
INSERT INTO achievements (name, slug, description, category, requirement_type, requirement_value, reward_coins, reward_boosts, icon_name, tier, is_hidden) VALUES
('Night Owl', 'night_owl', 'Login at 2 AM', 'hidden', 'login_streak', 1, 100, 1, 'moon', 'bronze', TRUE),
('Early Bird', 'early_bird', 'Login at 6 AM', 'hidden', 'login_streak', 1, 100, 1, 'sunrise', 'bronze', TRUE),
('Super Liker', 'super_liker', 'Send 50 super likes', 'hidden', 'super_like_sent', 50, 500, 0, 'star', 'gold', TRUE),
('Profile Stalker', 'profile_stalker', 'Get 1000 profile views', 'hidden', 'profile_view_count', 1000, 1000, 0, 'eye', 'platinum', TRUE);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: user_login_streaks
CREATE TRIGGER update_user_login_streaks_updated_at
BEFORE UPDATE ON user_login_streaks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: achievements
CREATE TRIGGER update_achievements_updated_at
BEFORE UPDATE ON achievements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: user_achievements
CREATE TRIGGER update_user_achievements_updated_at
BEFORE UPDATE ON user_achievements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: daily_login_rewards
CREATE TRIGGER update_daily_login_rewards_updated_at
BEFORE UPDATE ON daily_login_rewards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- View: User streak statistics
CREATE VIEW v_user_streak_stats AS
SELECT
  user_id,
  current_streak,
  longest_streak,
  total_logins,
  total_rewards_claimed,
  CASE
    WHEN current_streak >= 30 THEN 'Champion'
    WHEN current_streak >= 7 THEN 'Active'
    WHEN current_streak >= 3 THEN 'Regular'
    ELSE 'Casual'
  END as user_tier,
  last_login_date,
  last_claim_date
FROM user_login_streaks;

-- View: Achievement completion rate
CREATE VIEW v_achievement_completion_rate AS
SELECT
  u.id as user_id,
  COUNT(DISTINCT a.id) as total_achievements,
  COUNT(DISTINCT CASE WHEN ua.is_unlocked THEN ua.achievement_id END) as unlocked_achievements,
  ROUND(
    (COUNT(DISTINCT CASE WHEN ua.is_unlocked THEN ua.achievement_id END)::DECIMAL /
    NULLIF(COUNT(DISTINCT a.id), 0)) * 100,
    2
  ) as completion_percentage
FROM users u
CROSS JOIN achievements a
LEFT JOIN user_achievements ua ON u.id = ua.user_id AND a.id = ua.achievement_id
WHERE a.is_active = TRUE AND a.is_hidden = FALSE
GROUP BY u.id;

-- View: User achievement showcase
CREATE VIEW v_user_achievement_showcase AS
SELECT
  ua.user_id,
  a.name,
  a.description,
  a.icon_name,
  a.icon_color,
  a.badge_image_url,
  a.tier,
  ua.unlocked_at,
  ua.shown_on_profile
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.is_unlocked = TRUE
ORDER BY ua.shown_on_profile DESC, ua.unlocked_at DESC;

-- ============================================
-- GRANTS (for service user)
-- ============================================

-- Grant permissions (uncomment and adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON daily_login_rewards TO flamoral_service;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_login_streaks TO flamoral_service;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_reward_history TO flamoral_service;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON achievements TO flamoral_service;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_achievements TO flamoral_service;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON achievement_progress_events TO flamoral_service;
-- GRANT USAGE, SELECT ON SEQUENCE daily_login_rewards_id_seq TO flamoral_service;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
