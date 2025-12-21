/**
 * Discovery Service
 * Handles profile discovery and recommendations
 */

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
  private baseUrl = '/api/discovery';

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

    // Use /feed endpoint instead of /recommendations
    const url = cursor
      ? `${this.baseUrl}/feed?cursor=${cursor}`
      : `${this.baseUrl}/feed`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch discovery feed');
    }

    // Backend returns { success: true, data: { profiles, nextCursor, remainingToday } }
    const json = await response.json();
    return json.data || json;
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

    const response = await fetch(`${this.baseUrl}/swipe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetUserId, action }),
    });

    if (!response.ok) {
      throw new Error('Failed to swipe');
    }

    return response.json();
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
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    return response.json();
  }
}

export const discoveryService = new DiscoveryService();
