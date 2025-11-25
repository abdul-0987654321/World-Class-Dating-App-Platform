/**
 * useSocket Hook
 * React hook for using the socket client
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { SocketClient } from './SocketClient';
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
} from './types';

interface UseSocketOptions {
  config: SocketConfig;
  auth?: AuthPayload | null;
  autoConnect?: boolean;
  onMessage?: (message: Message) => void;
  onTyping?: (data: TypingIndicator) => void;
  onPresence?: (data: PresenceUpdate) => void;
  onNewMatch?: (data: MatchNotification) => void;
  onNewLike?: (data: LikeNotification) => void;
  onCallSignal?: (signal: CallSignal) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

interface UseSocketReturn {
  status: ConnectionStatus;
  isConnected: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  error: string | null;
  connect: (auth: AuthPayload) => void;
  disconnect: () => void;
  sendMessage: (
    conversationId: string,
    content: string,
    contentType?: string
  ) => Promise<string>;
  markAsRead: (conversationId: string, messageId: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  subscribeToPresence: (userIds: string[]) => void;
  unsubscribeFromPresence: (userIds: string[]) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendCallSignal: (signal: Omit<CallSignal, 'senderId'>) => void;
}

export function useSocket(options: UseSocketOptions): UseSocketReturn {
  const {
    config,
    auth,
    autoConnect = true,
    onMessage,
    onTyping,
    onPresence,
    onNewMatch,
    onNewLike,
    onCallSignal,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const clientRef = useRef<SocketClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = new SocketClient(config);

    // State change listener
    clientRef.current.on('state_change' as any, (state: any) => {
      setStatus(state.status);
      setIsAuthenticated(state.isAuthenticated);
      setUserId(state.userId);
      setError(state.error);
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current.removeAllListeners();
      }
    };
  }, [config.url]);

  // Setup event listeners
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    if (onConnect) client.on('connect', onConnect);
    if (onDisconnect) client.on('disconnect', onDisconnect);
    if (onError) client.on('connect_error', onError);
    if (onMessage) client.on('message', onMessage);
    if (onTyping) client.on('typing', onTyping);
    if (onPresence) client.on('presence', onPresence);
    if (onNewMatch) client.on('new_match', onNewMatch);
    if (onNewLike) client.on('new_like', onNewLike);
    if (onCallSignal) client.on('call_signal', onCallSignal);

    return () => {
      if (onConnect) client.off('connect', onConnect);
      if (onDisconnect) client.off('disconnect', onDisconnect);
      if (onError) client.off('connect_error', onError);
      if (onMessage) client.off('message', onMessage);
      if (onTyping) client.off('typing', onTyping);
      if (onPresence) client.off('presence', onPresence);
      if (onNewMatch) client.off('new_match', onNewMatch);
      if (onNewLike) client.off('new_like', onNewLike);
      if (onCallSignal) client.off('call_signal', onCallSignal);
    };
  }, [onConnect, onDisconnect, onError, onMessage, onTyping, onPresence, onNewMatch, onNewLike, onCallSignal]);

  // Auto connect
  useEffect(() => {
    if (autoConnect && auth && clientRef.current) {
      clientRef.current.connect(auth);
    }
  }, [autoConnect, auth]);

  // Methods
  const connect = useCallback((authPayload: AuthPayload) => {
    clientRef.current?.connect(authPayload);
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  const sendMessage = useCallback(
    (conversationId: string, content: string, contentType?: string) => {
      if (!clientRef.current) {
        return Promise.reject(new Error('Socket not initialized'));
      }
      return clientRef.current.sendMessage(conversationId, content, contentType);
    },
    []
  );

  const markAsRead = useCallback((conversationId: string, messageId: string) => {
    clientRef.current?.markAsRead(conversationId, messageId);
  }, []);

  const setTyping = useCallback((conversationId: string, isTyping: boolean) => {
    clientRef.current?.setTyping(conversationId, isTyping);
  }, []);

  const subscribeToPresence = useCallback((userIds: string[]) => {
    clientRef.current?.subscribeToPresence(userIds);
  }, []);

  const unsubscribeFromPresence = useCallback((userIds: string[]) => {
    clientRef.current?.unsubscribeFromPresence(userIds);
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    clientRef.current?.joinConversation(conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    clientRef.current?.leaveConversation(conversationId);
  }, []);

  const sendCallSignal = useCallback((signal: Omit<CallSignal, 'senderId'>) => {
    clientRef.current?.sendCallSignal(signal);
  }, []);

  return {
    status,
    isConnected: status === 'connected' && isAuthenticated,
    isAuthenticated,
    userId,
    error,
    connect,
    disconnect,
    sendMessage,
    markAsRead,
    setTyping,
    subscribeToPresence,
    unsubscribeFromPresence,
    joinConversation,
    leaveConversation,
    sendCallSignal,
  };
}
