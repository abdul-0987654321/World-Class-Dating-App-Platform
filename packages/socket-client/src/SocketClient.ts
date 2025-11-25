/**
 * Socket Client
 * Core WebSocket client using Socket.IO
 */

import { io, Socket } from 'socket.io-client';
import type {
  SocketConfig,
  AuthPayload,
  ConnectionStatus,
  Message,
  TypingIndicator,
  PresenceUpdate,
  MatchNotification,
  LikeNotification,
  CallSignal,
  SocketEvents,
} from './types';

type EventCallback<T> = (data: T) => void;

const DEFAULT_CONFIG: Partial<SocketConfig> = {
  path: '/socket.io',
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
};

export class SocketClient {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private authPayload: AuthPayload | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  private _status: ConnectionStatus = 'disconnected';
  private _isAuthenticated: boolean = false;
  private _userId: string | null = null;
  private _error: string | null = null;
  private _reconnectAttempt: number = 0;

  constructor(config: SocketConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Getters for state
  get status(): ConnectionStatus {
    return this._status;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get userId(): string | null {
    return this._userId;
  }

  get error(): string | null {
    return this._error;
  }

  get isConnected(): boolean {
    return this._status === 'connected' && this._isAuthenticated;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(auth: AuthPayload): void {
    if (this.socket?.connected) {
      console.warn('Socket already connected');
      return;
    }

    this.authPayload = auth;
    this._status = 'connecting';
    this.emitStateChange();

    this.socket = io(this.config.url, {
      path: this.config.path,
      autoConnect: true,
      reconnection: this.config.reconnection,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      timeout: this.config.timeout,
      auth: {
        token: auth.token,
      },
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this._status = 'disconnected';
    this._isAuthenticated = false;
    this._userId = null;
    this._error = null;
    this._reconnectAttempt = 0;
    this.emitStateChange();
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    contentType: string = 'text',
    replyTo?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.socket!.emit(
        'send_message',
        {
          conversationId,
          content,
          contentType,
          replyTo,
          tempId,
        },
        (response: { success: boolean; messageId?: string; error?: string }) => {
          if (response.success && response.messageId) {
            resolve(response.messageId);
          } else {
            reject(new Error(response.error || 'Failed to send message'));
          }
        }
      );
    });
  }

  /**
   * Mark messages as read
   */
  markAsRead(conversationId: string, messageId: string): void {
    if (!this.isConnected) return;

    this.socket!.emit('mark_read', {
      conversationId,
      messageId,
    });
  }

  /**
   * Send typing indicator
   */
  setTyping(conversationId: string, isTyping: boolean): void {
    if (!this.isConnected) return;

    this.socket!.emit('typing', {
      conversationId,
      isTyping,
    });
  }

  /**
   * Subscribe to presence updates for specific users
   */
  subscribeToPresence(userIds: string[]): void {
    if (!this.isConnected) return;

    this.socket!.emit('subscribe_presence', { userIds });
  }

  /**
   * Unsubscribe from presence updates
   */
  unsubscribeFromPresence(userIds: string[]): void {
    if (!this.isConnected) return;

    this.socket!.emit('unsubscribe_presence', { userIds });
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    if (!this.isConnected) return;

    this.socket!.emit('join_conversation', { conversationId });
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    if (!this.isConnected) return;

    this.socket!.emit('leave_conversation', { conversationId });
  }

  /**
   * Send a call signal
   */
  sendCallSignal(signal: Omit<CallSignal, 'senderId'>): void {
    if (!this.isConnected || !this._userId) return;

    this.socket!.emit('call_signal', {
      ...signal,
      senderId: this._userId,
    });
  }

  /**
   * Add event listener
   */
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: keyof SocketEvents): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  // Private methods

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this._status = 'connected';
      this._error = null;
      this._reconnectAttempt = 0;
      this.emitStateChange();
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason: string) => {
      this._status = 'disconnected';
      this._isAuthenticated = false;
      this.emitStateChange();
      this.emit('disconnect', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      this._status = 'error';
      this._error = error.message;
      this.emitStateChange();
      this.emit('connect_error', error);
    });

    this.socket.io.on('reconnect', (attempt: number) => {
      this._status = 'connected';
      this._reconnectAttempt = 0;
      this.emitStateChange();
      this.emit('reconnect', attempt);
    });

    this.socket.io.on('reconnect_attempt', (attempt: number) => {
      this._status = 'reconnecting';
      this._reconnectAttempt = attempt;
      this.emitStateChange();
      this.emit('reconnect_attempt', attempt);
    });

    this.socket.io.on('reconnect_failed', () => {
      this._status = 'error';
      this._error = 'Reconnection failed';
      this.emitStateChange();
      this.emit('reconnect_failed');
    });

    // Authentication
    this.socket.on('authenticated', (data: { userId: string }) => {
      this._isAuthenticated = true;
      this._userId = data.userId;
      this.emitStateChange();
      this.emit('authenticated', data);
    });

    this.socket.on('auth_error', (error: { message: string }) => {
      this._isAuthenticated = false;
      this._error = error.message;
      this.emitStateChange();
      this.emit('auth_error', error);
    });

    // Messaging events
    this.socket.on('message', (message: Message) => {
      this.emit('message', message);
    });

    this.socket.on('message_sent', (data: { id: string; timestamp: Date }) => {
      this.emit('message_sent', data);
    });

    this.socket.on('message_delivered', (data: { messageId: string }) => {
      this.emit('message_delivered', data);
    });

    this.socket.on('message_read', (data: { messageId: string; conversationId: string }) => {
      this.emit('message_read', data);
    });

    // Typing
    this.socket.on('typing', (data: TypingIndicator) => {
      this.emit('typing', data);
    });

    // Presence
    this.socket.on('presence', (data: PresenceUpdate) => {
      this.emit('presence', data);
    });

    this.socket.on('presence_batch', (data: PresenceUpdate[]) => {
      this.emit('presence_batch', data);
    });

    // Matches & Likes
    this.socket.on('new_match', (data: MatchNotification) => {
      this.emit('new_match', data);
    });

    this.socket.on('new_like', (data: LikeNotification) => {
      this.emit('new_like', data);
    });

    // Calls
    this.socket.on('call_signal', (signal: CallSignal) => {
      this.emit('call_signal', signal);
    });

    // Generic
    this.socket.on('notification', (data: any) => {
      this.emit('notification', data);
    });

    this.socket.on('error', (error: { message: string; code?: string }) => {
      this._error = error.message;
      this.emitStateChange();
      this.emit('error', error);
    });
  }

  private emit<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          (callback as Function)(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  private emitStateChange(): void {
    const state = {
      status: this._status,
      isAuthenticated: this._isAuthenticated,
      userId: this._userId,
      error: this._error,
      reconnectAttempt: this._reconnectAttempt,
    };

    // Emit to any state change listeners
    const listeners = this.eventListeners.get('state_change' as any);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          (callback as Function)(state);
        } catch (error) {
          console.error('Error in state_change listener:', error);
        }
      });
    }
  }
}
