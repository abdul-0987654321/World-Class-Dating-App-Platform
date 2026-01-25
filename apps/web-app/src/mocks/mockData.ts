/**
 * Mock data - DISABLED FOR PRODUCTION
 *
 * This file previously contained test user data with hardcoded credentials.
 * Mock data has been removed for security. Use the real backend API instead.
 *
 * To enable local development without a backend, set VITE_API_URL in your .env file.
 */

// Empty mock users - mock login is disabled
export const mockUsers: Record<string, never> = {};

// Empty mock data - use real backend API
export const mockProfiles: never[] = [];
export const mockMatches: never[] = [];
export const mockConversations: never[] = [];
export const mockLikes: never[] = [];
export const mockStats = {
  remainingLikes: 0,
  remainingSuperLikes: 0,
  remainingBoosts: 0,
  likesResetAt: new Date().toISOString(),
  isPremium: false,
};
