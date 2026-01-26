/**
 * Trust Service
 * Client-side service for trust scoring, ratings, and endorsements
 */

import apiClient, { ApiError } from './api.client';

// ============================================================================
// Types
// ============================================================================

export type TrustLevel = 'new' | 'building' | 'established' | 'trusted' | 'highly_trusted';

export type TrustBadge =
  | 'verified_identity'
  | 'verified_photos'
  | 'trusted_member'
  | 'community_champion'
  | 'long_standing_member';

export interface TrustScore {
  userId: string;
  overallScore: number;
  level: TrustLevel;
  badge: TrustBadge | null;
  components: {
    verification: {
      score: number;
      emailVerified: boolean;
      phoneVerified: boolean;
      photoVerified: boolean;
      idVerified: boolean;
    };
    behavioral: {
      score: number;
      responseRate: number;
      ghostingIncidents: number;
      positiveInteractions: number;
    };
    community: {
      score: number;
      ratingsReceived: number;
      averageRating: number;
      endorsementsReceived: number;
    };
    accountAge: { score: number; accountAgeDays: number; profileCompleteness: number };
    activity: { score: number; lastActiveAt: string; authenticInteractionCount: number };
  };
  lastUpdated: string;
}

export interface TrustProfile {
  userId: string;
  level: TrustLevel;
  badges: TrustBadge[];
  verificationStatus: {
    email: boolean;
    phone: boolean;
    photo: boolean;
    identity: boolean;
  };
  memberSince: string;
  communityStats: {
    positiveRatings: number;
    endorsements: number;
  };
  highlights: TrustHighlight[];
}

export interface TrustHighlight {
  type: string;
  label: string;
  iconEmoji: string;
}

export type RatingCategory =
  | 'respectful'
  | 'authentic'
  | 'good_communicator'
  | 'honest'
  | 'punctual'
  | 'kind'
  | 'interesting'
  | 'made_uncomfortable'
  | 'misleading_profile'
  | 'inappropriate_behavior';

export interface UserRating {
  id: string;
  fromUserId: string;
  toUserId: string;
  conversationId?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  categories: RatingCategory[];
  comment?: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface RatingStats {
  totalRatings: number;
  averageRating: number;
  distribution: Record<number, number>;
  topCategories: { category: RatingCategory; count: number }[];
}

export type EndorsementType =
  | 'great_conversation'
  | 'genuine_person'
  | 'respectful'
  | 'fun_date'
  | 'recommended';

export interface Endorsement {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: EndorsementType;
  message?: string;
  createdAt: string;
}

// ============================================================================
// Service
// ============================================================================

class TrustService {
  private readonly isMock = !import.meta.env.VITE_API_URL;

  // ============================================================================
  // Trust Score Methods
  // ============================================================================

  async getMyTrustScore(): Promise<TrustScore> {
    if (this.isMock) {
      return this.mockTrustScore();
    }

    const response = await apiClient.get<{ success: boolean; data: TrustScore }>(
      '/api/v1/trust/score'
    );
    return response.data;
  }

  async getTrustProfile(userId: string): Promise<TrustProfile> {
    if (this.isMock) {
      return this.mockTrustProfile(userId);
    }

    const response = await apiClient.get<{ success: boolean; data: TrustProfile }>(
      `/api/v1/trust/profile/${userId}`
    );
    return response.data;
  }

  // ============================================================================
  // Rating Methods
  // ============================================================================

  async submitRating(data: {
    toUserId: string;
    conversationId?: string;
    rating: 1 | 2 | 3 | 4 | 5;
    categories: RatingCategory[];
    comment?: string;
    isAnonymous?: boolean;
  }): Promise<UserRating> {
    if (this.isMock) {
      return {
        id: `rating-${Date.now()}`,
        fromUserId: 'current-user',
        toUserId: data.toUserId,
        conversationId: data.conversationId,
        rating: data.rating,
        categories: data.categories,
        comment: data.comment,
        isAnonymous: data.isAnonymous ?? true,
        createdAt: new Date().toISOString(),
      };
    }

    const response = await apiClient.post<{ success: boolean; data: UserRating }>(
      '/api/v1/trust/ratings',
      data
    );
    return response.data;
  }

  async getMyRatings(): Promise<UserRating[]> {
    if (this.isMock) {
      return this.mockRatings();
    }

    const response = await apiClient.get<{ success: boolean; data: UserRating[] }>(
      '/api/v1/trust/ratings/mine'
    );
    return response.data;
  }

  async getRatingStats(userId: string): Promise<RatingStats> {
    if (this.isMock) {
      return this.mockRatingStats();
    }

    const response = await apiClient.get<{ success: boolean; data: RatingStats }>(
      `/api/v1/trust/ratings/stats/${userId}`
    );
    return response.data;
  }

  // ============================================================================
  // Endorsement Methods
  // ============================================================================

  async giveEndorsement(data: {
    toUserId: string;
    type: EndorsementType;
    message?: string;
  }): Promise<Endorsement> {
    if (this.isMock) {
      return {
        id: `endorsement-${Date.now()}`,
        fromUserId: 'current-user',
        toUserId: data.toUserId,
        type: data.type,
        message: data.message,
        createdAt: new Date().toISOString(),
      };
    }

    const response = await apiClient.post<{ success: boolean; data: Endorsement }>(
      '/api/v1/trust/endorsements',
      data
    );
    return response.data;
  }

  async getMyEndorsements(): Promise<Endorsement[]> {
    if (this.isMock) {
      return this.mockEndorsements();
    }

    const response = await apiClient.get<{ success: boolean; data: Endorsement[] }>(
      '/api/v1/trust/endorsements/mine'
    );
    return response.data;
  }

  async getEndorsementCounts(userId: string): Promise<Record<EndorsementType, number>> {
    if (this.isMock) {
      return {
        great_conversation: 3,
        genuine_person: 5,
        respectful: 8,
        fun_date: 2,
        recommended: 4,
      };
    }

    const response = await apiClient.get<{
      success: boolean;
      data: Record<EndorsementType, number>;
    }>(`/api/v1/trust/endorsements/counts/${userId}`);
    return response.data;
  }

  // ============================================================================
  // Mock Data
  // ============================================================================

  private mockTrustScore(): TrustScore {
    return {
      userId: 'current-user',
      overallScore: 78,
      level: 'established',
      badge: 'verified_photos',
      components: {
        verification: {
          score: 75,
          emailVerified: true,
          phoneVerified: true,
          photoVerified: true,
          idVerified: false,
        },
        behavioral: { score: 82, responseRate: 85, ghostingIncidents: 0, positiveInteractions: 24 },
        community: { score: 76, ratingsReceived: 12, averageRating: 4.3, endorsementsReceived: 8 },
        accountAge: { score: 65, accountAgeDays: 120, profileCompleteness: 90 },
        activity: {
          score: 80,
          lastActiveAt: new Date().toISOString(),
          authenticInteractionCount: 45,
        },
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  private mockTrustProfile(userId: string): TrustProfile {
    return {
      userId,
      level: 'established',
      badges: ['verified_photos'],
      verificationStatus: {
        email: true,
        phone: true,
        photo: true,
        identity: false,
      },
      memberSince: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      communityStats: {
        positiveRatings: 12,
        endorsements: 8,
      },
      highlights: [
        { type: 'photo_verified', label: 'Photos Verified', iconEmoji: '📸' },
        { type: 'responsive', label: 'Quick Responder', iconEmoji: '⚡' },
        { type: 'endorsed', label: 'Community Endorsed', iconEmoji: '⭐' },
      ],
    };
  }

  private mockRatings(): UserRating[] {
    return [
      {
        id: 'rating-1',
        fromUserId: 'anonymous',
        toUserId: 'current-user',
        rating: 5,
        categories: ['respectful', 'good_communicator', 'authentic'],
        isAnonymous: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'rating-2',
        fromUserId: 'anonymous',
        toUserId: 'current-user',
        rating: 4,
        categories: ['kind', 'interesting'],
        isAnonymous: true,
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  private mockRatingStats(): RatingStats {
    return {
      totalRatings: 12,
      averageRating: 4.3,
      distribution: { 1: 0, 2: 1, 3: 2, 4: 4, 5: 5 },
      topCategories: [
        { category: 'respectful', count: 10 },
        { category: 'good_communicator', count: 8 },
        { category: 'authentic', count: 7 },
        { category: 'kind', count: 5 },
      ],
    };
  }

  private mockEndorsements(): Endorsement[] {
    return [
      {
        id: 'endorsement-1',
        fromUserId: 'user-123',
        toUserId: 'current-user',
        type: 'great_conversation',
        message: 'Really enjoyed our chat!',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'endorsement-2',
        fromUserId: 'user-456',
        toUserId: 'current-user',
        type: 'genuine_person',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }
}

export const trustService = new TrustService();
export default trustService;
