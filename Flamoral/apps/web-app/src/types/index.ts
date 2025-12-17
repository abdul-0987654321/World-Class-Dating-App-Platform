/**
 * Shared Types for Flamoral Web App
 * These types replace the @flamoral/types package
 */

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  name?: string;
  age?: number;
  gender?: string;
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
  premium_tier?: 'FREE' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  coinBalance?: number;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Profile Types
export interface Profile {
  id: string;
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
  premium_tier?: 'FREE' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
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
export type SubscriptionTier = 'FREE' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
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
