/**
 * Type definitions for Messaging Service
 */

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  VOICE = 'voice',
  FILE = 'file',
  GIF = 'gif',
  GIFT = 'gift',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
  DELETED = 'deleted',
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string; // Encrypted content
  type: MessageType;
  status: MessageStatus;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: {
    mediaUrl?: string;
    thumbnailUrl?: string;
    duration?: number; // for audio/video
    fileSize?: number;
    fileName?: string;
    mimeType?: string;
    gift?: any; // For gift messages
    transactionId?: string;
  };
  replyTo?: string; // Message ID being replied to
  deleted?: boolean;
  deletedAt?: Date;
  deletedFor?: string[]; // User IDs who have deleted this message (soft delete)
  // Pinned message support
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;
  // Message Before Match feature (Premium+, Elite only)
  // When true, indicates this message was sent before users had a mutual match
  isBeforeMatch?: boolean;
  // End-to-end encryption metadata
  encryption?: {
    isEncrypted: boolean;
    iv?: string; // Initialization vector for AES-GCM
    authTag?: string; // Authentication tag for AES-GCM
    version?: number; // Encryption protocol version (for future updates)
  };
}

export interface Conversation {
  id: string;
  participantIds: string[]; // Always 2 users for 1-on-1 chat
  matchId: string; // Reference to match from matching service
  status: ConversationStatus;
  lastMessageId?: string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: {
    [userId: string]: number;
  };
  metadata?: {
    user1Id: string;
    user2Id: string;
    user1Name?: string;
    user2Name?: string;
    user1Photo?: string;
    user2Photo?: string;
  };
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface OnlineStatus {
  userId: string;
  online: boolean;
  lastSeen?: Date;
  socketId?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  receiverId: string;
  content: string;
  type: MessageType;
  metadata?: Message['metadata'];
  replyTo?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

export interface ConversationListRequest {
  userId: string;
  limit?: number;
  offset?: number;
  status?: ConversationStatus;
}

export interface MessageHistoryRequest {
  conversationId: string;
  userId: string;
  limit?: number;
  before?: string; // Message ID for pagination
}

export interface MarkAsReadRequest {
  conversationId: string;
  userId: string;
  messageIds?: string[]; // If not provided, marks all as read
}

export interface DeleteMessageRequest {
  messageId: string;
  userId: string;
  deleteForBoth?: boolean; // true = delete for both users, false = only for sender
}

// Socket.io event types
export interface ClientToServerEvents {
  'message:send': (data: SendMessageRequest, callback: (response: SendMessageResponse) => void) => void;
  'message:read': (data: MarkAsReadRequest) => void;
  'message:delete': (data: DeleteMessageRequest) => void;
  'typing:start': (data: { conversationId: string }) => void;
  'typing:stop': (data: { conversationId: string }) => void;
  'conversation:join': (data: { conversationId: string }) => void;
  'conversation:leave': (data: { conversationId: string }) => void;
  // Media messaging events
  'message:photo': (data: { conversationId: string; receiverId: string; mediaUrl: string; thumbnailUrl: string; width: number; height: number }, callback: (response: SendMessageResponse) => void) => void;
  'message:voice': (data: { conversationId: string; receiverId: string; mediaUrl: string; duration: number; waveform: number[] }, callback: (response: SendMessageResponse) => void) => void;
  'message:gif': (data: { conversationId: string; receiverId: string; gifUrl: string; previewUrl: string; giphyId?: string; tenorId?: string }, callback: (response: SendMessageResponse) => void) => void;
}

export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:delivered': (data: { messageId: string; deliveredAt: Date }) => void;
  'message:read': (data: { messageIds: string[]; readAt: Date }) => void;
  'message:deleted': (data: { messageId: string; conversationId: string }) => void;
  'typing:indicator': (data: TypingIndicator) => void;
  'user:online': (data: OnlineStatus) => void;
  'user:offline': (data: OnlineStatus) => void;
  'error': (error: { message: string; code?: string }) => void;
  // Media message events (use existing message:new for simplicity)
  'message:media:processing': (data: { messageId: string; conversationId: string; progress: number }) => void;
  'message:media:ready': (data: { messageId: string; conversationId: string; mediaUrl: string; thumbnailUrl?: string }) => void;
  'message:media:failed': (data: { messageId: string; conversationId: string; error: string }) => void;
}

export interface UserSocketMap {
  [userId: string]: string; // userId -> socketId
}

// Socket.IO TypeScript augmentation for socket.data
// Note: Socket.data typing is handled by socket.io's built-in SocketData generic
// Custom data access can use: (socket as any).data.userId
