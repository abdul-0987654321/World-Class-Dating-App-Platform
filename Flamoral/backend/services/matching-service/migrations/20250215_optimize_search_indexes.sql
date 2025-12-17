-- Migration: Optimize Search Indexes
-- Description: Add comprehensive indexes for search and discovery performance

-- Drop existing indexes if they exist (to recreate with better specifications)
DROP INDEX IF EXISTS idx_users_location;
DROP INDEX IF EXISTS idx_users_active;

-- Spatial index for geolocation searches (using GIST)
-- This enables efficient radius/distance queries
CREATE INDEX IF NOT EXISTS idx_users_location_gist ON users USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Composite index for active users filtering
CREATE INDEX IF NOT EXISTS idx_users_active_verified ON users (is_active, is_verified)
WHERE is_active = true;

-- Index for gender preferences
CREATE INDEX IF NOT EXISTS idx_users_gender_active ON users (gender, is_active)
WHERE is_active = true;

-- Index for age-based searches (date_of_birth)
CREATE INDEX IF NOT EXISTS idx_users_dob_active ON users (date_of_birth, is_active)
WHERE is_active = true;

-- Index for height filtering
CREATE INDEX IF NOT EXISTS idx_users_height ON users (height)
WHERE height IS NOT NULL;

-- Index for education filtering
CREATE INDEX IF NOT EXISTS idx_users_education ON users (education)
WHERE education IS NOT NULL;

-- Index for religion filtering (if not already created)
CREATE INDEX IF NOT EXISTS idx_users_religion ON users (religion)
WHERE religion IS NOT NULL;

-- GIN indexes for array fields (interests, relationship_goals) if not exist
CREATE INDEX IF NOT EXISTS idx_users_interests_gin ON users USING GIN (interests)
WHERE interests IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_relationship_goals_gin ON users USING GIN (relationship_goals)
WHERE relationship_goals IS NOT NULL;

-- Index for dealbreaker filters
CREATE INDEX IF NOT EXISTS idx_users_smoker ON users (smoker)
WHERE smoker IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_drinker ON users (drinker)
WHERE drinker IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_has_children ON users (has_children)
WHERE has_children IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_has_pets ON users (has_pets)
WHERE has_pets IS NOT NULL;

-- Index for activity-based sorting
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users (last_active_at DESC NULLS LAST)
WHERE is_active = true;

-- Index for profile completion (for relevance scoring)
CREATE INDEX IF NOT EXISTS idx_users_profile_completion ON users (profile_completion_percentage DESC NULLS LAST)
WHERE is_active = true;

-- Composite index for verification and profile completion (relevance scoring)
CREATE INDEX IF NOT EXISTS idx_users_relevance ON users (
  is_verified DESC,
  profile_completion_percentage DESC,
  last_active_at DESC
) WHERE is_active = true;

-- Index for subscription tier (premium users first in some contexts)
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users (subscription_tier)
WHERE is_active = true;

-- Composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_users_search_common ON users (
  is_active,
  gender,
  is_verified
) WHERE is_active = true;

-- Index on swipes table for exclusion queries
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_swiped ON swipes (swiper_id, swiped_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes (swiped_id);

-- Index on user_blocks for exclusion queries
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_both ON user_blocks (blocker_id, blocked_id);

-- Index on photos for quick retrieval
CREATE INDEX IF NOT EXISTS idx_photos_user_status ON photos (user_id, status, "order")
WHERE status = 'approved';

-- Add missing columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;

-- Update profile_completion_percentage for existing users (one-time calculation)
-- This can be run as a separate data migration
DO $$
DECLARE
  user_record RECORD;
  completion_score INTEGER;
BEGIN
  FOR user_record IN SELECT id, first_name, bio, occupation, education, height, interests, latitude, longitude FROM users
  LOOP
    completion_score := 0;

    -- Basic info (20%)
    IF user_record.first_name IS NOT NULL AND user_record.first_name != '' THEN
      completion_score := completion_score + 20;
    END IF;

    -- Bio (20%)
    IF user_record.bio IS NOT NULL AND LENGTH(user_record.bio) > 10 THEN
      completion_score := completion_score + 20;
    END IF;

    -- Occupation (15%)
    IF user_record.occupation IS NOT NULL AND user_record.occupation != '' THEN
      completion_score := completion_score + 15;
    END IF;

    -- Education (15%)
    IF user_record.education IS NOT NULL THEN
      completion_score := completion_score + 15;
    END IF;

    -- Height (10%)
    IF user_record.height IS NOT NULL THEN
      completion_score := completion_score + 10;
    END IF;

    -- Interests (10%)
    IF user_record.interests IS NOT NULL AND array_length(user_record.interests, 1) > 0 THEN
      completion_score := completion_score + 10;
    END IF;

    -- Location (10%)
    IF user_record.latitude IS NOT NULL AND user_record.longitude IS NOT NULL THEN
      completion_score := completion_score + 10;
    END IF;

    UPDATE users SET profile_completion_percentage = completion_score WHERE id = user_record.id;
  END LOOP;
END $$;

-- Create function to update last_active_at automatically
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger would need to be added on specific activity tables
-- This is just the function definition

-- Add comment documentation
COMMENT ON INDEX idx_users_location_gist IS 'Spatial index for efficient geolocation radius searches';
COMMENT ON INDEX idx_users_interests_gin IS 'GIN index for array overlap queries on interests';
COMMENT ON INDEX idx_users_relationship_goals_gin IS 'GIN index for array overlap queries on relationship goals';
COMMENT ON INDEX idx_users_relevance IS 'Composite index for relevance-based sorting in search';

-- Analyze tables to update statistics for query planner
ANALYZE users;
ANALYZE swipes;
ANALYZE user_blocks;
ANALYZE photos;
