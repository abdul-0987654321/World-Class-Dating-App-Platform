/**
 * Type definitions for Matching Service
 */

export enum SwipeAction {
  LIKE = 'like',
  PASS = 'pass',
  SUPER_LIKE = 'super_like',
}

export enum MatchStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  UNMATCHED = 'unmatched',
  BLOCKED = 'blocked',
}

export interface UserPreferences {
  ageMin: number;
  ageMax: number;
  maxDistance: number; // in kilometers
  genderPreference: string[];
  interests?: string[];
  dealbreakers?: string[];
}

export interface UserProfile {
  userId: string;
  age: number;
  gender: string;
  location: {
    latitude: number;
    longitude: number;
  };
  bio?: string;
  interests: string[];
  photos: string[];
  verified: boolean;
  premium: boolean;
}

export interface SwipeRecord {
  id: string;
  userId: string;
  targetUserId: string;
  action: SwipeAction;
  createdAt: Date;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  status: MatchStatus;
  matchedAt: Date;
  lastActivityAt: Date;
  compatibilityScore?: number;
}

export interface MatchScore {
  userId: string;
  score: number;
  factors: {
    distance: number;
    interests: number;
    activity: number;
    preferences: number;
  };
}

export interface RecommendationRequest {
  userId: string;
  limit?: number;
  offset?: number;
  filters?: Partial<UserPreferences>;
}

export interface SwipeRequest {
  userId: string;
  targetUserId: string;
  action: SwipeAction;
}

export interface MatchResponse {
  matched: boolean;
  match?: Match;
  message?: string;
}
