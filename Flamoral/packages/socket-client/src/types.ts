/**
 * Socket Client Types
 */

export interface SocketConfig {
  url: string;
  path?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

export interface AuthPayload {
  token: string;
  userId: string;
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface MessageMetadata {
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  gifUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  videoUrl?: string;
  videoDuration?: number;
  thumbnailUrl?: string;
  fileSize?: number;
  fileName?: string;
  mimeType?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'gif' | 'audio' | 'video';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: string;
  metadata?: MessageMetadata;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceUpdate {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: Date;
}

export interface MatchNotification {
  matchId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
}

export interface LikeNotification {
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  timestamp: Date;
}

export interface CallSignalPayload {
  senderName?: string;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  reason?: string;
  answer?: RTCSessionDescriptionInit;
  offer?: RTCSessionDescriptionInit;
}

export interface GenericNotification {
  type: string;
  title: string;
  message: string;
  data?: Record<string, string | number | boolean>;
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high';
}

export interface CallSignal {
  type: 'call_initiate' | 'call_accept' | 'call_reject' | 'call_end';
  callId: string;
  senderId: string;
  receiverId: string;
  payload?: CallSignalPayload;
}

export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
  reconnect: (attempt: number) => void;
  reconnect_attempt: (attempt: number) => void;
  reconnect_failed: () => void;

  // Authentication
  authenticated: (data: { userId: string }) => void;
  auth_error: (error: { message: string }) => void;

  // Messaging
  message: (message: Message) => void;
  message_sent: (data: { id: string; timestamp: Date }) => void;
  message_delivered: (data: { messageId: string }) => void;
  message_read: (data: { messageId: string; conversationId: string }) => void;

  // Typing
  typing: (data: TypingIndicator) => void;

  // Presence
  presence: (data: PresenceUpdate) => void;
  presence_batch: (data: PresenceUpdate[]) => void;

  // Matches & Likes
  new_match: (data: MatchNotification) => void;
  new_like: (data: LikeNotification) => void;

  // Calls
  call_signal: (signal: CallSignal) => void;

  // Generic events
  notification: (data: GenericNotification) => void;
  error: (error: { message: string; code?: string }) => void;
}

export interface SocketState {
  status: ConnectionStatus;
  isAuthenticated: boolean;
  userId: string | null;
  error: string | null;
  reconnectAttempt: number;
}

export interface SocketStore extends SocketState {
  connect: (config: SocketConfig, auth: AuthPayload) => void;
  disconnect: () => void;
  sendMessage: (conversationId: string, content: string, contentType?: string) => Promise<string>;
  markAsRead: (conversationId: string, messageId: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  subscribeToPresence: (userIds: string[]) => void;
  unsubscribeFromPresence: (userIds: string[]) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
}
