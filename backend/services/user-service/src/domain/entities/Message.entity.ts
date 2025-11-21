export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface MessageEntity {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  read_at?: Date;
  status: MessageStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMessageDto {
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
}

export interface MessageResponse {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  read_at?: Date;
  status: MessageStatus;
  created_at: Date;
}

export interface SendMessageDto {
  receiver_id: string;
  content: string;
}
