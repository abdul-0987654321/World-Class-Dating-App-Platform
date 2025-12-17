import { IcebreakerCategory } from '../dtos';

/**
 * IcebreakerSuggestion Model
 * Stores generated icebreaker suggestions
 */
export interface IcebreakerSuggestion {
  id: string;
  user_id: string;
  match_user_id: string;
  match_id: string;
  message: string;
  category: IcebreakerCategory;
  tone: string;
  score: number;
  reasoning: string | null;
  is_used: boolean;
  used_at: Date | null;
  expires_at: Date;
  metadata: Record<string, any>;
  created_at: Date;
}

/**
 * SQL Schema for icebreaker_suggestions table
 */
export const createIcebreakerSuggestionsTable = `
CREATE TABLE IF NOT EXISTS icebreaker_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  match_user_id UUID NOT NULL,
  match_id UUID NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  tone VARCHAR(50) NOT NULL,
  score DECIMAL(3,2) DEFAULT 0.5,
  reasoning TEXT,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_icebreaker_user_match ON icebreaker_suggestions(user_id, match_id);
CREATE INDEX IF NOT EXISTS idx_icebreaker_expires_at ON icebreaker_suggestions(expires_at);
CREATE INDEX IF NOT EXISTS idx_icebreaker_is_used ON icebreaker_suggestions(is_used);
CREATE INDEX IF NOT EXISTS idx_icebreaker_score ON icebreaker_suggestions(score DESC);
`;
