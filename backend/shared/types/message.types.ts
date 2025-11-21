export interface Conversation {
  id: string;
  matchId: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  metadata?: MessageMetadata;
  isRead: boolean;
  isDelivered: boolean;
  createdAt: Date;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  VOICE = 'voice',
  GIF = 'gif',
  STICKER = 'sticker'
}

export interface MessageMetadata {
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  size?: number;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: Date;
}
