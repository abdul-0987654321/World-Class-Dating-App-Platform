import { io, Socket } from 'socket.io-client';

type MessageHandler = (message: any) => void;
type TypingHandler = (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
type OnlineStatusHandler = (data: { userId: string; isOnline: boolean }) => void;
type MatchHandler = (match: any) => void;

// Reward event types
type CoinUpdateHandler = (data: {
  newBalance: number;
  change: number;
  reason: string;
  transactionId?: string;
  timestamp: string;
}) => void;

type StreakUpdateHandler = (data: {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string;
  streakBonus?: number;
  timestamp: string;
}) => void;

type RewardClaimedHandler = (data: {
  rewardId: string;
  rewardType: string;
  userId: string;
  timestamp: string;
}) => void;

type RewardMilestoneHandler = (data: {
  milestone: string;
  reward: { type: string; amount: number };
  message: string;
  timestamp: string;
}) => void;

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private typingHandlers: TypingHandler[] = [];
  private onlineStatusHandlers: OnlineStatusHandler[] = [];
  private matchHandlers: MatchHandler[] = [];
  private coinUpdateHandlers: CoinUpdateHandler[] = [];
  private streakUpdateHandlers: StreakUpdateHandler[] = [];
  private rewardClaimedHandlers: RewardClaimedHandler[] = [];
  private rewardMilestoneHandlers: RewardMilestoneHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

      this.socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to socket server'));
        }
      });

      this.socket.on('disconnect', () => {
        // Socket disconnected
      });

      // Message handlers
      this.socket.on('message:new', (message) => {
        const handlers = this.messageHandlers.get(message.conversationId) || [];
        handlers.forEach(handler => handler(message));

        // Also notify global handlers
        const globalHandlers = this.messageHandlers.get('*') || [];
        globalHandlers.forEach(handler => handler(message));
      });

      this.socket.on('message:delivered', () => {
        // Message delivered
      });

      this.socket.on('message:read', () => {
        // Message read
      });

      // Typing handlers
      this.socket.on('typing', (data) => {
        this.typingHandlers.forEach(handler => handler(data));
      });

      // Online status handlers
      this.socket.on('presence:online', (data) => {
        this.onlineStatusHandlers.forEach(handler => handler({ ...data, isOnline: true }));
      });

      this.socket.on('presence:offline', (data) => {
        this.onlineStatusHandlers.forEach(handler => handler({ ...data, isOnline: false }));
      });

      // Match handlers
      this.socket.on('match:new', (match) => {
        this.matchHandlers.forEach(handler => handler(match));
      });

      // Reward event handlers (real-time balance & streak updates)
      this.socket.on('coins:updated', (data) => {
        this.coinUpdateHandlers.forEach(handler => handler(data));
      });

      this.socket.on('streak:updated', (data) => {
        this.streakUpdateHandlers.forEach(handler => handler(data));
      });

      this.socket.on('reward:claimed', (data) => {
        this.rewardClaimedHandlers.forEach(handler => handler(data));
      });

      this.socket.on('reward:milestone', (data) => {
        this.rewardMilestoneHandlers.forEach(handler => handler(data));
      });

      // Error handling
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.messageHandlers.clear();
    this.typingHandlers = [];
    this.onlineStatusHandlers = [];
    this.matchHandlers = [];
    this.coinUpdateHandlers = [];
    this.streakUpdateHandlers = [];
    this.rewardClaimedHandlers = [];
    this.rewardMilestoneHandlers = [];
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Join a conversation room
  joinConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('conversation:join', { conversationId });
    }
  }

  // Leave a conversation room
  leaveConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('conversation:leave', { conversationId });
    }
  }

  // Send a message
  sendMessage(conversationId: string, content: string, type: string = 'text'): void {
    if (this.socket?.connected) {
      this.socket.emit('message:send', {
        conversationId,
        content,
        type,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', { conversationId, isTyping });
    }
  }

  // Mark messages as read
  markAsRead(conversationId: string, messageIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('message:markRead', { conversationId, messageIds });
    }
  }

  // Subscribe to messages for a conversation
  onMessage(conversationId: string, handler: MessageHandler): () => void {
    const handlers = this.messageHandlers.get(conversationId) || [];
    handlers.push(handler);
    this.messageHandlers.set(conversationId, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.messageHandlers.get(conversationId) || [];
      const index = currentHandlers.indexOf(handler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
        this.messageHandlers.set(conversationId, currentHandlers);
      }
    };
  }

  // Subscribe to all messages
  onAnyMessage(handler: MessageHandler): () => void {
    return this.onMessage('*', handler);
  }

  // Subscribe to typing indicators
  onTyping(handler: TypingHandler): () => void {
    this.typingHandlers.push(handler);
    return () => {
      const index = this.typingHandlers.indexOf(handler);
      if (index > -1) {
        this.typingHandlers.splice(index, 1);
      }
    };
  }

  // Subscribe to online status changes
  onOnlineStatus(handler: OnlineStatusHandler): () => void {
    this.onlineStatusHandlers.push(handler);
    return () => {
      const index = this.onlineStatusHandlers.indexOf(handler);
      if (index > -1) {
        this.onlineStatusHandlers.splice(index, 1);
      }
    };
  }

  // Subscribe to new matches
  onMatch(handler: MatchHandler): () => void {
    this.matchHandlers.push(handler);
    return () => {
      const index = this.matchHandlers.indexOf(handler);
      if (index > -1) {
        this.matchHandlers.splice(index, 1);
      }
    };
  }

  // Request online status for specific users
  requestOnlineStatus(userIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('get_online_status', { userIds });
    }
  }

  // ==========================================
  // Reward Event Subscriptions
  // ==========================================

  // Subscribe to coin balance updates
  onCoinUpdate(handler: CoinUpdateHandler): () => void {
    this.coinUpdateHandlers.push(handler);
    return () => {
      const index = this.coinUpdateHandlers.indexOf(handler);
      if (index > -1) {
        this.coinUpdateHandlers.splice(index, 1);
      }
    };
  }

  // Subscribe to streak updates
  onStreakUpdate(handler: StreakUpdateHandler): () => void {
    this.streakUpdateHandlers.push(handler);
    return () => {
      const index = this.streakUpdateHandlers.indexOf(handler);
      if (index > -1) {
        this.streakUpdateHandlers.splice(index, 1);
      }
    };
  }

  // Subscribe to reward claimed events
  onRewardClaimed(handler: RewardClaimedHandler): () => void {
    this.rewardClaimedHandlers.push(handler);
    return () => {
      const index = this.rewardClaimedHandlers.indexOf(handler);
      if (index > -1) {
        this.rewardClaimedHandlers.splice(index, 1);
      }
    };
  }

  // Subscribe to reward milestone events
  onRewardMilestone(handler: RewardMilestoneHandler): () => void {
    this.rewardMilestoneHandlers.push(handler);
    return () => {
      const index = this.rewardMilestoneHandlers.indexOf(handler);
      if (index > -1) {
        this.rewardMilestoneHandlers.splice(index, 1);
      }
    };
  }

  // Subscribe to reward updates (joins rewards room)
  subscribeToRewards(): void {
    if (this.socket?.connected) {
      this.socket.emit('reward:subscribe');
    }
  }

  // Unsubscribe from reward updates
  unsubscribeFromRewards(): void {
    if (this.socket?.connected) {
      this.socket.emit('reward:unsubscribe');
    }
  }

  // Claim a reward via WebSocket
  claimReward(rewardId: string, rewardType: string, csrfToken: string): void {
    if (this.socket?.connected) {
      this.socket.emit('reward:claim', { rewardId, rewardType, csrfToken });
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
