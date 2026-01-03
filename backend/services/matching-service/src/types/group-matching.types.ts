/**
 * Group Matching Type Definitions
 * Types for group-to-group matching feature
 */

export enum GroupMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum GroupMemberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  DECLINED = 'declined',
  REMOVED = 'removed',
  LEFT = 'left',
}

export enum GroupStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISBANDED = 'disbanded',
}

export enum GroupMatchStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  UNMATCHED = 'unmatched',
  EXPIRED = 'expired',
}

export enum GroupSwipeAction {
  LIKE = 'like',
  PASS = 'pass',
  SUPER_LIKE = 'super_like',
}

export interface GroupPreferences {
  minGroupSize: number;
  maxGroupSize: number;
  ageRangeMin: number;
  ageRangeMax: number;
  maxDistance: number; // in kilometers
  genderPreferences: string[];
  activityPreferences: string[];
  lookingFor: GroupLookingFor[];
}

export enum GroupLookingFor {
  DOUBLE_DATE = 'double_date',
  GROUP_HANGOUT = 'group_hangout',
  ACTIVITY_PARTNERS = 'activity_partners',
  TRAVEL_BUDDIES = 'travel_buddies',
  GAME_NIGHT = 'game_night',
  SPORTS_TEAM = 'sports_team',
  DINNER_PARTY = 'dinner_party',
}

export interface Group {
  id: string;
  name: string;
  bio: string;
  photos: string[];
  adminId: string;
  status: GroupStatus;
  preferences: GroupPreferences;
  combinedInterests: string[];
  memberCount: number;
  minMembers: number;
  maxMembers: number;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
  };
  isVerified: boolean;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  joinedAt?: Date;
  invitedAt: Date;
  invitedBy: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  userId: string;
  invitedBy: string;
  status: GroupMemberStatus;
  message?: string;
  expiresAt: Date;
  createdAt: Date;
  respondedAt?: Date;
}

export interface GroupSwipe {
  id: string;
  groupId: string;
  targetGroupId: string;
  action: GroupSwipeAction;
  swipedByUserId: string;
  createdAt: Date;
}

export interface GroupMatch {
  id: string;
  group1Id: string;
  group2Id: string;
  status: GroupMatchStatus;
  compatibilityScore: number;
  matchedAt: Date;
  lastActivityAt: Date;
  conversationId?: string;
  expiresAt?: Date;
  expired: boolean;
  firstMessageSent: boolean;
}

export interface GroupProfile {
  group: Group;
  members: GroupMemberProfile[];
  compatibilityScore?: number;
  commonInterests: string[];
  distance?: number;
}

export interface GroupMemberProfile {
  userId: string;
  firstName: string;
  age: number;
  photos: string[];
  interests: string[];
  bio?: string;
}

export interface GroupActivitySuggestion {
  id: string;
  name: string;
  category: string;
  description: string;
  idealGroupSize: {
    min: number;
    max: number;
  };
  estimatedDuration: string;
  estimatedCost: 'free' | 'budget' | 'moderate' | 'expensive';
  location?: {
    latitude: number;
    longitude: number;
    address: string;
    venueName?: string;
  };
  tags: string[];
  rating?: number;
  imageUrl?: string;
}

export interface CreateGroupDto {
  name: string;
  bio: string;
  photos: string[];
  preferences: Partial<GroupPreferences>;
  minMembers?: number;
  maxMembers?: number;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
  };
}

export interface UpdateGroupDto {
  name?: string;
  bio?: string;
  photos?: string[];
  preferences?: Partial<GroupPreferences>;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
  };
}

export interface InviteMemberDto {
  userId: string;
  message?: string;
}

export interface GroupFeedFilters {
  minGroupSize?: number;
  maxGroupSize?: number;
  maxDistance?: number;
  lookingFor?: GroupLookingFor[];
  activityPreferences?: string[];
}

export interface GroupMatchResult {
  matched: boolean;
  match?: GroupMatch;
  message?: string;
}

export interface GroupChatCreationResult {
  conversationId: string;
  group1Members: string[];
  group2Members: string[];
}
