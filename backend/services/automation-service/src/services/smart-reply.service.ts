import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { cache } from '../infrastructure/cache/redis';
import config from '../config';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('automation-service:smart-reply');

export interface SmartReplySuggestion {
  id: string;
  text: string;
  tone: 'casual' | 'flirty' | 'friendly' | 'formal' | 'playful';
  confidence: number;
  category: 'question' | 'statement' | 'compliment' | 'followup';
}

export interface ConversationStarter {
  id: string;
  text: string;
  category: 'interest_based' | 'profile_based' | 'generic' | 'question';
  relevanceScore: number;
  context?: string;
}

/**
 * Smart Reply Service
 * Generates intelligent reply suggestions and conversation starters using AI
 */
export class SmartReplyService {
  private nlpServiceUrl: string;

  constructor() {
    this.nlpServiceUrl = config.services.ai;
  }

  /**
   * Generate smart reply suggestions based on conversation context
   */
  async generateSmartReplies(
    userId: string,
    conversationId: string,
    lastMessage: string,
    conversationHistory: any[]
  ): Promise<SmartReplySuggestion[]> {
    try {
      // Check cache first
      const cacheKey = `smart_reply:${conversationId}:${lastMessage.slice(0, 50)}`;
      const cached = await cache.get<SmartReplySuggestion[]>(cacheKey);
      if (cached) {
        logger.debug('Returning cached smart replies', { conversationId });
        return cached;
      }

      // Call NLP service for reply suggestions
      const response = await axios.post(
        `${this.nlpServiceUrl}/api/v1/message-assistant/reply-suggestions`,
        {
          conversationHistory: conversationHistory.map((msg: any) => ({
            text: msg.content,
            sender: msg.senderId === userId ? 'user' : 'other',
            timestamp: msg.createdAt,
          })),
          tone: await this.detectUserTone(userId, conversationHistory),
          count: 3,
        },
        {
          headers: {
            'X-Service-API-Key': config.serviceAuth.apiKey,
          },
          timeout: 10000,
        }
      );

      const aiSuggestions = response.data.suggestions || [];

      // Transform AI suggestions to our format
      const suggestions: SmartReplySuggestion[] = aiSuggestions.map(
        (suggestion: string, index: number) => ({
          id: uuidv4(),
          text: suggestion,
          tone: this.inferTone(suggestion),
          confidence: 0.9 - index * 0.1,
          category: this.categorizeReply(suggestion),
        })
      );

      // Cache for 5 minutes
      await cache.set(cacheKey, suggestions, 300);

      logger.info('Smart replies generated', {
        userId,
        conversationId,
        count: suggestions.length,
      });

      return suggestions;
    } catch (error: any) {
      logger.error('Failed to generate smart replies', {
        userId,
        conversationId,
        error: error.message,
      });

      // Return fallback suggestions
      return this.getFallbackReplies(lastMessage);
    }
  }

  /**
   * Generate conversation starters based on profile compatibility
   */
  async generateConversationStarters(
    userId: string,
    matchUserId: string,
    matchId: string
  ): Promise<ConversationStarter[]> {
    try {
      // Check cache
      const cacheKey = `conversation_starters:${userId}:${matchUserId}`;
      const cached = await cache.get<ConversationStarter[]>(cacheKey);
      if (cached) {
        logger.debug('Returning cached conversation starters', {
          userId,
          matchUserId,
        });
        return cached;
      }

      // Get user profiles
      const [userProfile, matchProfile] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserProfile(matchUserId),
      ]);

      // Call NLP service for conversation starters
      const response = await axios.post(
        `${this.nlpServiceUrl}/api/v1/message-assistant/conversation-starters`,
        {
          recipientProfile: {
            name: matchProfile.firstName,
            age: matchProfile.age,
            bio: matchProfile.bio,
            interests: matchProfile.interests,
          },
          senderProfile: {
            name: userProfile.firstName,
            interests: userProfile.interests,
          },
          count: 5,
          tone: userProfile.messagingPreferences?.tone || 'casual',
        },
        {
          headers: {
            'X-Service-API-Key': config.serviceAuth.apiKey,
          },
          timeout: 10000,
        }
      );

      const aiStarters = response.data.conversation_starters || [];

      // Transform to our format
      const starters: ConversationStarter[] = aiStarters.map(
        (starter: string, index: number) => ({
          id: uuidv4(),
          text: starter,
          category: this.categorizeStarter(starter, userProfile, matchProfile),
          relevanceScore: 0.95 - index * 0.05,
          context: this.extractContext(starter, matchProfile),
        })
      );

      // Cache for 1 hour
      await cache.set(cacheKey, starters, 3600);

      logger.info('Conversation starters generated', {
        userId,
        matchUserId,
        count: starters.length,
      });

      return starters;
    } catch (error: any) {
      logger.error('Failed to generate conversation starters', {
        userId,
        matchUserId,
        error: error.message,
      });

      // Return generic starters
      return this.getGenericStarters();
    }
  }

  /**
   * Analyze message and suggest improvements
   */
  async analyzeMessage(
    userId: string,
    message: string
  ): Promise<{
    score: number;
    suggestions: string[];
    improvedVersions: string[];
    analysis: any;
  }> {
    try {
      const response = await axios.post(
        `${this.nlpServiceUrl}/api/v1/message-assistant/analyze-effectiveness`,
        {
          message,
        },
        {
          headers: {
            'X-Service-API-Key': config.serviceAuth.apiKey,
          },
          timeout: 10000,
        }
      );

      const analysis = response.data;

      logger.info('Message analyzed', {
        userId,
        score: analysis.overall_score,
      });

      return {
        score: analysis.overall_score,
        suggestions: analysis.suggestions || [],
        improvedVersions: analysis.improved_versions || [],
        analysis: analysis.analysis,
      };
    } catch (error: any) {
      logger.error('Failed to analyze message', {
        userId,
        error: error.message,
      });

      return {
        score: 0.7,
        suggestions: ['Consider adding a question to encourage conversation'],
        improvedVersions: [],
        analysis: {},
      };
    }
  }

  /**
   * Rewrite message in different tone
   */
  async rewriteMessage(
    userId: string,
    message: string,
    targetTone: 'casual' | 'flirty' | 'friendly' | 'formal' | 'playful'
  ): Promise<string[]> {
    try {
      const response = await axios.post(
        `${this.nlpServiceUrl}/api/v1/message-assistant/rewrite`,
        {
          originalMessage: message,
          targetStyle: targetTone,
          preserveMeaning: true,
        },
        {
          headers: {
            'X-Service-API-Key': config.serviceAuth.apiKey,
          },
          timeout: 10000,
        }
      );

      const rewrites = response.data.rewrites || [];

      logger.info('Message rewritten', {
        userId,
        targetTone,
        count: rewrites.length,
      });

      return rewrites;
    } catch (error: any) {
      logger.error('Failed to rewrite message', {
        userId,
        error: error.message,
      });

      return [message]; // Return original if rewrite fails
    }
  }

  /**
   * Detect user's preferred tone from conversation history
   */
  private async detectUserTone(
    userId: string,
    conversationHistory: any[]
  ): Promise<string> {
    try {
      // Get user preferences from cache
      const cacheKey = `user:${userId}:tone_preference`;
      const cached = await cache.get<string>(cacheKey);
      if (cached) {
        return cached;
      }

      // Analyze recent messages to detect tone
      const userMessages = conversationHistory
        .filter((msg) => msg.senderId === userId)
        .slice(-5);

      if (userMessages.length === 0) {
        return 'casual';
      }

      // Simple heuristic-based detection
      const combinedText = userMessages.map((msg) => msg.content).join(' ');
      const tone = this.inferTone(combinedText);

      // Cache for 1 hour
      await cache.set(cacheKey, tone, 3600);

      return tone;
    } catch (error: any) {
      logger.warn('Failed to detect user tone', { error: error.message });
      return 'casual';
    }
  }

  /**
   * Infer tone from text
   */
  private inferTone(text: string): 'casual' | 'flirty' | 'friendly' | 'formal' | 'playful' {
    const lower = text.toLowerCase();

    // Flirty indicators
    if (
      lower.includes('😘') ||
      lower.includes('😍') ||
      lower.includes('cute') ||
      lower.includes('gorgeous')
    ) {
      return 'flirty';
    }

    // Playful indicators
    if (
      lower.includes('😄') ||
      lower.includes('😂') ||
      lower.includes('haha') ||
      lower.includes('lol')
    ) {
      return 'playful';
    }

    // Formal indicators
    if (
      lower.includes('pleased') ||
      lower.includes('delighted') ||
      lower.includes('appreciate')
    ) {
      return 'formal';
    }

    // Friendly indicators
    if (lower.includes('hey') || lower.includes('hi') || lower.includes('hello')) {
      return 'friendly';
    }

    return 'casual';
  }

  /**
   * Categorize reply type
   */
  private categorizeReply(
    text: string
  ): 'question' | 'statement' | 'compliment' | 'followup' {
    if (text.includes('?')) {
      return 'question';
    }

    const lower = text.toLowerCase();
    if (
      lower.includes('love') ||
      lower.includes('great') ||
      lower.includes('amazing') ||
      lower.includes('awesome')
    ) {
      return 'compliment';
    }

    if (lower.includes('tell me') || lower.includes('more about')) {
      return 'followup';
    }

    return 'statement';
  }

  /**
   * Categorize conversation starter
   */
  private categorizeStarter(
    text: string,
    userProfile: any,
    matchProfile: any
  ): 'interest_based' | 'profile_based' | 'generic' | 'question' {
    const lower = text.toLowerCase();

    // Check if mentions interests
    const interests = [...(userProfile.interests || []), ...(matchProfile.interests || [])];
    if (interests.some((interest: string) => lower.includes(interest.toLowerCase()))) {
      return 'interest_based';
    }

    // Check if mentions profile details
    if (lower.includes('bio') || lower.includes('profile')) {
      return 'profile_based';
    }

    // Check if it's a question
    if (text.includes('?')) {
      return 'question';
    }

    return 'generic';
  }

  /**
   * Extract context from starter
   */
  private extractContext(text: string, profile: any): string {
    const lower = text.toLowerCase();

    // Check for interest mentions
    const interests = profile.interests || [];
    const mentionedInterest = interests.find((interest: string) =>
      lower.includes(interest.toLowerCase())
    );

    if (mentionedInterest) {
      return `Based on shared interest: ${mentionedInterest}`;
    }

    return 'Generic conversation starter';
  }

  /**
   * Get fallback reply suggestions
   */
  private getFallbackReplies(lastMessage: string): SmartReplySuggestion[] {
    return [
      {
        id: uuidv4(),
        text: "That's interesting! Tell me more about that.",
        tone: 'friendly',
        confidence: 0.7,
        category: 'followup',
      },
      {
        id: uuidv4(),
        text: 'I know what you mean! What else do you enjoy?',
        tone: 'casual',
        confidence: 0.6,
        category: 'question',
      },
      {
        id: uuidv4(),
        text: "That sounds really cool! I'd love to hear more.",
        tone: 'playful',
        confidence: 0.5,
        category: 'statement',
      },
    ];
  }

  /**
   * Get generic conversation starters
   */
  private getGenericStarters(): ConversationStarter[] {
    return [
      {
        id: uuidv4(),
        text: "Hey! I noticed we matched. How's your day going?",
        category: 'generic',
        relevanceScore: 0.6,
      },
      {
        id: uuidv4(),
        text: 'Hi there! Your profile caught my eye. What do you like to do for fun?',
        category: 'question',
        relevanceScore: 0.65,
      },
      {
        id: uuidv4(),
        text: "Hey! I'd love to get to know you better. What brings you to the app?",
        category: 'question',
        relevanceScore: 0.7,
      },
    ];
  }

  /**
   * Get user profile from user service
   */
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${config.services.user}/api/internal/users/${userId}`,
        {
          headers: {
            'X-Service-API-Key': config.serviceAuth.apiKey,
          },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get user profile', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }
}
