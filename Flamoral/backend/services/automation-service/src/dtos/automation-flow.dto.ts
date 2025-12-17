/**
 * DTOs for Automation Flows
 */

export enum TriggerType {
  NEW_MATCH = 'new_match',
  NO_RESPONSE = 'no_response',
  DAILY_ENGAGEMENT = 'daily_engagement',
  WEEKLY_DIGEST = 'weekly_digest',
  MATCH_ANNIVERSARY = 'match_anniversary',
  PROFILE_VIEW = 'profile_view',
  SUPER_LIKE_RECEIVED = 'super_like_received',
  MATCH_WARMUP = 'match_warmup',
}

export enum ConditionType {
  TIME_ELAPSED = 'time_elapsed',
  MESSAGE_COUNT = 'message_count',
  USER_ACTIVITY = 'user_activity',
  SUBSCRIPTION_TIER = 'subscription_tier',
  MATCH_SCORE = 'match_score',
  TIME_OF_DAY = 'time_of_day',
  DAY_OF_WEEK = 'day_of_week',
  USER_PREFERENCE = 'user_preference',
}

export enum ActionType {
  SEND_MESSAGE = 'send_message',
  SEND_NOTIFICATION = 'send_notification',
  SEND_ICEBREAKER = 'send_icebreaker',
  GENERATE_SUGGESTION = 'generate_suggestion',
  UPDATE_USER_FLAG = 'update_user_flag',
  TRIGGER_WEBHOOK = 'trigger_webhook',
  WAIT = 'wait',
}

export enum FlowStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DISABLED = 'disabled',
  ARCHIVED = 'archived',
}

export interface TriggerConfig {
  type: TriggerType;
  parameters?: Record<string, any>;
}

export interface ConditionConfig {
  type: ConditionType;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: any;
  parameters?: Record<string, any>;
}

export interface ActionConfig {
  type: ActionType;
  parameters: Record<string, any>;
  delayMs?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface CreateAutomationFlowDto {
  name: string;
  description?: string;
  trigger: TriggerConfig;
  conditions?: ConditionConfig[];
  actions: ActionConfig[];
  priority?: number;
  isActive?: boolean;
  tags?: string[];
}

export interface UpdateAutomationFlowDto {
  name?: string;
  description?: string;
  trigger?: TriggerConfig;
  conditions?: ConditionConfig[];
  actions?: ActionConfig[];
  priority?: number;
  status?: FlowStatus;
  tags?: string[];
}

export interface AutomationFlowResponseDto {
  id: string;
  name: string;
  description: string;
  trigger: TriggerConfig;
  conditions: ConditionConfig[];
  actions: ActionConfig[];
  priority: number;
  status: FlowStatus;
  tags: string[];
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastExecutedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowExecutionDto {
  flowId: string;
  userId: string;
  matchId?: string;
  conversationId?: string;
  triggerData: Record<string, any>;
}

export interface FlowExecutionResultDto {
  executionId: string;
  flowId: string;
  userId: string;
  status: 'success' | 'failed' | 'partial';
  startedAt: Date;
  completedAt: Date;
  actionsExecuted: number;
  actionsFailed: number;
  errorMessage?: string;
  results: Record<string, any>;
}
