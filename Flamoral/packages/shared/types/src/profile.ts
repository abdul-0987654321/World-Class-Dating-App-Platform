import type {
  Gender,
  Orientation,
  RelationshipGoal,
  EducationLevel,
  DrinkingHabit,
  SmokingHabit,
  ExerciseFrequency,
  DietType,
  PetPreference,
  Location,
  Address
} from './common';

export interface Profile {
  id: string;
  userId: string;
  bio?: string;
  gender: Gender;
  orientation?: Orientation;
  relationshipGoal?: RelationshipGoal;
  age: number;
  height?: number; // in cm
  education?: EducationLevel;
  occupation?: string;
  company?: string;
  school?: string;
  location: Location;
  address?: Address;
  interests: string[];
  drinking?: DrinkingHabit;
  smoking?: SmokingHabit;
  exercise?: ExerciseFrequency;
  diet?: DietType;
  pets?: PetPreference;
  photos: Photo[];
  prompts: ProfilePrompt[];
  verified: {
    phone: boolean;
    photo: boolean;
    identity: boolean;
  };
  completionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Photo {
  id: string;
  url: string;
  order: number;
  isVerification?: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  uploadedAt: Date;
}

export interface ProfilePrompt {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface UpdateProfileRequest {
  bio?: string;
  orientation?: Orientation;
  relationshipGoal?: RelationshipGoal;
  height?: number;
  education?: EducationLevel;
  occupation?: string;
  company?: string;
  school?: string;
  interests?: string[];
  drinking?: DrinkingHabit;
  smoking?: SmokingHabit;
  exercise?: ExerciseFrequency;
  diet?: DietType;
  pets?: PetPreference;
  prompts?: Array<{ question: string; answer: string }>;
}

export interface UploadPhotoResponse {
  photo: Photo;
}
