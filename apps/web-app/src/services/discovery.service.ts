/**
 * Discovery Service
 * Handles profile discovery and recommendations
 */

import { authTokenService } from './auth-token.service';
import {
  toArray,
  toBoolean,
  toString,
  toNumber,
  normalizeSubscriptionTier,
} from '../utils/api-transformers';

export interface ProfilePhoto {
  url: string;
  is_primary: boolean;
}

export interface ProfilePrompt {
  question: string;
  answer: string;
}

export interface DiscoveryProfile {
  user_id: string;
  first_name: string;
  age: number;
  bio?: string;
  occupation?: string;
  city?: string;
  distance?: number;
  photos: ProfilePhoto[];
  prompts: ProfilePrompt[];
  interests: string[];
  is_verified: boolean;
  premium_tier?: string;
  compatibility_score?: number;
}

export interface RecommendationsResponse {
  profiles: DiscoveryProfile[];
  nextCursor: string | null;
  remainingToday: number;
}

// Alias for DiscoveryFeedResponse to match backend API
export type DiscoveryFeedResponse = RecommendationsResponse;

export interface SwipeResult {
  isMatch: boolean;
  match?: {
    id: string;
    matchedUser: {
      id: string;
      name: string;
      photoUrl: string;
      isOnline: boolean;
    };
    matchedAt: string;
  };
  remainingLikes: number;
  remainingSuperLikes: number;
}

class DiscoveryService {
  private baseUrl = '/api/v1/discovery';

  async getRecommendations(cursor?: string): Promise<RecommendationsResponse> {
    // In mock mode, return mock data
    if (!import.meta.env.VITE_API_URL) {
      const { mockApi } = await import('../mocks/mockApi');
      const result = await mockApi.getRecommendations();

      // Transform mock profiles to DiscoveryProfile format
      return {
        profiles: result.profiles.map((p: any) => ({
          user_id: p.userId,
          first_name: p.name,
          age: p.age,
          bio: p.bio,
          occupation: p.occupation,
          city: p.city,
          distance: p.distance,
          photos: p.photos.map((url: string, i: number) => ({ url, is_primary: i === 0 })),
          prompts: [],
          interests: p.interests || [],
          is_verified: p.verified,
          premium_tier: p.premium_tier,
          compatibility_score: p.compatibilityScore,
        })),
        nextCursor: result.nextCursor,
        remainingToday: result.remainingToday,
      };
    }

    // Use /feed endpoint
    const url = cursor
      ? `${this.baseUrl}/feed?cursor=${cursor}`
      : `${this.baseUrl}/feed`;

    const response = await fetch(url, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch discovery feed');
    }

    // Backend returns { success: true, data: { items, next_cursor } }
    // Map to frontend expected format { profiles, nextCursor, remainingToday }
    const json = await response.json();
    const data = json.data || json;

    // Transform backend items to frontend DiscoveryProfile format with safe defaults
    const items = toArray(data.items);
    const profiles: DiscoveryProfile[] = items.map((item: any) => {
      const preview = item.profile_preview || {};
      const rawPhotos = toArray(preview.photos);

      return {
        user_id: toString(item.user_id),
        first_name: toString(preview.display_name || preview.first_name, 'User'),
        age: toNumber(preview.age, 0),
        bio: toString(preview.bio) || undefined,
        occupation: toString(preview.occupation) || undefined,
        city: toString(preview.city) || undefined,
        distance: preview.distance !== undefined ? toNumber(preview.distance) : undefined,
        photos: rawPhotos.map((photo: any, i: number) => ({
          url: typeof photo === 'string' ? photo : toString(photo.url),
          is_primary: i === 0 || toBoolean(photo.is_primary),
        })),
        prompts: toArray(preview.prompts).map((p: any) => ({
          question: toString(p.question),
          answer: toString(p.answer),
        })),
        interests: toArray(preview.interests),
        is_verified: toBoolean(preview.is_verified),
        premium_tier: normalizeSubscriptionTier(preview.premium_tier) || undefined,
        compatibility_score: preview.compatibility_score !== undefined
          ? toNumber(preview.compatibility_score)
          : undefined,
      };
    });

    return {
      profiles,
      nextCursor: data.next_cursor || null,
      remainingToday: toNumber(data.remaining_today, 50), // Default to 50 if not provided
    };
  }

  // Alias for getRecommendations to match new API naming
  async getFeed(cursor?: string): Promise<DiscoveryFeedResponse> {
    return this.getRecommendations(cursor);
  }

  async swipe(targetUserId: string, action: 'like' | 'pass' | 'super_like'): Promise<SwipeResult> {
    // In mock mode, use mock API
    if (!import.meta.env.VITE_API_URL) {
      const { mockApi } = await import('../mocks/mockApi');
      const result = await mockApi.swipe(targetUserId, action);

      // Transform mock result to SwipeResult format
      return {
        isMatch: result.isMatch,
        match: result.match ? {
          id: result.match.id,
          matchedUser: {
            id: result.match.matchedUser.id,
            name: result.match.matchedUser.name,
            photoUrl: result.match.matchedUser.photoUrl,
            isOnline: result.match.matchedUser.isOnline,
          },
          matchedAt: result.match.matchedAt,
        } : undefined,
        remainingLikes: result.remainingLikes,
        remainingSuperLikes: result.remainingSuperLikes,
      };
    }

    // Route to appropriate endpoint based on action
    // Backend uses separate endpoints: /like, /pass, /super-like
    switch (action) {
      case 'like':
        return this.like(targetUserId);
      case 'pass':
        return this.pass(targetUserId);
      case 'super_like':
        return this.superLike(targetUserId);
      default:
        throw new Error(`Unknown swipe action: ${action}`);
    }
  }

  /**
   * Like a user
   * POST /api/v1/discovery/like
   */
  async like(targetUserId: string): Promise<SwipeResult> {
    const response = await fetch(`${this.baseUrl}/like`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_user_id: targetUserId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to like');
    }

    // Backend returns { success: true, data: { liked, match_created, match } }
    const json = await response.json();
    const data = json.data || json;

    return {
      isMatch: data.match_created || false,
      match: data.match ? {
        id: data.match.id,
        matchedUser: {
          id: data.match.matched_user_id || data.match.matchedUserId,
          name: data.match.matched_user_name || data.match.name || 'Match',
          photoUrl: data.match.matched_user_photo || data.match.photoUrl || '',
          isOnline: data.match.is_online || false,
        },
        matchedAt: data.match.created_at || new Date().toISOString(),
      } : undefined,
      remainingLikes: data.remaining_likes ?? 50,
      remainingSuperLikes: data.remaining_super_likes ?? 5,
    };
  }

  /**
   * Pass on a user
   * POST /api/v1/discovery/pass
   */
  async pass(targetUserId: string): Promise<SwipeResult> {
    const response = await fetch(`${this.baseUrl}/pass`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_user_id: targetUserId }),
    });

    // Backend returns 204 No Content for pass
    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to pass');
    }

    // Pass never results in a match
    return {
      isMatch: false,
      remainingLikes: 50, // Pass doesn't affect like count
      remainingSuperLikes: 5,
    };
  }

  /**
   * Super-like a user
   * POST /api/v1/discovery/super-like
   */
  async superLike(targetUserId: string): Promise<SwipeResult> {
    const response = await fetch(`${this.baseUrl}/super-like`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_user_id: targetUserId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Handle tier restriction error
      if (response.status === 402) {
        throw new Error('Super-like requires Plus or Premium subscription');
      }
      throw new Error(errorData.error || 'Failed to super-like');
    }

    // Backend returns { success: true, data: { super_liked: true } }
    const json = await response.json();
    const data = json.data || json;

    return {
      isMatch: data.match_created || false,
      match: data.match ? {
        id: data.match.id,
        matchedUser: {
          id: data.match.matched_user_id || data.match.matchedUserId,
          name: data.match.matched_user_name || data.match.name || 'Match',
          photoUrl: data.match.matched_user_photo || data.match.photoUrl || '',
          isOnline: data.match.is_online || false,
        },
        matchedAt: data.match.created_at || new Date().toISOString(),
      } : undefined,
      remainingLikes: data.remaining_likes ?? 50,
      remainingSuperLikes: data.remaining_super_likes ?? 4, // Decremented after super-like
    };
  }

  async getStats(): Promise<{
    remainingLikes: number;
    remainingSuperLikes: number;
    remainingBoosts: number;
    likesResetAt: string;
    isPremium: boolean;
  }> {
    // In mock mode, use mock API
    if (!import.meta.env.VITE_API_URL) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.getStats();
    }

    const response = await fetch(`${this.baseUrl}/stats`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    // Backend returns { success: true, data: { ... } }
    const json = await response.json();
    const data = json.data || json;

    // Map backend snake_case to frontend camelCase with safe defaults
    return {
      remainingLikes: toNumber(data.remaining_likes ?? data.remainingLikes, 50),
      remainingSuperLikes: toNumber(data.remaining_super_likes ?? data.remainingSuperLikes, 5),
      remainingBoosts: toNumber(data.remaining_boosts ?? data.remainingBoosts, 1),
      likesResetAt: toString(
        data.likes_reset_at ?? data.likesResetAt,
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      ),
      isPremium: toBoolean(data.is_premium ?? data.isPremium),
    };
  }
}

export const discoveryService = new DiscoveryService();
