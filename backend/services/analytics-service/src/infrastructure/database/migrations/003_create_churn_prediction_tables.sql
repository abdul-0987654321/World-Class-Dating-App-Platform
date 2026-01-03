-- Migration: Create Churn Prediction Tables for ML-based User Retention
-- Description: Creates tables for churn predictions, model weights, retention campaigns, and analytics
-- Created: 2026-01-03

-- =============================================
-- 1. CHURN PREDICTIONS TABLE
-- Stores individual user churn risk predictions
-- =============================================
CREATE TABLE IF NOT EXISTS churn_predictions (
  id VARCHAR(100) PRIMARY KEY,
  user_id UUID NOT NULL,
  risk_score DECIMAL(5, 4) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_tier VARCHAR(20) NOT NULL CHECK (risk_tier IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  confidence DECIMAL(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  -- Indicator data (JSON)
  indicators JSONB NOT NULL DEFAULT '[]',
  top_risk_factors JSONB DEFAULT '[]',
  recommended_campaigns JSONB DEFAULT '[]',

  -- Intervention details
  intervention_urgency VARCHAR(20) CHECK (intervention_urgency IN ('immediate', 'this_week', 'this_month', 'monitoring')),

  -- Model information
  model_version VARCHAR(20) NOT NULL,

  -- Outcome tracking (for model training)
  actual_outcome VARCHAR(20) CHECK (actual_outcome IN ('retained', 'churned', 'pending')),
  outcome_date TIMESTAMP,

  -- Timestamps
  predicted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_churn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for churn_predictions
CREATE INDEX idx_churn_predictions_user_id ON churn_predictions(user_id);
CREATE INDEX idx_churn_predictions_risk_tier ON churn_predictions(risk_tier);
CREATE INDEX idx_churn_predictions_risk_score ON churn_predictions(risk_score DESC);
CREATE INDEX idx_churn_predictions_predicted_at ON churn_predictions(predicted_at DESC);
CREATE INDEX idx_churn_predictions_user_latest ON churn_predictions(user_id, predicted_at DESC);
CREATE INDEX idx_churn_predictions_outcome ON churn_predictions(actual_outcome) WHERE actual_outcome IS NOT NULL;

-- Composite index for at-risk user queries
CREATE INDEX idx_churn_predictions_at_risk ON churn_predictions(risk_tier, predicted_at DESC)
  WHERE risk_tier IN ('HIGH', 'CRITICAL');

-- =============================================
-- 2. CHURN MODEL WEIGHTS TABLE
-- Stores ML model weights and performance metrics
-- =============================================
CREATE TABLE IF NOT EXISTS churn_model_weights (
  id VARCHAR(100) PRIMARY KEY,
  version VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT false,

  -- Model weights (JSON with indicator type -> weight mapping)
  weights JSONB NOT NULL,

  -- Performance metrics
  accuracy DECIMAL(5, 4) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
  precision_score DECIMAL(5, 4) NOT NULL CHECK (precision_score >= 0 AND precision_score <= 1),
  recall_score DECIMAL(5, 4) NOT NULL CHECK (recall_score >= 0 AND recall_score <= 1),
  f1_score DECIMAL(5, 4) NOT NULL CHECK (f1_score >= 0 AND f1_score <= 1),
  auc DECIMAL(5, 4) CHECK (auc >= 0 AND auc <= 1),

  -- Training metadata
  training_data_size INTEGER NOT NULL,
  training_period_start TIMESTAMP NOT NULL,
  training_period_end TIMESTAMP NOT NULL,
  model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('logistic_regression', 'gradient_boosting', 'weighted_features'))
);

-- Indexes for churn_model_weights
CREATE INDEX idx_model_weights_version ON churn_model_weights(version);
CREATE INDEX idx_model_weights_active ON churn_model_weights(is_active) WHERE is_active = true;
CREATE INDEX idx_model_weights_created ON churn_model_weights(created_at DESC);

-- =============================================
-- 3. RETENTION CAMPAIGNS TABLE
-- Tracks retention campaign triggers and outcomes
-- =============================================
CREATE TABLE IF NOT EXISTS retention_campaigns (
  id VARCHAR(100) PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN (
    'REENGAGEMENT_EMAIL', 'PUSH_NOTIFICATION', 'IN_APP_MESSAGE',
    'DISCOUNT_OFFER', 'PROFILE_BOOST', 'FREE_SUPER_LIKES',
    'PERSONALIZED_MATCHES', 'WIN_BACK_CAMPAIGN', 'FEEDBACK_REQUEST',
    'FEATURE_EDUCATION', 'VIP_SUPPORT', 'SUBSCRIPTION_PAUSE'
  )),

  -- Risk data at trigger time
  risk_score_at_trigger DECIMAL(5, 4) NOT NULL,
  risk_tier_at_trigger VARCHAR(20) NOT NULL,

  -- Campaign lifecycle
  triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  engaged_at TIMESTAMP,

  -- Status and outcome
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'engaged', 'failed', 'expired'
  )),
  outcome VARCHAR(20) CHECK (outcome IN ('retained', 'churned', 'pending')),
  risk_score_after DECIMAL(5, 4),

  -- Metadata
  metadata JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_campaign_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for retention_campaigns
CREATE INDEX idx_retention_campaigns_user_id ON retention_campaigns(user_id);
CREATE INDEX idx_retention_campaigns_type ON retention_campaigns(campaign_type);
CREATE INDEX idx_retention_campaigns_status ON retention_campaigns(status);
CREATE INDEX idx_retention_campaigns_triggered_at ON retention_campaigns(triggered_at DESC);
CREATE INDEX idx_retention_campaigns_user_latest ON retention_campaigns(user_id, triggered_at DESC);
CREATE INDEX idx_retention_campaigns_outcome ON retention_campaigns(outcome) WHERE outcome IS NOT NULL;

-- Index for finding users without recent campaigns
CREATE INDEX idx_retention_campaigns_pending ON retention_campaigns(user_id, triggered_at)
  WHERE status IN ('pending', 'sent', 'delivered');

-- =============================================
-- 4. CHURN INDICATOR SCORES TABLE
-- Stores individual indicator scores for analytics
-- =============================================
CREATE TABLE IF NOT EXISTS churn_indicator_scores (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  indicator_type VARCHAR(50) NOT NULL CHECK (indicator_type IN (
    'LOGIN_FREQUENCY', 'DECLINING_ENGAGEMENT', 'PAYMENT_FAILURE',
    'MESSAGE_RESPONSE_RATE', 'SWIPE_ACTIVITY', 'PROFILE_COMPLETION',
    'SUBSCRIPTION_RENEWAL', 'SESSION_DURATION', 'MATCH_SUCCESS_RATE',
    'APP_OPEN_FREQUENCY', 'FEATURE_USAGE', 'SUPPORT_TICKETS', 'NEGATIVE_FEEDBACK'
  )),
  score DECIMAL(5, 4) NOT NULL CHECK (score >= 0 AND score <= 1),
  weight DECIMAL(5, 4) NOT NULL,
  weighted_score DECIMAL(5, 4) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_indicator_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for churn_indicator_scores
CREATE INDEX idx_indicator_scores_user_id ON churn_indicator_scores(user_id);
CREATE INDEX idx_indicator_scores_type ON churn_indicator_scores(indicator_type);
CREATE INDEX idx_indicator_scores_created_at ON churn_indicator_scores(created_at DESC);
CREATE INDEX idx_indicator_scores_high_score ON churn_indicator_scores(score DESC) WHERE score > 0.5;

-- Composite index for analytics queries
CREATE INDEX idx_indicator_scores_analytics ON churn_indicator_scores(indicator_type, created_at, score);

-- =============================================
-- 5. CHURN PREDICTION JOBS TABLE
-- Tracks scheduled prediction jobs
-- =============================================
CREATE TABLE IF NOT EXISTS churn_prediction_jobs (
  id VARCHAR(100) PRIMARY KEY,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  users_processed INTEGER NOT NULL DEFAULT 0,
  users_total INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  model_version VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for churn_prediction_jobs
CREATE INDEX idx_prediction_jobs_status ON churn_prediction_jobs(status);
CREATE INDEX idx_prediction_jobs_created_at ON churn_prediction_jobs(created_at DESC);

-- =============================================
-- 6. USER BEHAVIOR FEATURES TABLE (Optional - for caching)
-- Caches extracted user behavior features
-- =============================================
CREATE TABLE IF NOT EXISTS user_behavior_features (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,

  -- Login/Activity features
  days_since_last_login INTEGER,
  logins_last_7_days INTEGER,
  logins_last_30_days INTEGER,
  login_frequency_trend DECIMAL(5, 4),
  avg_days_between_logins DECIMAL(10, 2),

  -- Session features
  avg_session_duration_minutes DECIMAL(10, 2),
  total_sessions_last_30_days INTEGER,
  session_duration_trend DECIMAL(5, 4),
  avg_screens_per_session DECIMAL(10, 2),

  -- Engagement features
  swipes_last_7_days INTEGER,
  swipes_last_30_days INTEGER,
  swipe_activity_trend DECIMAL(5, 4),
  right_swipe_ratio DECIMAL(5, 4),

  -- Match features
  matches_last_30_days INTEGER,
  match_rate DECIMAL(5, 4),
  match_rate_trend DECIMAL(5, 4),

  -- Message features
  messages_sent_last_30_days INTEGER,
  messages_received_last_30_days INTEGER,
  response_rate DECIMAL(5, 4),
  response_rate_trend DECIMAL(5, 4),
  avg_response_time_hours DECIMAL(10, 2),

  -- Profile features
  profile_completion_percent INTEGER,
  photo_count INTEGER,
  last_profile_update_days INTEGER,
  has_verification BOOLEAN DEFAULT false,
  bio_length INTEGER,

  -- Subscription features
  subscription_tier VARCHAR(50),
  subscription_age_days INTEGER,
  days_until_renewal INTEGER,
  payment_failures_last_90_days INTEGER,
  has_active_subscription BOOLEAN DEFAULT false,
  previously_paid_user BOOLEAN DEFAULT false,

  -- Feature usage
  used_boost_last_30_days BOOLEAN DEFAULT false,
  used_super_like_last_30_days BOOLEAN DEFAULT false,
  used_rewind_last_30_days BOOLEAN DEFAULT false,
  premium_features_used INTEGER DEFAULT 0,

  -- Derived scores
  engagement_score DECIMAL(5, 2),
  value_score DECIMAL(5, 2),
  satisfaction_indicator DECIMAL(5, 2),

  -- Timestamps
  extracted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_features_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for user_behavior_features
CREATE INDEX idx_behavior_features_user_id ON user_behavior_features(user_id);
CREATE INDEX idx_behavior_features_extracted_at ON user_behavior_features(extracted_at DESC);
CREATE INDEX idx_behavior_features_engagement ON user_behavior_features(engagement_score DESC);

-- =============================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_retention_campaigns_updated_at BEFORE UPDATE ON retention_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_behavior_features_updated_at BEFORE UPDATE ON user_behavior_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. VIEWS FOR ANALYTICS
-- =============================================

-- View: Latest churn prediction per user
CREATE OR REPLACE VIEW v_latest_churn_predictions AS
SELECT DISTINCT ON (user_id)
  user_id,
  risk_score,
  risk_tier,
  confidence,
  indicators,
  top_risk_factors,
  recommended_campaigns,
  intervention_urgency,
  model_version,
  predicted_at
FROM churn_predictions
ORDER BY user_id, predicted_at DESC;

-- View: At-risk user summary
CREATE OR REPLACE VIEW v_at_risk_users_summary AS
SELECT
  risk_tier,
  COUNT(*) as user_count,
  AVG(risk_score) as avg_risk_score,
  MIN(predicted_at) as oldest_prediction,
  MAX(predicted_at) as newest_prediction
FROM v_latest_churn_predictions
WHERE risk_tier IN ('HIGH', 'CRITICAL')
GROUP BY risk_tier;

-- View: Campaign effectiveness
CREATE OR REPLACE VIEW v_campaign_effectiveness AS
SELECT
  campaign_type,
  COUNT(*) as total_campaigns,
  COUNT(*) FILTER (WHERE status = 'engaged') as engaged_count,
  COUNT(*) FILTER (WHERE outcome = 'retained') as retained_count,
  COUNT(*) FILTER (WHERE outcome = 'churned') as churned_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'engaged') / NULLIF(COUNT(*), 0), 2) as engagement_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE outcome = 'retained') / NULLIF(COUNT(*), 0), 2) as retention_rate,
  AVG(risk_score_at_trigger) as avg_trigger_risk_score,
  AVG(risk_score_after) FILTER (WHERE risk_score_after IS NOT NULL) as avg_post_risk_score
FROM retention_campaigns
WHERE triggered_at > NOW() - INTERVAL '30 days'
GROUP BY campaign_type;

-- View: Risk indicator analysis
CREATE OR REPLACE VIEW v_risk_indicator_analysis AS
SELECT
  indicator_type,
  COUNT(*) as occurrence_count,
  AVG(score) as avg_score,
  AVG(weighted_score) as avg_weighted_score,
  COUNT(*) FILTER (WHERE score > 0.7) as high_risk_count,
  COUNT(*) FILTER (WHERE score > 0.5 AND score <= 0.7) as medium_risk_count,
  COUNT(*) FILTER (WHERE score <= 0.5) as low_risk_count
FROM churn_indicator_scores
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY indicator_type
ORDER BY avg_weighted_score DESC;

-- View: Daily churn metrics
CREATE OR REPLACE VIEW v_daily_churn_metrics AS
SELECT
  DATE(predicted_at) as date,
  COUNT(DISTINCT user_id) as users_analyzed,
  AVG(risk_score) as avg_risk_score,
  COUNT(*) FILTER (WHERE risk_tier = 'CRITICAL') as critical_count,
  COUNT(*) FILTER (WHERE risk_tier = 'HIGH') as high_count,
  COUNT(*) FILTER (WHERE risk_tier = 'MEDIUM') as medium_count,
  COUNT(*) FILTER (WHERE risk_tier = 'LOW') as low_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE risk_tier IN ('HIGH', 'CRITICAL')) / NULLIF(COUNT(*), 0), 2) as at_risk_percentage
FROM churn_predictions
WHERE predicted_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(predicted_at)
ORDER BY date DESC;

-- =============================================
-- 9. INSERT DEFAULT MODEL WEIGHTS
-- =============================================
INSERT INTO churn_model_weights (
  id, version, created_at, valid_from, is_active, weights,
  accuracy, precision_score, recall_score, f1_score, auc,
  training_data_size, training_period_start, training_period_end, model_type
) VALUES (
  'model_default_v1',
  '1.0.0',
  NOW(),
  NOW(),
  true,
  '{
    "LOGIN_FREQUENCY": 0.18,
    "DECLINING_ENGAGEMENT": 0.15,
    "PAYMENT_FAILURE": 0.12,
    "MESSAGE_RESPONSE_RATE": 0.10,
    "SWIPE_ACTIVITY": 0.09,
    "PROFILE_COMPLETION": 0.08,
    "SUBSCRIPTION_RENEWAL": 0.07,
    "SESSION_DURATION": 0.06,
    "MATCH_SUCCESS_RATE": 0.05,
    "APP_OPEN_FREQUENCY": 0.04,
    "FEATURE_USAGE": 0.03,
    "SUPPORT_TICKETS": 0.02,
    "NEGATIVE_FEEDBACK": 0.01
  }',
  0.75,
  0.72,
  0.78,
  0.75,
  0.82,
  0,
  NOW() - INTERVAL '90 days',
  NOW(),
  'weighted_features'
) ON CONFLICT (version) DO NOTHING;

-- =============================================
-- 10. DATA RETENTION POLICY
-- Automatically clean up old indicator scores
-- =============================================
-- Note: This would be executed as a scheduled job
-- DELETE FROM churn_indicator_scores WHERE created_at < NOW() - INTERVAL '90 days';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
INSERT INTO migrations (name) VALUES ('003_create_churn_prediction_tables')
ON CONFLICT (name) DO NOTHING;
