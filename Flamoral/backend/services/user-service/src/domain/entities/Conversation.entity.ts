export interface ConversationEntity {
  id: string;
  user1_id: string;
  user2_id: string;
  match_id: string;
  last_message?: string;
  last_message_at?: Date;
  last_message_sender_id?: string;
  unread_count_user1: number;
  unread_count_user2: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateConversationDto {
  user1_id: string;
  user2_id: string;
  match_id: string;
}

export interface ConversationResponse {
  id: string;
  match_id: string;
  other_user: {
    id: string;
    name: string;
    photo_url?: string;
  };
  last_message?: string;
  last_message_at?: Date;
  last_message_sender_id?: string;
  unread_count: number;
  created_at: Date;
  updated_at: Date;
}
