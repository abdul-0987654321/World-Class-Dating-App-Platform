/**
 * useTypingIndicator Hook
 *
 * A dedicated hook for managing typing indicators with WebSocket integration.
 * Features:
 * - Real-time typing updates via WebSocket
 * - Automatic debouncing of typing events
 * - Auto-stop after inactivity timeout
 * - HTTP fallback when WebSocket unavailable
 * - Stale user cleanup
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../services/api.client';

export interface TypingUser {
  userId: string;
  userName?: string;
  avatarUrl?: string;
  startedAt: Date;
}

export interface TypingIndicatorOptions {
  /** The conversation ID to track typing for */
  conversationId: string;
  /** Socket instance for real-time updates */
  socket?: {
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => void;
    connected?: boolean;
  } | null;
  /** Whether socket is connected */
  isSocketConnected?: boolean;
  /** Time in ms before auto-stopping typing (default: 3000) */
  autoStopDelay?: number;
  /** Time in ms before considering a typing user stale (default: 5000) */
  staleTimeout?: number;
  /** Minimum time between typing start events (default: 2000) */
  debounceDelay?: number;
  /** Callback when typing users change */
  onTypingUsersChange?: (users: TypingUser[]) => void;
}

export interface UseTypingIndicatorReturn {
  /** List of users currently typing */
  typingUsers: TypingUser[];
  /** Whether any users are typing */
  isAnyoneTyping: boolean;
  /** Start typing indicator (debounced) */
  startTyping: () => void;
  /** Stop typing indicator immediately */
  stopTyping: () => void;
  /** Handle input change (calls startTyping) */
  handleInputChange: () => void;
  /** Handle input blur (calls stopTyping) */
  handleInputBlur: () => void;
  /** Format typing text (e.g., "John is typing", "John and Jane are typing") */
  getTypingText: () => string;
}

export function useTypingIndicator(options: TypingIndicatorOptions): UseTypingIndicatorReturn {
  const {
    conversationId,
    socket,
    isSocketConnected = false,
    autoStopDelay = 3000,
    staleTimeout = 5000,
    debounceDelay = 2000,
    onTypingUsersChange,
  } = options;

  // State
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // Refs for tracking state without re-renders
  const isTypingRef = useRef(false);
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEventRef = useRef<number>(0);
  const conversationIdRef = useRef(conversationId);

  // Update ref when conversationId changes
  useEffect(() => {
    conversationIdRef.current = conversationId;
    // Clear typing state when conversation changes
    setTypingUsers([]);
    if (isTypingRef.current) {
      isTypingRef.current = false;
    }
  }, [conversationId]);

  // Listen for typing indicators from WebSocket
  useEffect(() => {
    if (!socket || !isSocketConnected) return;

    const handleTypingIndicator = (data: {
      conversationId: string;
      userId: string;
      userName?: string;
      avatarUrl?: string;
      isTyping: boolean;
      timestamp: string | Date;
    }) => {
      // Only process events for current conversation
      if (data.conversationId !== conversationIdRef.current) return;

      setTypingUsers((prev) => {
        if (data.isTyping) {
          // Add or update typing user
          const existingIndex = prev.findIndex((u) => u.userId === data.userId);
          const newUser: TypingUser = {
            userId: data.userId,
            userName: data.userName,
            avatarUrl: data.avatarUrl,
            startedAt: new Date(data.timestamp),
          };

          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newUser;
            return updated;
          }
          return [...prev, newUser];
        } else {
          // Remove user from typing
          return prev.filter((u) => u.userId !== data.userId);
        }
      });
    };

    // Listen to both event names for compatibility
    socket.on('typing:indicator', handleTypingIndicator);
    socket.on('typing', handleTypingIndicator);

    return () => {
      socket.off('typing:indicator', handleTypingIndicator);
      socket.off('typing', handleTypingIndicator);
    };
  }, [socket, isSocketConnected]);

  // Cleanup stale typing users periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const filtered = prev.filter((user) => now - user.startedAt.getTime() < staleTimeout);
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [staleTimeout]);

  // Notify parent when typing users change
  useEffect(() => {
    onTypingUsersChange?.(typingUsers);
  }, [typingUsers, onTypingUsersChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
      // Send stop typing on unmount if currently typing
      if (isTypingRef.current) {
        sendTypingEvent(false);
      }
    };
  }, []);

  /**
   * Send typing event via WebSocket or HTTP
   */
  const sendTypingEvent = useCallback(
    (isTyping: boolean) => {
      if (!conversationIdRef.current) return;

      if (socket && isSocketConnected) {
        // Use WebSocket
        if (isTyping) {
          socket.emit('typing:start', { conversationId: conversationIdRef.current });
        } else {
          socket.emit('typing:stop', { conversationId: conversationIdRef.current });
        }
      } else {
        // Fallback to HTTP
        apiClient
          .post(`/api/v1/conversations/${conversationIdRef.current}/typing`, {
            isTyping,
          })
          .catch((error) => {
            console.error('Failed to send typing indicator:', error);
          });
      }
    },
    [socket, isSocketConnected]
  );

  /**
   * Start typing indicator (debounced)
   */
  const startTyping = useCallback(() => {
    const now = Date.now();

    // Clear existing auto-stop timeout
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
    }

    // Only send typing start if not already typing or debounce time passed
    if (!isTypingRef.current || now - lastTypingEventRef.current >= debounceDelay) {
      isTypingRef.current = true;
      lastTypingEventRef.current = now;
      sendTypingEvent(true);
    }

    // Set auto-stop timeout
    autoStopTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTypingEvent(false);
      }
    }, autoStopDelay);
  }, [sendTypingEvent, autoStopDelay, debounceDelay]);

  /**
   * Stop typing indicator immediately
   */
  const stopTyping = useCallback(() => {
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingEvent(false);
    }
  }, [sendTypingEvent]);

  /**
   * Handle input change event
   */
  const handleInputChange = useCallback(() => {
    startTyping();
  }, [startTyping]);

  /**
   * Handle input blur event
   */
  const handleInputBlur = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  /**
   * Format typing text based on users
   */
  const getTypingText = useCallback((): string => {
    if (typingUsers.length === 0) {
      return '';
    }

    const names = typingUsers.map((u) => u.userName || 'Someone');

    if (names.length === 1) {
      return `${names[0]} is typing...`;
    }

    if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    }

    return `${names[0]} and ${names.length - 1} others are typing...`;
  }, [typingUsers]);

  return {
    typingUsers,
    isAnyoneTyping: typingUsers.length > 0,
    startTyping,
    stopTyping,
    handleInputChange,
    handleInputBlur,
    getTypingText,
  };
}

export default useTypingIndicator;
