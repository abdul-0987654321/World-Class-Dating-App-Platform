-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger JSONB NOT NULL,
    conditions JSONB,
    actions JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    priority INTEGER NOT NULL DEFAULT 0,
    tags TEXT[],
    ab_test_group VARCHAR(100),
    ab_test_variant VARCHAR(50),
    ab_test_percentage INTEGER,
    created_by UUID,
    updated_by UUID,
    execution_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created_by ON workflows(created_by);
CREATE INDEX idx_workflows_ab_test_group ON workflows(ab_test_group);
CREATE INDEX idx_workflows_trigger_type ON workflows((trigger->>'type'));

-- Add check constraint for status
ALTER TABLE workflows ADD CONSTRAINT check_workflow_status
    CHECK (status IN ('draft', 'active', 'paused', 'archived'));

-- Add check constraint for A/B test percentage
ALTER TABLE workflows ADD CONSTRAINT check_ab_test_percentage
    CHECK (ab_test_percentage IS NULL OR (ab_test_percentage >= 0 AND ab_test_percentage <= 100));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_updated_at_trigger
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_workflows_updated_at();

-- Add comments
COMMENT ON TABLE workflows IS 'Stores workflow definitions for automation engine';
COMMENT ON COLUMN workflows.trigger IS 'Trigger configuration in JSON format';
COMMENT ON COLUMN workflows.conditions IS 'Conditional logic for workflow execution';
COMMENT ON COLUMN workflows.actions IS 'Actions to execute when conditions are met';
COMMENT ON COLUMN workflows.ab_test_group IS 'A/B test group identifier for variant testing';
COMMENT ON COLUMN workflows.ab_test_variant IS 'Variant name within A/B test group';
COMMENT ON COLUMN workflows.ab_test_percentage IS 'Traffic percentage allocated to this variant';
