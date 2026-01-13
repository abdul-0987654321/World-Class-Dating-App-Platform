/**
 * Discovery API Service
 * Handles all discovery, swiping, and matching endpoints
 */

import { httpClient, ApiResponse } from './httpClient';
import {
  DiscoveryProfile,
  DiscoveryResponse,
  DiscoveryFilters,
  SwipeAction,
  SwipeResponse,
  Match,
  DiscoveryStats,
  BoostResponse,
  SuperLikeInfo,
  RewindInfo,
  DiscoveryPreferences,
} from '../../types/discovery.types';

export interface ProfileView {
  id: string;
  userId: string;
  name: string;
  age: number;
  photo: string;
  distance: number;
  viewedAt: string;
  isBlurred: boolean;
}

export interface ProfileViewsResponse {
  views: ProfileView[];
  total: number;
  hasMore: boolean;
}

class DiscoveryService {
  private readonly baseUrl = '/api/v1/discovery';

  /**
   * Get discovery profiles based on filters
   */
  async getProfiles(
    filters?: Partial<DiscoveryFilters>,
    cursor?: string,
    limit: number = 20
  ): Promise<ApiResponse<DiscoveryResponse>> {
    const params = new URLSearchParams();

    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, Array.isArray(value) ? JSON.stringify(value) : value.toString());
        }
      });
    }

    return httpClient.get<DiscoveryResponse>(`${this.baseUrl}/profiles?${params.toString()}`);
  }

  /**
   * Swipe left (pass) on a profile
   * POST /api/v1/discovery/pass
   */
  async swipeLeft(profileId: string): Promise<ApiResponse<SwipeResponse>> {
    return httpClient.post<SwipeResponse>(`${this.baseUrl}/pass`, {
      target_user_id: profileId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Swipe right (like) on a profile
   * POST /api/v1/discovery/like
   */
  async swipeRight(profileId: string): Promise<ApiResponse<SwipeResponse>> {
    return httpClient.post<SwipeResponse>(`${this.baseUrl}/like`, {
      target_user_id: profileId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Super like a profile
   * POST /api/v1/discovery/super-like
   */
  async superLike(profileId: string): Promise<ApiResponse<SwipeResponse>> {
    return httpClient.post<SwipeResponse>(`${this.baseUrl}/super-like`, {
      target_user_id: profileId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Rewind last swipe action
   */
  async rewind(): Promise<ApiResponse<{ success: boolean; profile?: DiscoveryProfile }>> {
    return httpClient.post(`${this.baseUrl}/rewind`);
  }

  /**
   * Activate boost
   */
  async activateBoost(): Promise<ApiResponse<BoostResponse>> {
    return httpClient.post<BoostResponse>(`${this.baseUrl}/boost/activate`);
  }

  /**
   * Get current boost status
   */
  async getBoostStatus(): Promise<ApiResponse<BoostResponse>> {
    return httpClient.get<BoostResponse>(`${this.baseUrl}/boost/status`);
  }

  /**
   * Get super like info (remaining count, reset time)
   */
  async getSuperLikeInfo(): Promise<ApiResponse<SuperLikeInfo>> {
    return httpClient.get<SuperLikeInfo>(`${this.baseUrl}/super-like/info`);
  }

  /**
   * Get rewind availability
   */
  async getRewindInfo(): Promise<ApiResponse<RewindInfo>> {
    return httpClient.get<RewindInfo>(`${this.baseUrl}/rewind/info`);
  }

  /**
   * Get all matches
   */
  async getMatches(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{ matches: Match[]; total: number }>> {
    return httpClient.get(`${this.baseUrl}/matches?page=${page}&limit=${limit}`);
  }

  /**
   * Get a specific match by ID
   */
  async getMatch(matchId: string): Promise<ApiResponse<Match>> {
    return httpClient.get<Match>(`${this.baseUrl}/matches/${matchId}`);
  }

  /**
   * Unmatch with a user
   */
  async unmatch(matchId: string): Promise<ApiResponse<{ success: boolean }>> {
    return httpClient.delete(`${this.baseUrl}/matches/${matchId}`);
  }

  /**
   * Get discovery statistics
   */
  async getStats(): Promise<ApiResponse<DiscoveryStats>> {
    return httpClient.get<DiscoveryStats>(`${this.baseUrl}/stats`);
  }

  /**
   * Get discovery preferences
   */
  async getPreferences(): Promise<ApiResponse<DiscoveryPreferences>> {
    return httpClient.get<DiscoveryPreferences>(`${this.baseUrl}/preferences`);
  }

  /**
   * Update discovery preferences
   */
  async updatePreferences(
    preferences: Partial<DiscoveryPreferences>
  ): Promise<ApiResponse<DiscoveryPreferences>> {
    return httpClient.put<DiscoveryPreferences>(`${this.baseUrl}/preferences`, preferences);
  }

  /**
   * Update discovery filters
   */
  async updateFilters(
    filters: Partial<DiscoveryFilters>
  ): Promise<ApiResponse<DiscoveryFilters>> {
    return httpClient.put<DiscoveryFilters>(`${this.baseUrl}/filters`, filters);
  }

  /**
   * Pause discovery (stop showing profile to others)
   */
  async pauseDiscovery(): Promise<ApiResponse<{ success: boolean }>> {
    return httpClient.post(`${this.baseUrl}/pause`);
  }

  /**
   * Resume discovery
   */
  async resumeDiscovery(): Promise<ApiResponse<{ success: boolean }>> {
    return httpClient.post(`${this.baseUrl}/resume`);
  }

  /**
   * Report a profile
   */
  async reportProfile(
    profileId: string,
    reason: string,
    details?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return httpClient.post(`${this.baseUrl}/report`, {
      profileId,
      reason,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return httpClient.post(`${this.baseUrl}/block`, {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get profile details (detailed view)
   */
  async getProfileDetails(profileId: string): Promise<ApiResponse<DiscoveryProfile>> {
    return httpClient.get<DiscoveryProfile>(`${this.baseUrl}/profiles/${profileId}`);
  }

  /**
   * Like a user from match list (mutual friends, etc.)
   */
  async likeFromList(userId: string): Promise<ApiResponse<SwipeResponse>> {
    return httpClient.post<SwipeResponse>(`${this.baseUrl}/like-from-list`, {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get who liked you (requires premium)
   */
  async getWhoLikedYou(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{ profiles: DiscoveryProfile[]; total: number }>> {
    return httpClient.get(`${this.baseUrl}/likes-you?page=${page}&limit=${limit}`);
  }

  /**
   * Get who viewed your profile (requires premium)
   * GET /api/v1/discovery/profile-views
   */
  async getWhoViewedMe(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<ProfileViewsResponse>> {
    return httpClient.get<ProfileViewsResponse>(
      `${this.baseUrl}/profile-views?page=${page}&limit=${limit}`
    );
  }
}

export const discoveryService = new DiscoveryService();
export default DiscoveryService;
