-- Create materialized view for workflow performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS workflow_performance_metrics AS
SELECT
    w.id as workflow_id,
    w.name as workflow_name,
    w.status as workflow_status,
    w.trigger->>'type' as trigger_type,
    COUNT(we.id) as total_executions,
    COUNT(we.id) FILTER (WHERE we.status = 'completed') as successful_executions,
    COUNT(we.id) FILTER (WHERE we.status = 'failed') as failed_executions,
    ROUND(
        (COUNT(we.id) FILTER (WHERE we.status = 'completed')::NUMERIC /
         NULLIF(COUNT(we.id), 0) * 100),
        2
    ) as success_rate,
    ROUND(AVG(we.duration) FILTER (WHERE we.duration IS NOT NULL)) as avg_duration_ms,
    ROUND(MIN(we.duration) FILTER (WHERE we.duration IS NOT NULL)) as min_duration_ms,
    ROUND(MAX(we.duration) FILTER (WHERE we.duration IS NOT NULL)) as max_duration_ms,
    MAX(we.created_at) as last_execution_at,
    w.created_at as workflow_created_at,
    w.updated_at as workflow_updated_at
FROM
    workflows w
LEFT JOIN
    workflow_executions we ON w.id = we.workflow_id
GROUP BY
    w.id, w.name, w.status, w.trigger, w.created_at, w.updated_at;

-- Create index on materialized view
CREATE INDEX idx_workflow_perf_metrics_workflow_id ON workflow_performance_metrics(workflow_id);
CREATE INDEX idx_workflow_perf_metrics_trigger_type ON workflow_performance_metrics(trigger_type);
CREATE INDEX idx_workflow_perf_metrics_success_rate ON workflow_performance_metrics(success_rate DESC);

-- Create materialized view for daily execution stats
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_execution_stats AS
SELECT
    DATE(we.created_at) as execution_date,
    we.workflow_id,
    w.name as workflow_name,
    w.trigger->>'type' as trigger_type,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE we.status = 'completed') as successful_executions,
    COUNT(*) FILTER (WHERE we.status = 'failed') as failed_executions,
    COUNT(DISTINCT we.user_id) FILTER (WHERE we.user_id IS NOT NULL) as unique_users,
    ROUND(AVG(we.duration) FILTER (WHERE we.duration IS NOT NULL)) as avg_duration_ms
FROM
    workflow_executions we
JOIN
    workflows w ON we.workflow_id = w.id
GROUP BY
    DATE(we.created_at), we.workflow_id, w.name, w.trigger;

-- Create indexes on daily stats view
CREATE INDEX idx_daily_stats_date ON daily_execution_stats(execution_date DESC);
CREATE INDEX idx_daily_stats_workflow_id ON daily_execution_stats(workflow_id);
CREATE INDEX idx_daily_stats_date_workflow ON daily_execution_stats(execution_date DESC, workflow_id);

-- Create materialized view for A/B test results
CREATE MATERIALIZED VIEW IF NOT EXISTS ab_test_results AS
SELECT
    w.ab_test_group,
    w.ab_test_variant,
    w.id as workflow_id,
    w.name as workflow_name,
    w.ab_test_percentage,
    COUNT(we.id) as total_executions,
    COUNT(DISTINCT we.user_id) FILTER (WHERE we.user_id IS NOT NULL) as unique_users,
    COUNT(we.id) FILTER (WHERE we.status = 'completed') as successful_executions,
    COUNT(we.id) FILTER (WHERE we.conditions_evaluated = true) as conditions_passed,
    ROUND(
        (COUNT(we.id) FILTER (WHERE we.status = 'completed')::NUMERIC /
         NULLIF(COUNT(we.id), 0) * 100),
        2
    ) as success_rate,
    ROUND(
        (COUNT(we.id) FILTER (WHERE we.conditions_evaluated = true)::NUMERIC /
         NULLIF(COUNT(DISTINCT we.user_id) FILTER (WHERE we.user_id IS NOT NULL), 0) * 100),
        2
    ) as conversion_rate,
    ROUND(AVG(we.duration) FILTER (WHERE we.duration IS NOT NULL)) as avg_duration_ms
FROM
    workflows w
LEFT JOIN
    workflow_executions we ON w.id = we.workflow_id
WHERE
    w.ab_test_group IS NOT NULL
GROUP BY
    w.ab_test_group, w.ab_test_variant, w.id, w.name, w.ab_test_percentage;

-- Create index on A/B test results
CREATE INDEX idx_ab_test_results_group ON ab_test_results(ab_test_group);
CREATE INDEX idx_ab_test_results_conversion ON ab_test_results(conversion_rate DESC);

-- Create function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_workflow_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_performance_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_execution_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY ab_test_results;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON MATERIALIZED VIEW workflow_performance_metrics IS 'Aggregated performance metrics for all workflows';
COMMENT ON MATERIALIZED VIEW daily_execution_stats IS 'Daily execution statistics by workflow';
COMMENT ON MATERIALIZED VIEW ab_test_results IS 'A/B test performance comparison metrics';
COMMENT ON FUNCTION refresh_workflow_analytics() IS 'Refreshes all workflow analytics materialized views';
