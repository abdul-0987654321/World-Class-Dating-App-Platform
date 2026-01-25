/**
 * Mock data - DISABLED FOR PRODUCTION
 *
 * This file previously contained test user data with hardcoded credentials.
 * Mock data has been removed for security. Use the real backend API instead.
 *
 * To enable local development without a backend, set VITE_API_URL in your .env file.
 */

// Type definitions for mock data
interface MockProfile {
  userId: string;
  name: string;
  age: number;
  bio?: string;
  occupation?: string;
  city?: string;
  distance?: number;
  photos: string[];
  interests?: string[];
  verified: boolean;
  premium_tier?: string;
  compatibilityScore?: number;
}

interface MockMatchUser {
  id: string;
  name: string;
  photoUrl: string;
  isOnline: boolean;
  premium_tier: string;
}

interface MockMatch {
  id: string;
  matchedUser: MockMatchUser;
  matchedAt: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  hasUnread: boolean;
}

interface MockMessage {
  id: string;
  senderId: string;
  content: string;
  sentAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface MockParticipant {
  id: string;
  name: string;
  photoUrl: string;
  isOnline: boolean;
}

interface MockConversation {
  id: string;
  participant: MockParticipant;
  messages: MockMessage[];
  unreadCount: number;
}

interface MockLike {
  id: string;
  userId: string;
  name: string;
  photoUrl: string;
  likedAt: string;
}

// Empty mock users - mock login is disabled
export const mockUsers: Record<string, never> = {};

// Empty mock data - use real backend API
export const mockProfiles: MockProfile[] = [];
export const mockMatches: MockMatch[] = [];
export const mockConversations: MockConversation[] = [];
export const mockLikes: MockLike[] = [];
export const mockStats = {
  remainingLikes: 0,
  remainingSuperLikes: 0,
  remainingBoosts: 0,
  likesResetAt: new Date().toISOString(),
  isPremium: false,
};
