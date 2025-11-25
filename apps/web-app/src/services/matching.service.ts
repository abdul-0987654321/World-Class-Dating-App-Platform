/**
 * Matching Service
 * Handles matches and likes
 */

import apiClient from './api.client';

export interface MatchedUser {
  id: string;
  name: string;
  photoUrl: string;
  isOnline: boolean;
  age?: number;
  city?: string;
  lastActive?: string;
}

export interface Match {
  id: string;
  matchedUser: MatchedUser;
  matchedAt: string;
  lastMessage?: {
    content: string;
    sentAt: string;
  };
  lastMessageAt?: string;
  hasUnread: boolean;
  compatibility?: number;
}

export interface Like {
  id: string;
  user: MatchedUser;
  likedAt: string;
  isSuperLike: boolean;
  isBlurred: boolean; // For non-premium users
}

export interface MatchesResponse {
  matches: Match[];
  nextCursor: string | null;
  totalCount: number;
}

export interface LikesResponse {
  likes: Like[];
  nextCursor: string | null;
  totalCount: number;
  canSeeLikes: boolean;
}

class MatchingService {
  private isMock = !import.meta.env.VITE_API_URL;

  async getMatches(cursor?: string): Promise<MatchesResponse> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.getMatches();
    }

    const url = cursor
      ? `/api/matching/matches?cursor=${cursor}`
      : '/api/matching/matches';

    return apiClient.get<MatchesResponse>(url);
  }

  async getLikes(cursor?: string): Promise<LikesResponse> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.getLikes();
    }

    const url = cursor
      ? `/api/matching/likes?cursor=${cursor}`
      : '/api/matching/likes';

    return apiClient.get<LikesResponse>(url);
  }

  async unmatch(matchId: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }

    await apiClient.delete(`/api/matching/matches/${matchId}`);
  }

  async reportMatch(matchId: string, reason: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }

    await apiClient.post(`/api/matching/matches/${matchId}/report`, { reason });
  }

  async blockUser(userId: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }

    await apiClient.post('/api/users/block', { userId });
  }

  async unblockUser(userId: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }

    await apiClient.delete(`/api/users/block/${userId}`);
  }

  async getBlockedUsers(): Promise<{ users: MatchedUser[]; totalCount: number }> {
    if (this.isMock) {
      return { users: [], totalCount: 0 };
    }

    return apiClient.get('/api/users/blocked');
  }
}

export const matchingService = new MatchingService();
export default matchingService;
