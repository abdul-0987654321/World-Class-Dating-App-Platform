import { UserMode } from './Profile.entity';

export interface UserModeEntity {
  id: string;
  user_id: string;
  mode: UserMode;
  enabled: boolean;
  preferences: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ModePreferences {
  // Date mode preferences
  date?: {
    age_min?: number;
    age_max?: number;
    distance_max?: number;
    show_me?: 'men' | 'women' | 'everyone';
  };

  // Friends mode preferences
  friends?: {
    age_min?: number;
    age_max?: number;
    distance_max?: number;
    gender_preference?: 'men' | 'women' | 'everyone' | 'same-gender';
    activity_preferences?: string[];
    group_size_preference?: 'one-on-one' | 'small-group' | 'large-group' | 'any';
  };

  // Network mode preferences
  network?: {
    industries?: string[];
    professions?: string[];
    experience_level?: 'entry' | 'mid' | 'senior' | 'executive';
    connection_type?: string[]; // ['mentor', 'mentee', 'peer', 'investor', etc.]
    distance_max?: number;
  };
}

export interface CreateUserModeDto {
  user_id: string;
  mode: UserMode;
  enabled?: boolean;
  preferences?: Record<string, any>;
}

export interface UpdateUserModeDto {
  enabled?: boolean;
  preferences?: Record<string, any>;
}

export interface UserModeResponse {
  id: string;
  user_id: string;
  mode: UserMode;
  enabled: boolean;
  preferences: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface UserModesListResponse {
  date: UserModeResponse;
  friends: UserModeResponse;
  network: UserModeResponse;
  current_mode: UserMode;
}
