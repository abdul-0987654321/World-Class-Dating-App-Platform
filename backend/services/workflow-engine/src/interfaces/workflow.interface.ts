export enum TriggerType {
  MATCH_CREATED = 'match_created',
  MESSAGE_SENT = 'message_sent',
  LIKE_RECEIVED = 'like_received',
  SUPER_LIKE = 'super_like',
  SUBSCRIPTION_PURCHASE = 'subscription_purchase',
  COIN_PURCHASE = 'coin_purchase',
  FIRST_LOGIN = 'first_login',
  PROFILE_COMPLETED = 'profile_completed',
  ABANDONED_ONBOARDING = 'abandoned_onboarding',
  USER_INACTIVE_7D = 'user_inactive_7d',
}

export enum ConditionType {
  USER_PREMIUM = 'user_premium',
  PROFILE_COMPLETE_PERCENTAGE = 'profile_complete_percentage',
  MATCH_COUNT = 'match_count',
  MESSAGE_COUNT = 'message_count',
}

export enum ActionType {
  SEND_PUSH = 'send_push',
  SEND_SMS = 'send_sms',
  SEND_EMAIL = 'send_email',
  SEND_IN_APP_MESSAGE = 'send_in_app_message',
  ADD_COINS = 'add_coins',
  ACTIVATE_BOOST = 'activate_boost',
  UPDATE_PROFILE_SCORE = 'update_profile_score',
  PROMOTE_USER = 'promote_user',
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

export interface TriggerConfig {
  type: TriggerType;
  config?: Record<string, any>;
}

export interface ConditionConfig {
  type: ConditionType;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ActionConfig {
  type: ActionType;
  config: Record<string, any>;
  delay?: number; // Delay in milliseconds before executing
  retryOnFailure?: boolean;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  trigger: TriggerConfig;
  conditions?: ConditionConfig[];
  actions: ActionConfig[];
  status: WorkflowStatus;
  priority?: number; // Higher priority workflows execute first
  tags?: string[];
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId?: string;
  triggerData: Record<string, any>;
  metadata?: Record<string, any>;
  startTime: Date;
  attempt: number;
}

export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  conditionsEvaluated?: boolean;
  conditionResults?: Record<string, boolean>;
  actionsExecuted: ActionExecutionResult[];
  error?: string;
  retryCount?: number;
}

export interface ActionExecutionResult {
  actionType: ActionType;
  status: 'success' | 'failed' | 'skipped';
  executedAt: Date;
  duration: number;
  error?: string;
  result?: any;
}
