/**
 * FLAMORAL AI Assistant - Type Definitions
 * Production-ready types for the conversational AI system
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum AssistantContext {
  ONBOARDING = 'onboarding',
  DATING_ADVICE = 'dating_advice',
  SAFETY_GUIDANCE = 'safety_guidance',
  FEATURE_HELP = 'feature_help',
  PROFILE_COACHING = 'profile_coaching',
  CONVERSATION_TIPS = 'conversation_tips',
  TROUBLESHOOTING = 'troubleshooting',
  GENERAL = 'general',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
  ELITE = 'ELITE',
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

// ============================================================================
// USER & PROFILE TYPES
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
  occupation?: string;
  interests: string[];
  lookingFor: string[];
  photos: { url: string; isPrimary: boolean }[];
  prompts: { question: string; answer: string }[];
  isVerified: boolean;
  premiumTier: SubscriptionTier;
  profileCompletion: number;
  createdAt: string;
}

export interface UserContext {
  profile: UserProfile;
  matchCount: number;
  conversationCount: number;
  lastActive: string;
  appUsageSignals: {
    daysActive: number;
    profileViewsReceived: number;
    likesReceived: number;
    likesSent: number;
    matchRate: number;
    responseRate: number;
  };
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  context?: AssistantContext;
  metadata?: Record<string, unknown>;
}

export interface ConversationHistory {
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  context: AssistantContext;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface AssistantRequest {
  message: string;
  sessionId?: string;
  context?: AssistantContext;
  includeHistory?: boolean;
}

export interface AssistantResponse {
  success: boolean;
  data: {
    message: string;
    sessionId: string;
    context: AssistantContext;
    suggestions?: string[];
    actions?: AssistantAction[];
    metadata: {
      tokensUsed: number;
      responseTime: number;
      model: string;
    };
  };
}

export interface AssistantAction {
  type: 'link' | 'button' | 'quick_reply';
  label: string;
  value: string;
  href?: string;
}

export interface StreamChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  sessionId?: string;
  error?: string;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitConfig {
  tier: SubscriptionTier;
  requestsPerMinute: number;
  requestsPerDay: number;
  tokensPerDay: number;
}

export const RATE_LIMITS: Record<SubscriptionTier, RateLimitConfig> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    requestsPerMinute: 3,
    requestsPerDay: 20,
    tokensPerDay: 5000,
  },
  [SubscriptionTier.GOLD]: {
    tier: SubscriptionTier.GOLD,
    requestsPerMinute: 10,
    requestsPerDay: 100,
    tokensPerDay: 25000,
  },
  [SubscriptionTier.PLATINUM]: {
    tier: SubscriptionTier.PLATINUM,
    requestsPerMinute: 20,
    requestsPerDay: 250,
    tokensPerDay: 75000,
  },
  [SubscriptionTier.DIAMOND]: {
    tier: SubscriptionTier.DIAMOND,
    requestsPerMinute: 30,
    requestsPerDay: 500,
    tokensPerDay: 150000,
  },
  [SubscriptionTier.ELITE]: {
    tier: SubscriptionTier.ELITE,
    requestsPerMinute: 60,
    requestsPerDay: -1, // unlimited
    tokensPerDay: -1, // unlimited
  },
};

// ============================================================================
// SESSION MEMORY
// ============================================================================

export interface SessionMemory {
  sessionId: string;
  userId: string;
  history: ChatMessage[];
  context: AssistantContext;
  userSummary: string;
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AssistantAuditLog {
  id: string;
  userId: string;
  sessionId: string;
  action: 'message_sent' | 'response_generated' | 'context_changed' | 'session_created' | 'session_expired';
  context: AssistantContext;
  inputTokens?: number;
  outputTokens?: number;
  responseTime?: number;
  model?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AssistantError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AssistantError';
  }
}

export const ErrorCodes = {
  RATE_LIMIT_EXCEEDED: 'ASSISTANT_RATE_LIMIT',
  INVALID_INPUT: 'ASSISTANT_INVALID_INPUT',
  SESSION_NOT_FOUND: 'ASSISTANT_SESSION_NOT_FOUND',
  AI_PROVIDER_ERROR: 'ASSISTANT_AI_ERROR',
  CONTENT_MODERATION: 'ASSISTANT_CONTENT_BLOCKED',
  INTERNAL_ERROR: 'ASSISTANT_INTERNAL_ERROR',
} as const;
