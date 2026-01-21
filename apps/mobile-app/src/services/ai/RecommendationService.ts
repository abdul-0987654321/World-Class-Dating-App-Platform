/**
 * Recommendation Service Client
 * Connects to the backend recommendation-service for AI-powered matching
 */

import { API_CONFIG } from '../api/config';
import { httpClient, ApiResponse } from '../api/httpClient';

// Types matching the backend service
export interface RecommendationRequest {
  user_id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  preferences?: UserPreferences;
  filters?: RecommendationFilters;
  limit?: number;
  offset?: number;
  recommendation_type?: 'discovery' | 'top_picks' | 'second_look' | 'boost';
}

export interface UserPreferences {
  age_range?: { min: number; max: number };
  distance_km?: number;
  gender_preference?: string[];
  relationship_goals?: string[];
  interests?: string[];
  deal_breakers?: string[];
  height_range?: { min_cm: number; max_cm: number };
  education_level?: string[];
  has_kids?: 'yes' | 'no' | 'want' | 'dont_want' | 'no_preference';
  smoking?: string[];
  drinking?: string[];
  religion?: string[];
  politics?: string[];
}

export interface RecommendationFilters {
  online_now?: boolean;
  verified_only?: boolean;
  with_bio_only?: boolean;
  min_photos?: number;
  exclude_seen?: boolean;
  exclude_liked?: boolean;
  exclude_passed?: boolean;
}

export interface RecommendationResult {
  recommendations: RecommendedProfile[];
  total_available: number;
  filters_applied: string[];
  next_refresh_at?: string;
}

export interface RecommendedProfile {
  user_id: string;
  compatibility_score: number; // 0-100
  distance_km: number;
  match_reasons: MatchReason[];
  profile_summary: ProfileSummary;
  ranking_factors: RankingFactor[];
  is_boosted?: boolean;
  is_top_pick?: boolean;
}

export interface MatchReason {
  type: 'interest' | 'lifestyle' | 'goal' | 'location' | 'personality' | 'activity';
  description: string;
  shared_item?: string;
  weight: number;
}

export interface ProfileSummary {
  name: string;
  age: number;
  bio_preview: string;
  photos: string[];
  verified: boolean;
  last_active: string;
  interests: string[];
  prompts?: { question: string; answer: string }[];
}

export interface RankingFactor {
  factor: string;
  score: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface CompatibilityResult {
  overall_score: number;
  breakdown: {
    interests: number;
    lifestyle: number;
    goals: number;
    personality: number;
    activity_patterns: number;
  };
  strengths: string[];
  potential_challenges: string[];
  conversation_starters: string[];
}

export interface SwipeFeedback {
  user_id: string;
  target_user_id: string;
  action: 'like' | 'pass' | 'super_like';
  time_spent_seconds?: number;
  photos_viewed?: number;
  source?: 'discovery' | 'top_picks' | 'liked_you' | 'search';
}

export interface UserEmbedding {
  user_id: string;
  embedding: number[];
  last_updated: string;
  version: string;
}

class RecommendationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.AI_SERVICES.RECOMMENDATION;
  }

  /**
   * Get personalized profile recommendations
   */
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<ApiResponse<RecommendationResult>> {
    return httpClient.post<RecommendationResult>(`${this.baseUrl}/recommend`, request, {
      timeout: API_CONFIG.TIMEOUTS.AI_ANALYSIS,
    });
  }

  /**
   * Get top picks (highest compatibility matches)
   */
  async getTopPicks(
    userId: string,
    location: { latitude: number; longitude: number },
    limit: number = 10
  ): Promise<ApiResponse<RecommendationResult>> {
    return httpClient.post<RecommendationResult>(`${this.baseUrl}/top-picks`, {
      user_id: userId,
      location,
      limit,
    });
  }

  /**
   * Calculate compatibility between two users
   */
  async calculateCompatibility(
    userId: string,
    targetUserId: string
  ): Promise<ApiResponse<CompatibilityResult>> {
    return httpClient.post<CompatibilityResult>(`${this.baseUrl}/compatibility`, {
      user_id: userId,
      target_user_id: targetUserId,
    });
  }

  /**
   * Record swipe action for improving recommendations
   */
  async recordSwipeFeedback(feedback: SwipeFeedback): Promise<ApiResponse<{ recorded: boolean }>> {
    return httpClient.post(`${this.baseUrl}/feedback`, feedback);
  }

  /**
   * Update user embedding based on latest profile/activity
   */
  async updateUserEmbedding(
    userId: string
  ): Promise<ApiResponse<{ updated: boolean; version: string }>> {
    return httpClient.post(`${this.baseUrl}/embedding/update`, { user_id: userId });
  }

  /**
   * Get similar profiles to a liked user
   */
  async getSimilarProfiles(
    userId: string,
    likedUserId: string,
    limit: number = 10
  ): Promise<ApiResponse<RecommendedProfile[]>> {
    return httpClient.post<RecommendedProfile[]>(`${this.baseUrl}/similar`, {
      user_id: userId,
      liked_user_id: likedUserId,
      limit,
    });
  }

  /**
   * Get second-look profiles (previously passed)
   */
  async getSecondLook(
    userId: string,
    location: { latitude: number; longitude: number },
    limit: number = 20
  ): Promise<ApiResponse<RecommendationResult>> {
    return httpClient.post<RecommendationResult>(`${this.baseUrl}/second-look`, {
      user_id: userId,
      location,
      limit,
    });
  }

  /**
   * Get profiles who liked the user
   */
  async getLikedYou(
    userId: string,
    limit: number = 50,
    blurred: boolean = true
  ): Promise<
    ApiResponse<{
      profiles: RecommendedProfile[];
      total_count: number;
      requires_premium: boolean;
    }>
  > {
    return httpClient.get(`${this.baseUrl}/liked-you/${userId}?limit=${limit}&blurred=${blurred}`);
  }

  /**
   * Refresh recommendations (force recalculation)
   */
  async refreshRecommendations(
    userId: string
  ): Promise<ApiResponse<{ refreshed: boolean; available_at: string }>> {
    return httpClient.post(`${this.baseUrl}/refresh`, { user_id: userId });
  }

  /**
   * Get recommendation statistics for user
   */
  async getRecommendationStats(userId: string): Promise<
    ApiResponse<{
      total_shown: number;
      total_liked: number;
      total_passed: number;
      match_rate: number;
      avg_compatibility: number;
      top_matched_interests: string[];
      recommendation_quality_score: number;
    }>
  > {
    return httpClient.get(`${this.baseUrl}/stats/${userId}`);
  }

  /**
   * Get explanation for why a profile was recommended
   */
  async getRecommendationExplanation(
    userId: string,
    targetUserId: string
  ): Promise<
    ApiResponse<{
      reasons: MatchReason[];
      compatibility_breakdown: Record<string, number>;
      common_interests: string[];
      similar_traits: string[];
    }>
  > {
    return httpClient.get(`${this.baseUrl}/explain/${userId}/${targetUserId}`);
  }

  /**
   * Get boost recommendations (profiles with higher visibility)
   */
  async getBoostRecommendations(
    userId: string,
    location: { latitude: number; longitude: number },
    boostId: string
  ): Promise<ApiResponse<RecommendationResult>> {
    return httpClient.post<RecommendationResult>(`${this.baseUrl}/boost-recommendations`, {
      user_id: userId,
      location,
      boost_id: boostId,
    });
  }

  /**
   * Batch score profiles for quick filtering
   */
  async batchScoreProfiles(
    userId: string,
    targetUserIds: string[]
  ): Promise<ApiResponse<{ scores: Record<string, number> }>> {
    return httpClient.post(`${this.baseUrl}/batch-score`, {
      user_id: userId,
      target_user_ids: targetUserIds,
    });
  }
}

export const recommendationService = new RecommendationService();
export default RecommendationService;
