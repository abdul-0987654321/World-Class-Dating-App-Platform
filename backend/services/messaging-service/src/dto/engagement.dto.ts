import { Type } from 'class-transformer';
import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsString,
  IsArray,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { WindowTheme } from '../services/vulnerability-window.service';
import { MicroDateType } from '../services/micro-date.service';

// =============================================================================
// Vulnerability Window DTOs
// =============================================================================

/**
 * DTO for initiating a vulnerability window
 * POST /engagement/vulnerability-windows
 */
export class InitiateVulnerabilityWindowDto {
  @IsUUID()
  conversationId: string;

  @IsUUID()
  responderId: string;

  @IsEnum(WindowTheme, {
    message: 'theme must be one of: dreams, fears, childhood, values, future, gratitude',
  })
  theme: WindowTheme;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(60)
  durationMinutes?: number;
}

/**
 * DTO for accepting a vulnerability window
 * POST /engagement/vulnerability-windows/:id/accept
 */
export class AcceptVulnerabilityWindowDto {
  // No body required - windowId comes from URL params
}

/**
 * DTO for declining a vulnerability window
 * POST /engagement/vulnerability-windows/:id/decline
 */
export class DeclineVulnerabilityWindowDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * URL params for vulnerability window operations
 */
export class VulnerabilityWindowIdParams {
  @IsUUID()
  id: string;
}

/**
 * URL params for getting active window by conversation
 */
export class ConversationIdParams {
  @IsUUID()
  conversationId: string;
}

// =============================================================================
// Conversation Momentum DTOs
// =============================================================================

/**
 * URL params for momentum endpoints
 */
export class MomentumParams {
  @IsUUID()
  conversationId: string;
}

/**
 * Query params for momentum history
 * GET /engagement/momentum/:conversationId/history
 */
export class MomentumHistoryQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168) // Max 7 days (168 hours)
  @Type(() => Number)
  hours?: number = 24;
}

// =============================================================================
// Micro-Date DTOs
// =============================================================================

/**
 * DTO for proposing a micro-date
 * POST /engagement/micro-dates/propose
 */
export class ProposeMicroDateDto {
  @IsUUID()
  recipientId: string;

  @IsUUID()
  conversationId: string;

  @IsEnum(['coffee_chat', 'quick_intro', 'interest_deep_dive', 'compatibility_check'], {
    message: 'type must be one of: coffee_chat, quick_intro, interest_deep_dive, compatibility_check',
  })
  type: MicroDateType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsDateString({}, { each: true })
  suggestedTimes: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

/**
 * DTO for accepting a micro-date proposal
 * POST /engagement/micro-dates/:id/accept
 */
export class AcceptMicroDateDto {
  @IsDateString()
  selectedTime: string;
}

/**
 * DTO for declining a micro-date proposal
 * POST /engagement/micro-dates/:id/decline
 */
export class DeclineMicroDateDto {
  @IsOptional()
  @IsEnum(['busy', 'not_interested', 'need_more_time', 'prefer_in_person', 'other'], {
    message: 'reason must be one of: busy, not_interested, need_more_time, prefer_in_person, other',
  })
  reason?: 'busy' | 'not_interested' | 'need_more_time' | 'prefer_in_person' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customMessage?: string;
}

/**
 * URL params for micro-date operations
 */
export class MicroDateIdParams {
  @IsUUID()
  id: string;
}

/**
 * Query params for upcoming micro-dates
 * GET /engagement/micro-dates/upcoming
 */
export class UpcomingMicroDatesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}

/**
 * Query params for optimal time suggestions
 * GET /engagement/micro-dates/suggestions/times
 */
export class TimeSuggestionsQueryDto {
  @IsUUID()
  recipientId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  @Type(() => Number)
  daysAhead?: number = 7;
}

// =============================================================================
// Ghosting Prevention DTOs
// =============================================================================

/**
 * URL params for ghosting risk assessment
 * GET /engagement/ghosting-risk/:conversationId
 */
export class GhostingRiskParams {
  @IsUUID()
  conversationId: string;
}

/**
 * Query params for at-risk conversations
 * GET /engagement/at-risk-conversations
 */
export class AtRiskConversationsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;
}

// =============================================================================
// Response DTOs (for documentation/typing purposes)
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Response for vulnerability window operations
 */
export interface VulnerabilityWindowResponse {
  id: string;
  conversationId: string;
  initiatorId: string;
  responderId: string;
  status: string;
  theme: string;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  scheduledEndTime?: string;
  promptsRevealed: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response for available themes
 */
export interface ThemeResponse {
  theme: string;
  name: string;
  description: string;
}

/**
 * Response for conversation momentum
 */
export interface MomentumResponse {
  conversationId: string;
  currentScore: number;
  trend: 'rising' | 'stable' | 'falling';
  velocity: number;
  factors: {
    responseTime: number;
    messageLength: number;
    questionRatio: number;
    emojiUsage: number;
    topicVariety: number;
    reciprocity: number;
    messageRate: number;
  };
  history: Array<{
    score: number;
    trend: string;
    timestamp: string;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    suggestion: string;
    urgency: number;
    timestamp: string;
  }>;
  calculatedAt: string;
}

/**
 * Response for micro-date operations
 */
export interface MicroDateResponse {
  id: string;
  proposalId: string;
  participants: Array<{
    id: string;
    name?: string;
    joinedAt?: string;
  }>;
  scheduledTime: string;
  duration: number;
  status: string;
  type: string;
  icebreaker?: {
    id: string;
    prompt: string;
    followUpQuestions: string[];
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Response for ghosting risk assessment
 */
export interface GhostingRiskResponse {
  conversationId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  signals: Array<{
    type: string;
    weight: number;
    description: string;
    value?: number;
    threshold?: number;
  }>;
  daysSinceLastMessage: number;
  lastActiveUser: 'self' | 'match';
  assessedAt: string;
  recommendedAction?: {
    type: string;
    message: string;
    confidence: number;
  };
}

/**
 * Response for at-risk conversations
 */
export interface AtRiskConversationResponse {
  conversationId: string;
  matchId: string;
  matchName?: string;
  assessment: GhostingRiskResponse;
  suggestedAction?: {
    type: string;
    message: string;
    confidence: number;
  };
}
