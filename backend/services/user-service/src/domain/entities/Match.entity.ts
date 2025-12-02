export interface MatchEntity {
  id: string;
  user1_id: string;
  user2_id: string;
  matched_at: Date;
  is_active: boolean;
  unmatched_by?: string;
  unmatched_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMatchDto {
  user1_id: string;
  user2_id: string;
}

export interface MatchResponse {
  id: string;
  matched_user: {
    id: string;
    first_name: string;
    last_name: string;
    age: number;
    bio?: string;
    primary_photo?: string;
    city?: string;
  };
  matched_at: Date;
  is_active: boolean;
}

export interface MatchDetailResponse extends MatchResponse {
  matched_user: {
    id: string;
    first_name: string;
    last_name: string;
    age: number;
    bio?: string;
    photos: string[];
    city?: string;
    occupation?: string;
    interests: string[];
    prompts: Array<{
      question: string;
      answer: string;
    }>;
  };
  opening_moves?: Array<{
    id: string;
    type: string;
    content?: string;
    image_url?: string;
    template?: {
      id: string;
      category: string;
      content: string;
    };
  }>;
  opening_response?: {
    id: string;
    opening_move_id: string;
    response_text: string;
    responded_at: Date;
  };
  requires_response?: boolean;
}
