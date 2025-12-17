import { ApiClient } from './client';
import type {
  Conversation,
  Message,
  SendMessageRequest
} from '@flamoral/types';

export class MessagingApi {
  constructor(private client: ApiClient) {}

  async getConversations(limit = 50, offset = 0): Promise<Conversation[]> {
    return this.client.get<Conversation[]>('/messaging/conversations', {
      params: { limit, offset }
    });
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return this.client.get<Conversation>(`/messaging/conversations/${conversationId}`);
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    return this.client.get<Message[]>(`/messaging/conversations/${conversationId}/messages`, {
      params: { limit, offset }
    });
  }

  async sendMessage(conversationId: string, data: SendMessageRequest): Promise<Message> {
    return this.client.post<Message>(`/messaging/conversations/${conversationId}/messages`, data);
  }

  async markAsRead(conversationId: string, messageId: string): Promise<void> {
    return this.client.post<void>(`/messaging/conversations/${conversationId}/messages/${messageId}/read`);
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    return this.client.delete<void>(`/messaging/conversations/${conversationId}/messages/${messageId}`);
  }
}
