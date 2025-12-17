export type SmokingStatus = 'never' | 'sometimes' | 'regularly';
export type DrinkingStatus = 'never' | 'socially' | 'regularly';
export type ExerciseFrequency = 'never' | 'sometimes' | 'regularly' | 'daily';
export type DietType = 'anything' | 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'other';
export type PetsType = 'none' | 'dog' | 'cat' | 'both' | 'other';
export type RelationshipType = 'casual' | 'serious' | 'friendship' | 'unsure';
export type UserMode = 'date' | 'friends' | 'network';
export type GroupSizePreference = 'one-on-one' | 'small-group' | 'large-group' | 'any';

export interface ProfileEntity {
  id: string;
  user_id: string;
  bio?: string;
  occupation?: string;
  education?: string;
  height?: number;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  interests: string[];
  languages: string[];
  is_photo_verified: boolean;

  // Lifestyle fields
  smoking?: SmokingStatus;
  drinking?: DrinkingStatus;
  exercise?: ExerciseFrequency;
  diet?: DietType;
  pets?: PetsType;

  // Additional profile fields
  relationship_type?: RelationshipType;
  has_children: boolean;
  wants_children?: boolean;
  zodiac_sign?: string;
  religion?: string;
  politics?: string;

  // Profile completion
  profile_completion_percentage: number;
  profile_completed: boolean;

  // Activity tracking
  last_active_at?: Date;
  view_count: number;
  like_count: number;

  // Friends Mode fields
  friend_looking_for?: string[]; // ['hiking buddy', 'gym partner', 'concert friend', etc.]
  friend_activities?: string[]; // Activities they want to do with friends
  friend_availability?: string; // When they're available to hang out
  friend_group_size_preference?: GroupSizePreference;

  // Network Mode fields
  network_industry?: string;
  network_profession?: string;
  network_company?: string;
  network_job_title?: string;
  network_years_experience?: number;
  network_skills?: string[];
  network_looking_for?: string[]; // ['mentor', 'mentee', 'collaborator', 'co-founder', etc.]
  network_linkedin_url?: string;
  network_portfolio_url?: string;
  network_career_goals?: string;
  network_open_to_opportunities?: boolean;

  created_at: Date;
  updated_at: Date;
}

export interface CreateProfileDto {
  user_id: string;
  bio?: string;
  occupation?: string;
  education?: string;
  height?: number;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  interests?: string[];
  languages?: string[];
}

export interface UpdateProfileDto {
  bio?: string;
  occupation?: string;
  education?: string;
  height?: number;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  interests?: string[];
  languages?: string[];

  // Lifestyle fields
  smoking?: SmokingStatus;
  drinking?: DrinkingStatus;
  exercise?: ExerciseFrequency;
  diet?: DietType;
  pets?: PetsType;

  // Additional profile fields
  relationship_type?: RelationshipType;
  has_children?: boolean;
  wants_children?: boolean;
  zodiac_sign?: string;
  religion?: string;
  politics?: string;

  // Friends Mode fields
  friend_looking_for?: string[];
  friend_activities?: string[];
  friend_availability?: string;
  friend_group_size_preference?: GroupSizePreference;

  // Network Mode fields
  network_industry?: string;
  network_profession?: string;
  network_company?: string;
  network_job_title?: string;
  network_years_experience?: number;
  network_skills?: string[];
  network_looking_for?: string[];
  network_linkedin_url?: string;
  network_portfolio_url?: string;
  network_career_goals?: string;
  network_open_to_opportunities?: boolean;
}

export interface ProfileResponse {
  id: string;
  user_id: string;
  bio?: string;
  occupation?: string;
  education?: string;
  height?: number;
  city?: string;
  state?: string;
  country?: string;
  interests: string[];
  languages: string[];
  is_photo_verified: boolean;

  // Lifestyle fields
  smoking?: SmokingStatus;
  drinking?: DrinkingStatus;
  exercise?: ExerciseFrequency;
  diet?: DietType;
  pets?: PetsType;

  // Additional profile fields
  relationship_type?: RelationshipType;
  has_children: boolean;
  wants_children?: boolean;
  zodiac_sign?: string;
  religion?: string;
  politics?: string;

  // Profile completion
  profile_completion_percentage: number;
  profile_completed: boolean;

  // Activity
  last_active_at?: Date;

  // Friends Mode fields
  friend_looking_for?: string[];
  friend_activities?: string[];
  friend_availability?: string;
  friend_group_size_preference?: GroupSizePreference;

  // Network Mode fields
  network_industry?: string;
  network_profession?: string;
  network_company?: string;
  network_job_title?: string;
  network_years_experience?: number;
  network_skills?: string[];
  network_looking_for?: string[];
  network_linkedin_url?: string;
  network_portfolio_url?: string;
  network_career_goals?: string;
  network_open_to_opportunities?: boolean;

  created_at: Date;
  updated_at: Date;
}
