-- Flamoral Dating Platform API Accuracy Schema
-- Database schema for tracking API health, test results, and accuracy metrics

-- API Endpoints Registry
CREATE TABLE api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(100) NOT NULL,
  path VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  handler_file VARCHAR(500),
  handler_function VARCHAR(200),
  documented BOOLEAN DEFAULT false,
  implemented BOOLEAN DEFAULT false,
  has_tests BOOLEAN DEFAULT false,
  auth_required BOOLEAN DEFAULT true,
  last_tested TIMESTAMP,
  status VARCHAR(50) DEFAULT 'unknown',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(service, path, method)
);

-- Test Run Results
CREATE TABLE api_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES api_endpoints(id) ON DELETE CASCADE,
  test_name VARCHAR(200) NOT NULL,
  test_file VARCHAR(500),
  status VARCHAR(50) NOT NULL,
  response_time_ms INTEGER,
  response_status_code INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  run_at TIMESTAMP DEFAULT NOW(),
  build_id VARCHAR(100),
  pipeline_id VARCHAR(100)
);

-- Schema Mismatch Tracking
CREATE TABLE api_schema_mismatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES api_endpoints(id) ON DELETE CASCADE,
  field_name VARCHAR(200) NOT NULL,
  field_path VARCHAR(500),
  expected_type VARCHAR(100),
  actual_type VARCHAR(100),
  expected_value TEXT,
  actual_value TEXT,
  severity VARCHAR(50) DEFAULT 'medium',
  fixed BOOLEAN DEFAULT false,
  fixed_at TIMESTAMP,
  fixed_by VARCHAR(200),
  detected_at TIMESTAMP DEFAULT NOW()
);

-- API Accuracy Snapshots
CREATE TABLE api_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_endpoints INTEGER NOT NULL,
  documented_endpoints INTEGER DEFAULT 0,
  implemented_endpoints INTEGER DEFAULT 0,
  tested_endpoints INTEGER DEFAULT 0,
  passing_endpoints INTEGER DEFAULT 0,
  failing_endpoints INTEGER DEFAULT 0,
  accuracy_score DECIMAL(5,2),
  documentation_coverage DECIMAL(5,2),
  test_coverage DECIMAL(5,2),
  build_id VARCHAR(100),
  branch VARCHAR(200),
  commit_sha VARCHAR(64),
  snapshot_at TIMESTAMP DEFAULT NOW()
);

-- Documentation Drift Tracking
CREATE TABLE api_documentation_drift (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES api_endpoints(id) ON DELETE CASCADE,
  drift_type VARCHAR(50) NOT NULL, -- 'missing_doc', 'outdated_doc', 'extra_doc'
  description TEXT,
  swagger_definition TEXT,
  actual_implementation TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  detected_at TIMESTAMP DEFAULT NOW()
);

-- API Contract Versions
CREATE TABLE api_contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL,
  openapi_spec TEXT NOT NULL,
  changelog TEXT,
  breaking_changes TEXT[],
  published_at TIMESTAMP DEFAULT NOW(),
  is_current BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_endpoints_service ON api_endpoints(service);
CREATE INDEX idx_endpoints_status ON api_endpoints(status);
CREATE INDEX idx_test_runs_endpoint ON api_test_runs(endpoint_id);
CREATE INDEX idx_test_runs_status ON api_test_runs(status);
CREATE INDEX idx_test_runs_date ON api_test_runs(run_at);
CREATE INDEX idx_mismatches_endpoint ON api_schema_mismatches(endpoint_id);
CREATE INDEX idx_mismatches_severity ON api_schema_mismatches(severity);
CREATE INDEX idx_snapshots_date ON api_score_snapshots(snapshot_at);
CREATE INDEX idx_drift_endpoint ON api_documentation_drift(endpoint_id);

-- Views for quick metrics
CREATE VIEW api_health_summary AS
SELECT
  COUNT(*) as total_endpoints,
  COUNT(*) FILTER (WHERE documented = true) as documented,
  COUNT(*) FILTER (WHERE implemented = true) as implemented,
  COUNT(*) FILTER (WHERE has_tests = true) as tested,
  COUNT(*) FILTER (WHERE status = 'passing') as passing,
  COUNT(*) FILTER (WHERE status = 'failing') as failing,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'passing')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2
  ) as accuracy_score
FROM api_endpoints;

CREATE VIEW service_health AS
SELECT
  service,
  COUNT(*) as total_endpoints,
  COUNT(*) FILTER (WHERE documented = true) as documented,
  COUNT(*) FILTER (WHERE has_tests = true) as tested,
  COUNT(*) FILTER (WHERE status = 'passing') as passing,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'passing')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2
  ) as health_score
FROM api_endpoints
GROUP BY service
ORDER BY health_score DESC;

CREATE VIEW recent_failures AS
SELECT
  e.service,
  e.path,
  e.method,
  tr.test_name,
  tr.error_message,
  tr.run_at
FROM api_test_runs tr
JOIN api_endpoints e ON tr.endpoint_id = e.id
WHERE tr.status = 'failed'
ORDER BY tr.run_at DESC
LIMIT 50;

-- Functions for accuracy calculation
CREATE OR REPLACE FUNCTION calculate_accuracy_score()
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total INT;
  passing INT;
  score DECIMAL(5,2);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'passing')
  INTO total, passing
  FROM api_endpoints;

  IF total = 0 THEN
    RETURN 0;
  END IF;

  score := (passing::DECIMAL / total) * 100;
  RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update endpoint status based on test results
CREATE OR REPLACE FUNCTION update_endpoint_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE api_endpoints
  SET
    status = NEW.status,
    last_tested = NEW.run_at,
    updated_at = NOW()
  WHERE id = NEW.endpoint_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_endpoint_status
AFTER INSERT ON api_test_runs
FOR EACH ROW
EXECUTE FUNCTION update_endpoint_status();

-- Seed data for services
INSERT INTO api_endpoints (service, path, method, documented, implemented, has_tests, auth_required) VALUES
-- Auth Service
('auth-service', '/api/auth/register', 'POST', true, true, true, false),
('auth-service', '/api/auth/login', 'POST', true, true, true, false),
('auth-service', '/api/auth/logout', 'POST', true, true, true, true),
('auth-service', '/api/auth/refresh-token', 'POST', true, true, true, false),
('auth-service', '/api/auth/verify-email', 'POST', true, true, false, false),
('auth-service', '/api/auth/forgot-password', 'POST', true, true, false, false),
('auth-service', '/api/auth/reset-password', 'POST', true, true, false, false),
('auth-service', '/api/auth/me', 'GET', true, true, true, true),

-- User Service
('user-service', '/api/profile', 'GET', true, true, true, true),
('user-service', '/api/profile', 'PUT', true, true, true, true),
('user-service', '/api/photos', 'GET', true, true, false, true),
('user-service', '/api/photos', 'POST', true, true, false, true),
('user-service', '/api/photos/:id', 'DELETE', true, true, false, true),
('user-service', '/api/subscriptions/current', 'GET', true, true, false, true),
('user-service', '/api/subscriptions/tier', 'PUT', true, true, false, true),
('user-service', '/api/coins/balance', 'GET', true, true, false, true),
('user-service', '/api/coins/purchase', 'POST', true, true, false, true),
('user-service', '/api/privacy/settings', 'GET', true, true, false, true),
('user-service', '/api/privacy/settings', 'PUT', true, true, false, true),

-- Matching Service
('matching-service', '/api/discovery', 'GET', true, true, false, true),
('matching-service', '/api/swipes', 'POST', true, true, false, true),
('matching-service', '/api/matches', 'GET', true, true, false, true),
('matching-service', '/api/matches/:id', 'GET', true, true, false, true),
('matching-service', '/api/matches/:id', 'DELETE', true, true, false, true),

-- Messaging Service
('messaging-service', '/api/conversations', 'GET', true, true, false, true),
('messaging-service', '/api/conversations/:id', 'GET', true, true, false, true),
('messaging-service', '/api/messages', 'POST', true, true, false, true),
('messaging-service', '/api/messages/unread-count', 'GET', true, true, false, true),

-- Notification Service
('notification-service', '/api/notifications', 'GET', true, true, false, true),
('notification-service', '/api/notifications/preferences', 'GET', true, true, false, true),
('notification-service', '/api/notifications/preferences', 'PUT', true, true, false, true),

-- Payment Service
('payment-service', '/api/payments/create-intent', 'POST', true, true, false, true),
('payment-service', '/api/payments/history', 'GET', true, true, false, true);
