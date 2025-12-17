import { ScheduleType, MessageType } from '../dtos';

/**
 * ScheduledMessage Model
 * Represents scheduled messages and recurring message templates
 */
export interface ScheduledMessage {
  id: string;
  user_id: string;
  match_id: string | null;
  conversation_id: string | null;
  message_type: MessageType;
  schedule_type: ScheduleType;
  scheduled_for: Date;
  cron_expression: string | null;
  content: string;
  template_id: string | null;
  template_variables: Record<string, any>;
  channel: 'message' | 'push' | 'email' | 'sms';
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  is_active: boolean;
  last_sent_at: Date | null;
  next_send_at: Date | null;
  send_count: number;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * ConversationHealth Model
 * Tracks conversation engagement metrics
 */
export interface ConversationHealth {
  id: string;
  conversation_id: string;
  user_id: string;
  match_user_id: string;
  engagement_score: number;
  response_rate: number;
  average_response_time_minutes: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  risk_level: 'low' | 'medium' | 'high';
  last_message_at: Date;
  message_count: number;
  recommendations: string[];
  last_analyzed_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * GhostingDetection Model
 * Tracks potential ghosting situations
 */
export interface GhostingDetection {
  id: string;
  conversation_id: string;
  user_id: string;
  match_user_id: string;
  last_message_at: Date;
  last_message_from_user_id: string;
  message_count: number;
  hours_since_last_reply: number;
  is_ghosted: boolean;
  detected_at: Date;
  resolved_at: Date | null;
  resolution_type: string | null;
  created_at: Date;
}

/**
 * ReEngagementAttempt Model
 * Tracks re-engagement flow attempts
 */
export interface ReEngagementAttempt {
  id: string;
  ghosting_detection_id: string;
  conversation_id: string;
  user_id: string;
  match_user_id: string;
  attempt_number: number;
  message_sent: string | null;
  channel: 'message' | 'push';
  scheduled_for: Date;
  sent_at: Date | null;
  was_successful: boolean;
  response_received_at: Date | null;
  created_at: Date;
}

/**
 * SQL Schemas
 */
export const createScheduledMessagesTable = `
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  match_id UUID,
  conversation_id UUID,
  message_type VARCHAR(50) NOT NULL,
  schedule_type VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  cron_expression VARCHAR(255),
  content TEXT NOT NULL,
  template_id UUID,
  template_variables JSONB DEFAULT '{}'::jsonb,
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP,
  next_send_at TIMESTAMP,
  send_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_user_id ON scheduled_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_active ON scheduled_messages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_next_send ON scheduled_messages(next_send_at) WHERE status = 'pending' AND is_active = true;
`;

export const createConversationHealthTable = `
CREATE TABLE IF NOT EXISTS conversation_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  match_user_id UUID NOT NULL,
  engagement_score DECIMAL(3,2) DEFAULT 0.5,
  response_rate DECIMAL(3,2) DEFAULT 0.0,
  average_response_time_minutes INTEGER DEFAULT 0,
  sentiment VARCHAR(20) DEFAULT 'neutral',
  risk_level VARCHAR(20) DEFAULT 'low',
  last_message_at TIMESTAMP NOT NULL,
  message_count INTEGER DEFAULT 0,
  recommendations TEXT[] DEFAULT '{}',
  last_analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_health_conversation ON conversation_health(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_health_user ON conversation_health(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_health_risk ON conversation_health(risk_level);
CREATE INDEX IF NOT EXISTS idx_conversation_health_last_message ON conversation_health(last_message_at DESC);
`;

export const createGhostingDetectionsTable = `
CREATE TABLE IF NOT EXISTS ghosting_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  match_user_id UUID NOT NULL,
  last_message_at TIMESTAMP NOT NULL,
  last_message_from_user_id UUID NOT NULL,
  message_count INTEGER DEFAULT 0,
  hours_since_last_reply INTEGER NOT NULL,
  is_ghosted BOOLEAN DEFAULT true,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ghosting_conversation ON ghosting_detections(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ghosting_user ON ghosting_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_ghosting_is_ghosted ON ghosting_detections(is_ghosted) WHERE is_ghosted = true;
CREATE INDEX IF NOT EXISTS idx_ghosting_detected_at ON ghosting_detections(detected_at DESC);
`;

export const createReEngagementAttemptsTable = `
CREATE TABLE IF NOT EXISTS re_engagement_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghosting_detection_id UUID NOT NULL REFERENCES ghosting_detections(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  match_user_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL,
  message_sent TEXT,
  channel VARCHAR(20) NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  was_successful BOOLEAN DEFAULT false,
  response_received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_re_engagement_ghosting ON re_engagement_attempts(ghosting_detection_id);
CREATE INDEX IF NOT EXISTS idx_re_engagement_conversation ON re_engagement_attempts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_re_engagement_scheduled ON re_engagement_attempts(scheduled_for);
`;
