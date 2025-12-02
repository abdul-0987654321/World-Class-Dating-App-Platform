/**
 * WebSocket Service for Real-time Messaging
 * Handles real-time message delivery, typing indicators, read receipts, and presence
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../api/config';

export interface MessageEvent {
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: 'text' | 'image' | 'gif' | 'voice';
    mediaUrl?: string;
    status: 'sent' | 'delivered' | 'read';
    createdAt: string;
  };
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface ReadReceiptEvent {
  conversationId: string;
  messageIds: string[];
  readBy: string;
  readAt: string;
}

export interface PresenceEvent {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
}

type EventCallback<T> = (data: T) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<EventCallback<any>>> = new Map();

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const wsUrl = process.env.WEBSOCKET_URL || 'wss://ws.flamoral.com';

      console.log('[WebSocket] Connecting to:', wsUrl);

      this.socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting');
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.emit('connection', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached');
        this.emit('connection', { status: 'failed', error: error.message });
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    // Message events
    this.socket.on('message:new', (data: MessageEvent) => {
      console.log('[WebSocket] New message:', data);
      this.emit('message:new', data);
    });

    this.socket.on('message:delivered', (data: { messageId: string; conversationId: string }) => {
      console.log('[WebSocket] Message delivered:', data);
      this.emit('message:delivered', data);
    });

    this.socket.on('message:read', (data: ReadReceiptEvent) => {
      console.log('[WebSocket] Messages read:', data);
      this.emit('message:read', data);
    });

    // Typing indicators
    this.socket.on('typing:start', (data: TypingEvent) => {
      console.log('[WebSocket] User typing:', data);
      this.emit('typing:start', data);
    });

    this.socket.on('typing:stop', (data: TypingEvent) => {
      console.log('[WebSocket] User stopped typing:', data);
      this.emit('typing:stop', data);
    });

    // Presence events
    this.socket.on('presence:update', (data: PresenceEvent) => {
      console.log('[WebSocket] Presence update:', data);
      this.emit('presence:update', data);
    });

    // Match events
    this.socket.on('match:new', (data: any) => {
      console.log('[WebSocket] New match:', data);
      this.emit('match:new', data);
    });
  }

  // Send message
  sendMessage(conversationId: string, message: {
    content: string;
    type: 'text' | 'image' | 'gif' | 'voice';
    mediaUrl?: string;
    tempId?: string;
  }): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    console.log('[WebSocket] Sending message:', { conversationId, message });
    this.socket.emit('message:send', { conversationId, message });
  }

  // Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot send typing indicator - not connected');
      return;
    }

    this.socket.emit('typing', { conversationId, isTyping });
  }

  // Mark messages as read
  markAsRead(conversationId: string, messageIds: string[]): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot mark as read - not connected');
      return;
    }

    console.log('[WebSocket] Marking messages as read:', { conversationId, messageIds });
    this.socket.emit('message:read', { conversationId, messageIds });
  }

  // Join conversation room
  joinConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot join conversation - not connected');
      return;
    }

    console.log('[WebSocket] Joining conversation:', conversationId);
    this.socket.emit('conversation:join', { conversationId });
  }

  // Leave conversation room
  leaveConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot leave conversation - not connected');
      return;
    }

    console.log('[WebSocket] Leaving conversation:', conversationId);
    this.socket.emit('conversation:leave', { conversationId });
  }

  // Update presence
  updatePresence(status: 'online' | 'offline' | 'away'): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot update presence - not connected');
      return;
    }

    console.log('[WebSocket] Updating presence:', status);
    this.socket.emit('presence:update', { status });
  }

  // Event subscription
  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const callbacks = this.listeners.get(event)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  // Emit event to listeners
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[WebSocket] Error in event callback:', error);
        }
      });
    }
  }

  // Remove all listeners for an event
  off(event: string): void {
    this.listeners.delete(event);
  }

  // Remove all listeners
  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export const webSocketService = new WebSocketService();
export default WebSocketService;
