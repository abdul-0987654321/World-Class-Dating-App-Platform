import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from '@connectsphere/constants';
import type { Message } from '@connectsphere/types';

export interface WebSocketConfig {
  url?: string;
  getToken: () => string | null;
}

export class WebSocketClient {
  private socket: Socket | null = null;
  private config: WebSocketConfig;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  connect(): void {
    const token = this.config.getToken();

    this.socket = io(this.config.url || WS_BASE_URL, {
      auth: {
        token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onMessage(callback: (message: Message) => void): void {
    this.socket?.on('message:new', callback);
  }

  onMessageRead(callback: (data: { messageId: string; conversationId: string }) => void): void {
    this.socket?.on('message:read', callback);
  }

  onTyping(callback: (data: { userId: string; conversationId: string; isTyping: boolean }) => void): void {
    this.socket?.on('user:typing', callback);
  }

  onMatch(callback: (data: { matchId: string; user: any }) => void): void {
    this.socket?.on('match:new', callback);
  }

  sendTyping(conversationId: string, isTyping: boolean): void {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  joinConversation(conversationId: string): void {
    this.socket?.emit('conversation:join', { conversationId });
  }

  leaveConversation(conversationId: string): void {
    this.socket?.emit('conversation:leave', { conversationId });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
