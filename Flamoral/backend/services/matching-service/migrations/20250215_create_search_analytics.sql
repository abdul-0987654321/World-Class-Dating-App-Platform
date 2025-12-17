-- Migration: Create Search Analytics Tables
-- Description: Track search usage and performance for optimization

-- Search analytics main table
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filters JSONB NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for analytics queries
  INDEX idx_search_analytics_user_id (user_id),
  INDEX idx_search_analytics_timestamp (timestamp DESC),
  INDEX idx_search_analytics_user_timestamp (user_id, timestamp DESC),
  INDEX idx_search_analytics_response_time (response_time_ms DESC),
  INDEX idx_search_analytics_result_count (result_count)
);

-- GIN index for filter analysis
CREATE INDEX IF NOT EXISTS idx_search_analytics_filters_gin
ON search_analytics USING GIN (filters);

-- Search no-results tracking table
CREATE TABLE IF NOT EXISTS search_no_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filters JSONB NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_search_no_results_user_id (user_id),
  INDEX idx_search_no_results_timestamp (timestamp DESC)
);

-- Table for tracking popular search patterns
CREATE TABLE IF NOT EXISTS search_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_hash VARCHAR(64) UNIQUE NOT NULL,
  filters JSONB NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 1,
  avg_result_count NUMERIC(10, 2),
  avg_response_time_ms INTEGER,
  last_used TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_search_patterns_usage (usage_count DESC),
  INDEX idx_search_patterns_hash (pattern_hash)
);

-- Materialized view for daily search statistics (for faster reporting)
CREATE MATERIALIZED VIEW IF NOT EXISTS search_daily_stats AS
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_searches,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(result_count) as avg_result_count,
  AVG(response_time_ms) as avg_response_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
  COUNT(CASE WHEN result_count = 0 THEN 1 END) as zero_result_count,
  COUNT(CASE WHEN response_time_ms > 1000 THEN 1 END) as slow_query_count
FROM search_analytics
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_daily_stats_date
ON search_daily_stats (date);

-- Function to refresh daily stats (call this periodically via cron)
CREATE OR REPLACE FUNCTION refresh_search_daily_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_daily_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old analytics data (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_search_analytics(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM search_analytics
  WHERE timestamp < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM search_no_results
  WHERE timestamp < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update search patterns
CREATE OR REPLACE FUNCTION update_search_pattern(filter_data JSONB)
RETURNS void AS $$
DECLARE
  pattern_key VARCHAR(64);
BEGIN
  -- Create hash of filters for pattern matching
  pattern_key := MD5(filter_data::TEXT);

  INSERT INTO search_patterns (pattern_hash, filters, usage_count, last_used)
  VALUES (pattern_key, filter_data, 1, CURRENT_TIMESTAMP)
  ON CONFLICT (pattern_hash)
  DO UPDATE SET
    usage_count = search_patterns.usage_count + 1,
    last_used = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search patterns automatically
CREATE OR REPLACE FUNCTION trigger_update_search_pattern()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_search_pattern(NEW.filters);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER search_analytics_pattern_update
  AFTER INSERT ON search_analytics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_search_pattern();

-- Add partitioning for search_analytics by month (PostgreSQL 10+)
-- This improves query performance for time-based queries
-- Note: This requires modifying the existing table structure

-- Add comments for documentation
COMMENT ON TABLE search_analytics IS 'Tracks all search queries for analytics and optimization';
COMMENT ON TABLE search_no_results IS 'Tracks searches that returned zero results for filter optimization';
COMMENT ON TABLE search_patterns IS 'Aggregates common search patterns for recommendations';
COMMENT ON MATERIALIZED VIEW search_daily_stats IS 'Daily aggregated search statistics for reporting';
COMMENT ON FUNCTION cleanup_old_search_analytics IS 'Removes search analytics data older than specified retention period';
COMMENT ON FUNCTION refresh_search_daily_stats IS 'Refreshes the materialized view with latest daily statistics';

-- Initial refresh of materialized view
REFRESH MATERIALIZED VIEW search_daily_stats;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT ON search_analytics TO analytics_role;
-- GRANT SELECT ON search_daily_stats TO analytics_role;
