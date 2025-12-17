-- Migration: Add Multi-Mode Support (Date, Friends, Network)
-- Description: Add mode support for dating, friendship, and professional networking

-- Create mode enum type
DO $$ BEGIN
  CREATE TYPE user_mode AS ENUM ('date', 'friends', 'network');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_modes table for managing user's enabled modes and preferences
CREATE TABLE IF NOT EXISTS user_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode user_mode NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one row per user per mode
  UNIQUE(user_id, mode)
);

-- Create indexes for user_modes
CREATE INDEX IF NOT EXISTS idx_user_modes_user_id ON user_modes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_modes_mode ON user_modes(mode);
CREATE INDEX IF NOT EXISTS idx_user_modes_enabled ON user_modes(enabled);
CREATE INDEX IF NOT EXISTS idx_user_modes_user_mode ON user_modes(user_id, mode) WHERE enabled = TRUE;

-- Add current_mode to users table (tracks which mode the user is currently using)
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_mode user_mode DEFAULT 'date';
CREATE INDEX IF NOT EXISTS idx_users_current_mode ON users(current_mode);

-- Add mode-specific profile fields to profiles table
-- Friends Mode fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friend_looking_for TEXT[]; -- ['hiking buddy', 'gym partner', 'concert friend', 'study partner', etc.]
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friend_activities TEXT[]; -- Activities they want to do with friends
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friend_availability TEXT; -- When they're available to hang out
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friend_group_size_preference VARCHAR(50); -- 'one-on-one', 'small-group', 'large-group', 'any'

-- Network Mode fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_industry VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_profession VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_company VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_job_title VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_years_experience INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_skills TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_looking_for TEXT[]; -- ['mentor', 'mentee', 'collaborator', 'co-founder', 'investor', 'advisor', etc.]
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_linkedin_url VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_portfolio_url VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_career_goals TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_open_to_opportunities BOOLEAN DEFAULT FALSE;

-- Add mode column to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS mode user_mode DEFAULT 'date';
CREATE INDEX IF NOT EXISTS idx_matches_mode ON matches(mode);
CREATE INDEX IF NOT EXISTS idx_matches_user1_mode ON matches(user1_id, mode);
CREATE INDEX IF NOT EXISTS idx_matches_user2_mode ON matches(user2_id, mode);

-- Add mode column to swipes table
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS mode user_mode DEFAULT 'date';
CREATE INDEX IF NOT EXISTS idx_swipes_mode ON swipes(mode);
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_mode ON swipes(swiper_id, mode);

-- Add mode column to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mode user_mode DEFAULT 'date';
CREATE INDEX IF NOT EXISTS idx_conversations_mode ON conversations(mode);

-- Create function to automatically create default modes for new users
CREATE OR REPLACE FUNCTION create_default_user_modes()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default mode entries for new user (only date mode enabled by default)
  INSERT INTO user_modes (user_id, mode, enabled, preferences)
  VALUES
    (NEW.id, 'date', TRUE, '{}'),
    (NEW.id, 'friends', FALSE, '{}'),
    (NEW.id, 'network', FALSE, '{}');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create modes for new users
DROP TRIGGER IF EXISTS trigger_create_default_user_modes ON users;
CREATE TRIGGER trigger_create_default_user_modes
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_user_modes();

-- Create updated_at trigger for user_modes
CREATE OR REPLACE FUNCTION update_user_modes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_modes_timestamp ON user_modes;
CREATE TRIGGER trigger_update_user_modes_timestamp
  BEFORE UPDATE ON user_modes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_modes_timestamp();

-- Insert default mode configurations for existing users
INSERT INTO user_modes (user_id, mode, enabled, preferences)
SELECT id, 'date', TRUE, '{}'
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_modes WHERE user_modes.user_id = users.id AND user_modes.mode = 'date'
);

INSERT INTO user_modes (user_id, mode, enabled, preferences)
SELECT id, 'friends', FALSE, '{}'
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_modes WHERE user_modes.user_id = users.id AND user_modes.mode = 'friends'
);

INSERT INTO user_modes (user_id, mode, enabled, preferences)
SELECT id, 'network', FALSE, '{}'
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_modes WHERE user_modes.user_id = users.id AND user_modes.mode = 'network'
);
