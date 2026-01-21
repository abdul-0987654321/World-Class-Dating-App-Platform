/**
 * NLP Service
 * Web client for NLP/text analysis AI service
 */

import { apiClient } from '../api.client';
import { AI_CONFIG } from './config';

// Types
export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotions: EmotionScore[];
  intensity: 'low' | 'moderate' | 'high';
}

export interface EmotionScore {
  emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'love' | 'excitement' | 'anxiety';
  score: number;
  confidence: number;
}

export interface ToxicityAnalysisResult {
  is_toxic: boolean;
  overall_score: number;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'warn' | 'block';
  categories: ToxicityCategory[];
  flagged_phrases: FlaggedPhrase[];
  recommendation: string;
}

export interface ToxicityCategory {
  category:
    | 'harassment'
    | 'hate_speech'
    | 'sexual_content'
    | 'profanity'
    | 'spam'
    | 'threat'
    | 'identity_attack'
    | 'scam';
  score: number;
  confidence: number;
  matched_patterns?: string[];
}

export interface FlaggedPhrase {
  phrase: string;
  category: string;
  severity: string;
  start_index: number;
  end_index: number;
}

export interface LanguageDetectionResult {
  primary_language: string;
  language_code: string;
  confidence: number;
  all_languages: { code: string; name: string; confidence: number }[];
}

export interface KeywordExtractionResult {
  keywords: { keyword: string; relevance: number; frequency: number; type: string }[];
  entities: { text: string; type: string; confidence: number }[];
  topics: string[];
}

export interface InterestExtractionResult {
  interests: { category: string; interest: string; confidence: number }[];
  personality_traits: { trait: string; score: number; indicators: string[] }[];
  lifestyle_indicators: string[];
}

export interface ConversationAnalysisResult {
  engagement_score: number;
  response_quality: 'poor' | 'fair' | 'good' | 'excellent';
  conversation_health: 'dying' | 'stale' | 'neutral' | 'flowing' | 'thriving';
  sentiment_trend: 'declining' | 'stable' | 'improving';
  red_flags: string[];
  suggestions: string[];
}

export interface SmartReplyResult {
  replies: SuggestedReply[];
  context_understood: string;
}

export interface SuggestedReply {
  text: string;
  tone: 'friendly' | 'flirty' | 'curious' | 'humorous' | 'sincere';
  confidence: number;
}

export interface ContentModerationResult {
  approved: boolean;
  reason?: string;
  modified_text?: string;
  issues: string[];
}

export interface ScamDetectionResult {
  is_scam: boolean;
  confidence: number;
  indicators: string[];
  scam_type?: string;
}

export interface IcebreakerResult {
  icebreakers: { text: string; type: string; confidence: number }[];
}

export interface BioAnalysisResult {
  quality_score: number;
  strengths: string[];
  improvements: string[];
  suggested_additions: string[];
  word_count: number;
  readability_score: number;
}

class NLPService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = AI_CONFIG.NLP_SERVICE_URL;
  }

  async analyzeSentiment(
    text: string,
    context?: 'message' | 'bio' | 'prompt' | 'general'
  ): Promise<SentimentAnalysisResult> {
    return apiClient.post<SentimentAnalysisResult>(`${this.baseUrl}/sentiment`, { text, context });
  }

  async analyzeToxicity(text: string, strictMode?: boolean): Promise<ToxicityAnalysisResult> {
    return apiClient.post<ToxicityAnalysisResult>(`${this.baseUrl}/toxicity`, {
      text,
      strict_mode: strictMode,
    });
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    return apiClient.post<LanguageDetectionResult>(`${this.baseUrl}/language/detect`, { text });
  }

  async extractKeywords(text: string): Promise<KeywordExtractionResult> {
    return apiClient.post<KeywordExtractionResult>(`${this.baseUrl}/keywords`, { text });
  }

  async extractInterests(text: string): Promise<InterestExtractionResult> {
    return apiClient.post<InterestExtractionResult>(`${this.baseUrl}/interests`, { text });
  }

  async analyzeConversation(
    messages: { text: string; sender_id: string; timestamp: string }[]
  ): Promise<ConversationAnalysisResult> {
    return apiClient.post<ConversationAnalysisResult>(`${this.baseUrl}/conversation/analyze`, {
      messages,
    });
  }

  async generateSmartReplies(
    conversation: { text: string; sender_id: string }[],
    userId: string
  ): Promise<SmartReplyResult> {
    return apiClient.post<SmartReplyResult>(`${this.baseUrl}/replies/suggest`, {
      conversation,
      user_id: userId,
    });
  }

  async moderateContent(
    text: string,
    contentType: 'bio' | 'message' | 'prompt' | 'photo_caption'
  ): Promise<ContentModerationResult> {
    return apiClient.post<ContentModerationResult>(`${this.baseUrl}/moderate`, {
      text,
      content_type: contentType,
    });
  }

  async detectScam(text: string): Promise<ScamDetectionResult> {
    return apiClient.post<ScamDetectionResult>(`${this.baseUrl}/scam/detect`, { text });
  }

  async generateIcebreakers(
    targetProfileBio: string,
    targetInterests: string[],
    senderInterests: string[]
  ): Promise<IcebreakerResult> {
    return apiClient.post<IcebreakerResult>(`${this.baseUrl}/icebreakers/generate`, {
      target_bio: targetProfileBio,
      target_interests: targetInterests,
      sender_interests: senderInterests,
    });
  }

  async analyzeBioQuality(bio: string): Promise<BioAnalysisResult> {
    return apiClient.post<BioAnalysisResult>(`${this.baseUrl}/bio/analyze`, { bio });
  }
}

export const nlpService = new NLPService();
export default nlpService;
