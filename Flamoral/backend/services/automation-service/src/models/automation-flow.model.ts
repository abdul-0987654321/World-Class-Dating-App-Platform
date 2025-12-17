import { TriggerConfig, ConditionConfig, ActionConfig, FlowStatus } from '../dtos';

/**
 * AutomationFlow Model
 * Represents an automation workflow configuration
 */
export interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  trigger: TriggerConfig;
  conditions: ConditionConfig[];
  actions: ActionConfig[];
  priority: number;
  status: FlowStatus;
  tags: string[];
  execution_count: number;
  success_count: number;
  failure_count: number;
  last_executed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * FlowExecution Model
 * Tracks individual executions of automation flows
 */
export interface FlowExecution {
  id: string;
  flow_id: string;
  user_id: string;
  match_id: string | null;
  conversation_id: string | null;
  trigger_data: Record<string, any>;
  status: 'pending' | 'running' | 'success' | 'failed' | 'partial';
  started_at: Date;
  completed_at: Date | null;
  actions_executed: number;
  actions_failed: number;
  error_message: string | null;
  results: Record<string, any>;
  created_at: Date;
}

/**
 * Database table name constants
 */
export const TABLES = {
  AUTOMATION_FLOWS: 'automation_flows',
  FLOW_EXECUTIONS: 'flow_executions',
  ICEBREAKER_SUGGESTIONS: 'icebreaker_suggestions',
  SCHEDULED_MESSAGES: 'scheduled_messages',
  CONVERSATION_HEALTH: 'conversation_health',
  GHOSTING_DETECTIONS: 'ghosting_detections',
  RE_ENGAGEMENT_ATTEMPTS: 're_engagement_attempts',
};

/**
 * SQL Schema for automation_flows table
 */
export const createAutomationFlowsTable = `
CREATE TABLE IF NOT EXISTS automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger JSONB NOT NULL,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automation_flows_status ON automation_flows(status);
CREATE INDEX IF NOT EXISTS idx_automation_flows_priority ON automation_flows(priority DESC);
CREATE INDEX IF NOT EXISTS idx_automation_flows_trigger_type ON automation_flows((trigger->>'type'));
`;

/**
 * SQL Schema for flow_executions table
 */
export const createFlowExecutionsTable = `
CREATE TABLE IF NOT EXISTS flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  match_id UUID,
  conversation_id UUID,
  trigger_data JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  actions_executed INTEGER DEFAULT 0,
  actions_failed INTEGER DEFAULT 0,
  error_message TEXT,
  results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_id ON flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_user_id ON flow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_status ON flow_executions(status);
CREATE INDEX IF NOT EXISTS idx_flow_executions_started_at ON flow_executions(started_at DESC);
`;
