import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { createLogger } from '@flamoral/backend-shared';
import { GenerateReplyDto, ReplyAssistantResponseDto, ReplySuggestionDto } from '../dtos';
import config from '../config';
import { ServiceClient } from './service-client';

const logger = createLogger('automation-service:reply-assistant');

/**
 * Reply Assistant Service
 * Provides AI-powered reply suggestions for conversations
 */
export class ReplyAssistantService {
  private openai: OpenAI;
  private userServiceClient: ServiceClient;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.userServiceClient = new ServiceClient({
      baseURL: config.services.user,
      serviceName: 'automation-service',
    });
  }

  /**
   * Generate reply suggestions
   */
  async generateReplies(dto: GenerateReplyDto): Promise<ReplyAssistantResponseDto> {
    try {
      // Get user profile for context
      const user = await this.getUserProfile(dto.userId);

      // Analyze conversation context
      const context = this.analyzeConversation(dto.messageHistory);

      // Generate replies using AI
      const suggestions = await this.generateWithAI(dto, user, context);

      return {
        suggestions,
        conversationContext: context,
        generatedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate replies using OpenAI
   */
  private async generateWithAI(
    dto: GenerateReplyDto,
    user: any,
    context: any
  ): Promise<ReplySuggestionDto[]> {
    // Build conversation history for context
    const conversationText = dto.messageHistory
      .slice(-5) // Last 5 messages for context
      .map((msg) => {
        const role = msg.senderId === dto.userId ? 'You' : 'Match';
        return `${role}: ${msg.content}`;
      })
      .join('\n');

    const prompt = `You are a dating coach helping craft thoughtful replies. Generate 3 different reply options for the following conversation.

User profile: ${user.firstName}, interests: ${user.interests?.join(', ') || 'not specified'}
Conversation tone: ${dto.tone || 'casual'}
Max length: ${dto.maxLength || 200} characters
${dto.includeEmoji ? 'Include relevant emojis' : 'No emojis'}

Recent conversation:
${conversationText}

Generate 3 varied replies with different approaches:
1. A thoughtful/engaging response
2. A playful/light-hearted response
3. A question to keep the conversation flowing

Format as JSON array with: message, tone, score (0-1), sentiment (positive/neutral/negative), reasoning.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 400,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const aiSuggestions = JSON.parse(content);

      return aiSuggestions.map((s: any) => ({
        id: uuidv4(),
        message: s.message,
        tone: s.tone || dto.tone || 'casual',
        score: s.score || 0.7,
        sentiment: s.sentiment || 'positive',
        reasoning: s.reasoning,
      }));
    } catch (error: any) {
      logger.error('AI generation failed', { error: error.message });

      // Fallback suggestions
      return this.generateFallbackReplies(dto, context);
    }
  }

  /**
   * Analyze conversation for context
   */
  private analyzeConversation(messages: any[]): any {
    if (messages.length === 0) {
      return {
        sentiment: 'neutral',
        topics: [],
        engagementScore: 0.5,
      };
    }

    // Simple sentiment analysis based on message patterns
    const recentMessages = messages.slice(-10);
    const averageLength = recentMessages.reduce((sum, msg) => sum + msg.content.length, 0) / recentMessages.length;

    // Extract potential topics (simple keyword extraction)
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    const commonWords = ['love', 'like', 'enjoy', 'travel', 'music', 'food', 'work', 'hobby'];
    const topics = commonWords.filter(word => allText.includes(word));

    return {
      sentiment: averageLength > 50 ? 'positive' : 'neutral',
      topics: topics.slice(0, 5),
      engagementScore: Math.min(averageLength / 100, 1.0),
    };
  }

  /**
   * Fallback reply generation
   */
  private generateFallbackReplies(dto: GenerateReplyDto, context: any): ReplySuggestionDto[] {
    return [
      {
        id: uuidv4(),
        message: "That's really interesting! Tell me more about that.",
        tone: 'friendly',
        score: 0.6,
        sentiment: 'positive',
        reasoning: 'Encouraging response',
      },
      {
        id: uuidv4(),
        message: "I can relate to that! What do you enjoy most about it?",
        tone: 'casual',
        score: 0.65,
        sentiment: 'positive',
        reasoning: 'Builds connection',
      },
      {
        id: uuidv4(),
        message: "Sounds like fun! Have you been doing it for long?",
        tone: 'playful',
        score: 0.7,
        sentiment: 'positive',
        reasoning: 'Keeps conversation flowing',
      },
    ];
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<any> {
    const response = await this.userServiceClient.get(`/api/internal/users/${userId}`);
    return response.data;
  }
}
