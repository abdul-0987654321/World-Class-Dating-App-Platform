/**
 * Match Service
 * Handles match-related API calls including expiration features
 */

import axios from 'axios';
import { API_BASE_URL } from './config';

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'pending' | 'matched' | 'unmatched' | 'blocked';
  matchedAt: Date;
  lastActivityAt: Date;
  compatibilityScore?: number;
  expiresAt?: Date;
  extended?: boolean;
  extendedAt?: Date;
  expired?: boolean;
  firstMessageSent?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  premiumRequired?: boolean;
}

class MatchService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/matches`;
  }

  /**
   * Get all matches for current user
   */
  async getMatches(status?: string): Promise<ApiResponse<{ count: number; matches: Match[] }>> {
    try {
      const params = status ? { status } : {};
      const response = await axios.get(this.baseUrl, { params });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch matches',
      };
    }
  }

  /**
   * Get specific match by ID
   */
  async getMatch(matchId: string): Promise<ApiResponse<Match>> {
    try {
      const response = await axios.get(`${this.baseUrl}/${matchId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch match',
      };
    }
  }

  /**
   * Get recent matches
   */
  async getRecentMatches(
    limit: number = 10
  ): Promise<ApiResponse<{ count: number; matches: Match[] }>> {
    try {
      const response = await axios.get(`${this.baseUrl}/recent`, {
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch recent matches',
      };
    }
  }

  /**
   * Get match count
   */
  async getMatchCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await axios.get(`${this.baseUrl}/count`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch match count',
      };
    }
  }

  /**
   * Unmatch with a user
   */
  async unmatch(matchId: string): Promise<ApiResponse<void>> {
    try {
      const response = await axios.delete(`${this.baseUrl}/${matchId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to unmatch',
      };
    }
  }

  /**
   * Extend match expiration (Premium feature)
   */
  async extendMatch(matchId: string): Promise<ApiResponse<Match>> {
    try {
      const response = await axios.post(`${this.baseUrl}/${matchId}/extend`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to extend match',
        premiumRequired: error.response?.data?.premiumRequired || false,
      };
    }
  }

  /**
   * Rematch with expired match (Premium feature)
   */
  async rematch(targetUserId: string): Promise<ApiResponse<Match>> {
    try {
      const response = await axios.post(`${this.baseUrl}/${targetUserId}/rematch`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to rematch',
        premiumRequired: error.response?.data?.premiumRequired || false,
      };
    }
  }
}

export const matchService = new MatchService();
