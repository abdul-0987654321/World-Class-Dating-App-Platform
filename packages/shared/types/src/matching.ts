import type { Profile } from './profile';

export type SwipeAction = 'like' | 'pass' | 'super-like';

export interface DiscoveryProfile {
  id: string;
  userId: string;
  profile: Profile;
  distance?: number; // in km
  compatibilityScore?: number;
}

export interface Match {
  id: string;
  users: [string, string];
  profiles: [Profile, Profile];
  matchedAt: Date;
  lastMessageAt?: Date;
  unreadCount: number;
}

export interface DiscoveryFilters {
  ageMin?: number;
  ageMax?: number;
  distanceMax?: number;
  genders?: string[];
  orientations?: string[];
  relationshipGoals?: string[];
  education?: string[];
  interests?: string[];
}

export interface SwipeHistory {
  id: string;
  userId: string;
  targetUserId: string;
  action: SwipeAction;
  swipedAt: Date;
}
