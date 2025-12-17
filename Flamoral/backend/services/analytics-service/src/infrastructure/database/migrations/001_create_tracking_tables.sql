-- Migration: Create Tracking Tables for Analytics Service
-- Description: Creates tables for event tracking, user attribution, conversion funnel, and campaign performance
-- Created: 2025-01-19

-- =============================================
-- 1. TRACKING EVENTS TABLE
-- =============================================
-- Stores all user events with UTM parameters and click IDs
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id VARCHAR(255),
  event_type VARCHAR(100) NOT NULL, -- 'page_view', 'registration', 'conversion', etc.
  event_name VARCHAR(100) NOT NULL, -- 'registration_started', 'profile_completed', etc.

  -- UTM Parameters (for attribution)
  utm_source VARCHAR(255),      -- facebook, google, tiktok, etc.
  utm_medium VARCHAR(255),       -- cpc, display, social, email
  utm_campaign VARCHAR(255),     -- summer_2025, dating_promo, etc.
  utm_content VARCHAR(255),      -- ad_creative_id
  utm_term VARCHAR(255),         -- keyword for search campaigns

  -- Click IDs (for platform-specific tracking)
  click_ids JSONB,               -- { fbclid, gclid, ttclid, snapchat_click_id, reddit_click_id }

  -- Event Data
  event_data JSONB,              -- Custom event properties
  page_url TEXT,                 -- Page where event occurred
  referrer_url TEXT,             -- Referring page

  -- Device & Browser Info
  user_agent TEXT,
  ip_address VARCHAR(45),
  device_type VARCHAR(50),       -- mobile, desktop, tablet
  browser VARCHAR(100),
  os VARCHAR(100),

  -- Location
  country VARCHAR(2),            -- ISO country code
  region VARCHAR(100),
  city VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  event_timestamp TIMESTAMP DEFAULT NOW()

  -- Note: user_id is a reference to external user service, no FK constraint needed
);

-- Indexes for performance
CREATE INDEX idx_tracking_events_user_id ON tracking_events(user_id);
CREATE INDEX idx_tracking_events_session_id ON tracking_events(session_id);
CREATE INDEX idx_tracking_events_event_type ON tracking_events(event_type);
CREATE INDEX idx_tracking_events_event_name ON tracking_events(event_name);
CREATE INDEX idx_tracking_events_utm_source ON tracking_events(utm_source);
CREATE INDEX idx_tracking_events_utm_campaign ON tracking_events(utm_campaign);
CREATE INDEX idx_tracking_events_created_at ON tracking_events(created_at);
CREATE INDEX idx_tracking_events_click_ids ON tracking_events USING GIN(click_ids);

-- =============================================
-- 2. USER ATTRIBUTION TABLE
-- =============================================
-- Stores first-touch and last-touch attribution for each user
CREATE TABLE IF NOT EXISTS user_attribution (
  user_id UUID PRIMARY KEY,

  -- First Touch Attribution (initial source)
  first_touch_source VARCHAR(255),       -- First UTM source
  first_touch_medium VARCHAR(255),       -- First UTM medium
  first_touch_campaign VARCHAR(255),     -- First UTM campaign
  first_touch_content VARCHAR(255),      -- First UTM content
  first_touch_click_id JSONB,            -- First click IDs
  first_touch_timestamp TIMESTAMP,       -- When user first landed
  first_touch_landing_page TEXT,         -- First page visited
  first_touch_referrer TEXT,             -- First referrer

  -- Last Touch Attribution (conversion source)
  last_touch_source VARCHAR(255),        -- Last UTM source before conversion
  last_touch_medium VARCHAR(255),        -- Last UTM medium
  last_touch_campaign VARCHAR(255),      -- Last UTM campaign
  last_touch_content VARCHAR(255),       -- Last UTM content
  last_touch_click_id JSONB,             -- Last click IDs
  last_touch_timestamp TIMESTAMP,        -- When user last touched before conversion

  -- Registration Info
  registration_timestamp TIMESTAMP,      -- When user registered
  registration_source VARCHAR(255),      -- Source at time of registration
  registration_campaign VARCHAR(255),    -- Campaign at time of registration

  -- Attribution Model
  attribution_model VARCHAR(50) DEFAULT 'last_touch', -- 'first_touch', 'last_touch', 'linear', 'time_decay'

  -- Metadata
  total_touchpoints INTEGER DEFAULT 1,   -- Number of interactions before conversion
  touchpoint_data JSONB,                 -- Array of all touchpoints

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()

  -- Note: user_id is a reference to external user service, no FK constraint needed
);

-- Indexes
CREATE INDEX idx_user_attribution_first_source ON user_attribution(first_touch_source);
CREATE INDEX idx_user_attribution_last_source ON user_attribution(last_touch_source);
CREATE INDEX idx_user_attribution_registration ON user_attribution(registration_timestamp);

-- =============================================
-- 3. CONVERSION FUNNEL TABLE
-- =============================================
-- Tracks user progression through conversion funnel
CREATE TABLE IF NOT EXISTS conversion_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id VARCHAR(255),

  -- Funnel Steps (timestamps)
  landing_page_view_at TIMESTAMP,        -- Step 1: Landing page view
  registration_started_at TIMESTAMP,     -- Step 2: Registration form started
  email_entered_at TIMESTAMP,            -- Step 3: Email entered
  password_created_at TIMESTAMP,         -- Step 4: Password created
  registration_completed_at TIMESTAMP,   -- Step 5: Registration completed
  email_verified_at TIMESTAMP,           -- Step 6: Email verified
  profile_started_at TIMESTAMP,          -- Step 7: Profile creation started
  photo_uploaded_at TIMESTAMP,           -- Step 8: Photo uploaded
  profile_completed_at TIMESTAMP,        -- Step 9: Profile completed
  first_match_at TIMESTAMP,              -- Step 10: First match
  first_message_at TIMESTAMP,            -- Step 11: First message sent
  subscription_purchased_at TIMESTAMP,   -- Step 12: Premium subscription

  -- Time to Complete (in seconds)
  time_to_register INTEGER,              -- Landing → Registration
  time_to_verify INTEGER,                -- Registration → Verification
  time_to_profile INTEGER,               -- Verification → Profile complete
  time_to_match INTEGER,                 -- Profile → First match
  time_to_subscribe INTEGER,             -- Registration → Subscription

  -- Drop-off Analysis
  dropped_at_step VARCHAR(100),          -- Step where user dropped off
  completed BOOLEAN DEFAULT FALSE,       -- Did user complete entire funnel?

  -- Attribution
  utm_source VARCHAR(255),
  utm_campaign VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()

  -- Note: user_id is a reference to external user service, no FK constraint needed
);

-- Indexes
CREATE INDEX idx_conversion_funnel_user_id ON conversion_funnel(user_id);
CREATE INDEX idx_conversion_funnel_session_id ON conversion_funnel(session_id);
CREATE INDEX idx_conversion_funnel_utm_source ON conversion_funnel(utm_source);
CREATE INDEX idx_conversion_funnel_completed ON conversion_funnel(completed);
CREATE INDEX idx_conversion_funnel_dropped_at ON conversion_funnel(dropped_at_step);

-- =============================================
-- 4. AD CAMPAIGN PERFORMANCE TABLE
-- =============================================
-- Aggregated metrics for each advertising campaign
CREATE TABLE IF NOT EXISTS ad_campaign_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign Identifiers
  platform VARCHAR(100) NOT NULL,        -- facebook, tiktok, google, snapchat, reddit
  campaign_id VARCHAR(255) NOT NULL,     -- Platform's campaign ID
  campaign_name VARCHAR(255),
  ad_set_id VARCHAR(255),                -- Ad set / ad group ID
  ad_set_name VARCHAR(255),
  ad_id VARCHAR(255),                    -- Individual ad ID
  ad_name VARCHAR(255),

  -- UTM Parameters
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),

  -- Metrics (updated daily)
  impressions INTEGER DEFAULT 0,         -- Total ad impressions
  clicks INTEGER DEFAULT 0,              -- Total clicks
  spend DECIMAL(10, 2) DEFAULT 0,        -- Total spend in USD

  -- Conversions
  registrations INTEGER DEFAULT 0,       -- New registrations
  email_verifications INTEGER DEFAULT 0, -- Email verified
  profile_completions INTEGER DEFAULT 0, -- Profile completed
  subscriptions INTEGER DEFAULT 0,       -- Premium subscriptions purchased

  -- Calculated Metrics
  ctr DECIMAL(5, 4),                     -- Click-through rate
  cpc DECIMAL(10, 2),                    -- Cost per click
  cpm DECIMAL(10, 2),                    -- Cost per 1000 impressions
  cpa DECIMAL(10, 2),                    -- Cost per acquisition (registration)
  roas DECIMAL(10, 2),                   -- Return on ad spend

  -- Revenue
  revenue DECIMAL(10, 2) DEFAULT 0,      -- Total revenue from this campaign

  -- Date Range
  date DATE NOT NULL,                    -- Performance date

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint: one row per campaign per date
  CONSTRAINT unique_campaign_date UNIQUE (platform, campaign_id, ad_id, date)
);

-- Indexes
CREATE INDEX idx_campaign_performance_platform ON ad_campaign_performance(platform);
CREATE INDEX idx_campaign_performance_campaign_id ON ad_campaign_performance(campaign_id);
CREATE INDEX idx_campaign_performance_date ON ad_campaign_performance(date);
CREATE INDEX idx_campaign_performance_utm_campaign ON ad_campaign_performance(utm_campaign);

-- =============================================
-- 5. SESSION TRACKING TABLE
-- =============================================
-- Tracks user sessions and interactions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID,                          -- NULL for anonymous sessions

  -- Session Start
  started_at TIMESTAMP DEFAULT NOW(),
  landing_page TEXT,
  referrer_url TEXT,

  -- UTM Parameters
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),

  -- Click IDs
  click_ids JSONB,

  -- Device Info
  user_agent TEXT,
  ip_address VARCHAR(45),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),

  -- Location
  country VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),

  -- Session Activity
  page_views INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,              -- Session duration

  -- Session End
  ended_at TIMESTAMP,
  exit_page TEXT,

  -- Conversion
  converted BOOLEAN DEFAULT FALSE,       -- Did session result in registration?
  conversion_timestamp TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()

  -- Note: user_id is a reference to external user service, no FK constraint needed
);

-- Indexes
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX idx_user_sessions_utm_source ON user_sessions(utm_source);
CREATE INDEX idx_user_sessions_converted ON user_sessions(converted);

-- =============================================
-- 6. PIXEL EVENTS TABLE (for server-side tracking)
-- =============================================
-- Stores events sent to advertising platforms via server-side APIs
CREATE TABLE IF NOT EXISTS pixel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Platform
  platform VARCHAR(100) NOT NULL,        -- meta, tiktok, snapchat, google
  event_type VARCHAR(100) NOT NULL,      -- CompleteRegistration, Purchase, etc.

  -- User Info
  user_id UUID,
  event_id VARCHAR(255) UNIQUE,          -- Deduplication ID

  -- Event Data
  event_data JSONB,                      -- Full event payload

  -- Status
  sent_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, sent, failed
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()

  -- Note: user_id is a reference to external user service, no FK constraint needed
);

-- Indexes
CREATE INDEX idx_pixel_events_platform ON pixel_events(platform);
CREATE INDEX idx_pixel_events_status ON pixel_events(status);
CREATE INDEX idx_pixel_events_created_at ON pixel_events(created_at);
CREATE INDEX idx_pixel_events_event_id ON pixel_events(event_id);

-- =============================================
-- 7. VIEWS FOR ANALYTICS
-- =============================================

-- View: Daily Campaign Performance Summary
CREATE OR REPLACE VIEW v_daily_campaign_summary AS
SELECT
  date,
  platform,
  utm_campaign,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  SUM(spend) as total_spend,
  SUM(registrations) as total_registrations,
  SUM(subscriptions) as total_subscriptions,
  SUM(revenue) as total_revenue,
  CASE WHEN SUM(impressions) > 0 THEN (SUM(clicks)::DECIMAL / SUM(impressions)) ELSE 0 END as avg_ctr,
  CASE WHEN SUM(clicks) > 0 THEN (SUM(spend) / SUM(clicks)) ELSE 0 END as avg_cpc,
  CASE WHEN SUM(registrations) > 0 THEN (SUM(spend) / SUM(registrations)) ELSE 0 END as avg_cpa,
  CASE WHEN SUM(spend) > 0 THEN (SUM(revenue) / SUM(spend)) ELSE 0 END as avg_roas
FROM ad_campaign_performance
GROUP BY date, platform, utm_campaign
ORDER BY date DESC, total_spend DESC;

-- View: Funnel Conversion Rates
CREATE OR REPLACE VIEW v_funnel_conversion_rates AS
SELECT
  utm_source,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN landing_page_view_at IS NOT NULL THEN 1 END) as landing_views,
  COUNT(CASE WHEN registration_started_at IS NOT NULL THEN 1 END) as registrations_started,
  COUNT(CASE WHEN registration_completed_at IS NOT NULL THEN 1 END) as registrations_completed,
  COUNT(CASE WHEN email_verified_at IS NOT NULL THEN 1 END) as emails_verified,
  COUNT(CASE WHEN profile_completed_at IS NOT NULL THEN 1 END) as profiles_completed,
  COUNT(CASE WHEN first_match_at IS NOT NULL THEN 1 END) as first_matches,
  COUNT(CASE WHEN subscription_purchased_at IS NOT NULL THEN 1 END) as subscriptions,
  ROUND(100.0 * COUNT(CASE WHEN registration_completed_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(CASE WHEN landing_page_view_at IS NOT NULL THEN 1 END), 0), 2) as registration_rate,
  ROUND(100.0 * COUNT(CASE WHEN profile_completed_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(CASE WHEN registration_completed_at IS NOT NULL THEN 1 END), 0), 2) as profile_completion_rate,
  ROUND(100.0 * COUNT(CASE WHEN subscription_purchased_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(CASE WHEN registration_completed_at IS NOT NULL THEN 1 END), 0), 2) as subscription_rate
FROM conversion_funnel
GROUP BY utm_source
ORDER BY total_sessions DESC;

-- View: Attribution Summary
CREATE OR REPLACE VIEW v_attribution_summary AS
SELECT
  first_touch_source,
  last_touch_source,
  COUNT(*) as total_users,
  COUNT(CASE WHEN registration_timestamp IS NOT NULL THEN 1 END) as registered_users,
  AVG(total_touchpoints) as avg_touchpoints,
  ROUND(100.0 * COUNT(CASE WHEN registration_timestamp IS NOT NULL THEN 1 END) / COUNT(*), 2) as conversion_rate
FROM user_attribution
GROUP BY first_touch_source, last_touch_source
ORDER BY total_users DESC;

-- =============================================
-- 8. TRIGGERS
-- =============================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_attribution_updated_at BEFORE UPDATE ON user_attribution
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversion_funnel_updated_at BEFORE UPDATE ON conversion_funnel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_campaign_performance_updated_at BEFORE UPDATE ON ad_campaign_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pixel_events_updated_at BEFORE UPDATE ON pixel_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
INSERT INTO migrations (name) VALUES ('001_create_tracking_tables')
ON CONFLICT (name) DO NOTHING;
