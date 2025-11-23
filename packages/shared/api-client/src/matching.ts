import { ApiClient } from './client';
import type {
  DiscoveryProfile,
  Match,
  SwipeAction,
  DiscoveryFilters
} from '@connectsphere/types';

export class MatchingApi {
  constructor(private client: ApiClient) {}

  async getDiscoveryProfiles(filters?: DiscoveryFilters): Promise<DiscoveryProfile[]> {
    return this.client.get<DiscoveryProfile[]>('/matching/discovery', {
      params: filters
    });
  }

  async swipe(targetUserId: string, action: SwipeAction): Promise<{ match: boolean; matchId?: string }> {
    return this.client.post<{ match: boolean; matchId?: string }>('/matching/swipe', {
      targetUserId,
      action
    });
  }

  async getMatches(limit = 50, offset = 0): Promise<Match[]> {
    return this.client.get<Match[]>('/matching/matches', {
      params: { limit, offset }
    });
  }

  async unmatch(matchId: string): Promise<void> {
    return this.client.delete<void>(`/matching/matches/${matchId}`);
  }

  async superLike(targetUserId: string): Promise<{ match: boolean; matchId?: string }> {
    return this.client.post<{ match: boolean; matchId?: string }>('/matching/super-like', {
      targetUserId
    });
  }

  async boostProfile(duration: number = 30): Promise<{ expiresAt: Date }> {
    return this.client.post<{ expiresAt: Date }>('/matching/boost', { duration });
  }
}
