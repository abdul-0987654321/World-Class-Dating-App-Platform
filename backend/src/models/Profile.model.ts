export interface ProfileModel {
  id: string;
  user_id: string;
  bio?: string;
  occupation?: string;
  education?: string;
  height?: number; // in cm
  relationship_goal?: string;
  sexual_orientation?: string;
  interests: string[]; // Array of interest tags
  languages: string[];
  hometown?: string;
  current_city?: string;
  zodiac_sign?: string;
  religion?: string;
  politics?: string;
  smoking?: 'never' | 'sometimes' | 'regularly' | 'prefer_not_to_say';
  drinking?: 'never' | 'sometimes' | 'regularly' | 'prefer_not_to_say';
  exercise?: 'never' | 'sometimes' | 'regularly' | 'prefer_not_to_say';
  pets?: string[]; // Array like ['dogs', 'cats']
  looking_for?: string[];
  personality_traits?: string[];
  profile_completion_percentage: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProfilePhoto {
  id: string;
  user_id: string;
  url: string;
  thumbnail_url?: string;
  order_index: number; // For ordering photos (0 = primary)
  is_verified: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected';
  moderation_notes?: string;
  uploaded_at: Date;
  created_at: Date;
}

export interface ProfileCreateInput {
  userId: string;
  bio?: string;
  occupation?: string;
  education?: string;
  height?: number;
  relationshipGoal?: string;
  sexualOrientation?: string;
  interests?: string[];
  languages?: string[];
}

export interface ProfileUpdateInput {
  bio?: string;
  occupation?: string;
  education?: string;
  height?: number;
  relationshipGoal?: string;
  sexualOrientation?: string;
  interests?: string[];
  languages?: string[];
  hometown?: string;
  currentCity?: string;
  zodiacSign?: string;
  religion?: string;
  politics?: string;
  smoking?: 'never' | 'sometimes' | 'regularly' | 'prefer_not_to_say';
  drinking?: 'never' | 'sometimes' | 'regularly' | 'prefer_not_to_say';
  exercise?: 'never' | 'sometimes' | 'regularly' | 'prefer_not_to_say';
  pets?: string[];
  lookingFor?: string[];
  personalityTraits?: string[];
}
