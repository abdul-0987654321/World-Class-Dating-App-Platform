// MongoDB document models

export interface MessageDocument {
  _id: string;
  matchId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'gif' | 'voice_note';
  mediaUrl?: string;
  readAt?: Date;
  deliveredAt?: Date;
  sentAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDocument {
  _id: string;
  matchId: string;
  participants: [string, string]; // User IDs
  lastMessage?: {
    content: string;
    senderId: string;
    sentAt: Date;
  };
  lastMessageAt?: Date;
  unreadCount: {
    [userId: string]: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDocument {
  _id: string;
  userId: string;
  type: 'new_match' | 'new_message' | 'new_like' | 'super_like' | 'profile_view';
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface AuditLogDocument {
  _id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
