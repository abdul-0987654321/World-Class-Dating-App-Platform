export interface PreferencesEntity {
  id: string;
  user_id: string;
  age_min: number;
  age_max: number;
  distance_max: number;
  genders: string[];
  show_me: 'men' | 'women' | 'everyone';
  created_at: Date;
  updated_at: Date;
}

export interface CreatePreferencesDto {
  user_id: string;
  age_min?: number;
  age_max?: number;
  distance_max?: number;
  genders?: string[];
  show_me?: 'men' | 'women' | 'everyone';
}

export interface UpdatePreferencesDto {
  age_min?: number;
  age_max?: number;
  distance_max?: number;
  genders?: string[];
  show_me?: 'men' | 'women' | 'everyone';
}

export interface PreferencesResponse {
  id: string;
  user_id: string;
  age_min: number;
  age_max: number;
  distance_max: number;
  genders: string[];
  show_me: string;
  created_at: Date;
  updated_at: Date;
}
