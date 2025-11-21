export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  phoneNumber?: string;
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non-binary',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export interface Profile {
  id: string;
  userId: string;
  bio?: string;
  occupation?: string;
  education?: string;
  height?: number;
  location: Location;
  photos: Photo[];
  interests: string[];
  languages: string[];
  isPhotoVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  order: number;
  isVerified: boolean;
  uploadedAt: Date;
}

export interface Preferences {
  id: string;
  userId: string;
  ageMin: number;
  ageMax: number;
  distanceMax: number;
  genders: Gender[];
  showMe: ShowMePreference;
  createdAt: Date;
  updatedAt: Date;
}

export enum ShowMePreference {
  MEN = 'men',
  WOMEN = 'women',
  EVERYONE = 'everyone'
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
