-- Migration: Create search_filter_presets table
-- Description: Store user's saved search filter presets

CREATE TABLE IF NOT EXISTS search_filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_search_presets_user_id (user_id),
  INDEX idx_search_presets_created_at (created_at)
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_search_filter_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER search_filter_presets_updated_at
  BEFORE UPDATE ON search_filter_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_search_filter_presets_updated_at();

-- Add missing columns to users table if they don't exist (for dealbreakers)
ALTER TABLE users ADD COLUMN IF NOT EXISTS smoker BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS drinker BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_pets BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS religion VARCHAR(50);

-- Create indexes on new columns for better query performance
CREATE INDEX IF NOT EXISTS idx_users_smoker ON users(smoker);
CREATE INDEX IF NOT EXISTS idx_users_drinker ON users(drinker);
CREATE INDEX IF NOT EXISTS idx_users_has_children ON users(has_children);
CREATE INDEX IF NOT EXISTS idx_users_has_pets ON users(has_pets);
CREATE INDEX IF NOT EXISTS idx_users_religion ON users(religion);

-- GIN index for array fields (interests, relationship_goals)
CREATE INDEX IF NOT EXISTS idx_users_interests_gin ON users USING GIN (interests);
CREATE INDEX IF NOT EXISTS idx_users_relationship_goals_gin ON users USING GIN (relationship_goals);
