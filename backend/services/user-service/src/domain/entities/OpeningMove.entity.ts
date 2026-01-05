export type OpeningMoveType = 'text' | 'image' | 'system';
export type TemplateCategory =
  | 'interests'
  | 'date_ideas'
  | 'travel'
  | 'fun'
  | 'conversation'
  | 'food'
  | 'entertainment';

export interface OpeningMoveEntity {
  id: string;
  user_id: string;
  type: OpeningMoveType;
  content?: string;
  image_url?: string;
  template_id?: string;
  order: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OpeningMoveTemplateEntity {
  id: string;
  category: TemplateCategory;
  content: string;
  is_system: boolean;
  popularity_score: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MatchOpeningResponseEntity {
  id: string;
  match_id: string;
  opening_move_id: string;
  responder_id: string;
  response_text: string;
  responded_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOpeningMoveDto {
  type: OpeningMoveType;
  content?: string;
  image_url?: string;
  template_id?: string;
  order?: number;
}

export interface UpdateOpeningMoveDto {
  content?: string;
  image_url?: string;
  order?: number;
  active?: boolean;
}

export interface CreateOpeningResponseDto {
  match_id: string;
  opening_move_id: string;
  response_text: string;
}

export interface OpeningMoveResponse {
  id: string;
  user_id: string;
  type: OpeningMoveType;
  content?: string;
  image_url?: string;
  template_id?: string;
  template?: OpeningMoveTemplateResponse;
  order: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OpeningMoveTemplateResponse {
  id: string;
  category: TemplateCategory;
  content: string;
  is_system: boolean;
  popularity_score: number;
}

export interface MatchWithOpeningMovesResponse {
  match_id: string;
  user1_id: string;
  user2_id: string;
  matched_at: Date;
  opening_moves: OpeningMoveResponse[];
  has_responded: boolean;
  response?: {
    id: string;
    opening_move_id: string;
    response_text: string;
    responded_at: Date;
  };
}
