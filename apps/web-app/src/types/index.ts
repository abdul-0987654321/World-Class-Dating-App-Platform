/**
 * Shared Types for Flamoral Web App
 * These types replace the @flamoral/types package
 *
 * NOTE: These types are designed to match the backend API contract.
 * See utils/api-transformers.ts for handling snake_case/camelCase conversions.
 */

// Gender enum - matches backend validation
export const VALID_GENDERS = ['male', 'female', 'non-binary', 'other'] as const;
export type Gender = typeof VALID_GENDERS[number];

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  name?: string;
  age?: number;
  gender?: Gender;
  bio?: string;
  photos?: string[];
  location?: {
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  interests?: string[];
  occupation?: string;
  company?: string;
  education?: string;
  height?: number;
  verified?: {
    phone?: boolean;
    photo?: boolean;
    identity?: boolean;
  };
  subscription?: string;
  premium_tier?: SubscriptionTier;
  // Support both camelCase and snake_case for backward compatibility
  premiumTier?: SubscriptionTier;
  coinBalance?: number;
  isVerified?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Profile Types
export interface Profile {
  userId: string;
  name: string;
  age: number;
  bio?: string;
  photos: string[];
  distance?: number;
  city?: string;
  occupation?: string;
  interests?: string[];
  verified?: boolean;
  premium_tier?: SubscriptionTier;
  compatibilityScore?: number;
}

// Match Types
export interface Match {
  id: string;
  matchedUser: {
    id: string;
    name: string;
    photoUrl: string;
    isOnline: boolean;
    premium_tier?: string;
  };
  matchedAt: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  hasUnread: boolean;
  compatibility?: number;
}

// Conversation Types
export interface Message {
  id: string;
  senderId: string;
  content: string;
  sentAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'gif' | 'voice';
  mediaUrl?: string;
}

export interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    photoUrl: string;
    isOnline: boolean;
    isTyping?: boolean;
  };
  lastMessage?: Message;
  unreadCount: number;
  createdAt?: string;
}

// Like Types
export interface Like {
  id: string;
  user?: {
    id: string;
    name: string;
    photoUrl: string;
    isOnline: boolean;
    age?: number;
    city?: string;
  };
  fromUser?: {
    blurredPhotoUrl: string;
    name: string | null;
    age: number | null;
  };
  likedAt: string;
  isSuperLike: boolean;
  isBlurred?: boolean;
  isRevealed?: boolean;
}

// Subscription Types
// NOTE: Tier values are lowercase to match backend API contract
export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';

// NOTE: Status uses US spelling 'canceled' (not 'cancelled') to match backend
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'past_due' | 'trialing' | 'grace_period';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string | null;
  gracePeriodEnd?: string | null;
  autoRenew: boolean;
  features?: string[];
  trialEnd?: string | null;
}

// Settings Types
export interface UserSettings {
  notifications: {
    matches: boolean;
    messages: boolean;
    likes: boolean;
    marketing: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    showDistance: boolean;
    showAge: boolean;
    incognitoMode: boolean;
  };
  discovery: {
    ageRangeMin: number;
    ageRangeMax: number;
    maxDistance: number;
    genderPreference: string[];
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string | null;
  totalCount?: number;
  hasMore?: boolean;
}
