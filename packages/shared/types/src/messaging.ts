export interface Conversation {
  id: string;
  matchId: string;
  participants: [string, string];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image' | 'gif';
  mediaUrl?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface SendMessageRequest {
  content: string;
  type?: 'text' | 'image' | 'gif';
  mediaUrl?: string;
}
