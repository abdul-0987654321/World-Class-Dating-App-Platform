export type SmokingStatus = 'never' | 'sometimes' | 'regularly';
export type DrinkingStatus = 'never' | 'socially' | 'regularly';
export type ExerciseFrequency = 'never' | 'sometimes' | 'regularly' | 'daily';
export type DietType = 'anything' | 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'other';
export type PetsType = 'none' | 'dog' | 'cat' | 'both' | 'other';
export type RelationshipType = 'casual' | 'serious' | 'friendship' | 'unsure';

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

  created_at: Date;
  updated_at: Date;
}
