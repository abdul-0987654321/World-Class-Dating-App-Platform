export interface PromptEntity {
  id: string;
  question: string;
  category: string;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserPromptEntity {
  id: string;
  user_id: string;
  prompt_id: string;
  answer: string;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserPromptDto {
  user_id: string;
  prompt_id: string;
  answer: string;
  display_order?: number;
}

export interface UpdateUserPromptDto {
  answer?: string;
  display_order?: number;
}

export interface UserPromptResponse {
  id: string;
  prompt_id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
}

export interface PromptResponse {
  id: string;
  question: string;
  category: string;
}
