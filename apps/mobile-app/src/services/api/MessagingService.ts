/**
 * Messaging API Service
 * Handles REST API calls for messaging functionality
 */

import { httpClient, ApiResponse } from './httpClient';
import { API_CONFIG } from './config';

export interface Conversation {
  id: string;
  matchId: string;
  participants: {
    id: string;
    name: string;
    photo: string;
    isOnline: boolean;
    lastSeen?: string;
  }[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    type: 'text' | 'image' | 'gif' | 'voice';
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'gif' | 'voice';
  mediaUrl?: string;
  voiceDuration?: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt: string;
  readAt?: string;
  deliveredAt?: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'gif' | 'voice';
  mediaUrl?: string;
  voiceDuration?: number;
  tempId?: string;
}

export interface ConversationListParams {
  page?: number;
  limit?: number;
  search?: string;
  unreadOnly?: boolean;
}

export interface MessageListParams {
  conversationId: string;
  page?: number;
  limit?: number;
  before?: string; // Message ID for pagination
}

class MessagingService {
  private baseUrl = API_CONFIG.CORE_SERVICES.MESSAGING;

  /**
   * Get all conversations for the current user
   */
  async getConversations(
    params: ConversationListParams = {}
  ): Promise<ApiResponse<Conversation[]>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.unreadOnly) queryParams.append('unreadOnly', 'true');

    const query = queryParams.toString();
    const endpoint = `${this.baseUrl}/conversations${query ? `?${query}` : ''}`;

    return httpClient.get<Conversation[]>(endpoint);
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    return httpClient.get<Conversation>(`${this.baseUrl}/conversations/${conversationId}`);
  }

  /**
   * Create or get conversation with a match
   */
  async getOrCreateConversation(matchId: string): Promise<ApiResponse<Conversation>> {
    return httpClient.post<Conversation>(`${this.baseUrl}/conversations`, { matchId });
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(params: MessageListParams): Promise<ApiResponse<Message[]>> {
    const { conversationId, page = 1, limit = 50, before } = params;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (before) queryParams.append('before', before);

    const query = queryParams.toString();
    const endpoint = `${this.baseUrl}/conversations/${conversationId}/messages?${query}`;

    return httpClient.get<Message[]>(endpoint);
  }

  /**
   * Send a text message
   */
  async sendMessage(payload: SendMessagePayload): Promise<ApiResponse<Message>> {
    const { conversationId, ...messageData } = payload;
    return httpClient.post<Message>(
      `${this.baseUrl}/conversations/${conversationId}/messages`,
      messageData
    );
  }

  /**
   * Send an image message
   */
  async sendImage(
    conversationId: string,
    file: { uri: string; type: string; name: string }
  ): Promise<ApiResponse<Message>> {
    return httpClient.uploadFile<Message>(
      `${this.baseUrl}/conversations/${conversationId}/messages/image`,
      file,
      { type: 'image' }
    );
  }

  /**
   * Send a GIF message
   */
  async sendGif(conversationId: string, gifUrl: string): Promise<ApiResponse<Message>> {
    return httpClient.post<Message>(`${this.baseUrl}/conversations/${conversationId}/messages`, {
      type: 'gif',
      mediaUrl: gifUrl,
      content: 'GIF',
    });
  }

  /**
   * Send a voice message
   */
  async sendVoiceMessage(
    conversationId: string,
    file: { uri: string; type: string; name: string },
    duration: number
  ): Promise<ApiResponse<Message>> {
    return httpClient.uploadFile<Message>(
      `${this.baseUrl}/conversations/${conversationId}/messages/voice`,
      file,
      { type: 'voice', voiceDuration: duration }
    );
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, messageIds: string[]): Promise<ApiResponse<void>> {
    return httpClient.post<void>(`${this.baseUrl}/conversations/${conversationId}/read`, {
      messageIds,
    });
  }

  /**
   * Mark conversation as read
   */
  async markConversationAsRead(conversationId: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(`${this.baseUrl}/conversations/${conversationId}/read-all`, {});
  }

  /**
   * Delete a message
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(
      `${this.baseUrl}/conversations/${conversationId}/messages/${messageId}`
    );
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`${this.baseUrl}/conversations/${conversationId}`);
  }

  /**
   * Report a message
   */
  async reportMessage(
    conversationId: string,
    messageId: string,
    reason: string,
    details?: string
  ): Promise<ApiResponse<void>> {
    return httpClient.post<void>(
      `${this.baseUrl}/conversations/${conversationId}/messages/${messageId}/report`,
      { reason, details }
    );
  }

  /**
   * Block a user from a conversation
   */
  async blockUser(conversationId: string, userId: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(`${this.baseUrl}/conversations/${conversationId}/block`, {
      userId,
    });
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<
    ApiResponse<{ total: number; byConversation: Record<string, number> }>
  > {
    return httpClient.get<{ total: number; byConversation: Record<string, number> }>(
      `${this.baseUrl}/unread-count`
    );
  }

  /**
   * Search messages in a conversation
   */
  async searchMessages(conversationId: string, query: string): Promise<ApiResponse<Message[]>> {
    const queryParams = new URLSearchParams({ q: query });
    return httpClient.get<Message[]>(
      `${this.baseUrl}/conversations/${conversationId}/search?${queryParams.toString()}`
    );
  }

  /**
   * Get media from a conversation (images, GIFs)
   */
  async getConversationMedia(
    conversationId: string,
    type: 'image' | 'gif' | 'voice'
  ): Promise<ApiResponse<Message[]>> {
    const queryParams = new URLSearchParams({ type });
    return httpClient.get<Message[]>(
      `${this.baseUrl}/conversations/${conversationId}/media?${queryParams.toString()}`
    );
  }
}

export const messagingService = new MessagingService();
export default MessagingService;
