/**
 * Type definitions for Matching Service
 */

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        email: string;
        role?: 'user' | 'admin' | 'moderator' | 'support';
      };
    }
  }
}

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

export enum UserMode {
  DATE = 'date',
  FRIENDS = 'friends',
  NETWORK = 'network',
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
  mode: UserMode;
  createdAt: Date;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  status: MatchStatus;
  mode: UserMode;
  matchedAt: Date;
  lastActivityAt: Date;
  compatibilityScore?: number;
  expiresAt?: Date;
  extended?: boolean;
  extendedAt?: Date;
  expired?: boolean;
  firstMessageSent?: boolean;
  // Women-first messaging fields
  requiresWomenFirst?: boolean;
  womanUserId?: string;
  conversationInitiated?: boolean;
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
  mode?: UserMode;
  limit?: number;
  offset?: number;
  filters?: Partial<UserPreferences>;
}

export interface SwipeRequest {
  userId: string;
  targetUserId: string;
  action: SwipeAction;
  mode?: UserMode;
}

export interface MatchResponse {
  matched: boolean;
  match?: Match;
  message?: string;
}

// Re-export speed dating types
export * from './speed-dating.types';

// Re-export chemistry matching types
export * from './chemistry-matching.types';
