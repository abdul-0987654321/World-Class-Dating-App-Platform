/**
 * Matching Service Client
 * Handles communication with the matching service
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('matching-service-client');

interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  status: string;
  requiresWomenFirst?: boolean;
  womanUserId?: string;
  conversationInitiated?: boolean;
  firstMessageSentBy?: string;
}

export class MatchingServiceClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.MATCHING_SERVICE_URL || 'http://localhost:3003';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'messaging-service',
      },
    });
  }

  /**
   * Get match by ID
   */
  async getMatch(matchId: string): Promise<Match | null> {
    try {
      const response = await this.client.get(`/api/internal/matches/${matchId}`);
      return response.data.data || response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error(`Failed to get match ${matchId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find match between two users
   */
  async findMatchByUsers(user1Id: string, user2Id: string): Promise<Match | null> {
    try {
      const response = await this.client.get('/api/internal/matches/find', {
        params: { user1Id, user2Id },
      });
      return response.data.data || response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error(`Failed to find match between ${user1Id} and ${user2Id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update match conversation status
   */
  async updateMatchConversationStatus(
    matchId: string,
    conversationInitiated: boolean,
    firstMessageSentBy?: string
  ): Promise<void> {
    try {
      await this.client.patch(`/api/internal/matches/${matchId}/conversation`, {
        conversationInitiated,
        firstMessageSentBy,
      });
      logger.info(`Updated conversation status for match ${matchId}`);
    } catch (error: any) {
      logger.error(`Failed to update match conversation status: ${error.message}`);
      // Don't throw - this is a non-critical update
    }
  }
}

export const matchingServiceClient = new MatchingServiceClient();
export default matchingServiceClient;
