import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../../utils/logger';
import config from '../../config';

const logger = createLogger('realtime-http-client');

/**
 * HTTP Client for direct communication with the Realtime Service
 * Used for operations that need synchronous responses (e.g., checking online status)
 */
export class RealtimeHttpClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private serviceToken: string;

  constructor() {
    this.baseUrl = config.realtimeServiceUrl || 'http://localhost:8081';
    this.serviceToken = config.serviceToken || 'dev-service-token-change-in-production';

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/internal`,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': this.serviceToken,
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Publish a new message to WebSocket clients
   */
  async publishMessage(data: {
    conversationId: string;
    messageId: string;
    senderId: string;
    receiverId: string;
    content: string;
    type: string;
    metadata?: any;
  }): Promise<boolean> {
    try {
      await this.client.post('/messages/publish', data);
      logger.info(`Message published: ${data.messageId}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to publish message ${data.messageId}:`, error.message);
      return false;
    }
  }

  /**
   * Publish read receipts to WebSocket clients
   */
  async publishReadReceipt(data: {
    conversationId: string;
    messageIds: string[];
    readBy: string;
    senderId: string;
  }): Promise<boolean> {
    try {
      await this.client.post('/messages/read-receipt', data);
      logger.info(`Read receipt published for ${data.messageIds.length} messages`);
      return true;
    } catch (error: any) {
      logger.error('Failed to publish read receipt:', error.message);
      return false;
    }
  }

  /**
   * Publish typing indicator to WebSocket clients
   */
  async publishTypingIndicator(data: {
    conversationId: string;
    userId: string;
    targetUserId: string;
    isTyping: boolean;
  }): Promise<boolean> {
    try {
      await this.client.post('/messages/typing', data);
      logger.debug(`Typing indicator published: ${data.isTyping}`);
      return true;
    } catch (error: any) {
      logger.error('Failed to publish typing indicator:', error.message);
      return false;
    }
  }

  /**
   * Get online participants in a conversation
   */
  async getConversationParticipants(conversationId: string): Promise<string[]> {
    try {
      const response = await this.client.get(`/conversations/${conversationId}/participants`);
      return response.data.data.participants || [];
    } catch (error: any) {
      logger.error(`Failed to get conversation participants:`, error.message);
      return [];
    }
  }

  /**
   * Add a user to a conversation room
   */
  async joinConversation(data: {
    conversationId: string;
    userId: string;
  }): Promise<boolean> {
    try {
      await this.client.post('/conversations/join', data);
      logger.debug(`User ${data.userId} joined conversation ${data.conversationId}`);
      return true;
    } catch (error: any) {
      logger.error('Failed to join conversation:', error.message);
      return false;
    }
  }

  /**
   * Remove a user from a conversation room
   */
  async leaveConversation(data: {
    conversationId: string;
    userId: string;
  }): Promise<boolean> {
    try {
      await this.client.post('/conversations/leave', data);
      logger.debug(`User ${data.userId} left conversation ${data.conversationId}`);
      return true;
    } catch (error: any) {
      logger.error('Failed to leave conversation:', error.message);
      return false;
    }
  }

  /**
   * Check if a user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      // Use the public API endpoint (requires auth)
      const response = await axios.get(`${this.baseUrl}/api/v1/presence/${userId}`, {
        headers: {
          'X-Service-Token': this.serviceToken,
        },
        timeout: 3000,
      });
      return response.data.data.status === 'online';
    } catch (error: any) {
      logger.error(`Failed to check online status for ${userId}:`, error.message);
      return false;
    }
  }

  /**
   * Get presence for multiple users
   */
  async getMultiplePresence(userIds: string[]): Promise<Record<string, any>> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/presence`,
        { userIds },
        {
          headers: {
            'X-Service-Token': this.serviceToken,
            'Content-Type': 'application/json',
          },
          timeout: 3000,
        }
      );
      return response.data.data || {};
    } catch (error: any) {
      logger.error('Failed to get multiple presence:', error.message);
      return {};
    }
  }

  /**
   * Get online users count
   */
  async getOnlineCount(): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/online/count`, {
        headers: {
          'X-Service-Token': this.serviceToken,
        },
        timeout: 3000,
      });
      return response.data.data.count || 0;
    } catch (error: any) {
      logger.error('Failed to get online count:', error.message);
      return 0;
    }
  }

  /**
   * Publish reaction update to WebSocket clients
   */
  async publishReactionUpdate(data: {
    conversationId: string;
    messageId: string;
    userId?: string;
    emoji?: string;
    reaction?: any;
    action: 'add' | 'remove' | 'added' | 'removed' | 'updated';
  }): Promise<boolean> {
    try {
      await this.client.post('/messages/reaction', data);
      logger.debug(`Reaction update published: ${data.action} ${data.emoji}`);
      return true;
    } catch (error: any) {
      logger.error('Failed to publish reaction update:', error.message);
      return false;
    }
  }

  /**
   * Publish message pinned event
   */
  async publishMessagePinned(data: {
    conversationId: string;
    messageId: string;
    pinnedBy: string;
  }): Promise<boolean> {
    try {
      await this.client.post('/messages/pinned', data);
      logger.debug(`Message pinned event published: ${data.messageId}`);
      return true;
    } catch (error: any) {
      logger.error('Failed to publish message pinned:', error.message);
      return false;
    }
  }

  /**
   * Publish message unpinned event
   */
  async publishMessageUnpinned(data: {
    conversationId: string;
    messageId: string;
    unpinnedBy: string;
  }): Promise<boolean> {
    try {
      await this.client.post('/messages/unpinned', data);
      logger.debug(`Message unpinned event published: ${data.messageId}`);
      return true;
    } catch (error: any) {
      logger.error('Failed to publish message unpinned:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export const realtimeHttpClient = new RealtimeHttpClient();
export default realtimeHttpClient;
