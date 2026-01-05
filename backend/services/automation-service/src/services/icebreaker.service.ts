import { createLogger } from '@flamoral/backend-shared';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

import config from '../config';
import {
  GenerateIcebreakerDto,
  IcebreakerResponseDto,
  IcebreakerSuggestionDto,
  IcebreakerCategory,
} from '../dtos';
import { cache } from '../infrastructure/cache/redis';
import db from '../infrastructure/database/knex';
import { TABLES, IcebreakerSuggestion } from '../models';

import { ServiceClient } from './service-client';

const logger = createLogger('automation-service:icebreaker');

/**
 * Icebreaker Service
 * Generates AI-powered icebreaker messages for new matches
 */
export class IcebreakerService {
  private openai: OpenAI;
  private userServiceClient: ServiceClient;
  private matchingServiceClient: ServiceClient;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.userServiceClient = new ServiceClient({
      baseURL: config.services.user,
      serviceName: 'automation-service',
    });
    this.matchingServiceClient = new ServiceClient({
      baseURL: config.services.matching,
      serviceName: 'automation-service',
    });
  }

  /**
   * Generate icebreaker suggestions for a match
   */
  async generateIcebreakers(dto: GenerateIcebreakerDto): Promise<IcebreakerResponseDto> {
    try {
      // Check cache first
      const cacheKey = `icebreaker:${dto.userId}:${dto.matchUserId}`;
      const cached = await cache.get<IcebreakerResponseDto>(cacheKey);
      if (cached && new Date(cached.expiresAt) > new Date()) {
        return cached;
      }

      // Fetch user profiles
      const [user, matchUser] = await Promise.all([
        this.getUserProfile(dto.userId),
        this.getUserProfile(dto.matchUserId),
      ]);

      // Fetch match details
      const match = await this.getMatchDetails(dto.matchId);

      // Generate suggestions using AI
      const suggestions = await this.generateWithAI(dto, user, matchUser, match);

      // Store suggestions in database
      const expiresAt = new Date(Date.now() + config.icebreaker.cacheTtlHours * 60 * 60 * 1000);

      for (const suggestion of suggestions) {
        await this.storeSuggestion({
          id: suggestion.id,
          user_id: dto.userId,
          match_user_id: dto.matchUserId,
          match_id: dto.matchId,
          message: suggestion.message,
          category: suggestion.category,
          tone: dto.tone || 'casual',
          score: suggestion.score,
          reasoning: suggestion.reasoning || null,
          is_used: false,
          used_at: null,
          expires_at: expiresAt,
          metadata: {},
          created_at: new Date(),
        });
      }

      const response: IcebreakerResponseDto = {
        suggestions,
        generatedAt: new Date(),
        expiresAt,
        metadata: {
          matchScore: match.matchScore,
          sharedInterests: this.findSharedInterests(user, matchUser),
        },
      };

      // Cache the response
      await cache.set(cacheKey, response, config.icebreaker.cacheTtlHours * 3600);

      return response;
    } catch (error: any) {
      logger.error('Generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate icebreakers using OpenAI
   */
  private async generateWithAI(
    dto: GenerateIcebreakerDto,
    user: any,
    matchUser: any,
    match: any
  ): Promise<IcebreakerSuggestionDto[]> {
    const sharedInterests = this.findSharedInterests(user, matchUser);

    const prompt = `You are a dating coach helping create personalized icebreaker messages. Generate 3 unique, engaging icebreaker messages for a dating app conversation.

User 1 (sender): ${user.firstName}, ${user.age} years old, interests: ${user.interests?.join(', ') || 'not specified'}
User 2 (recipient): ${matchUser.firstName}, ${matchUser.age} years old, interests: ${matchUser.interests?.join(', ') || 'not specified'}, bio: ${matchUser.bio || 'not specified'}
Shared interests: ${sharedInterests.join(', ') || 'none identified'}

Requirements:
- Tone: ${dto.tone || 'casual'}
- Length: ${config.icebreaker.minLength}-${config.icebreaker.maxLength} characters
- ${dto.includeEmoji ? 'Include relevant emojis' : 'No emojis'}
- Personalized based on profile information
- Natural and conversational
- Each message should have a different category: question, compliment, or observation

Format your response as a JSON array of objects with: message, category (question/compliment/observation), score (0-1), reasoning.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      // Parse AI response
      const aiSuggestions = JSON.parse(content);

      return aiSuggestions.map((s: any) => ({
        id: uuidv4(),
        message: s.message,
        category: s.category as IcebreakerCategory,
        tone: dto.tone || 'casual',
        score: s.score || 0.7,
        reasoning: s.reasoning,
      }));
    } catch (error: any) {
      logger.error('AI generation failed', { error: error.message });

      // Fallback to template-based suggestions
      return this.generateTemplateSuggestions(dto, user, matchUser, sharedInterests);
    }
  }

  /**
   * Fallback template-based suggestions
   */
  private generateTemplateSuggestions(
    dto: GenerateIcebreakerDto,
    user: any,
    matchUser: any,
    sharedInterests: string[]
  ): IcebreakerSuggestionDto[] {
    const suggestions: IcebreakerSuggestionDto[] = [];

    if (sharedInterests.length > 0) {
      const interest = sharedInterests[0];
      suggestions.push({
        id: uuidv4(),
        message: `I noticed we both love ${interest}! What got you into it?`,
        category: IcebreakerCategory.QUESTION,
        tone: 'casual',
        score: 0.8,
        reasoning: 'Based on shared interest',
      });
    }

    if (matchUser.bio) {
      suggestions.push({
        id: uuidv4(),
        message: `Your bio made me smile! Tell me more about your adventures.`,
        category: IcebreakerCategory.OBSERVATION,
        tone: 'friendly',
        score: 0.7,
        reasoning: 'Based on bio content',
      });
    }

    suggestions.push({
      id: uuidv4(),
      message: `Hey ${matchUser.firstName}! What's the best thing that happened to you this week?`,
      category: IcebreakerCategory.QUESTION,
      tone: 'casual',
      score: 0.6,
      reasoning: 'Generic engaging question',
    });

    return suggestions;
  }

  /**
   * Find shared interests between users
   */
  private findSharedInterests(user: any, matchUser: any): string[] {
    const userInterests = user.interests || [];
    const matchInterests = matchUser.interests || [];

    return userInterests.filter((interest: string) =>
      matchInterests.some((mi: string) => mi.toLowerCase() === interest.toLowerCase())
    );
  }

  /**
   * Mark icebreaker as used
   */
  async markAsUsed(suggestionId: string): Promise<void> {
    await db(TABLES.ICEBREAKER_SUGGESTIONS).where({ id: suggestionId }).update({
      is_used: true,
      used_at: new Date(),
    });
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<any> {
    const response = await this.userServiceClient.get(`/api/internal/users/${userId}`);
    return response.data;
  }

  /**
   * Get match details
   */
  private async getMatchDetails(matchId: string): Promise<any> {
    const response = await this.matchingServiceClient.get(`/api/internal/matches/${matchId}`);
    return response.data;
  }

  /**
   * Store suggestion in database
   */
  private async storeSuggestion(suggestion: IcebreakerSuggestion): Promise<void> {
    await db(TABLES.ICEBREAKER_SUGGESTIONS).insert(suggestion);
  }
}
