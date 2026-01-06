export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface Location {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Address {
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export type Gender = 'male' | 'female' | 'non-binary' | 'other';
export type Orientation =
  | 'straight'
  | 'gay'
  | 'lesbian'
  | 'bisexual'
  | 'pansexual'
  | 'asexual'
  | 'other';
export type RelationshipGoal = 'casual' | 'serious' | 'friendship' | 'unsure';
export type EducationLevel =
  | 'high-school'
  | 'some-college'
  | 'bachelors'
  | 'masters'
  | 'phd'
  | 'other';
export type DrinkingHabit =
  | 'never'
  | 'rarely'
  | 'socially'
  | 'regularly'
  | 'prefer-not-to-say';
export type SmokingHabit =
  | 'never'
  | 'occasionally'
  | 'regularly'
  | 'prefer-not-to-say';
export type ExerciseFrequency =
  | 'never'
  | 'rarely'
  | 'sometimes'
  | 'regularly'
  | 'daily';
export type DietType = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'other';
export type PetPreference = 'dog' | 'cat' | 'both' | 'other' | 'none';
