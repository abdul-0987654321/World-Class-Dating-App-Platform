-- Create workflow_executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    trigger_data JSONB NOT NULL,
    metadata JSONB,
    conditions_evaluated BOOLEAN,
    condition_results JSONB,
    actions_executed JSONB,
    error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    attempt INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- in milliseconds
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_created_at ON workflow_executions(created_at DESC);
CREATE INDEX idx_workflow_executions_workflow_created ON workflow_executions(workflow_id, created_at DESC);

-- Add check constraint for status
ALTER TABLE workflow_executions ADD CONSTRAINT check_execution_status
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying', 'cancelled'));

-- Add check constraint for duration (must be non-negative if set)
ALTER TABLE workflow_executions ADD CONSTRAINT check_execution_duration
    CHECK (duration IS NULL OR duration >= 0);

-- Create partial index for active executions
CREATE INDEX idx_workflow_executions_active ON workflow_executions(workflow_id)
    WHERE status IN ('pending', 'running', 'retrying');

-- Add comments
COMMENT ON TABLE workflow_executions IS 'Stores execution history and state of workflow runs';
COMMENT ON COLUMN workflow_executions.trigger_data IS 'Data that triggered the workflow execution';
COMMENT ON COLUMN workflow_executions.metadata IS 'Additional context and metadata for the execution';
COMMENT ON COLUMN workflow_executions.conditions_evaluated IS 'Whether workflow conditions were met';
COMMENT ON COLUMN workflow_executions.condition_results IS 'Detailed results of condition evaluation';
COMMENT ON COLUMN workflow_executions.actions_executed IS 'Results of executed actions';
COMMENT ON COLUMN workflow_executions.duration IS 'Execution time in milliseconds';
