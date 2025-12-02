/**
 * Discovery and Matching Types
 */

export interface DiscoveryProfile {
  id: string;
  userId: string;
  name: string;
  age: number;
  bio?: string;
  photos: ProfilePhoto[];
  location: Location;
  distance?: number; // Distance from current user in km
  occupation?: string;
  company?: string;
  education?: string;
  verified: boolean;
  interests: string[];
  lookingFor?: 'casual' | 'serious' | 'friendship' | 'not-sure';
  height?: number; // in cm
  relationshipGoal?: string;
  zodiacSign?: string;
  smoking?: 'yes' | 'no' | 'sometimes';
  drinking?: 'yes' | 'no' | 'sometimes';
  exercise?: 'active' | 'sometimes' | 'rarely';
  pets?: string[];
  languages?: string[];
  videoProfileUrl?: string;
  answerPrompts?: ProfilePrompt[];
  spotifyArtists?: string[];
  instagramHandle?: string;
  lastActive?: string;
  matchScore?: number; // 0-100 compatibility score
  commonInterests?: string[];
}

export interface ProfilePhoto {
  id: string;
  url: string;
  order: number;
  isVerified?: boolean;
}

export interface Location {
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProfilePrompt {
  id: string;
  question: string;
  answer: string;
}

export interface DiscoveryFilters {
  distanceMax: number; // in km
  ageMin: number;
  ageMax: number;
  heightMin?: number;
  heightMax?: number;
  educationLevels: string[];
  relationshipGoals: string[];
  smokingPreferences: string[];
  drinkingPreferences: string[];
  exercisePreferences: string[];
  interests: string[];
  sexualOrientations: string[];
  verifiedOnly: boolean;
  showRecentlyActive: boolean;
}

export interface SwipeAction {
  profileId: string;
  action: 'like' | 'pass' | 'super-like';
  timestamp: string;
}

export interface Match {
  id: string;
  matchedUserId: string;
  matchedProfile: MatchedProfile;
  timestamp: string;
  isSuperLike: boolean;
  conversationId?: string;
  hasUnreadMessages: boolean;
  messageCount: number;
}

export interface MatchedProfile {
  id: string;
  name: string;
  age: number;
  photo: string;
  bio?: string;
  occupation?: string;
  commonInterests?: string[];
}

export interface DiscoveryStats {
  totalProfiles: number;
  profilesViewed: number;
  likesGiven: number;
  likesReceived: number;
  matchesToday: number;
  superLikesRemaining: number;
  boostsRemaining: number;
  rewindsRemaining: number;
}

export interface BoostStatus {
  isActive: boolean;
  activatedAt?: string;
  expiresAt?: string;
  viewsCount?: number;
}

export interface SuperLikeInfo {
  count: number;
  maxPerDay: number;
  nextResetAt: string;
}

export interface RewindInfo {
  available: boolean;
  lastAction?: SwipeAction;
}

export interface DiscoveryPreferences {
  interestedIn: ('men' | 'women' | 'everyone')[];
  filters: DiscoveryFilters;
  pauseDiscovery: boolean;
  globalMode: boolean; // Show profiles from anywhere
  incognitoMode: boolean;
}

export interface DiscoveryResponse {
  profiles: DiscoveryProfile[];
  hasMore: boolean;
  nextCursor?: string;
  filters: DiscoveryFilters;
}

export interface SwipeResponse {
  success: boolean;
  isMatch: boolean;
  match?: Match;
  profilesRemaining: number;
}

export interface BoostResponse {
  success: boolean;
  boostStatus: BoostStatus;
  cost?: number;
}
