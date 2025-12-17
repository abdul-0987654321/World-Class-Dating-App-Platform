/**
 * NLP Service Client
 * Connects to the backend nlp-service for text analysis, sentiment, and content moderation
 */

import { API_CONFIG } from '../api/config';
import { httpClient, ApiResponse } from '../api/httpClient';

// Types matching the backend service
export interface SentimentAnalysisRequest {
  text: string;
  context?: 'message' | 'bio' | 'prompt' | 'general';
}

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number; // 0-1
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

export interface ToxicityAnalysisRequest {
  text: string;
  strict_mode?: boolean;
}

export interface ToxicityAnalysisResult {
  is_toxic: boolean;
  overall_score: number; // 0-1
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'warn' | 'block';
  categories: ToxicityCategory[];
  flagged_phrases: FlaggedPhrase[];
  recommendation: string;
}

export interface ToxicityCategory {
  category: 'harassment' | 'hate_speech' | 'sexual_content' | 'profanity' | 'spam' | 'threat' | 'identity_attack' | 'scam';
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
  keywords: ExtractedKeyword[];
  entities: NamedEntity[];
  topics: string[];
}

export interface ExtractedKeyword {
  keyword: string;
  relevance: number;
  frequency: number;
  type: 'noun' | 'verb' | 'adjective' | 'other';
}

export interface NamedEntity {
  text: string;
  type: 'person' | 'location' | 'organization' | 'date' | 'other';
  confidence: number;
}

export interface InterestExtractionResult {
  interests: ExtractedInterest[];
  personality_traits: PersonalityTrait[];
  lifestyle_indicators: string[];
}

export interface ExtractedInterest {
  category: string;
  interest: string;
  confidence: number;
  source_text?: string;
}

export interface PersonalityTrait {
  trait: string;
  score: number;
  indicators: string[];
}

export interface ConversationAnalysisResult {
  engagement_score: number; // 0-100
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

class NLPService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.AI_SERVICES.NLP_SERVICE;
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(request: SentimentAnalysisRequest): Promise<ApiResponse<SentimentAnalysisResult>> {
    return httpClient.post<SentimentAnalysisResult>(
      `${this.baseUrl}/sentiment`,
      request,
      { timeout: API_CONFIG.TIMEOUTS.AI_ANALYSIS }
    );
  }

  /**
   * Check text for toxicity and inappropriate content
   */
  async analyzeToxicity(request: ToxicityAnalysisRequest): Promise<ApiResponse<ToxicityAnalysisResult>> {
    return httpClient.post<ToxicityAnalysisResult>(
      `${this.baseUrl}/toxicity`,
      request,
      { timeout: API_CONFIG.TIMEOUTS.AI_ANALYSIS }
    );
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<ApiResponse<LanguageDetectionResult>> {
    return httpClient.post<LanguageDetectionResult>(
      `${this.baseUrl}/language/detect`,
      { text }
    );
  }

  /**
   * Extract keywords and entities from text
   */
  async extractKeywords(text: string): Promise<ApiResponse<KeywordExtractionResult>> {
    return httpClient.post<KeywordExtractionResult>(
      `${this.baseUrl}/keywords`,
      { text }
    );
  }

  /**
   * Extract interests from profile bio or prompts
   */
  async extractInterests(text: string): Promise<ApiResponse<InterestExtractionResult>> {
    return httpClient.post<InterestExtractionResult>(
      `${this.baseUrl}/interests`,
      { text }
    );
  }

  /**
   * Analyze a conversation for health and engagement
   */
  async analyzeConversation(
    messages: { text: string; sender_id: string; timestamp: string }[]
  ): Promise<ApiResponse<ConversationAnalysisResult>> {
    return httpClient.post<ConversationAnalysisResult>(
      `${this.baseUrl}/conversation/analyze`,
      { messages }
    );
  }

  /**
   * Generate smart reply suggestions
   */
  async generateSmartReplies(
    conversation: { text: string; sender_id: string }[],
    userId: string
  ): Promise<ApiResponse<SmartReplyResult>> {
    return httpClient.post<SmartReplyResult>(
      `${this.baseUrl}/replies/suggest`,
      { conversation, user_id: userId }
    );
  }

  /**
   * Moderate content before posting
   */
  async moderateContent(
    text: string,
    contentType: 'bio' | 'message' | 'prompt' | 'photo_caption'
  ): Promise<ApiResponse<{
    approved: boolean;
    reason?: string;
    modified_text?: string;
    issues: string[];
  }>> {
    return httpClient.post(
      `${this.baseUrl}/moderate`,
      { text, content_type: contentType }
    );
  }

  /**
   * Check if message contains scam indicators
   */
  async detectScam(text: string): Promise<ApiResponse<{
    is_scam: boolean;
    confidence: number;
    indicators: string[];
    scam_type?: string;
  }>> {
    return httpClient.post(
      `${this.baseUrl}/scam/detect`,
      { text }
    );
  }

  /**
   * Generate icebreaker suggestions based on profile
   */
  async generateIcebreakers(
    targetProfileBio: string,
    targetInterests: string[],
    senderInterests: string[]
  ): Promise<ApiResponse<{
    icebreakers: { text: string; type: string; confidence: number }[];
  }>> {
    return httpClient.post(
      `${this.baseUrl}/icebreakers/generate`,
      {
        target_bio: targetProfileBio,
        target_interests: targetInterests,
        sender_interests: senderInterests,
      }
    );
  }

  /**
   * Analyze profile bio quality and get improvement suggestions
   */
  async analyzeBioQuality(bio: string): Promise<ApiResponse<{
    quality_score: number;
    strengths: string[];
    improvements: string[];
    suggested_additions: string[];
    word_count: number;
    readability_score: number;
  }>> {
    return httpClient.post(
      `${this.baseUrl}/bio/analyze`,
      { bio }
    );
  }
}

export const nlpService = new NLPService();
export default NLPService;
