/**
 * Mock API - DISABLED FOR PRODUCTION
 *
 * This file previously contained mock API implementations with hardcoded test credentials.
 * Mock login functionality has been disabled for security.
 *
 * All API calls should go through the real backend.
 * To enable mock mode for local development, set VITE_MOCK_API=true or VITE_ENABLE_MOCK_API=true.
 */

import { mockProfiles, mockMatches, mockConversations, mockLikes, mockStats } from './mockData';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Current logged in user
let currentUser: any = null;
let profiles = [...mockProfiles];
let matches = [...mockMatches];
let conversations = [...mockConversations];

export const mockApi = {
  // Auth - DISABLED: No mock login allowed
  async login(_email: string, _password: string) {
    await delay(500);
    // Mock login is disabled for security
    // All authentication must go through the real backend API
    throw new Error(
      'Mock login is disabled. Please configure VITE_API_URL to use the real backend.'
    );
  },

  async logout() {
    await delay(200);
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  },

  async getCurrentUser() {
    await delay(300);
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      currentUser = JSON.parse(stored);
      return currentUser;
    }
    throw new Error('Not authenticated');
  },

  // Recommendations
  async getRecommendations() {
    await delay(600);
    return {
      profiles: profiles.slice(0, 5),
      nextCursor: null,
      remainingToday: 50,
    };
  },

  // Swipe
  async swipe(targetUserId: string, action: 'like' | 'pass' | 'super_like') {
    await delay(400);

    // Remove from recommendations
    profiles = profiles.filter((p) => p.userId !== targetUserId);

    // Simulate match (30% chance on like)
    const isMatch = action !== 'pass' && Math.random() > 0.7;

    if (isMatch) {
      const matchedProfile = mockProfiles.find((p) => p.userId === targetUserId);
      const newMatch = {
        id: `match-${Date.now()}`,
        matchedUser: {
          id: targetUserId,
          name: matchedProfile?.name || 'New Match',
          photoUrl: matchedProfile?.photos[0] || '',
          isOnline: Math.random() > 0.5,
          premium_tier: 'free',
        },
        matchedAt: new Date().toISOString(),
        lastMessage: null as string | null,
        lastMessageAt: null as string | null,
        hasUnread: false,
      };
      matches.unshift(newMatch);
    }

    return {
      isMatch,
      match: isMatch ? matches[0] : null,
      remainingLikes: mockStats.remainingLikes - 1,
      remainingSuperLikes:
        action === 'super_like' ? mockStats.remainingSuperLikes - 1 : mockStats.remainingSuperLikes,
    };
  },

  // Matches
  async getMatches() {
    await delay(400);
    return {
      matches,
      nextCursor: null,
      totalCount: matches.length,
    };
  },

  // Likes
  async getLikes() {
    await delay(400);
    return {
      likes: mockLikes,
      nextCursor: null,
      totalCount: mockLikes.length,
      canSeeLikes: currentUser?.subscription === 'premium',
    };
  },

  // Conversations
  async getConversations() {
    await delay(400);
    return {
      conversations: conversations.map((c) => ({
        id: c.id,
        participant: c.participant,
        lastMessage: c.messages[c.messages.length - 1]
          ? {
              ...c.messages[c.messages.length - 1],
              status: c.messages[c.messages.length - 1].status as
                | 'sending'
                | 'sent'
                | 'delivered'
                | 'read',
            }
          : undefined,
        unreadCount: c.unreadCount,
        createdAt: new Date().toISOString(),
      })),
      nextCursor: null,
      totalUnread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    };
  },

  async getMessages(conversationId: string) {
    await delay(300);
    const conv = conversations.find((c) => c.id === conversationId);
    return {
      messages: (conv?.messages || []).map((m) => ({
        ...m,
        status: m.status as 'sending' | 'sent' | 'delivered' | 'read',
      })),
      hasMore: false,
    };
  },

  async sendMessage(conversationId: string, content: string) {
    await delay(300);
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) throw new Error('Conversation not found');

    const newMessage = {
      id: `m-${Date.now()}`,
      senderId: currentUser?.id || 'test-user-1',
      content,
      sentAt: new Date().toISOString(),
      status: 'sent' as const,
    };

    conv.messages.push(newMessage);
    return newMessage;
  },

  // Stats
  async getStats() {
    await delay(200);
    return mockStats;
  },

  // Profile
  async updateProfile(data: any) {
    await delay(400);
    if (currentUser) {
      currentUser = { ...currentUser, ...data };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    return currentUser;
  },
};

// Export for use in components
export default mockApi;
