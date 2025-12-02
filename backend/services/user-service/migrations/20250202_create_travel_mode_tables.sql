-- Migration: Create Travel Mode Tables
-- Date: 2025-02-02
-- Description: Adds travel mode functionality for users to set destinations before traveling

-- Table for user travel sessions
CREATE TABLE IF NOT EXISTS user_travel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Destination details
  destination_city VARCHAR(100) NOT NULL,
  destination_state VARCHAR(100),
  destination_country VARCHAR(100) NOT NULL,
  destination_latitude DECIMAL(10, 8) NOT NULL,
  destination_longitude DECIMAL(11, 8) NOT NULL,

  -- Travel dates
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  is_current BOOLEAN DEFAULT FALSE,

  -- Travel mode settings
  show_on_profile BOOLEAN DEFAULT TRUE,
  match_with_locals BOOLEAN DEFAULT TRUE,
  match_with_travelers BOOLEAN DEFAULT TRUE,

  -- Stats (for analytics)
  views_count INTEGER DEFAULT 0,
  matches_count INTEGER DEFAULT 0,
  messages_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  CONSTRAINT valid_coordinates CHECK (
    destination_latitude BETWEEN -90 AND 90 AND
    destination_longitude BETWEEN -180 AND 180
  )
);

-- Table for travel history (stores completed travels)
CREATE TABLE IF NOT EXISTS user_travel_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  travel_session_id UUID REFERENCES user_travel_sessions(id) ON DELETE SET NULL,

  -- Destination
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(100) NOT NULL,

  -- Dates
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,

  -- Stats
  total_views INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for passport feature (premium unlimited location changes)
CREATE TABLE IF NOT EXISTS user_passport_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Current virtual location (for passport feature)
  current_city VARCHAR(100) NOT NULL,
  current_state VARCHAR(100),
  current_country VARCHAR(100) NOT NULL,
  current_latitude DECIMAL(10, 8) NOT NULL,
  current_longitude DECIMAL(11, 8) NOT NULL,

  -- Tracking
  is_active BOOLEAN DEFAULT TRUE,
  changes_count INTEGER DEFAULT 0,
  last_change_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_passport_coordinates CHECK (
    current_latitude BETWEEN -90 AND 90 AND
    current_longitude BETWEEN -180 AND 180
  )
);

-- Table for tracking passport location history
CREATE TABLE IF NOT EXISTS passport_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  passport_session_id UUID REFERENCES user_passport_sessions(id) ON DELETE CASCADE,

  -- Location details
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,

  -- Duration at this location
  set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_at TIMESTAMP,

  -- Stats while at this location
  matches_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_travel_sessions_user_id ON user_travel_sessions(user_id);
CREATE INDEX idx_travel_sessions_status ON user_travel_sessions(status);
CREATE INDEX idx_travel_sessions_is_current ON user_travel_sessions(user_id, is_current) WHERE is_current = TRUE;
CREATE INDEX idx_travel_sessions_dates ON user_travel_sessions(start_date, end_date);
CREATE INDEX idx_travel_sessions_destination ON user_travel_sessions(destination_city, destination_country);

CREATE INDEX idx_travel_history_user_id ON user_travel_history(user_id);
CREATE INDEX idx_travel_history_dates ON user_travel_history(start_date, end_date);

CREATE INDEX idx_passport_sessions_user_id ON user_passport_sessions(user_id);
CREATE INDEX idx_passport_sessions_active ON user_passport_sessions(user_id, is_active) WHERE is_active = TRUE;

CREATE INDEX idx_passport_history_user_id ON passport_location_history(user_id);
CREATE INDEX idx_passport_history_session_id ON passport_location_history(passport_session_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_travel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER travel_sessions_updated_at
  BEFORE UPDATE ON user_travel_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_travel_updated_at();

CREATE TRIGGER passport_sessions_updated_at
  BEFORE UPDATE ON user_passport_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_travel_updated_at();

-- Function to prevent multiple current travel sessions
CREATE OR REPLACE FUNCTION enforce_single_current_travel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE user_travel_sessions
    SET is_current = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_current_travel_trigger
  BEFORE INSERT OR UPDATE ON user_travel_sessions
  FOR EACH ROW
  WHEN (NEW.is_current = TRUE)
  EXECUTE FUNCTION enforce_single_current_travel();

-- Function to auto-activate travel sessions when start_date arrives
CREATE OR REPLACE FUNCTION auto_activate_travel_sessions()
RETURNS void AS $$
BEGIN
  UPDATE user_travel_sessions
  SET
    status = 'active',
    is_current = TRUE,
    activated_at = CURRENT_TIMESTAMP
  WHERE
    status = 'scheduled'
    AND start_date <= CURRENT_TIMESTAMP
    AND end_date > CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-complete expired travel sessions
CREATE OR REPLACE FUNCTION auto_complete_travel_sessions()
RETURNS void AS $$
BEGIN
  -- Complete expired sessions
  WITH completed_sessions AS (
    UPDATE user_travel_sessions
    SET
      status = 'completed',
      is_current = FALSE,
      updated_at = CURRENT_TIMESTAMP
    WHERE
      status = 'active'
      AND end_date <= CURRENT_TIMESTAMP
    RETURNING *
  )
  -- Archive to history
  INSERT INTO user_travel_history (
    user_id,
    travel_session_id,
    city,
    state,
    country,
    start_date,
    end_date,
    total_views,
    total_matches,
    total_messages
  )
  SELECT
    user_id,
    id,
    destination_city,
    destination_state,
    destination_country,
    start_date,
    end_date,
    views_count,
    matches_count,
    messages_count
  FROM completed_sessions;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_travel_sessions IS 'Stores user travel plans and current travel status';
COMMENT ON TABLE user_travel_history IS 'Archives completed travel sessions for user history';
COMMENT ON TABLE user_passport_sessions IS 'Premium feature: allows unlimited virtual location changes';
COMMENT ON TABLE passport_location_history IS 'Tracks location changes for passport feature analytics';

COMMENT ON COLUMN user_travel_sessions.is_current IS 'Only one travel session can be current per user';
COMMENT ON COLUMN user_travel_sessions.show_on_profile IS 'Display "Traveling to [City]" badge on profile';
COMMENT ON COLUMN user_travel_sessions.match_with_locals IS 'Allow matching with people local to destination';
COMMENT ON COLUMN user_travel_sessions.match_with_travelers IS 'Allow matching with other travelers at destination';
