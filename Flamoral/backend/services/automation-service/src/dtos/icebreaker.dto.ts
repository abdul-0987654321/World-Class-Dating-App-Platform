/**
 * DTOs for Icebreaker Suggestions
 */

export enum IcebreakerCategory {
  QUESTION = 'question',
  COMPLIMENT = 'compliment',
  OBSERVATION = 'observation',
  HUMOR = 'humor',
  SHARED_INTEREST = 'shared_interest',
  CREATIVE = 'creative',
}

export interface GenerateIcebreakerDto {
  userId: string;
  matchUserId: string;
  matchId: string;
  category?: IcebreakerCategory;
  tone?: 'casual' | 'formal' | 'playful' | 'romantic' | 'friendly';
  includeEmoji?: boolean;
  maxLength?: number;
}

export interface IcebreakerSuggestionDto {
  id: string;
  message: string;
  category: IcebreakerCategory;
  tone: string;
  score: number;
  reasoning?: string;
}

export interface IcebreakerResponseDto {
  suggestions: IcebreakerSuggestionDto[];
  generatedAt: Date;
  expiresAt: Date;
  metadata: {
    matchScore?: number;
    sharedInterests: string[];
    conversationContext?: string;
  };
}

export interface SendIcebreakerDto {
  userId: string;
  matchId: string;
  conversationId: string;
  message: string;
  suggestionId?: string;
}
