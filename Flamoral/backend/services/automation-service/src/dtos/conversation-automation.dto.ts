/**
 * DTOs for Conversation Automation
 */

export interface GenerateReplyDto {
  userId: string;
  conversationId: string;
  messageHistory: MessageContextDto[];
  tone?: 'casual' | 'formal' | 'playful' | 'romantic' | 'friendly';
  maxLength?: number;
  includeEmoji?: boolean;
}

export interface MessageContextDto {
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'emoji' | 'gif' | 'image';
}

export interface ReplySuggestionDto {
  id: string;
  message: string;
  tone: string;
  score: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  reasoning?: string;
}

export interface ReplyAssistantResponseDto {
  suggestions: ReplySuggestionDto[];
  conversationContext: {
    sentiment: string;
    topics: string[];
    engagementScore: number;
  };
  generatedAt: Date;
}

export interface GhostingDetectionDto {
  conversationId: string;
  userId: string;
  matchUserId: string;
  lastMessageAt: Date;
  lastMessageFromUserId: string;
  messageCount: number;
  isGhosted: boolean;
  hoursSinceLastReply: number;
}

export interface ReEngagementFlowDto {
  conversationId: string;
  userId: string;
  matchUserId: string;
  attemptNumber: number;
  suggestedMessage?: string;
  scheduledFor?: Date;
}

export interface ConversationHealthDto {
  conversationId: string;
  engagementScore: number;
  responseRate: number;
  averageResponseTimeMinutes: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}
