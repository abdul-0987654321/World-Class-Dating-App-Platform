/**
 * Messaging Service
 * Handles conversations and messages
 */

import apiClient from './api.client';

export interface Message {
  id: string;
  senderId: string;
  sender_id?: string; // Alias for senderId
  content: string;
  sentAt: string;
  created_at?: string; // Alias for sentAt
  status: 'sending' | 'sent' | 'delivered' | 'read';
  is_read?: boolean; // Alias for status === 'read'
  type?: 'text' | 'image' | 'gif' | 'voice';
  mediaUrl?: string;
}

export interface Participant {
  id: string;
  name: string;
  photoUrl: string;
  photo_url?: string; // Alias for photoUrl
  isOnline: boolean;
  lastActive?: string;
}

export interface OtherUser {
  id: string;
  name: string;
  photo_url?: string;
  photoUrl?: string;
}

export interface Conversation {
  id: string;
  participant: Participant;
  other_user?: OtherUser; // Alias for participant
  lastMessage?: Message;
  unreadCount: number;
  isTyping?: boolean;
  createdAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  nextCursor: string | null;
  totalUnread: number;
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

class MessagingService {
  private isMock = !import.meta.env.VITE_API_URL;

  async getConversations(cursor?: string): Promise<ConversationsResponse> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.getConversations();
    }

    const url = cursor
      ? `/api/messaging/conversations?cursor=${cursor}`
      : '/api/messaging/conversations';

    return apiClient.get<ConversationsResponse>(url);
  }

  async getMessages(conversationId: string, cursor?: string): Promise<MessagesResponse> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.getMessages(conversationId);
    }

    const url = cursor
      ? `/api/messaging/conversations/${conversationId}/messages?cursor=${cursor}`
      : `/api/messaging/conversations/${conversationId}/messages`;

    return apiClient.get<MessagesResponse>(url);
  }

  async sendMessage(conversationId: string, content: string, type: string = 'text'): Promise<Message> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.sendMessage(conversationId, content);
    }

    return apiClient.post<Message>(
      `/api/messaging/conversations/${conversationId}/messages`,
      { content, type }
    );
  }

  async markAsRead(conversationId: string, messageIds: string[]): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return;
    }

    await apiClient.post(
      `/api/messaging/conversations/${conversationId}/read`,
      { messageIds }
    );
  }

  async startConversation(matchId: string, initialMessage?: string): Promise<Conversation> {
    if (this.isMock) {
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        participant: {
          id: matchId,
          name: 'New Match',
          photoUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
          isOnline: true,
        },
        unreadCount: 0,
        createdAt: new Date().toISOString(),
      };
      return newConv;
    }

    return apiClient.post<Conversation>('/api/messaging/conversations', {
      matchId,
      initialMessage,
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }

    await apiClient.delete(`/api/messaging/conversations/${conversationId}`);
  }

  async reportConversation(conversationId: string, reason: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }

    await apiClient.post(`/api/messaging/conversations/${conversationId}/report`, {
      reason,
    });
  }
}

export const messagingService = new MessagingService();
export default messagingService;
