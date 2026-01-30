/**
 * WebSocket Service for Real-time Messaging
 * Handles real-time message delivery, typing indicators, read receipts, and presence
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../api/config';
import logger from '../../utils/logger';

// Dev-only logging helper using structured logger
const devLog = (message: string, context?: Record<string, any>) => {
  logger.debug(message, context);
};

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

export interface CoinsUpdatedEvent {
  userId: string;
  balance: number;
  change: number;
  reason: string;
}

export interface StreakUpdatedEvent {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string;
}

export interface RewardClaimedEvent {
  userId: string;
  rewardId: string;
  rewardType: string;
  value: number;
  claimedAt: string;
}

export interface RewardMilestoneEvent {
  userId: string;
  milestoneId: string;
  milestoneName: string;
  reward: {
    type: string;
    value: number;
  };
  achievedAt: string;
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
      devLog('[WebSocket] Already connected');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const wsUrl = process.env.WEBSOCKET_URL || 'wss://ws.flamoral.com';

      devLog('[WebSocket] Connecting to', { wsUrl });

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
      logger.error('[WebSocket] Connection error', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      devLog('[WebSocket] Disconnecting');
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
      devLog('[WebSocket] Connected');
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      devLog('[WebSocket] Disconnected', { reason });
      this.emit('connection', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      logger.error('[WebSocket] Connection error', error instanceof Error ? error : undefined);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('[WebSocket] Max reconnection attempts reached');
        this.emit('connection', { status: 'failed', error: error.message });
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      devLog('[WebSocket] Reconnected', { attemptNumber });
      this.reconnectAttempts = 0;
    });

    // Message events
    this.socket.on('message:new', (data: MessageEvent) => {
      devLog('[WebSocket] New message', { conversationId: data.conversationId });
      this.emit('message:new', data);
    });

    this.socket.on('message:delivered', (data: { messageId: string; conversationId: string }) => {
      devLog('[WebSocket] Message delivered', { messageId: data.messageId });
      this.emit('message:delivered', data);
    });

    this.socket.on('message:read', (data: ReadReceiptEvent) => {
      devLog('[WebSocket] Messages read', { conversationId: data.conversationId });
      this.emit('message:read', data);
    });

    // Typing indicators
    this.socket.on('typing:start', (data: TypingEvent) => {
      devLog('[WebSocket] User typing', { userId: data.userId, conversationId: data.conversationId });
      this.emit('typing:start', data);
    });

    this.socket.on('typing:stop', (data: TypingEvent) => {
      devLog('[WebSocket] User stopped typing', { userId: data.userId, conversationId: data.conversationId });
      this.emit('typing:stop', data);
    });

    // Presence events
    this.socket.on('presence:update', (data: PresenceEvent) => {
      devLog('[WebSocket] Presence update', { userId: data.userId, status: data.status });
      this.emit('presence:update', data);
    });

    // Match events
    this.socket.on('match:new', (data: any) => {
      devLog('[WebSocket] New match', { data });
      this.emit('match:new', data);
    });

    // Reward/Gamification events
    this.socket.on('coins:updated', (data: CoinsUpdatedEvent) => {
      devLog('[WebSocket] Coins updated', { userId: data.userId, balance: data.balance });
      this.emit('coins:updated', data);
    });

    this.socket.on('streak:updated', (data: StreakUpdatedEvent) => {
      devLog('[WebSocket] Streak updated', { userId: data.userId, currentStreak: data.currentStreak });
      this.emit('streak:updated', data);
    });

    this.socket.on('reward:claimed', (data: RewardClaimedEvent) => {
      devLog('[WebSocket] Reward claimed', { userId: data.userId, rewardId: data.rewardId });
      this.emit('reward:claimed', data);
    });

    this.socket.on('reward:milestone', (data: RewardMilestoneEvent) => {
      devLog('[WebSocket] Reward milestone', { userId: data.userId, milestoneId: data.milestoneId });
      this.emit('reward:milestone', data);
    });
  }

  // Send message
  sendMessage(
    conversationId: string,
    message: {
      content: string;
      type: 'text' | 'image' | 'gif' | 'voice';
      mediaUrl?: string;
      tempId?: string;
    }
  ): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    devLog('[WebSocket] Sending message', { conversationId, message });
    this.socket.emit('message:send', { conversationId, message });
  }

  // Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (!this.socket?.connected) {
      logger.warn('[WebSocket] Cannot send typing indicator - not connected');
      return;
    }

    this.socket.emit('typing', { conversationId, isTyping });
  }

  // Mark messages as read
  markAsRead(conversationId: string, messageIds: string[]): void {
    if (!this.socket?.connected) {
      logger.warn('[WebSocket] Cannot mark as read - not connected');
      return;
    }

    devLog('[WebSocket] Marking messages as read', { conversationId, messageIds });
    this.socket.emit('message:read', { conversationId, messageIds });
  }

  // Join conversation room
  joinConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      logger.warn('[WebSocket] Cannot join conversation - not connected');
      return;
    }

    devLog('[WebSocket] Joining conversation', { conversationId });
    this.socket.emit('conversation:join', { conversationId });
  }

  // Leave conversation room
  leaveConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      logger.warn('[WebSocket] Cannot leave conversation - not connected');
      return;
    }

    devLog('[WebSocket] Leaving conversation', { conversationId });
    this.socket.emit('conversation:leave', { conversationId });
  }

  // Update presence
  updatePresence(status: 'online' | 'offline' | 'away'): void {
    if (!this.socket?.connected) {
      logger.warn('[WebSocket] Cannot update presence - not connected');
      return;
    }

    devLog('[WebSocket] Updating presence', { status });
    this.socket.emit('presence:update', { status });
  }

  // Subscribe to reward events
  subscribeToRewards(): void {
    if (!this.socket?.connected) {
      logger.warn('[WebSocket] Cannot subscribe to rewards - not connected');
      return;
    }

    devLog('[WebSocket] Subscribing to rewards');
    this.socket.emit('reward:subscribe');
  }

  // Unsubscribe from reward events
  unsubscribeFromRewards(): void {
    if (!this.socket?.connected) {
      logger.warn('[WebSocket] Cannot unsubscribe from rewards - not connected');
      return;
    }

    devLog('[WebSocket] Unsubscribing from rewards');
    this.socket.emit('reward:unsubscribe');
  }

  // Claim a reward
  claimReward(rewardId: string): void {
    if (!this.socket?.connected) {
      logger.warn('[WebSocket] Cannot claim reward - not connected');
      return;
    }

    devLog('[WebSocket] Claiming reward', { rewardId });
    this.socket.emit('reward:claim', { rewardId });
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
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error('[WebSocket] Error in event callback', error instanceof Error ? error : undefined);
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
