/**
 * Smart Reply Suggestions Service
 * AI-powered contextual reply suggestions for chat conversations
 *
 * Features:
 * - Context-aware reply suggestions based on conversation history
 * - Personality-matched tone suggestions
 * - Engagement-boosting conversation starters
 * - Feature-flagged for gradual rollout
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('smart-reply-service');

// Types
export interface ConversationContext {
  conversationId: string;
  userId: string;
  partnerId: string;
  recentMessages: MessageContext[];
  userProfile?: UserProfileContext;
  partnerProfile?: UserProfileContext;
  conversationMetrics?: ConversationMetrics;
}

export interface MessageContext {
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'voice' | 'image' | 'gif';
}

export interface UserProfileContext {
  userId: string;
  interests?: string[];
  occupation?: string;
  bio?: string;
  communicationStyle?: 'casual' | 'formal' | 'playful' | 'sincere';
}

export interface ConversationMetrics {
  messageCount: number;
  averageResponseTime: number;
  engagementScore: number;
  lastActivityAt: Date;
}

export interface SmartReply {
  id: string;
  text: string;
  type: SmartReplyType;
  confidence: number;
  tone: ReplyTone;
  category: ReplyCategory;
}

export enum SmartReplyType {
  QUICK_RESPONSE = 'quick_response',
  QUESTION = 'question',
  COMPLIMENT = 'compliment',
  SHARED_INTEREST = 'shared_interest',
  DATE_SUGGESTION = 'date_suggestion',
  CONTINUATION = 'continuation',
}

export enum ReplyTone {
  FRIENDLY = 'friendly',
  FLIRTY = 'flirty',
  CURIOUS = 'curious',
  ENTHUSIASTIC = 'enthusiastic',
  THOUGHTFUL = 'thoughtful',
}

export enum ReplyCategory {
  OPENER = 'opener',
  FOLLOW_UP = 'follow_up',
  KEEP_GOING = 'keep_going',
  ASK_OUT = 'ask_out',
  RECOVER = 'recover',
}

// AI Provider interface (matches existing pattern)
interface AIProvider {
  generateCompletion(systemPrompt: string, userPrompt: string): Promise<string>;
}

// Feature flag check (simplified - integrate with actual feature flag service)
function isFeatureEnabled(userId: string): boolean {
  // In production: return featureFlags.isEnabled('engagementFeatures', 'smartReplySuggestions', { userId });
  // For now, use hash-based rollout at 50%
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100 < 50;
}

export class SmartReplyService {
  private aiProvider: AIProvider | null = null;
  private readonly MAX_SUGGESTIONS = 3;

  constructor(aiProvider?: AIProvider) {
    this.aiProvider = aiProvider || null;
  }

  /**
   * Check if smart replies are enabled for a user
   */
  isEnabled(userId: string): boolean {
    return isFeatureEnabled(userId);
  }

  /**
   * Generate smart reply suggestions based on conversation context
   */
  async getSuggestions(context: ConversationContext): Promise<SmartReply[]> {
    logger.info('Getting smart reply suggestions', {
      conversationId: context.conversationId,
      userId: context.userId
    });

    // Check feature flag
    if (!this.isEnabled(context.userId)) {
      logger.debug('Smart replies disabled for user', { userId: context.userId });
      return [];
    }

    // If no AI provider, use rule-based suggestions
    if (!this.aiProvider) {
      return this.getRuleBasedSuggestions(context);
    }

    try {
      const aiSuggestions = await this.getAISuggestions(context);
      return aiSuggestions;
    } catch (error) {
      logger.error('AI suggestion generation failed, falling back to rules:', error);
      return this.getRuleBasedSuggestions(context);
    }
  }

  /**
   * AI-powered suggestion generation
   */
  private async getAISuggestions(context: ConversationContext): Promise<SmartReply[]> {
    if (!this.aiProvider) {
      return [];
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(context);

    const response = await this.aiProvider.generateCompletion(systemPrompt, userPrompt);
    return this.parseAIResponse(response);
  }

  /**
   * Rule-based fallback suggestions
   */
  private getRuleBasedSuggestions(context: ConversationContext): SmartReply[] {
    const suggestions: SmartReply[] = [];
    const lastMessage = context.recentMessages[context.recentMessages.length - 1];
    const isTheirTurn = lastMessage?.senderId === context.partnerId;

    if (!lastMessage || !isTheirTurn) {
      return this.getConversationStarters(context);
    }

    const messageText = lastMessage.content.toLowerCase();

    // Question detection - suggest answers
    if (messageText.includes('?')) {
      suggestions.push(...this.getQuestionResponses(lastMessage.content, context));
    }

    // Shared interest detection
    if (context.userProfile?.interests && context.partnerProfile?.interests) {
      const sharedInterests = this.findSharedInterests(
        context.userProfile.interests,
        context.partnerProfile.interests
      );
      if (sharedInterests.length > 0) {
        suggestions.push(this.createSharedInterestReply(sharedInterests[0]));
      }
    }

    // Generic engagement boosters
    suggestions.push(...this.getEngagementBoosters(context));

    return suggestions.slice(0, this.MAX_SUGGESTIONS);
  }

  /**
   * Get conversation starters when it's the user's turn
   */
  private getConversationStarters(context: ConversationContext): SmartReply[] {
    const starters: SmartReply[] = [];
    const metrics = context.conversationMetrics;

    // New conversation - use icebreakers
    if (!metrics || metrics.messageCount < 3) {
      starters.push({
        id: this.generateId(),
        text: "Hey! I noticed we have some things in common. What got you into your hobbies?",
        type: SmartReplyType.QUESTION,
        confidence: 0.85,
        tone: ReplyTone.FRIENDLY,
        category: ReplyCategory.OPENER,
      });
      starters.push({
        id: this.generateId(),
        text: "Your profile really stood out to me! How's your week going?",
        type: SmartReplyType.QUICK_RESPONSE,
        confidence: 0.8,
        tone: ReplyTone.ENTHUSIASTIC,
        category: ReplyCategory.OPENER,
      });
    }

    // Stalled conversation - recovery suggestions
    if (metrics && this.isConversationStalled(metrics)) {
      starters.push({
        id: this.generateId(),
        text: "I've been thinking about our chat - would you want to continue over coffee sometime?",
        type: SmartReplyType.DATE_SUGGESTION,
        confidence: 0.7,
        tone: ReplyTone.THOUGHTFUL,
        category: ReplyCategory.RECOVER,
      });
    }

    return starters.slice(0, this.MAX_SUGGESTIONS);
  }

  /**
   * Generate responses to questions
   */
  private getQuestionResponses(question: string, _context: ConversationContext): SmartReply[] {
    const responses: SmartReply[] = [];
    const lowerQuestion = question.toLowerCase();

    // "How are you" type questions
    if (lowerQuestion.includes('how are you') || lowerQuestion.includes("how's it going")) {
      responses.push({
        id: this.generateId(),
        text: "I'm doing great, thanks for asking! How about you?",
        type: SmartReplyType.QUICK_RESPONSE,
        confidence: 0.9,
        tone: ReplyTone.FRIENDLY,
        category: ReplyCategory.FOLLOW_UP,
      });
      responses.push({
        id: this.generateId(),
        text: "Pretty good! Been staying busy. What are you up to?",
        type: SmartReplyType.CONTINUATION,
        confidence: 0.85,
        tone: ReplyTone.CURIOUS,
        category: ReplyCategory.FOLLOW_UP,
      });
    }

    // "What do you do" type questions
    if (lowerQuestion.includes('what do you do') || lowerQuestion.includes('work')) {
      responses.push({
        id: this.generateId(),
        text: "I work in tech - it keeps me busy but I love it! What about you?",
        type: SmartReplyType.QUICK_RESPONSE,
        confidence: 0.85,
        tone: ReplyTone.ENTHUSIASTIC,
        category: ReplyCategory.FOLLOW_UP,
      });
    }

    // Weekend/plans questions
    if (lowerQuestion.includes('weekend') || lowerQuestion.includes('plans')) {
      responses.push({
        id: this.generateId(),
        text: "Nothing concrete yet - I'm open to suggestions!",
        type: SmartReplyType.QUICK_RESPONSE,
        confidence: 0.8,
        tone: ReplyTone.FLIRTY,
        category: ReplyCategory.FOLLOW_UP,
      });
    }

    return responses;
  }

  /**
   * Create a reply based on shared interests
   */
  private createSharedInterestReply(interest: string): SmartReply {
    return {
      id: this.generateId(),
      text: 'I saw you\'re into ' + interest + ' too! What\'s your favorite part about it?',
      type: SmartReplyType.SHARED_INTEREST,
      confidence: 0.9,
      tone: ReplyTone.CURIOUS,
      category: ReplyCategory.KEEP_GOING,
    };
  }

  /**
   * Get generic engagement boosters
   */
  private getEngagementBoosters(context: ConversationContext): SmartReply[] {
    const boosters: SmartReply[] = [];
    const metrics = context.conversationMetrics;

    // If conversation is going well, suggest moving forward
    if (metrics && metrics.engagementScore > 0.7 && metrics.messageCount > 10) {
      boosters.push({
        id: this.generateId(),
        text: "I'm really enjoying our conversation! Would you want to grab a drink sometime?",
        type: SmartReplyType.DATE_SUGGESTION,
        confidence: 0.75,
        tone: ReplyTone.THOUGHTFUL,
        category: ReplyCategory.ASK_OUT,
      });
    }

    // Generic follow-up questions
    boosters.push({
      id: this.generateId(),
      text: "That sounds really interesting! Tell me more?",
      type: SmartReplyType.CONTINUATION,
      confidence: 0.8,
      tone: ReplyTone.CURIOUS,
      category: ReplyCategory.KEEP_GOING,
    });

    return boosters;
  }

  /**
   * Find shared interests between two users
   */
  private findSharedInterests(userInterests: string[], partnerInterests: string[]): string[] {
    const userSet = new Set(userInterests.map(i => i.toLowerCase()));
    return partnerInterests.filter(i => userSet.has(i.toLowerCase()));
  }

  /**
   * Check if conversation has stalled
   */
  private isConversationStalled(metrics: ConversationMetrics): boolean {
    const hoursSinceLastActivity =
      (Date.now() - metrics.lastActivityAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastActivity > 24 && metrics.messageCount > 5;
  }

  /**
   * Build system prompt for AI
   */
  private buildSystemPrompt(): string {
    return 'You are a dating app conversation assistant helping users craft engaging, ' +
      'authentic replies. Your suggestions should be:\n' +
      '- Natural and conversational (not robotic)\n' +
      '- Appropriate for the conversation stage\n' +
      '- Encouraging deeper connection\n' +
      '- Respectful and never inappropriate\n' +
      '- Varied in tone (friendly, curious, flirty when appropriate)\n\n' +
      'Generate exactly 3 reply suggestions in JSON format:\n' +
      '[{"text": "...", "type": "question|compliment|continuation|date_suggestion", ' +
      '"tone": "friendly|flirty|curious|enthusiastic", "confidence": 0.0-1.0}]';
  }

  /**
   * Build user prompt with conversation context
   */
  private buildUserPrompt(context: ConversationContext): string {
    const recentMessagesText = context.recentMessages
      .slice(-5)
      .map(m => (m.senderId === context.userId ? 'User' : 'Match') + ': ' + m.content)
      .join('\n');

    const sharedInterests = context.userProfile?.interests && context.partnerProfile?.interests
      ? this.findSharedInterests(context.userProfile.interests, context.partnerProfile.interests)
      : [];

    return 'Recent conversation:\n' + recentMessagesText + '\n\n' +
      'Shared interests: ' + (sharedInterests.join(', ') || 'Unknown') + '\n' +
      'Conversation stage: ' + this.determineConversationStage(context) + '\n\n' +
      'Generate 3 natural reply suggestions for the user.';
  }

  /**
   * Determine conversation stage
   */
  private determineConversationStage(context: ConversationContext): string {
    const count = context.conversationMetrics?.messageCount || 0;
    if (count < 3) return 'opening';
    if (count < 10) return 'getting_to_know';
    if (count < 25) return 'building_rapport';
    return 'established';
  }

  /**
   * Parse AI response into SmartReply objects
   */
  private parseAIResponse(response: string): SmartReply[] {
    try {
      const parsed = JSON.parse(response);
      if (!Array.isArray(parsed)) return [];

      return parsed.slice(0, this.MAX_SUGGESTIONS).map((item: any) => ({
        id: this.generateId(),
        text: item.text || '',
        type: this.mapReplyType(item.type),
        confidence: Math.min(1, Math.max(0, item.confidence || 0.7)),
        tone: this.mapTone(item.tone),
        category: ReplyCategory.FOLLOW_UP,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Map string to SmartReplyType enum
   */
  private mapReplyType(type: string): SmartReplyType {
    const mapping: Record<string, SmartReplyType> = {
      question: SmartReplyType.QUESTION,
      compliment: SmartReplyType.COMPLIMENT,
      continuation: SmartReplyType.CONTINUATION,
      date_suggestion: SmartReplyType.DATE_SUGGESTION,
      shared_interest: SmartReplyType.SHARED_INTEREST,
    };
    return mapping[type?.toLowerCase()] || SmartReplyType.QUICK_RESPONSE;
  }

  /**
   * Map string to ReplyTone enum
   */
  private mapTone(tone: string): ReplyTone {
    const mapping: Record<string, ReplyTone> = {
      friendly: ReplyTone.FRIENDLY,
      flirty: ReplyTone.FLIRTY,
      curious: ReplyTone.CURIOUS,
      enthusiastic: ReplyTone.ENTHUSIASTIC,
      thoughtful: ReplyTone.THOUGHTFUL,
    };
    return mapping[tone?.toLowerCase()] || ReplyTone.FRIENDLY;
  }

  /**
   * Generate unique ID for suggestions
   */
  private generateId(): string {
    return 'sr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }
}

// Export singleton instance
export const smartReplyService = new SmartReplyService();
export default smartReplyService;
