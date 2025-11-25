/**
 * Recommendation Service
 * Web client for AI-powered matching and recommendations
 */

import { apiClient } from '../api.client';
import { AI_CONFIG } from './config';

// Types
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
  compatibility_score: number;
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

export interface RecommendationStats {
  total_shown: number;
  total_liked: number;
  total_passed: number;
  match_rate: number;
  avg_compatibility: number;
  top_matched_interests: string[];
  recommendation_quality_score: number;
}

export interface LikedYouResult {
  profiles: RecommendedProfile[];
  total_count: number;
  requires_premium: boolean;
}

class RecommendationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = AI_CONFIG.RECOMMENDATION_URL;
  }

  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    return apiClient.post<RecommendationResult>(`${this.baseUrl}/recommend`, request);
  }

  async getTopPicks(
    userId: string,
    location: { latitude: number; longitude: number },
    limit: number = 10
  ): Promise<RecommendationResult> {
    return apiClient.post<RecommendationResult>(`${this.baseUrl}/top-picks`, {
      user_id: userId,
      location,
      limit,
    });
  }

  async calculateCompatibility(
    userId: string,
    targetUserId: string
  ): Promise<CompatibilityResult> {
    return apiClient.post<CompatibilityResult>(`${this.baseUrl}/compatibility`, {
      user_id: userId,
      target_user_id: targetUserId,
    });
  }

  async recordSwipeFeedback(feedback: SwipeFeedback): Promise<{ recorded: boolean }> {
    return apiClient.post(`${this.baseUrl}/feedback`, feedback);
  }

  async updateUserEmbedding(userId: string): Promise<{ updated: boolean; version: string }> {
    return apiClient.post(`${this.baseUrl}/embedding/update`, { user_id: userId });
  }

  async getSimilarProfiles(
    userId: string,
    likedUserId: string,
    limit: number = 10
  ): Promise<RecommendedProfile[]> {
    return apiClient.post<RecommendedProfile[]>(`${this.baseUrl}/similar`, {
      user_id: userId,
      liked_user_id: likedUserId,
      limit,
    });
  }

  async getSecondLook(
    userId: string,
    location: { latitude: number; longitude: number },
    limit: number = 20
  ): Promise<RecommendationResult> {
    return apiClient.post<RecommendationResult>(`${this.baseUrl}/second-look`, {
      user_id: userId,
      location,
      limit,
    });
  }

  async getLikedYou(
    userId: string,
    limit: number = 50,
    blurred: boolean = true
  ): Promise<LikedYouResult> {
    return apiClient.get<LikedYouResult>(
      `${this.baseUrl}/liked-you/${userId}?limit=${limit}&blurred=${blurred}`
    );
  }

  async refreshRecommendations(
    userId: string
  ): Promise<{ refreshed: boolean; available_at: string }> {
    return apiClient.post(`${this.baseUrl}/refresh`, { user_id: userId });
  }

  async getRecommendationStats(userId: string): Promise<RecommendationStats> {
    return apiClient.get<RecommendationStats>(`${this.baseUrl}/stats/${userId}`);
  }

  async getRecommendationExplanation(
    userId: string,
    targetUserId: string
  ): Promise<{
    reasons: MatchReason[];
    compatibility_breakdown: Record<string, number>;
    common_interests: string[];
    similar_traits: string[];
  }> {
    return apiClient.get(`${this.baseUrl}/explain/${userId}/${targetUserId}`);
  }

  async getBoostRecommendations(
    userId: string,
    location: { latitude: number; longitude: number },
    boostId: string
  ): Promise<RecommendationResult> {
    return apiClient.post<RecommendationResult>(`${this.baseUrl}/boost-recommendations`, {
      user_id: userId,
      location,
      boost_id: boostId,
    });
  }

  async batchScoreProfiles(
    userId: string,
    targetUserIds: string[]
  ): Promise<{ scores: Record<string, number> }> {
    return apiClient.post(`${this.baseUrl}/batch-score`, {
      user_id: userId,
      target_user_ids: targetUserIds,
    });
  }
}

export const recommendationService = new RecommendationService();
export default recommendationService;
