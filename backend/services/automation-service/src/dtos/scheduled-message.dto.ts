/**
 * DTOs for Scheduled Messaging
 */

export enum ScheduleType {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum MessageType {
  ENGAGEMENT_NUDGE = 'engagement_nudge',
  MATCH_WARMUP = 'match_warmup',
  WEEKLY_DIGEST = 'weekly_digest',
  DAILY_SUMMARY = 'daily_summary',
  REMINDER = 'reminder',
  CUSTOM = 'custom',
}

export interface CreateScheduledMessageDto {
  userId: string;
  matchId?: string;
  conversationId?: string;
  messageType: MessageType;
  scheduleType: ScheduleType;
  scheduledFor: Date;
  cronExpression?: string;
  content?: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
  channel: 'message' | 'push' | 'email' | 'sms';
  isActive?: boolean;
}

export interface UpdateScheduledMessageDto {
  scheduledFor?: Date;
  cronExpression?: string;
  content?: string;
  templateVariables?: Record<string, any>;
  channel?: 'message' | 'push' | 'email' | 'sms';
  isActive?: boolean;
}

export interface ScheduledMessageResponseDto {
  id: string;
  userId: string;
  matchId: string | null;
  conversationId: string | null;
  messageType: MessageType;
  scheduleType: ScheduleType;
  scheduledFor: Date;
  cronExpression: string | null;
  content: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  isActive: boolean;
  lastSentAt: Date | null;
  nextSendAt: Date | null;
  sendCount: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchWarmupSequenceDto {
  userId: string;
  matchId: string;
  conversationId: string;
  sequence: WarmupMessageDto[];
}

export interface WarmupMessageDto {
  sequenceNumber: number;
  delayHours: number;
  content: string;
  channel: 'message' | 'push';
  condition?: {
    type: 'no_response' | 'no_engagement';
    parameters?: Record<string, any>;
  };
}

export interface DailyEngagementDto {
  userId: string;
  scheduledTime: string;
  timezone: string;
  includeMatches: boolean;
  includeMessages: boolean;
  includeRecommendations: boolean;
  channel: 'push' | 'email';
}
