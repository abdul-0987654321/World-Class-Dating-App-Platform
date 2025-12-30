-- Migration: Create Interest Badges and Intention Badges System Tables
-- Version: 1.0.0
-- Date: 2025-12-02
-- Description: Adds interest and intention badge functionality for user profiles and matching

-- ============================================
-- INTEREST BADGES SYSTEM
-- ============================================

-- Table: interest_badges
-- Master list of all available interest badges (hobbies, activities)
CREATE TABLE interest_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50) NOT NULL,  -- Icon name (e.g., 'game-controller', 'dumbbell', 'camera')

  -- Category for grouping
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'lifestyle',
    'sports_fitness',
    'arts_culture',
    'food_drink',
    'entertainment',
    'outdoor',
    'social',
    'tech',
    'other'
  )),

  -- Display settings
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interest_badges_category ON interest_badges(category);
CREATE INDEX idx_interest_badges_active ON interest_badges(is_active);
CREATE INDEX idx_interest_badges_order ON interest_badges(display_order);

-- Table: user_interest_badges
-- Tracks which interest badges each user has selected
CREATE TABLE user_interest_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES interest_badges(id) ON DELETE CASCADE,

  -- Metadata
  selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_interest_badges_user ON user_interest_badges(user_id);
CREATE INDEX idx_user_interest_badges_badge ON user_interest_badges(badge_id);
CREATE INDEX idx_user_interest_badges_selected ON user_interest_badges(selected_at);

-- ============================================
-- INTENTION BADGES SYSTEM
-- ============================================

-- Table: intention_badges
-- Master list of relationship intention badges
CREATE TABLE intention_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50) NOT NULL,  -- Icon name (e.g., 'heart', 'users', 'sparkles')
  description TEXT,           -- Longer description of what this intention means

  -- Display settings
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_intention_badges_active ON intention_badges(is_active);
CREATE INDEX idx_intention_badges_order ON intention_badges(display_order);

-- Table: user_intention_badges
-- Tracks which intention badges each user has selected (max 2)
CREATE TABLE user_intention_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES intention_badges(id) ON DELETE CASCADE,

  -- Priority (1 = primary, 2 = secondary)
  priority INTEGER NOT NULL CHECK (priority IN (1, 2)),

  -- Metadata
  selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, badge_id),
  UNIQUE(user_id, priority)
);

CREATE INDEX idx_user_intention_badges_user ON user_intention_badges(user_id);
CREATE INDEX idx_user_intention_badges_badge ON user_intention_badges(badge_id);
CREATE INDEX idx_user_intention_badges_priority ON user_intention_badges(user_id, priority);

-- ============================================
-- SEED DATA: Interest Badges (30+ badges)
-- ============================================

INSERT INTO interest_badges (name, slug, icon, category, display_order) VALUES
-- Lifestyle (6)
('Memes', 'memes', 'smile', 'lifestyle', 1),
('Houseplants', 'houseplants', 'flower', 'lifestyle', 2),
('Coffee', 'coffee', 'coffee', 'lifestyle', 3),
('Wine', 'wine', 'wine', 'lifestyle', 4),
('Meditation', 'meditation', 'peace', 'lifestyle', 5),
('Astrology', 'astrology', 'moon', 'lifestyle', 6),

-- Sports & Fitness (6)
('Fitness', 'fitness', 'dumbbell', 'sports_fitness', 10),
('Yoga', 'yoga', 'yoga', 'sports_fitness', 11),
('Hiking', 'hiking', 'mountain', 'sports_fitness', 12),
('Sports', 'sports', 'sports', 'sports_fitness', 13),
('Skiing', 'skiing', 'ski', 'sports_fitness', 14),
('Beach', 'beach', 'beach', 'sports_fitness', 15),

-- Arts & Culture (6)
('Photography', 'photography', 'camera', 'arts_culture', 20),
('Music', 'music', 'music', 'arts_culture', 21),
('Art', 'art', 'palette', 'arts_culture', 22),
('Reading', 'reading', 'book', 'arts_culture', 23),
('Movies', 'movies', 'film', 'arts_culture', 24),
('Podcasts', 'podcasts', 'microphone', 'arts_culture', 25),

-- Food & Drink (3)
('Cooking', 'cooking', 'chef', 'food_drink', 30),
('Brunch', 'brunch', 'brunch', 'food_drink', 31),
('Mocktails', 'mocktails', 'drink', 'food_drink', 32),

-- Entertainment (5)
('Gaming', 'gaming', 'game-controller', 'entertainment', 40),
('Dancing', 'dancing', 'dance', 'entertainment', 41),
('Board Games', 'board-games', 'dice', 'entertainment', 42),
('Karaoke', 'karaoke', 'mic', 'entertainment', 43),
('Festivals', 'festivals', 'festival', 'entertainment', 44),

-- Outdoor (2)
('Travel', 'travel', 'plane', 'outdoor', 50),
('Camping', 'camping', 'tent', 'outdoor', 51),

-- Social (2)
('Volunteering', 'volunteering', 'heart-hand', 'social', 60),
('Animals', 'animals', 'paw', 'social', 61),

-- Tech & Other (4)
('Tech', 'tech', 'laptop', 'tech', 70),
('Fashion', 'fashion', 'shirt', 'other', 80),
('DIY', 'diy', 'tools', 'other', 81);

-- ============================================
-- SEED DATA: Intention Badges (8 badges)
-- ============================================

INSERT INTO intention_badges (name, slug, icon, description, display_order) VALUES
('Fun casual dates', 'fun-casual', 'smile', 'Looking for casual, no-pressure dates and seeing where things go', 1),
('Intimacy without commitment', 'intimacy-no-commitment', 'sparkles', 'Open to physical intimacy without the expectation of a committed relationship', 2),
('Life partner', 'life-partner', 'heart', 'Searching for someone to build a life with and potentially start a family', 3),
('Ethical non-monogamy', 'ethical-non-monogamy', 'users', 'Practicing or interested in consensual non-monogamous relationships', 4),
('Not sure yet', 'not-sure', 'question', 'Still figuring out what I want, open to exploring different connections', 5),
('Long-term relationship', 'long-term', 'heart-circle', 'Interested in finding a serious, committed relationship for the long haul', 6),
('Marriage', 'marriage', 'rings', 'Looking for a partner with the intention of getting married', 7),
('Something serious', 'something-serious', 'lock', 'Want something meaningful and committed, but not rushing to the altar', 8);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER update_interest_badges_updated_at
  BEFORE UPDATE ON interest_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_badges_updated_at();

CREATE TRIGGER update_intention_badges_updated_at
  BEFORE UPDATE ON intention_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_badges_updated_at();

CREATE TRIGGER update_user_intention_badges_updated_at
  BEFORE UPDATE ON user_intention_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_badges_updated_at();

-- Function: Enforce max 2 intention badges per user
CREATE OR REPLACE FUNCTION enforce_max_intention_badges()
RETURNS TRIGGER AS $$
DECLARE
  badge_count INTEGER;
BEGIN
  -- Count existing badges for this user
  SELECT COUNT(*) INTO badge_count
  FROM user_intention_badges
  WHERE user_id = NEW.user_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

  -- Prevent insert if user already has 2 badges
  IF badge_count >= 2 THEN
    RAISE EXCEPTION 'User can only have a maximum of 2 intention badges';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_intention_badges_trigger
  BEFORE INSERT ON user_intention_badges
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_intention_badges();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- View: Interest badge popularity
CREATE VIEW v_interest_badge_popularity AS
SELECT
  ib.id,
  ib.name,
  ib.slug,
  ib.category,
  COUNT(uib.user_id) as user_count,
  ROUND(
    (COUNT(uib.user_id)::DECIMAL / NULLIF((SELECT COUNT(*) FROM users), 0)) * 100,
    2
  ) as percentage_of_users
FROM interest_badges ib
LEFT JOIN user_interest_badges uib ON ib.id = uib.badge_id
WHERE ib.is_active = TRUE
GROUP BY ib.id, ib.name, ib.slug, ib.category
ORDER BY user_count DESC;

-- View: Intention badge distribution
CREATE VIEW v_intention_badge_distribution AS
SELECT
  ib.id,
  ib.name,
  ib.slug,
  COUNT(uib.user_id) as user_count,
  COUNT(CASE WHEN uib.priority = 1 THEN 1 END) as primary_count,
  COUNT(CASE WHEN uib.priority = 2 THEN 1 END) as secondary_count,
  ROUND(
    (COUNT(uib.user_id)::DECIMAL / NULLIF((SELECT COUNT(*) FROM users), 0)) * 100,
    2
  ) as percentage_of_users
FROM intention_badges ib
LEFT JOIN user_intention_badges uib ON ib.id = uib.badge_id
WHERE ib.is_active = TRUE
GROUP BY ib.id, ib.name, ib.slug
ORDER BY user_count DESC;

-- View: User badges profile (for quick lookup)
CREATE VIEW v_user_badges_profile AS
SELECT
  u.id as user_id,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', ib.id,
        'name', ib.name,
        'slug', ib.slug,
        'icon', ib.icon,
        'category', ib.category
      )
    ) FILTER (WHERE ib.id IS NOT NULL),
    '[]'::json
  ) as interest_badges,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', itb.id,
        'name', itb.name,
        'slug', itb.slug,
        'icon', itb.icon,
        'description', itb.description,
        'priority', uintb.priority
      ) ORDER BY uintb.priority
    ) FILTER (WHERE itb.id IS NOT NULL),
    '[]'::json
  ) as intention_badges
FROM users u
LEFT JOIN user_interest_badges uib ON u.id = uib.user_id
LEFT JOIN interest_badges ib ON uib.badge_id = ib.id AND ib.is_active = TRUE
LEFT JOIN user_intention_badges uintb ON u.id = uintb.user_id
LEFT JOIN intention_badges itb ON uintb.badge_id = itb.id AND itb.is_active = TRUE
GROUP BY u.id;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Get user's interest badges
CREATE OR REPLACE FUNCTION get_user_interest_badges(p_user_id UUID)
RETURNS TABLE (
  badge_id UUID,
  name VARCHAR,
  slug VARCHAR,
  icon VARCHAR,
  category VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ib.id,
    ib.name,
    ib.slug,
    ib.icon,
    ib.category
  FROM user_interest_badges uib
  JOIN interest_badges ib ON uib.badge_id = ib.id
  WHERE uib.user_id = p_user_id
    AND ib.is_active = TRUE
  ORDER BY ib.display_order;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user's intention badges
CREATE OR REPLACE FUNCTION get_user_intention_badges(p_user_id UUID)
RETURNS TABLE (
  badge_id UUID,
  name VARCHAR,
  slug VARCHAR,
  icon VARCHAR,
  description TEXT,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ib.id,
    ib.name,
    ib.slug,
    ib.icon,
    ib.description,
    uib.priority
  FROM user_intention_badges uib
  JOIN intention_badges ib ON uib.badge_id = ib.id
  WHERE uib.user_id = p_user_id
    AND ib.is_active = TRUE
  ORDER BY uib.priority;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate shared interest badges between two users
CREATE OR REPLACE FUNCTION count_shared_interest_badges(p_user1_id UUID, p_user2_id UUID)
RETURNS INTEGER AS $$
DECLARE
  shared_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT uib1.badge_id) INTO shared_count
  FROM user_interest_badges uib1
  JOIN user_interest_badges uib2 ON uib1.badge_id = uib2.badge_id
  WHERE uib1.user_id = p_user1_id
    AND uib2.user_id = p_user2_id;

  RETURN shared_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if two users have compatible intentions
CREATE OR REPLACE FUNCTION check_intention_compatibility(p_user1_id UUID, p_user2_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_shared_intention BOOLEAN;
BEGIN
  -- Check if users have any shared intention badges
  SELECT EXISTS(
    SELECT 1
    FROM user_intention_badges uib1
    JOIN user_intention_badges uib2 ON uib1.badge_id = uib2.badge_id
    WHERE uib1.user_id = p_user1_id
      AND uib2.user_id = p_user2_id
  ) INTO has_shared_intention;

  RETURN has_shared_intention;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE interest_badges IS 'Master list of interest badges (hobbies, activities) that users can select';
COMMENT ON TABLE intention_badges IS 'Master list of relationship intention badges (what users are looking for)';
COMMENT ON TABLE user_interest_badges IS 'Junction table tracking which interest badges each user has selected';
COMMENT ON TABLE user_intention_badges IS 'Junction table tracking which intention badges each user has selected (max 2)';

COMMENT ON COLUMN user_intention_badges.priority IS 'Priority of intention: 1=primary, 2=secondary. Each user can have up to 2 intentions';
COMMENT ON COLUMN interest_badges.category IS 'Category for grouping badges: lifestyle, sports_fitness, arts_culture, food_drink, entertainment, outdoor, social, tech, other';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
